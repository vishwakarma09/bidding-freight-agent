from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from ..database import get_db
from ..schemas import SimulateEmailRequest
from ..services.email_service import process_incoming_email

router = APIRouter(prefix="/simulator", tags=["Email Simulator"])
logger = logging.getLogger(__name__)

@router.post("/send-mock-email")
def send_mock_email(payload: SimulateEmailRequest, db: Session = Depends(get_db)):
    """
    Simulates receiving an email (either a customer inquiry, a carrier bid, or a customer approval/rejection).
    """
    try:
        return process_incoming_email(
            db, 
            payload.sender, 
            payload.recipient, 
            payload.subject, 
            payload.body
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
    from ..models import StateTransition, CarrierBid, FreightQuote, ProcessedEmail
    
    try:
        # Delete state transitions, bids, quotes, processed_emails
        db.query(StateTransition).delete()
        db.query(CarrierBid).delete()
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


