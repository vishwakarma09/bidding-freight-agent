from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from ..database import get_db
from ..schemas import SimulateEmailRequest
from ..services.email_service import process_incoming_email
from ..models import User
from .auth import get_current_user

router = APIRouter(prefix="/simulator", tags=["Email Simulator"])
logger = logging.getLogger(__name__)

@router.post("/send-mock-email")
def send_mock_email(
    payload: SimulateEmailRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulates receiving an email (either a customer inquiry, a carrier bid, or a customer approval/rejection).
    """
    from ..config import settings
    from ..models import EmailCredential, ProcessedEmail
    from ..services.email_service import send_email

    try:
        # 1. Determine the target recipient based on configured credentials of this user
        creds = db.query(EmailCredential).filter(EmailCredential.user_id == current_user.id).first()
        target_recipient = creds.email if (creds and creds.email) else payload.recipient

        # 2. Route the email via SMTP first so it gets captured by Mailpit
        send_email(
            to_email=target_recipient,
            subject=payload.subject,
            body_html=payload.body,
            from_email=payload.sender
        )

        # 3. Wait slightly and find the message ID in Mailpit to mark it as processed
        import time
        import httpx
        time.sleep(0.25)
        mailpit_host = settings.SMTP_HOST
        if mailpit_host == "mailpit":
            mailpit_url = "http://mailpit:8025/api/v1/messages"
        else:
            mailpit_url = f"http://{mailpit_host}:8025/api/v1/messages"

        try:
            r = httpx.get(mailpit_url, params={"limit": 10}, timeout=2.0)
            if r.status_code == 200:
                messages = r.json().get("messages", [])
                for msg in messages:
                    msg_id = msg.get("ID")
                    already_processed = db.query(ProcessedEmail).filter(ProcessedEmail.id == msg_id).first()
                    if not already_processed:
                        msg_subj = msg.get("Subject", "").strip().lower()
                        target_subj = payload.subject.strip().lower()
                        
                        msg_from = msg.get("From", {}).get("Address", "").strip().lower()
                        target_from = payload.sender.strip().lower()
                        
                        if (target_subj in msg_subj or msg_subj in target_subj) and (target_from in msg_from or msg_from in target_from):
                            processed = ProcessedEmail(id=msg_id)
                            db.add(processed)
                            db.commit()
                            logger.info(f"Marked Mailpit message {msg_id} as processed in DB")
                            break
        except Exception as ex:
            logger.warning(f"Could not register email with Mailpit ID: {ex}")

        # 4. Process the incoming email directly to return the immediate response
        return process_incoming_email(
            db, 
            payload.sender, 
            target_recipient, 
            payload.subject, 
            payload.body,
            user_id=current_user.id
        )
    except ValueError as e:
        logger.warning(f"Validation error in mock email simulation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in mock email simulation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process simulated email: {e}")


@router.post("/fast-forward")
def fast_forward_timers(db: Session = Depends(get_db)):
    """
    Fast-forwards all active bidding and quote timers to progress the workflow.
    """
    import datetime
    from ..models import FreightQuote
    from ..services.workflow import check_pending_timers

    now = datetime.datetime.utcnow()
    
    # 1. Find quotes in OUT_TO_CARRIERS and set first_round_ends_at to now or past
    updated_round1 = db.query(FreightQuote).filter(
        FreightQuote.status == "OUT_TO_CARRIERS",
        FreightQuote.first_round_ends_at > now
    ).update({FreightQuote.first_round_ends_at: now}, synchronize_session=False)

    # 2. Find quotes in RE_BID_ROUND and set rebid_round_ends_at to now or past
    updated_round2 = db.query(FreightQuote).filter(
        FreightQuote.status == "RE_BID_ROUND",
        FreightQuote.rebid_round_ends_at > now
    ).update({FreightQuote.rebid_round_ends_at: now}, synchronize_session=False)

    # 3. Find quotes in AWAITING_APPROVAL and set quote_expires_at to now or past
    updated_expired = db.query(FreightQuote).filter(
        FreightQuote.status == "AWAITING_APPROVAL",
        FreightQuote.quote_expires_at > now
    ).update({FreightQuote.quote_expires_at: now}, synchronize_session=False)

    db.commit()

    # Trigger the pending timers check immediately
    check_pending_timers(db)

    total_progressed = updated_round1 + updated_round2 + updated_expired
    return {
        "status": "success",
        "message": f"Fast-forwarded {total_progressed} active quotes.",
        "details": {
            "round1_quotes": updated_round1,
            "round2_quotes": updated_round2,
            "expired_quotes": updated_expired
        }
    }


@router.post("/reset-database")
def reset_database(db: Session = Depends(get_db)):
    """
    Clears all quote-related tables to reset the simulator state.
    """
    from ..models import StateTransition, CarrierBid, FreightQuote, ProcessedEmail, RequestForQuote
    
    try:
        # Delete state transitions, bids, quotes, processed_emails, rfqs
        db.query(StateTransition).delete()
        db.query(CarrierBid).delete()
        db.query(RequestForQuote).delete()
        # Due to cascade relationships, delete FreightQuote
        db.query(FreightQuote).delete()
        db.query(ProcessedEmail).delete()
        db.commit()
        return {"status": "success", "message": "Database reset successfully."}
    except Exception as e:
        db.rollback()
        logger.error(f"Error resetting database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {e}")


@router.get("/logs")
def get_logs(db: Session = Depends(get_db), limit: int = 50):
    """
    Returns a combined list of logs based on actual state transitions and carrier bids.
    """
    from ..models import StateTransition, CarrierBid
    import datetime

    # Get state transitions
    transitions = db.query(StateTransition).order_by(StateTransition.timestamp.desc()).limit(limit).all()
    # Get bids
    bids = db.query(CarrierBid).order_by(CarrierBid.received_at.desc()).limit(limit).all()

    logs = []

    for t in transitions:
        # Determine log level / type based on status
        level = "INFO"
        if t.to_status in ["APPROVED", "COMPLETED", "QUOTE_SENT"]:
            level = "SUCCESS"
        elif t.to_status in ["LOST"]:
            level = "WARN"
            
        logs.append({
            "timestamp": t.timestamp.isoformat() + "Z",
            "level": level,
            "message": f"Quote {t.freight_quote_id}: {t.notes or f'Transitioned from {t.from_status} to {t.to_status}'}"
        })

    for b in bids:
        logs.append({
            "timestamp": b.received_at.isoformat() + "Z",
            "level": "SUCCESS",
            "message": f"Quote {b.freight_quote_id}: Bid received from {b.carrier.name if b.carrier else 'Carrier'} for ${b.bid_amount:.2f} (Round {b.round})"
        })

    # Sort all logs by timestamp desc
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return logs[:limit]


@router.get("/mailpit-messages")
def get_mailpit_messages(
    current_user: User = Depends(get_current_user)
):
    """
    Proxies requests to the Mailpit API to fetch mock emails.
    Try multiple potential endpoints:
    1. mailpit:8025 (inside docker container network)
    2. localhost:18025 (fallback if mapped to 18025 on host)
    3. localhost:8025 (fallback if running directly on host or host network)
    4. host.docker.internal:18025 (docker-to-host fallback)
    """
    import httpx
    
    urls = [
        "http://mailpit:8025/api/v1/messages",
        "http://localhost:18025/api/v1/messages",
        "http://localhost:8025/api/v1/messages",
        "http://host.docker.internal:18025/api/v1/messages"
    ]
    
    for url in urls:
        try:
            r = httpx.get(url, timeout=2.0)
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            logger.debug(f"Failed to fetch mailpit from {url}: {e}")
            
    return {"messages": []}



