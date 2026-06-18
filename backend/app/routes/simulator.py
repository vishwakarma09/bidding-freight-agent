from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import datetime
import re
import logging
from ..database import get_db
from ..models import FreightQuote, Customer, Carrier, CarrierBid, StateTransition
from ..schemas import SimulateEmailRequest, FreightQuoteResponse
from ..services.cerebras_service import parse_customer_email, parse_carrier_bid_email
from ..services.embedding_service import get_embedding
from ..services.workflow import transition_quote

router = APIRouter(prefix="/simulator", tags=["Email Simulator"])
logger = logging.getLogger(__name__)

@router.post("/send-mock-email")
def send_mock_email(payload: SimulateEmailRequest, db: Session = Depends(get_db)):
    """
    Simulates receiving an email (either a customer inquiry or a carrier bid).
    """
    sender = payload.sender.strip()
    recipient = payload.recipient.strip()
    subject = payload.subject.strip()
    body = payload.body.strip()

    # Determine email type based on recipient and subject
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
                default_markup_percent=12.0 # default simulator markup
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

        # Parse email using Cerebras service (with regex fallback)
        extracted = parse_customer_email(subject, body, sender_clean)

        # Generate quote sequential ID
        count = db.query(func.count(FreightQuote.id)).scalar() or 0
        quote_id = f"Q-{1000 + count + 1}"

        # Generate semantic vector
        description = f"Origin: {extracted['origin']}, Destination: {extracted['destination']}, Class: {extracted['freight_class']}, Weight: {extracted['weight_lbs']} lbs"
        vector = get_embedding(description)

        # Create Freight Quote
        quote = FreightQuote(
            id=quote_id,
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
        transition_quote(db, quote, "INTAKE", f"Simulated email intake from {sender_clean}")
        transition_quote(db, quote, "OUT_TO_CARRIERS", "Broadcasting RFQs to carrier network")

        db.refresh(quote)
        return {
            "type": "CUSTOMER_INQUIRY",
            "quote_id": quote.id,
            "parsed_data": extracted,
            "status": "Quote created and RFQs broadcasted"
        }

    # 2. Carrier Bid Reply (Subject contains quote ID like Q-1001)
    quote_id_match = re.search(r'(Q-\d{4})', subject)
    if quote_id_match:
        quote_id = quote_id_match.group(1)
        quote = db.query(FreightQuote).filter(FreightQuote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail=f"Freight quote {quote_id} referenced in email subject not found.")

        # Match carrier by sender email
        sender_email = re.findall(r'[\w\.-]+@[\w\.-]+', sender)
        sender_clean = sender_email[0] if sender_email else sender
        
        carrier = db.query(Carrier).filter(Carrier.email == sender_clean).first()
        if not carrier:
            # Seed a carrier if not found
            carrier = Carrier(
                name=sender_clean.split('@')[0].replace('carrier_', '').replace('.', ' ').title(),
                email=sender_clean,
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
            existing_bid.notes = f"Updated bid via mock email. Original: {existing_bid.notes}"
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

    # 3. Unrecognized format
    raise HTTPException(
        status_code=400,
        detail="Unrecognized email. To create a quote, send to broker@amzprep.com. To submit a carrier bid, ensure the subject contains 'Q-XXXX'."
    )
