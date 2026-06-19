import uuid
import logging
import datetime
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from ..config import settings
from ..database import get_db
from ..models import User
from ..security_utils import hash_password, verify_password
from ..schemas import UserRegister, UserLogin, UserResponse, UserTokenResponse
from ..services.email_service import send_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

class GoogleSSORequest(BaseModel):
    credential: str


def get_current_user(x_user_email: str = Header(..., alias="X-User-Email"), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(x_user_email.strip())).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: User not found."
        )
    return user


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

@router.post("/register")
def register_user(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email.ilike(payload.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
    
    # Generate activation token
    token = uuid.uuid4().hex
    
    # Create inactive user
    user = User(
        name=payload.name,
        email=payload.email.lower().strip(),
        hashed_password=hash_password(payload.password),
        is_active=False,
        activation_token=token
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Determine activation link using the request's base URL
    activation_link = f"{request.base_url}api/auth/activate?token={token}"
    year = datetime.datetime.now().year
    subject = "Activate Your Dispatch Account"
    
    body_html = f"""<!DOCTYPE html>
<html>
<head>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f9f9fb;
    }}
    .container {{
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border: 1px solid #e1e1e8;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      background-color: #0f172a;
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #38bdf8;
    }}
    .header p {{
      margin: 5px 0 0 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #94a3b8;
    }}
    .content {{
      padding: 40px 30px;
    }}
    .content h2 {{
      margin-top: 0;
      font-size: 20px;
      color: #0f172a;
    }}
    .content p {{
      color: #475569;
      font-size: 15px;
      margin-bottom: 24px;
    }}
    .button-container {{
      text-align: center;
      margin: 35px 0;
    }}
    .btn-primary {{
      display: inline-block;
      background-color: #0ea5e9;
      color: #ffffff !important;
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);
    }}
    .footer {{
      background-color: #f8fafc;
      padding: 20px 30px;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DISPATCH</h1>
      <p>Enterprise Logistics Terminal</p>
    </div>
    <div class="content">
      <h2>Verify your email address</h2>
      <p>Hello {payload.name},</p>
      <p>Thank you for signing up for Dispatch. To complete your registration and activate your freight brokerage and bidding orchestrator account, please click the button below:</p>
      <div class="button-container">
        <a href="{activation_link}" class="btn-primary" style="color: #ffffff !important;">Activate Account</a>
      </div>
      <p>If the button doesn't work, you can copy and paste the following URL into your web browser:</p>
      <p style="word-break: break-all; font-family: monospace; background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px; color: #334155;">{activation_link}</p>
    </div>
    <div class="footer">
      &copy; {year} Dispatch Inc. All rights reserved.<br>
      This is an automated notification. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
"""
    
    email_sent = send_email(to_email=payload.email, subject=subject, body_html=body_html)
    if not email_sent:
        logger.error(f"Could not send activation email to {payload.email}")
        
    return {"status": "success", "message": "Verification link sent to your email. Please check your inbox."}

@router.get("/activate")
def activate_account(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.activation_token == token).first()
    
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    
    if not user:
        logger.warning(f"Invalid activation token requested: {token}")
        return RedirectResponse(url=f"{frontend_url}/?activation_error=invalid_token")
    
    user.is_active = True
    user.activation_token = None
    db.commit()
    
    logger.info(f"User account activated: {user.email}")
    return RedirectResponse(url=f"{frontend_url}/?activated=true")

@router.post("/login", response_model=UserTokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(payload.email)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google Sign-In. Please click 'Continue with Google' to sign in."
        )
        
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not activated yet. Please check your email for the activation link."
        )
        
    access_token = user.email
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

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
        
    email = email.lower().strip()
    
    # Check if user already exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create Google SSO user, pre-activated
        user = User(
            name=name,
            email=email,
            hashed_password=None,
            is_active=True,
            activation_token=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Ensure user is active (Google SSO auto-activates if they had registered locally but not activated)
        if not user.is_active:
            user.is_active = True
            user.activation_token = None
            db.commit()
            db.refresh(user)
            
    return {
        "access_token": payload.credential,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.name
        }
    }
