from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Carrier, User
from ..schemas import CarrierCreate, CarrierResponse
from .auth import get_current_user

from sqlalchemy import func
from ..models import CarrierBid, FreightQuote

def get_carrier_calculated_score(db: Session, carrier_id: int) -> float:
    # Calculate competitiveness score based on win rate percentage clamped to [0.0, 10.0]
    total_bids = db.query(func.count(CarrierBid.id)).filter(
        CarrierBid.carrier_id == carrier_id
    ).scalar() or 0
    wins = db.query(func.count(FreightQuote.id)).filter(
        FreightQuote.winning_carrier_id == carrier_id
    ).scalar() or 0
    win_rate_pct = round((wins / total_bids * 100.0), 2) if total_bids > 0 else 0.0
    return round(win_rate_pct / 10.0, 1)

def populate_carrier_scores(db: Session, carrier: Carrier):
    carrier.calculated_competitiveness_score = get_carrier_calculated_score(db, carrier.id)
    carrier.competitiveness_score = carrier.simulated_score if carrier.is_override else carrier.calculated_competitiveness_score
    return carrier

router = APIRouter(prefix="/carriers", tags=["Carriers"])

@router.get("", response_model=List[CarrierResponse])
def get_carriers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    carriers = db.query(Carrier).filter(Carrier.user_id == current_user.id).all()
    for c in carriers:
        populate_carrier_scores(db, c)
    return carriers

@router.post("", response_model=CarrierResponse)
def create_carrier(
    carrier: CarrierCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if this carrier email is already registered for this user
    existing = db.query(Carrier).filter(
        Carrier.email == carrier.email,
        Carrier.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Carrier email already registered for this user")
        
    db_carrier = Carrier(
        name=carrier.name,
        email=carrier.email,
        user_id=current_user.id,
        competitiveness_score=carrier.competitiveness_score,
        is_override=carrier.is_override,
        simulated_score=carrier.simulated_score
    )
    db.add(db_carrier)
    db.commit()
    db.refresh(db_carrier)
    return populate_carrier_scores(db, db_carrier)

@router.put("/{carrier_id}", response_model=CarrierResponse)
def update_carrier(
    carrier_id: int,
    carrier: CarrierCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_carrier = db.query(Carrier).filter(
        Carrier.id == carrier_id,
        Carrier.user_id == current_user.id
    ).first()
    if not db_carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
        
    db_carrier.name = carrier.name
    db_carrier.email = carrier.email
    db_carrier.is_override = carrier.is_override
    db_carrier.simulated_score = carrier.simulated_score
    db_carrier.competitiveness_score = carrier.simulated_score if carrier.is_override else get_carrier_calculated_score(db, carrier_id)
    db.commit()
    db.refresh(db_carrier)
    return populate_carrier_scores(db, db_carrier)

@router.delete("/{carrier_id}")
def delete_carrier(
    carrier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_carrier = db.query(Carrier).filter(
        Carrier.id == carrier_id,
        Carrier.user_id == current_user.id
    ).first()
    if not db_carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    db.delete(db_carrier)
    db.commit()
    return {"detail": "Carrier deleted successfully"}
