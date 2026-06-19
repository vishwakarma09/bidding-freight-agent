import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import engine, Base, SessionLocal
from .models import Customer, Carrier, EmailCredential, User
from .routes import quotes, carriers, customers, simulator, analytics, email_credentials, auth
from .services.workflow import check_pending_timers

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Freight bidding workflow orchestrator",
    description="Automated competitive freight bidding API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins in dev simulator
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(quotes.router, prefix="/api")
app.include_router(carriers.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(simulator.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(email_credentials.router, prefix="/api")
app.include_router(auth.router, prefix="/api")



async def workflow_timer_loop():
    """
    Background worker that runs every 5 seconds to check active timers 
    (first round bids, re-bids, and quote expiration).
    """
    logger.info("Starting background workflow orchestrator timer loop...")
    while True:
        try:
            db = SessionLocal()
            check_pending_timers(db)
            
            # Poll and ingest emails (Mailpit dev mode or real IMAP)
            from .services.email_service import poll_and_ingest_emails
            poll_and_ingest_emails(db)
            
            db.close()
        except Exception as e:
            logger.error(f"Error in background timer tick: {e}")
        await asyncio.sleep(5)


@app.on_event("startup")
def startup_event():
    # 1. Initialize Postgres tables and extensions
    db = SessionLocal()
    try:
        # Create pgvector extension if not exists
        logger.info("Initializing pgvector database extension...")
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        db.commit()
    except Exception as e:
        logger.warning(f"Could not initialize pgvector extension: {e}. Falling back to standard operations.")
        
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")

    try:
        logger.info("Altering email_credentials table to add use_dev_mode if not exists...")
        db.execute(text("ALTER TABLE email_credentials ADD COLUMN IF NOT EXISTS use_dev_mode BOOLEAN DEFAULT FALSE"))
        db.commit()
    except Exception as e:
        logger.warning(f"Could not alter email_credentials table: {e}")

    try:
        logger.info("Altering carriers table to add is_override and simulated_score if not exists...")
        db.execute(text("ALTER TABLE carriers ADD COLUMN IF NOT EXISTS is_override BOOLEAN DEFAULT FALSE"))
        db.execute(text("ALTER TABLE carriers ADD COLUMN IF NOT EXISTS simulated_score DOUBLE PRECISION DEFAULT 0.0"))
        db.commit()
    except Exception as e:
        logger.warning(f"Could not alter carriers table: {e}")

    try:
        logger.info("Altering tables to add user_id column if not exists...")
        db.execute(text("ALTER TABLE carriers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
        db.execute(text("ALTER TABLE freight_quotes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
        db.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
        db.execute(text("ALTER TABLE email_credentials ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE"))
        
        # Drop unique constraint on carriers(email)
        # Note: postgres unique index constraint name is carriers_email_key
        db.execute(text("ALTER TABLE carriers DROP CONSTRAINT IF EXISTS carriers_email_key"))
        
        # Drop unique index if exists in postgres and create a non-unique one
        db.execute(text("DROP INDEX IF EXISTS ix_carriers_email"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_carriers_email ON carriers (email)"))
        db.commit()
    except Exception as e:
        logger.warning(f"Could not alter tables for user_id columns or constraints: {e}")
        db.rollback()

    try:
        logger.info("Healing database: linking user_id to existing credentials and data...")
        # 1. Update email_credentials based on user_email
        db.execute(text("""
            UPDATE email_credentials ec 
            SET user_id = u.id 
            FROM users u 
            WHERE ec.user_email = u.email AND ec.user_id IS NULL
        """))
        
        # 2. Update carriers, customers, freight_quotes to default seeded user
        db.execute(text("""
            UPDATE carriers 
            SET user_id = (SELECT id FROM users WHERE email = 'broker@dispatch.owera.ca' LIMIT 1) 
            WHERE user_id IS NULL
        """))
        db.execute(text("""
            UPDATE customers 
            SET user_id = (SELECT id FROM users WHERE email = 'broker@dispatch.owera.ca' LIMIT 1) 
            WHERE user_id IS NULL
        """))
        db.execute(text("""
            UPDATE freight_quotes 
            SET user_id = (SELECT id FROM users WHERE email = 'broker@dispatch.owera.ca' LIMIT 1) 
            WHERE user_id IS NULL
        """))
        db.commit()
        logger.info("Database healing completed successfully.")
    except Exception as e:
        logger.warning(f"Could not heal database: {e}")
        db.rollback()
        
    # 2. Seed default User, Customers, Carriers, and Credentials if tables are empty
    try:
        # Seed default User first
        if db.query(User).count() == 0:
            logger.info("Seeding default User broker@dispatch.owera.ca...")
            from .security_utils import hash_password
            default_user = User(
                email="broker@dispatch.owera.ca",
                name="Broker",
                hashed_password=hash_password("password123"),
                is_active=True
            )
            db.add(default_user)
            db.commit()
            
        default_user = db.query(User).filter(User.email == "broker@dispatch.owera.ca").first()
        default_user_id = default_user.id if default_user else None

        if db.query(Customer).count() == 0:
            logger.info("Seeding default Customers A, B, and C...")
            customers = [
                Customer(name="Dispatch Customer A (5% Markup)", email="customer_a@example.com", default_markup_percent=5.0, user_id=default_user_id),
                Customer(name="Dispatch Customer B (12% Markup)", email="customer_b@example.com", default_markup_percent=12.0, user_id=default_user_id),
                Customer(name="Dispatch Customer C (30% Markup)", email="customer_c@example.com", default_markup_percent=30.0, user_id=default_user_id)
            ]
            db.add_all(customers)
            db.commit()
            
        if db.query(Carrier).count() == 0:
            logger.info("Seeding default carriers UPS, FedEx, DHL, Amazon Freight, and Old Dominion...")
            carriers = [
                Carrier(name="UPS Freight", email="carrier_ups@mailpit.local", competitiveness_score=0.0, user_id=default_user_id),
                Carrier(name="FedEx Freight", email="carrier_fedex@mailpit.local", competitiveness_score=0.0, user_id=default_user_id),
                Carrier(name="DHL Express", email="carrier_dhl@mailpit.local", competitiveness_score=0.0, user_id=default_user_id),
                Carrier(name="Amazon Freight", email="carrier_amz@mailpit.local", competitiveness_score=0.0, user_id=default_user_id),
                Carrier(name="Old Dominion", email="carrier_od@mailpit.local", competitiveness_score=0.0, user_id=default_user_id)
            ]
            db.add_all(carriers)
            db.commit()

        if db.query(EmailCredential).count() == 0:
            logger.info("Seeding default EmailCredential for Mailpit...")
            from .security_utils import encrypt_password
            default_creds = EmailCredential(
                user_id=default_user_id,
                user_email="broker@dispatch.owera.ca",
                email_provider="Mailpit",
                email="broker@dispatch.owera.ca",
                smtp_host="mailpit",
                smtp_port=1025,
                encrypted_smtp_password=encrypt_password("devmode"),
                imap_host="mailpit",
                imap_port=143,
                encrypted_imap_password=encrypt_password("devmode"),
                use_dev_mode=True
            )
            db.add(default_creds)
            db.commit()
    except Exception as e:
        logger.error(f"Failed to seed initial data: {e}")
    finally:
        db.close()

    # 3. Spawn background workflow worker
    asyncio.create_task(workflow_timer_loop())


@app.get("/")
def read_root():
    return {"status": "running", "engine": "Freight bidding workflow engine v1.0.0"}
