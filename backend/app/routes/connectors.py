from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Connector
from ..schemas import ConnectorCreate, ConnectorResponse

router = APIRouter(prefix="/connectors", tags=["Connectors"])

@router.get("", response_model=List[ConnectorResponse])
def get_connectors(db: Session = Depends(get_db)):
    return db.query(Connector).all()

@router.get("/{connector_id}", response_model=ConnectorResponse)
def get_connector(connector_id: int, db: Session = Depends(get_db)):
    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    return connector

@router.post("", response_model=ConnectorResponse)
def create_connector(connector: ConnectorCreate, db: Session = Depends(get_db)):
    db_connector = Connector(
        name=connector.name,
        company_name=connector.company_name,
        contact_email=connector.contact_email,
        contact_phone=connector.contact_phone,
        contact_name=connector.contact_name,
        contact_role=connector.contact_role,
        channel=connector.channel,
        filtering_keywords=connector.filtering_keywords,
        status=connector.status
    )
    db.add(db_connector)
    db.commit()
    db.refresh(db_connector)
    return db_connector

@router.put("/{connector_id}", response_model=ConnectorResponse)
def update_connector(connector_id: int, connector: ConnectorCreate, db: Session = Depends(get_db)):
    db_connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not db_connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    db_connector.name = connector.name
    db_connector.company_name = connector.company_name
    db_connector.contact_email = connector.contact_email
    db_connector.contact_phone = connector.contact_phone
    db_connector.contact_name = connector.contact_name
    db_connector.contact_role = connector.contact_role
    db_connector.channel = connector.channel
    db_connector.filtering_keywords = connector.filtering_keywords
    db_connector.status = connector.status
    
    db.commit()
    db.refresh(db_connector)
    return db_connector

@router.delete("/{connector_id}")
def delete_connector(connector_id: int, db: Session = Depends(get_db)):
    db_connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not db_connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    db.delete(db_connector)
    db.commit()
    return {"message": "Connector deleted successfully"}
