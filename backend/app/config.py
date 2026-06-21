from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    ENV: str = "dev"
    DATABASE_URL: str = "postgresql://freight_user:freight_password@localhost:5432/freight_bidding_db"
    FRONTEND_URL: str = "http://localhost:5173"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = False
    EMAILS_FROM_EMAIL: Optional[str] = None

    
    # Cerebras API Key for fast LLM inference
    CEREBRAS_API_KEY: str = "YOUR_CEREBRAS_API_KEY"
    
    # Custom business rules
    BROKER_EMAIL: str = "broker@dispatch.owera.ca"

    # Google Client Sign-In Credentials
    GOOGLE_CLIENT_ID: str = "YOUR_GOOGLE_CLIENT_ID"
    GOOGLE_CLIENT_SECRET: str = "YOUR_GOOGLE_CLIENT_SECRET"



    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
