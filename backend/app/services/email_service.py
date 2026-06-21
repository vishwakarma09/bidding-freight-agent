import smtplib
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import re
import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..config import settings
from ..models import FreightQuote, Customer, Carrier, CarrierBid, EmailCredential, ProcessedEmail
from ..services.cerebras_service import parse_customer_email, parse_carrier_bid_email
from ..services.embedding_service import get_embedding

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body_html: str, from_email: str = None) -> bool:
    """
    Sends an SMTP email. In dev, this routes directly to Mailpit.
    """
    if not from_email:
        from_email = settings.EMAILS_FROM_EMAIL or settings.BROKER_EMAIL or "broker@dispatch.owera.ca"
        
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    
    part = MIMEText(body_html, "html")
    msg.attach(part)
    
    try:
        # Connect to SMTP
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        # If TLS is enabled, start TLS
        if settings.SMTP_TLS or settings.SMTP_PORT == 587:
            server.starttls()
        # If username/password is configured, login (like in production)
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Email sent successfully to {to_email} with subject: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def process_incoming_email(db: Session, sender: str, recipient: str, subject: str, body: str, user_id: int = None) -> dict:
    sender = sender.strip()
    recipient = recipient.strip()
    subject = subject.strip()
    body = body.strip()

    # Match quote ID if present (e.g. Q-1001)
    quote_id_match = re.search(r'(Q-\d{4})', f"{subject} {body}")
    if quote_id_match:
        quote_id = quote_id_match.group(1)
        quote_query = db.query(FreightQuote).filter(FreightQuote.id == quote_id)
        if user_id:
            quote_query = quote_query.filter(FreightQuote.user_id == user_id)
        quote = quote_query.first()
        if quote:
            # Clean the sender email
            sender_email_match = re.findall(r'[\w\.-]+@[\w\.-]+', sender)
            sender_clean = sender_email_match[0] if sender_email_match else sender
            sender_clean_lower = sender_clean.lower()
            
            # Check if this sender matches the quote's customer email
            customer_email = quote.customer.email.lower() if quote.customer else ""
            body_lower = body.lower()
            
            # If sender is the customer OR the email explicitly contains approval/rejection keywords
            if (customer_email and sender_clean_lower == customer_email) or any(k in body_lower for k in ["approved", "approve", "book", "rejected", "reject", "decline"]):
                from .workflow import transition_quote
                if any(k in body_lower for k in ["approved", "approve", "book"]):
                    if quote.status == "AWAITING_APPROVAL":
                        transition_quote(db, quote, "APPROVED", "Customer approved the proposal via email")
                        return {
                            "type": "CUSTOMER_APPROVAL",
                            "quote_id": quote.id,
                            "status": "APPROVED",
                            "message": "Quote approved via email"
                        }
                elif any(k in body_lower for k in ["rejected", "reject", "decline"]):
                    if quote.status == "AWAITING_APPROVAL":
                        quote.lost_reason = "Customer rejected via email"
                        transition_quote(db, quote, "LOST", "Customer rejected the proposal via email")
                        return {
                            "type": "CUSTOMER_REJECTION",
                            "quote_id": quote.id,
                            "status": "LOST",
                            "message": "Quote rejected via email"
                        }

            # If not a customer reply, treat it as a carrier bid
            carrier_query = db.query(Carrier).filter(Carrier.email == sender_clean)
            if user_id:
                carrier_query = carrier_query.filter(Carrier.user_id == user_id)
            carrier = carrier_query.first()
            if not carrier:
                # Seed a carrier if not found
                carrier = Carrier(
                    name=sender_clean.split('@')[0].replace('carrier_', '').replace('.', ' ').title(),
                    email=sender_clean,
                    user_id=user_id,
                    competitiveness_score=0.0
                )
                db.add(carrier)
                db.commit()
                db.refresh(carrier)

            # Parse carrier bid (rates, transit days) using Cerebras / regex
            bid_data = parse_carrier_bid_email(body)

            # Determine round (1 or 2) based on current quote status
            current_round = 2 if quote.status == "RE_BID_ROUND" else 1

            # Check if this carrier already bid in this round
            existing_bid = db.query(CarrierBid).filter(
                CarrierBid.freight_quote_id == quote.id,
                CarrierBid.carrier_id == carrier.id,
                CarrierBid.round == current_round
            ).first()

            if existing_bid:
                # Update existing bid
                existing_bid.bid_amount = bid_data["bid_amount"]
                existing_bid.transit_time_days = bid_data["transit_time_days"]
                existing_bid.notes = f"Updated bid via email. Original: {existing_bid.notes}"
                db.commit()
                bid_rec = existing_bid
            else:
                # Create new bid
                bid_rec = CarrierBid(
                    freight_quote_id=quote.id,
                    carrier_id=carrier.id,
                    round=current_round,
                    bid_amount=bid_data["bid_amount"],
                    transit_time_days=bid_data["transit_time_days"],
                    pickup_window=bid_data["pickup_window"],
                    accessorials_text=bid_data["accessorials_text"],
                    service_level=bid_data["service_level"],
                    notes=bid_data["notes"],
                    received_at=datetime.datetime.utcnow(),
                    is_winning=False,
                    raw_email=body
                )
                db.add(bid_rec)
                db.commit()

            logger.info(f"Recorded bid of ${bid_rec.bid_amount} by carrier {carrier.name} for quote {quote.id} (Round {current_round})")

            return {
                "type": "CARRIER_BID",
                "quote_id": quote.id,
                "carrier": carrier.name,
                "round": current_round,
                "bid_amount": bid_rec.bid_amount,
                "parsed_data": bid_data
            }

    # 1. Customer inquiry to Broker
    if "broker" in recipient.lower() or "freight" in recipient.lower():
        # Clean email
        sender_email = re.findall(r'[\w\.-]+@[\w\.-]+', sender)
        sender_clean = sender_email[0] if sender_email else sender

        # Match or create customer
        customer = db.query(Customer).filter(Customer.email == sender_clean).first()
        if not customer:
            # Seed a default customer if not found
            customer = Customer(
                name=sender_clean.split('@')[0].replace('.', ' ').title(),
                email=sender_clean,
                user_id=user_id,
                default_markup_percent=12.0 # default simulator markup
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
        elif customer.user_id is None and user_id is not None:
            customer.user_id = user_id
            db.commit()
            db.refresh(customer)

        # Parse email using Cerebras service (with regex fallback)
        extracted = parse_customer_email(subject, body, sender_clean)

        # Generate quote sequential ID
        count = db.query(func.count(FreightQuote.id)).scalar() or 0
        while True:
            quote_id = f"Q-{1000 + count + 1}"
            exists = db.query(FreightQuote.id).filter(FreightQuote.id == quote_id).first()
            if not exists:
                break
            count += 1

        # Generate semantic vector
        description = f"Origin: {extracted['origin']}, Destination: {extracted['destination']}, Class: {extracted['freight_class']}, Weight: {extracted['weight_lbs']} lbs"
        vector = get_embedding(description)

        # Create Freight Quote
        quote = FreightQuote(
            id=quote_id,
            user_id=user_id,
            customer_id=customer.id,
            status="INTAKE",
            origin=extracted["origin"],
            destination=extracted["destination"],
            weight_lbs=extracted["weight_lbs"],
            dimensions=extracted["dimensions"],
            freight_class=extracted["freight_class"],
            hazmat=extracted["hazmat"],
            accessorials=", ".join(extracted["accessorials"]) if isinstance(extracted["accessorials"], list) else extracted["accessorials"],
            pickup_date=datetime.datetime.strptime(extracted["pickup_date"], "%Y-%m-%d") if extracted.get("pickup_date") else datetime.datetime.utcnow() + datetime.timedelta(days=3),
            shipment_vector=vector,
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow()
        )
        db.add(quote)
        db.commit()

        # Trigger workflow state machine
        from .workflow import transition_quote
        transition_quote(db, quote, "INTAKE", f"Email intake from {sender_clean}")
        transition_quote(db, quote, "OUT_TO_CARRIERS", "Broadcasting RFQs to carrier network")

        db.refresh(quote)
        return {
            "type": "CUSTOMER_INQUIRY",
            "quote_id": quote.id,
            "parsed_data": extracted,
            "status": "Quote created and RFQs broadcasted"
        }

    # 3. Unrecognized format
    raise ValueError("Unrecognized email. To create a quote, send to broker@dispatch.owera.ca. To submit a carrier bid, ensure the subject contains 'Q-XXXX'.")


def poll_and_ingest_emails(db: Session):
    """
    Polls configured email inboxes. If dev mode is enabled, queries Mailpit REST API.
    Otherwise, polls real IMAP server.
    """
    import httpx
    
    try:
        # Fetch all credentials
        creds_list = db.query(EmailCredential).all()
        for creds in creds_list:
            if creds.use_dev_mode and settings.ENV != "prod":
                try:
                    # Poll Mailpit REST API
                    mailpit_host = settings.SMTP_HOST
                    if mailpit_host == "mailpit":
                        url = "http://mailpit:8025/api/v1/messages"
                    else:
                        url = f"http://{mailpit_host}:8025/api/v1/messages"
                    response = httpx.get(url, params={"limit": 50}, timeout=5.0)
                    if response.status_code != 200:
                        logger.warning(f"Mailpit API returned status {response.status_code}")
                        continue
                    
                    data = response.json()
                    messages = data.get("messages", [])
                    
                    for msg in messages:
                        msg_id = msg.get("ID")
                        # Check if already processed
                        already_processed = db.query(ProcessedEmail).filter(ProcessedEmail.id == msg_id).first()
                        if already_processed:
                            continue
                        
                        # Check if recipient matches the credential email
                        to_list = msg.get("To", [])
                        recipient_emails = []
                        for t in to_list:
                            addr = t.get("Address", "")
                            emails = re.findall(r'[\w\.-]+@[\w\.-]+', addr)
                            if emails:
                                recipient_emails.append(emails[0].lower())
                        
                        cred_email = creds.email.strip().lower()
                        
                        # If recipient matches
                        if cred_email and not any(cred_email in r for r in recipient_emails):
                            continue
                        
                        # Fetch full email body from Mailpit
                        detail_response = httpx.get(f"http://mailpit:8025/api/v1/message/{msg_id}", timeout=5.0)
                        if detail_response.status_code != 200:
                            continue
                        
                        detail = detail_response.json()
                        
                        sender_info = detail.get("From", {})
                        sender_name = sender_info.get("Name", "")
                        sender_addr = sender_info.get("Address", "")
                        sender = f"{sender_name} <{sender_addr}>".strip() if sender_name else sender_addr
                        subject = detail.get("Subject", "")
                        
                        body = detail.get("Text", "") or detail.get("HTML", "")
                        
                        try:
                            logger.info(f"Ingesting Mailpit email {msg_id} from {sender} with subject {subject}")
                            process_incoming_email(db, sender, creds.email, subject, body, user_id=creds.user_id)
                        except Exception as e:
                            logger.error(f"Error processing email {msg_id}: {e}")
                        
                        # Mark as processed
                        processed = ProcessedEmail(id=msg_id)
                        db.add(processed)
                        db.commit()
                except Exception as e:
                    logger.error(f"Error polling Mailpit: {e}")
            else:
                try:
                    poll_real_imap_for_creds(db, creds)
                except Exception as e:
                    logger.error(f"Error polling real IMAP for {creds.email}: {e}")
    except Exception as e:
        logger.error(f"Error checking email credentials list: {e}")


def poll_real_imap_for_creds(db: Session, creds: EmailCredential):
    """
    Connects to live IMAP, fetches UNSEEN messages, processes them, and marks them as SEEN.
    """
    from ..security_utils import decrypt_password
    from email.header import decode_header
    
    imap_host = creds.imap_host.strip()
    imap_port = creds.imap_port
    email_user = creds.email.strip()
    email_pass = decrypt_password(creds.encrypted_imap_password)
    
    if not imap_host or not email_user or not email_pass:
        logger.info(f"IMAP credentials incomplete for {email_user}. Skipping real IMAP poll.")
        return
        
    try:
        mail = imaplib.IMAP4_SSL(imap_host, imap_port, timeout=10.0)
        mail.login(email_user, email_pass)
        mail.select("inbox")
        
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK":
            mail.logout()
            return
            
        message_ids = messages[0].split()
        # Limit to the latest 5 unseen messages to prevent blocking the worker
        for mail_id in message_ids[-5:]:
            status, msg_data = mail.fetch(mail_id, "(RFC822)")
            if status != "OK":
                continue
                
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    raw_email = response_part[1]
                    msg = email.message_from_bytes(raw_email)
                    
                    subject_header = msg["Subject"] or ""
                    subject, encoding = decode_header(subject_header)[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding or "utf-8", errors="ignore")
                        
                    sender_header = msg["From"] or ""
                    sender, encoding = decode_header(sender_header)[0]
                    if isinstance(sender, bytes):
                        sender = sender.decode(encoding or "utf-8", errors="ignore")
                        
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                                break
                            elif content_type == "text/html" and "attachment" not in content_disposition:
                                body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                    else:
                        body = msg.get_payload(decode=True).decode("utf-8", errors="ignore")
                        
                    message_id = msg.get("Message-ID", f"imap_{mail_id.decode()}_{datetime.datetime.utcnow().timestamp()}")
                    already_processed = db.query(ProcessedEmail).filter(ProcessedEmail.id == message_id).first()
                    if already_processed:
                        continue
                        
                    try:
                        logger.info(f"Ingesting real IMAP email {message_id} from {sender} with subject {subject}")
                        process_incoming_email(db, sender, creds.email, subject, body, user_id=creds.user_id)
                    except Exception as e:
                        logger.error(f"Error processing real IMAP email {message_id}: {e}")
                        
                    processed = ProcessedEmail(id=message_id)
                    db.add(processed)
                    db.commit()
                    
                    mail.store(mail_id, "+FLAGS", "\\Seen")
                    
        mail.close()
        mail.logout()
    except Exception as e:
        logger.error(f"Failed to poll real IMAP mailbox: {e}")

