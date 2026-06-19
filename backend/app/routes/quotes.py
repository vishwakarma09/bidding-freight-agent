from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
import datetime
import uuid
from ..database import get_db
from ..models import FreightQuote, Customer, CarrierBid, StateTransition, User
from ..schemas import FreightQuoteResponse, FreightQuoteCreate, QuoteApprovalRequest
from ..services.workflow import transition_quote
from ..services.embedding_service import get_embedding
from .auth import get_current_user

router = APIRouter(prefix="/quotes", tags=["Freight Quotes"])

@router.get("", response_model=List[FreightQuoteResponse])
def get_quotes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(FreightQuote).filter(
        FreightQuote.user_id == current_user.id
    ).order_by(FreightQuote.created_at.desc()).all()


@router.get("/{quote_id}", response_model=FreightQuoteResponse)
def get_quote(
    quote_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quote = db.query(FreightQuote).filter(
        FreightQuote.id == quote_id,
        FreightQuote.user_id == current_user.id
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Freight quote not found")
    return quote


@router.post("", response_model=FreightQuoteResponse)
def create_quote(
    payload: FreightQuoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify customer exists and belongs to this user
    customer = db.query(Customer).filter(
        Customer.id == payload.customer_id,
        Customer.user_id == current_user.id
    ).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid Customer ID")

    # 2. Generate sequential ID like Q-1001
    count = db.query(func.count(FreightQuote.id)).filter(
        FreightQuote.user_id == current_user.id
    ).scalar() or 0
    quote_id = f"Q-{1000 + count + 1}"

    # 3. Compute vector embedding for lane RAG benchmarking
    description = f"Origin: {payload.origin}, Destination: {payload.destination}, Class: {payload.freight_class or 'N/A'}, Weight: {payload.weight_lbs} lbs"
    vector = get_embedding(description)

    # 4. Create record
    quote = FreightQuote(
        id=quote_id,
        user_id=current_user.id,
        customer_id=payload.customer_id,
        status="INTAKE",
        origin=payload.origin,
        destination=payload.destination,
        weight_lbs=payload.weight_lbs,
        dimensions=payload.dimensions,
        freight_class=payload.freight_class,
        hazmat=payload.hazmat,
        accessorials=payload.accessorials,
        pickup_date=payload.pickup_date,
        shipment_vector=vector,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    db.add(quote)
    db.commit()
    
    # 5. Record initial state and trigger state machine
    transition_quote(db, quote, "INTAKE", "Quote ingest parsed successfully")
    transition_quote(db, quote, "OUT_TO_CARRIERS", "RFQ requests sent out to carriers")
    
    db.refresh(quote)
    return quote


@router.post("/{quote_id}/approve", response_model=FreightQuoteResponse)
def approve_quote(
    quote_id: str,
    approval: QuoteApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quote = db.query(FreightQuote).filter(
        FreightQuote.id == quote_id,
        FreightQuote.user_id == current_user.id
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Freight quote not found")

    if approval.approved:
        if quote.status != "AWAITING_APPROVAL":
            raise HTTPException(status_code=400, detail=f"Cannot approve quote in status {quote.status}")
        transition_quote(db, quote, "APPROVED", "Customer approved the freight quote proposal")
    else:
        quote.lost_reason = approval.lost_reason or "Customer rejected rate"
        quote.competitor_info = approval.competitor_info
        transition_quote(db, quote, "LOST", f"Customer rejected. Reason: {quote.lost_reason}")

    db.refresh(quote)
    return quote


@router.post("/{quote_id}/manual-override", response_model=FreightQuoteResponse)
def manual_override(
    quote_id: str,
    to_status: str = Body(..., embed=True),
    notes: Optional[str] = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Beta requirement: allows manual override of pipeline stage at any time.
    """
    quote = db.query(FreightQuote).filter(
        FreightQuote.id == quote_id,
        FreightQuote.user_id == current_user.id
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Freight quote not found")

    valid_statuses = [
        "INTAKE", "OUT_TO_CARRIERS", "FIRST_ROUND_RECEIVED", "RE_BID_ROUND",
        "QUOTE_SENT", "AWAITING_APPROVAL", "APPROVED", "IN_TRANSIT", "COMPLETED", "LOST"
    ]
    if to_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status: {to_status}. Must be one of {valid_statuses}")

    # Manually transition status
    transition_quote(db, quote, to_status, notes=f"Manual Override: {notes or 'No notes provided'}")
    
    # If overridden to COMPLETED, handle payment / billing reconciliation simulations
    if to_status == "COMPLETED":
        quote.payment_status = "PAID"
        db.commit()

    db.refresh(quote)
    return quote


@router.get("/{quote_id}/historical-rag")
def get_historical_rag(
    quote_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Performs a vector similarity search on the pgvector column to find 
    the top 3 closest historical lanes and their pricing.
    """
    quote = db.query(FreightQuote).filter(
        FreightQuote.id == quote_id,
        FreightQuote.user_id == current_user.id
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Freight quote not found")

    if quote.shipment_vector is None:
        return []

    try:
        # Perform pgvector cosine distance search
        results = db.query(FreightQuote).filter(
            FreightQuote.id != quote_id,
            FreightQuote.user_id == current_user.id,
            FreightQuote.cost_price > 0
        ).order_by(
            FreightQuote.shipment_vector.cosine_distance(quote.shipment_vector)
        ).limit(3).all()

        formatted_results = []
        for r in results:
            dist = db.scalar(select(r.shipment_vector.cosine_distance(quote.shipment_vector)))
            similarity = round((1.0 - float(dist or 0.0)) * 100.0, 2) if dist is not None else 0.0
            
            formatted_results.append({
                "id": r.id,
                "origin": r.origin,
                "destination": r.destination,
                "weight_lbs": r.weight_lbs,
                "winning_carrier": r.winning_carrier.name if r.winning_carrier else "N/A",
                "cost_price": r.cost_price,
                "sell_price": r.sell_price,
                "margin_pct": r.margin_pct,
                "similarity": similarity,
                "status": r.status
            })
        return formatted_results
    except Exception as e:
        # Fallback if pgvector is not initialized or fails: query by exact match of origin/destination
        fallback_results = db.query(FreightQuote).filter(
            FreightQuote.id != quote_id,
            FreightQuote.user_id == current_user.id,
            FreightQuote.cost_price > 0,
            (FreightQuote.origin == quote.origin) | (FreightQuote.destination == quote.destination)
        ).limit(3).all()
        
        return [{
            "id": r.id,
            "origin": r.origin,
            "destination": r.destination,
            "weight_lbs": r.weight_lbs,
            "winning_carrier": r.winning_carrier.name if r.winning_carrier else "N/A",
            "cost_price": r.cost_price,
            "sell_price": r.sell_price,
            "margin_pct": r.margin_pct,
            "similarity": 50.0,
            "status": r.status
        } for r in fallback_results]
