from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Customer, User
from ..schemas import CustomerCreate, CustomerResponse
from .auth import get_current_user

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def get_customers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Customer).filter(Customer.user_id == current_user.id).all()

@router.post("", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_customer = Customer(
        name=customer.name,
        email=customer.email,
        user_id=current_user.id,
        default_markup_percent=customer.default_markup_percent
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer
