import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from .config import settings

def get_fernet_key() -> bytes:
    # Use PBKDF2 to derive a cryptographically strong 32-byte key
    secret = getattr(settings, "SECRET_KEY", "dispatch_fallback_super_secret_key_2026")
    salt = b"dispatch_freight_security_salt_987654"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(secret.encode()))

def encrypt_password(password: str) -> str:
    if not password:
        return ""
    key = get_fernet_key()
    f = Fernet(key)
    return f.encrypt(password.encode("utf-8")).decode("utf-8")

def decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password:
        return ""
    key = get_fernet_key()
    f = Fernet(key)
    return f.decrypt(encrypted_password.encode("utf-8")).decode("utf-8")
