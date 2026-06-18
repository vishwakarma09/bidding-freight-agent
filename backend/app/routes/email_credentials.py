import smtplib
import imaplib
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import EmailCredential
from ..schemas import EmailCredentialCreate, EmailCredentialResponse
from ..security_utils import encrypt_password, decrypt_password

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email-credentials", tags=["Email Credentials"])

def check_smtp(host: str, port: int, email: str, password: str):
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=5)
        else:
            server = smtplib.SMTP(host, port, timeout=5)
            server.starttls()
        server.login(email, password)
        server.quit()
        return True, "SMTP connection OK"
    except Exception as e:
        logger.error(f"SMTP verification failed: {e}")
        return False, str(e)

def check_imap(host: str, port: int, email: str, password: str):
    try:
        mail = imaplib.IMAP4_SSL(host, port, timeout=5)
        mail.login(email, password)
        mail.logout()
        return True, "IMAP connection OK"
    except Exception as e:
        logger.error(f"IMAP verification failed: {e}")
        return False, str(e)

@router.get("", response_model=EmailCredentialResponse)
def get_credentials(
    x_user_email: str = Header(..., alias="X-User-Email"), 
    db: Session = Depends(get_db)
):
    creds = db.query(EmailCredential).filter(EmailCredential.user_email == x_user_email).first()
    if not creds:
        raise HTTPException(status_code=404, detail="Email credentials not configured")
    return creds

@router.post("", response_model=EmailCredentialResponse)
def save_credentials(
    payload: EmailCredentialCreate,
    x_user_email: str = Header(..., alias="X-User-Email"),
    db: Session = Depends(get_db)
):
    creds = db.query(EmailCredential).filter(EmailCredential.user_email == x_user_email).first()
    if creds:
        creds.email_provider = payload.email_provider
        creds.email = payload.email
        creds.smtp_host = payload.smtp_host
        creds.smtp_port = payload.smtp_port
        if payload.smtp_password != "••••••••••••":
            creds.encrypted_smtp_password = encrypt_password(payload.smtp_password)
        creds.imap_host = payload.imap_host
        creds.imap_port = payload.imap_port
        if payload.imap_password != "••••••••••••":
            creds.encrypted_imap_password = encrypt_password(payload.imap_password)
    else:
        smtp_pwd = payload.smtp_password if payload.smtp_password != "••••••••••••" else ""
        imap_pwd = payload.imap_password if payload.imap_password != "••••••••••••" else ""
        
        creds = EmailCredential(
            user_email=x_user_email,
            email_provider=payload.email_provider,
            email=payload.email,
            smtp_host=payload.smtp_host,
            smtp_port=payload.smtp_port,
            encrypted_smtp_password=encrypt_password(smtp_pwd),
            imap_host=payload.imap_host,
            imap_port=payload.imap_port,
            encrypted_imap_password=encrypt_password(imap_pwd)
        )
        db.add(creds)
    
    db.commit()
    db.refresh(creds)
    return creds

@router.delete("")
def delete_credentials(
    x_user_email: str = Header(..., alias="X-User-Email"),
    db: Session = Depends(get_db)
):
    creds = db.query(EmailCredential).filter(EmailCredential.user_email == x_user_email).first()
    if not creds:
        raise HTTPException(status_code=404, detail="Email credentials not found")
    
    db.delete(creds)
    db.commit()
    return {"status": "success", "message": "Email credentials disconnected"}

@router.post("/test")
def test_credentials(
    payload: EmailCredentialCreate
):
    smtp_ok, smtp_err = check_smtp(
        payload.smtp_host, 
        payload.smtp_port, 
        payload.email, 
        payload.smtp_password
    )
    
    imap_ok, imap_err = check_imap(
        payload.imap_host, 
        payload.imap_port, 
        payload.email, 
        payload.imap_password
    )
    
    return {
        "smtp_connected": smtp_ok,
        "smtp_error": smtp_err if not smtp_ok else None,
        "imap_connected": imap_ok,
        "imap_error": imap_err if not imap_ok else None,
        "success": smtp_ok and imap_ok
    }

@router.post("/test-existing")
def test_existing_credentials(
    x_user_email: str = Header(..., alias="X-User-Email"),
    db: Session = Depends(get_db)
):
    creds = db.query(EmailCredential).filter(EmailCredential.user_email == x_user_email).first()
    if not creds:
        raise HTTPException(status_code=404, detail="Email credentials not found")
    
    smtp_password = decrypt_password(creds.encrypted_smtp_password)
    imap_password = decrypt_password(creds.encrypted_imap_password)
    
    smtp_ok, smtp_err = check_smtp(
        creds.smtp_host, 
        creds.smtp_port, 
        creds.email, 
        smtp_password
    )
    
    imap_ok, imap_err = check_imap(
        creds.imap_host, 
        creds.imap_port, 
        creds.email, 
        imap_password
    )
    
    return {
        "smtp_connected": smtp_ok,
        "smtp_error": smtp_err if not smtp_ok else None,
        "imap_connected": imap_ok,
        "imap_error": imap_err if not imap_ok else None,
        "success": smtp_ok and imap_ok
    }
