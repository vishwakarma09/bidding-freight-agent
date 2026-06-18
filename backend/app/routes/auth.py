from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import httpx
import logging
from ..config import settings
from ..database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

class GoogleSSORequest(BaseModel):
    credential: str

def verify_google_token(token_str: str) -> dict:
    try:
        # Verify ID token using google-auth library
        idinfo = id_token.verify_oauth2_token(token_str, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
        return idinfo
    except Exception as e:
        logger.warning(f"google-auth-library failed verification, trying HTTP fallback: {e}")
        # Fallback HTTP request validation in case library fails (e.g. environment issues)
        try:
            r = httpx.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token_str}", timeout=5)
            if r.status_code == 200:
                data = r.json()
                if data.get("aud") == settings.GOOGLE_CLIENT_ID:
                    return data
        except Exception as fallback_err:
            logger.error(f"Fallback HTTP token info verification failed: {fallback_err}")
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

@router.post("/google-sso")
def google_sso(payload: GoogleSSORequest, db: Session = Depends(get_db)):
    idinfo = verify_google_token(payload.credential)
    email = idinfo.get("email")
    name = idinfo.get("name", email.split("@")[0] if email else "Google User")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google token"
        )
        
    return {
        "access_token": payload.credential,
        "token_type": "bearer",
        "user": {
            "email": email,
            "name": name
        }
    }
