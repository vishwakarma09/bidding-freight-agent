from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://freight_user:freight_password@localhost:5432/freight_bidding_db"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    # Cerebras API Key for fast LLM inference
    CEREBRAS_API_KEY: str = "YOUR_CEREBRAS_API_KEY"
    
    # Custom business rules
    BROKER_EMAIL: str = "broker@amzprep.com"
    CARRIER_EMAILS: str = "carrier_ups@mailpit.local,carrier_fedex@mailpit.local,carrier_dhl@mailpit.local,carrier_amz@mailpit.local,carrier_od@mailpit.local"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
