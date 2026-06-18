import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    default_markup_percent = Column(Float, default=10.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    quotes = relationship("FreightQuote", back_populates="customer")


class Carrier(Base):
    __tablename__ = "carriers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    competitiveness_score = Column(Float, default=0.0) # calculated based on historical wins
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    bids = relationship("CarrierBid", back_populates="carrier")
    quotes_won = relationship("FreightQuote", back_populates="winning_carrier")


class FreightQuote(Base):
    __tablename__ = "freight_quotes"

    id = Column(String, primary_key=True, index=True) # e.g. "Q-1001"
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    status = Column(String, default="INTAKE", nullable=False)
    
    # Shipment specs
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    weight_lbs = Column(Float, nullable=False)
    dimensions = Column(String, nullable=True) # e.g., "48x48x50"
    freight_class = Column(String, nullable=True) # e.g., "70"
    hazmat = Column(Boolean, default=False)
    accessorials = Column(String, nullable=True) # comma separated, e.g. "Liftgate,Residential"
    pickup_date = Column(DateTime, nullable=False)
    
    # Workflow timestamps
    first_round_ends_at = Column(DateTime, nullable=True)
    rebid_round_ends_at = Column(DateTime, nullable=True)
    quote_expires_at = Column(DateTime, nullable=True)
    
    # Financial details
    cost_price = Column(Float, default=0.0)
    sell_price = Column(Float, default=0.0)
    markup_percent = Column(Float, default=0.0)
    margin_amt = Column(Float, default=0.0)
    margin_pct = Column(Float, default=0.0)
    
    # Winner & Resolution
    winning_carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)
    lost_reason = Column(String, nullable=True)
    competitor_info = Column(String, nullable=True)
    
    # Billing / PandaDoc simulation
    payment_status = Column(String, default="UNPAID") # UNPAID, PAID, RECONCILED
    bol_url = Column(String, nullable=True)
    invoice_url = Column(String, nullable=True)
    
    # Email / Context mapping
    email_thread_id = Column(String, nullable=True)
    email_message_id = Column(String, nullable=True)
    
    # Vector Embedding for historical quote RAG benchmarking
    # Represents the semantic profile of the shipment (Origin + Destination + Class + Weight)
    shipment_vector = Column(Vector(1536), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="quotes")
    winning_carrier = relationship("Carrier", back_populates="quotes_won")
    bids = relationship("CarrierBid", back_populates="quote", cascade="all, delete-orphan")
    transitions = relationship("StateTransition", back_populates="quote", cascade="all, delete-orphan")


class CarrierBid(Base):
    __tablename__ = "carrier_bids"

    id = Column(Integer, primary_key=True, index=True)
    freight_quote_id = Column(String, ForeignKey("freight_quotes.id"), nullable=False)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=False)
    round = Column(Integer, default=1) # 1 or 2
    bid_amount = Column(Float, nullable=False)
    transit_time_days = Column(Integer, nullable=True)
    pickup_window = Column(String, nullable=True)
    accessorials_text = Column(String, nullable=True)
    service_level = Column(String, nullable=True) # e.g. "Standard LTL", "Guaranteed"
    notes = Column(Text, nullable=True)
    received_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_winning = Column(Boolean, default=False)
    raw_email = Column(Text, nullable=True)

    quote = relationship("FreightQuote", back_populates="bids")
    carrier = relationship("Carrier", back_populates="bids")


class StateTransition(Base):
    __tablename__ = "state_transitions"

    id = Column(Integer, primary_key=True, index=True)
    freight_quote_id = Column(String, ForeignKey("freight_quotes.id"), nullable=False)
    from_status = Column(String, nullable=False)
    to_status = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)

    quote = relationship("FreightQuote", back_populates="transitions")


class Connector(Base):
    __tablename__ = "connectors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=False)
    contact_phone = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    contact_role = Column(String, nullable=True)
    channel = Column(String, default="email", nullable=False) # email, sms, whatsapp
    filtering_keywords = Column(Text, nullable=True)
    status = Column(String, default="CONNECTED", nullable=False) # CONNECTED, DISCONNECTED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
