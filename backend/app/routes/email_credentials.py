import smtplib
import imaplib
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import EmailCredential, User
from ..schemas import EmailCredentialCreate, EmailCredentialResponse
from ..security_utils import encrypt_password, decrypt_password
from .auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email-credentials", tags=["Email Credentials"])

def clean_str(val: str) -> str:
    if not val:
        return ""
    return val.strip().replace(" ", "").replace("\xa0", "").replace("\t", "").replace("\n", "").replace("\r", "")

def check_mailpit_service():
    import httpx
    try:
        r = httpx.get("http://mailpit:8025/api/v1/messages", timeout=2)
        return r.status_code == 200
    except Exception:
        return False

def check_smtp(host: str, port: int, email: str, password: str):
    try:
        host = clean_str(host)
        email = clean_str(email)
        password = clean_str(password)
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=5)
        else:
            server = smtplib.SMTP(host, port, timeout=5)
            server.starttls()
        server.login(email, password)
        server.quit()
        return True, "SMTP connection OK"
    except UnicodeEncodeError as e:
        logger.error(f"SMTP encoding failed: {e}")
        return False, "Password or email contains invalid non-ASCII characters (e.g. ellipsis, curly quotes, or copy-paste artifacts). Please re-type it manually."
    except Exception as e:
        logger.error(f"SMTP verification failed: {e}")
        return False, str(e)

def check_imap(host: str, port: int, email: str, password: str):
    try:
        host = clean_str(host)
        email = clean_str(email)
        password = clean_str(password)
        mail = imaplib.IMAP4_SSL(host, port, timeout=5)
        mail.login(email, password)
        mail.logout()
        return True, "IMAP connection OK"
    except UnicodeEncodeError as e:
        logger.error(f"IMAP encoding failed: {e}")
        return False, "Password or email contains invalid non-ASCII characters (e.g. ellipsis, curly quotes, or copy-paste artifacts). Please re-type it manually."
    except Exception as e:
        logger.error(f"IMAP verification failed: {e}")
        return False, str(e)

@router.get("", response_model=List[EmailCredentialResponse])
def get_credentials(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    creds = db.query(EmailCredential).filter(EmailCredential.user_id == current_user.id).all()
    return creds

@router.get("/env")
def get_env_mode(
    current_user: User = Depends(get_current_user)
):
    from ..config import settings
    return {"env": settings.ENV}

@router.post("", response_model=EmailCredentialResponse)
def save_credentials(
    payload: EmailCredentialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..config import settings
    effective_use_dev_mode = payload.use_dev_mode if settings.ENV != "prod" else False
    creds = db.query(EmailCredential).filter(EmailCredential.user_id == current_user.id).first()
    if creds:
        creds.email_provider = payload.email_provider
        creds.email = clean_str(payload.email)
        creds.smtp_host = clean_str(payload.smtp_host)
        creds.smtp_port = payload.smtp_port
        if payload.smtp_password != "••••••••••••":
            creds.encrypted_smtp_password = encrypt_password(clean_str(payload.smtp_password))
        creds.imap_host = clean_str(payload.imap_host)
        creds.imap_port = payload.imap_port
        if payload.imap_password != "••••••••••••":
            creds.encrypted_imap_password = encrypt_password(clean_str(payload.imap_password))
        creds.use_dev_mode = effective_use_dev_mode
        creds.user_email = current_user.email
    else:
        smtp_pwd = clean_str(payload.smtp_password) if payload.smtp_password != "••••••••••••" else ""
        imap_pwd = clean_str(payload.imap_password) if payload.imap_password != "••••••••••••" else ""
        
        creds = EmailCredential(
            user_id=current_user.id,
            user_email=current_user.email,
            email_provider=payload.email_provider,
            email=clean_str(payload.email),
            smtp_host=clean_str(payload.smtp_host),
            smtp_port=payload.smtp_port,
            encrypted_smtp_password=encrypt_password(smtp_pwd),
            imap_host=clean_str(payload.imap_host),
            imap_port=payload.imap_port,
            encrypted_imap_password=encrypt_password(imap_pwd),
            use_dev_mode=effective_use_dev_mode
        )
        db.add(creds)
    
    db.commit()
    db.refresh(creds)
    return creds

@router.delete("")
def delete_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    creds = db.query(EmailCredential).filter(EmailCredential.user_id == current_user.id).first()
    if not creds:
        raise HTTPException(status_code=404, detail="Email credentials not found")
    
    db.delete(creds)
    db.commit()
    return {"status": "success", "message": "Email credentials disconnected"}

@router.post("/test")
def test_credentials(
    payload: EmailCredentialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..config import settings
    effective_use_dev_mode = payload.use_dev_mode if settings.ENV != "prod" else False
    if effective_use_dev_mode:
        mailpit_ok = check_mailpit_service()
        return {
            "smtp_connected": mailpit_ok,
            "smtp_error": None if mailpit_ok else "Mailpit service is unreachable inside the Docker container network.",
            "imap_connected": mailpit_ok,
            "imap_error": None if mailpit_ok else "Mailpit service is unreachable inside the Docker container network.",
            "success": mailpit_ok
        }

    existing = db.query(EmailCredential).filter(EmailCredential.user_id == current_user.id).first()
    
    smtp_password = payload.smtp_password
    if smtp_password == "••••••••••••" or not smtp_password:
        if existing and existing.encrypted_smtp_password:
            smtp_password = decrypt_password(existing.encrypted_smtp_password)
        else:
            smtp_password = ""
            
    imap_password = payload.imap_password
    if imap_password == "••••••••••••" or not imap_password:
        if existing and existing.encrypted_imap_password:
            imap_password = decrypt_password(existing.encrypted_imap_password)
        else:
            imap_password = ""

    smtp_ok, smtp_err = check_smtp(
        payload.smtp_host, 
        payload.smtp_port, 
        payload.email, 
        smtp_password
    )
    
    imap_ok, imap_err = check_imap(
        payload.imap_host, 
        payload.imap_port, 
        payload.email, 
        imap_password
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    creds = db.query(EmailCredential).filter(EmailCredential.user_id == current_user.id).first()
    if not creds:
        raise HTTPException(status_code=404, detail="Email credentials not found")
        
    from ..config import settings
    if creds.use_dev_mode and settings.ENV != "prod":
        mailpit_ok = check_mailpit_service()
        return {
            "smtp_connected": mailpit_ok,
            "smtp_error": None if mailpit_ok else "Mailpit service is unreachable inside the Docker container network.",
            "imap_connected": mailpit_ok,
            "imap_error": None if mailpit_ok else "Mailpit service is unreachable inside the Docker container network.",
            "success": mailpit_ok
        }
    
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
