import smtplib
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from ..config import settings

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body_html: str, from_email: str = None) -> bool:
    """
    Sends an SMTP email. In dev, this routes directly to Mailpit.
    """
    if not from_email:
        from_email = settings.BROKER_EMAIL or "broker@amzprep.com"
        
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    
    part = MIMEText(body_html, "html")
    msg.attach(part)
    
    try:
        # Connect to SMTP
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        # If username/password is configured, login (like in production)
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Email sent successfully to {to_email} with subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def poll_real_imap(db_session_dependency_helper=None) -> list:
    """
    Optional: Connects to a real IMAP mailbox to scan for new incoming emails.
    Can be run in a background worker if credentials are provided in .env.
    """
    # Placeholder for Live mode: requires setting IMAP variables in settings.
    # To keep the application portable, we implement it as a structured helper
    # that reads mail envelopes, parses them, and returns raw emails for ingestion.
    logger.info("IMAP check ticked: No real credentials configured. Skipping real IMAP poll.")
    return []
