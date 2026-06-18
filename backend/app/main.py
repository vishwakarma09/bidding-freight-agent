import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import engine, Base, SessionLocal
from .models import Customer, Carrier, Connector, EmailCredential
from .routes import quotes, carriers, customers, simulator, analytics, connectors, email_credentials
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
app.include_router(connectors.router, prefix="/api")
app.include_router(email_credentials.router, prefix="/api")


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
        
    # 2. Seed default Customers and Carriers if tables are empty
    try:
        if db.query(Customer).count() == 0:
            logger.info("Seeding default Customers A, B, and C...")
            customers = [
                Customer(name="AMZPrep Customer A (5% Markup)", email="customer_a@example.com", default_markup_percent=5.0),
                Customer(name="AMZPrep Customer B (12% Markup)", email="customer_b@example.com", default_markup_percent=12.0),
                Customer(name="AMZPrep Customer C (30% Markup)", email="customer_c@example.com", default_markup_percent=30.0)
            ]
            db.add_all(customers)
            db.commit()
            
        if db.query(Carrier).count() == 0:
            logger.info("Seeding default carriers UPS, FedEx, DHL, Amazon Freight, and Old Dominion...")
            carriers = [
                Carrier(name="UPS Freight", email="carrier_ups@mailpit.local", competitiveness_score=0.0),
                Carrier(name="FedEx Freight", email="carrier_fedex@mailpit.local", competitiveness_score=0.0),
                Carrier(name="DHL Express", email="carrier_dhl@mailpit.local", competitiveness_score=0.0),
                Carrier(name="Amazon Freight", email="carrier_amz@mailpit.local", competitiveness_score=0.0),
                Carrier(name="Old Dominion", email="carrier_od@mailpit.local", competitiveness_score=0.0)
            ]
            db.add_all(carriers)
            db.commit()

        if db.query(Connector).count() == 0:
            logger.info("Seeding default connectors FedEx, UPS, DHL...")
            connectors_list = [
                Connector(
                    name="Apex Global Logistics",
                    company_name="Apex Global Logistics Inc.",
                    contact_email="ops@apex-logistics.io",
                    contact_phone="+1 (555) 000-0000",
                    contact_name="Elena Rodriguez",
                    contact_role="Senior Logistics Coordinator",
                    channel="email",
                    filtering_keywords="LTL, pallets, weight, class, hazardous, expedited, priority_1",
                    status="CONNECTED"
                ),
                Connector(
                    name="FedEx Direct Feed",
                    company_name="FedEx Freight",
                    contact_email="carrier_fedex@mailpit.local",
                    contact_phone="+1 (800) 463-3339",
                    contact_name="Mark Smith",
                    contact_role="Integration Lead",
                    channel="email",
                    filtering_keywords="LTL, pallets, weight, priority",
                    status="CONNECTED"
                ),
                Connector(
                    name="DHL Global Connect",
                    company_name="DHL Express",
                    contact_email="carrier_dhl@mailpit.local",
                    contact_phone="+1 (800) 225-5345",
                    contact_name="Sarah Jenkins",
                    contact_role="Support Manager",
                    channel="email",
                    filtering_keywords="air freight, pallet, weight, hazmat",
                    status="CONNECTED"
                )
            ]
            db.add_all(connectors_list)
            db.commit()

        if db.query(EmailCredential).count() == 0:
            logger.info("Seeding default EmailCredential for Mailpit...")
            from .security_utils import encrypt_password
            default_creds = EmailCredential(
                user_email="broker@amzprep.com",
                email_provider="Mailpit",
                email="broker@amzprep.com",
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
