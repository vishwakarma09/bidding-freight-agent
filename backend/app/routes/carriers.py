from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Carrier
from ..schemas import CarrierCreate, CarrierResponse

router = APIRouter(prefix="/carriers", tags=["Carriers"])

@router.get("", response_model=List[CarrierResponse])
def get_carriers(db: Session = Depends(get_db)):
    return db.query(Carrier).all()

@router.post("", response_model=CarrierResponse)
def create_carrier(carrier: CarrierCreate, db: Session = Depends(get_db)):
    db_carrier = Carrier(
        name=carrier.name,
        email=carrier.email,
        competitiveness_score=carrier.competitiveness_score
    )
    db.add(db_carrier)
    db.commit()
    db.refresh(db_carrier)
    return db_carrier
