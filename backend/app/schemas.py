from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    email: str
    default_markup_percent: float = 10.0

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CarrierBase(BaseModel):
    name: str
    email: str
    competitiveness_score: float = 0.0

class CarrierCreate(CarrierBase):
    pass

class CarrierResponse(CarrierBase):
    id: int

    class Config:
        from_attributes = True


class FreightQuoteCreate(BaseModel):
    customer_id: int
    origin: str
    destination: str
    weight_lbs: float
    dimensions: Optional[str] = "48x48x48"
    freight_class: Optional[str] = "70"
    hazmat: Optional[bool] = False
    accessorials: Optional[str] = ""
    pickup_date: datetime


class CarrierBidBase(BaseModel):
    carrier_id: int
    round: int = 1
    bid_amount: float
    transit_time_days: int
    pickup_window: Optional[str] = "09:00 - 17:00"
    accessorials_text: Optional[str] = ""
    service_level: Optional[str] = "Standard LTL"
    notes: Optional[str] = ""

class CarrierBidCreate(CarrierBidBase):
    pass

class CarrierBidResponse(CarrierBidBase):
    id: int
    freight_quote_id: str
    received_at: datetime
    is_winning: bool

    class Config:
        from_attributes = True


class StateTransitionResponse(BaseModel):
    id: int
    from_status: str
    to_status: str
    timestamp: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class FreightQuoteResponse(BaseModel):
    id: str
    customer_id: int
    customer: CustomerResponse
    status: str
    origin: str
    destination: str
    weight_lbs: float
    dimensions: Optional[str]
    freight_class: Optional[str]
    hazmat: bool
    accessorials: Optional[str]
    pickup_date: datetime
    first_round_ends_at: Optional[datetime]
    rebid_round_ends_at: Optional[datetime]
    quote_expires_at: Optional[datetime]
    cost_price: float
    sell_price: float
    markup_percent: float
    margin_amt: float
    margin_pct: float
    winning_carrier_id: Optional[int]
    winning_carrier: Optional[CarrierResponse]
    lost_reason: Optional[str]
    competitor_info: Optional[str]
    payment_status: str
    bol_url: Optional[str]
    invoice_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    bids: List[CarrierBidResponse] = []
    transitions: List[StateTransitionResponse] = []

    class Config:
        from_attributes = True


class QuoteApprovalRequest(BaseModel):
    approved: bool
    lost_reason: Optional[str] = None
    competitor_info: Optional[str] = None


class SimulateEmailRequest(BaseModel):
    sender: str
    recipient: str
    subject: str
    body: str


class ConnectorBase(BaseModel):
    name: str
    company_name: Optional[str] = None
    contact_email: str
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    channel: str = "email"
    filtering_keywords: Optional[str] = None
    status: str = "CONNECTED"


class ConnectorCreate(ConnectorBase):
    pass


class ConnectorResponse(ConnectorBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
