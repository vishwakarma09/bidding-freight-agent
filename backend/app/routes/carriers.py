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

@router.put("/{carrier_id}", response_model=CarrierResponse)
def update_carrier(carrier_id: int, carrier: CarrierCreate, db: Session = Depends(get_db)):
    db_carrier = db.query(Carrier).filter(Carrier.id == carrier_id).first()
    if not db_carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    db_carrier.name = carrier.name
    db_carrier.email = carrier.email
    db_carrier.competitiveness_score = carrier.competitiveness_score
    db.commit()
    db.refresh(db_carrier)
    return db_carrier

@router.delete("/{carrier_id}")
def delete_carrier(carrier_id: int, db: Session = Depends(get_db)):
    db_carrier = db.query(Carrier).filter(Carrier.id == carrier_id).first()
    if not db_carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    db.delete(db_carrier)
    db.commit()
    return {"detail": "Carrier deleted successfully"}
