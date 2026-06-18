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

