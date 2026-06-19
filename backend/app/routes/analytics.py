from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, select, and_
from typing import List, Dict, Any
import datetime
from ..database import get_db
from ..models import FreightQuote, Customer, Carrier, CarrierBid, StateTransition, User
from .auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("")
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes key performance metrics for the freight pipeline.
    """
    # 1. Total Quotes count by status
    status_counts = db.query(FreightQuote.status, func.count(FreightQuote.id)).filter(
        FreightQuote.user_id == current_user.id
    ).group_by(FreightQuote.status).all()
    status_counts_dict = {status: count for status, count in status_counts}

    # 2. Financial Metrics (Approved / In Transit / Completed)
    financial_states = ["APPROVED", "IN_TRANSIT", "COMPLETED"]
    finance_summary = db.query(
        func.sum(FreightQuote.sell_price).label("receivables"),
        func.sum(FreightQuote.cost_price).label("payables"),
        func.sum(FreightQuote.margin_amt).label("margin_amt"),
        func.avg(FreightQuote.margin_pct).label("avg_margin_pct")
    ).filter(
        FreightQuote.status.in_(financial_states),
        FreightQuote.user_id == current_user.id
    ).first()

    total_receivables = round(float(finance_summary.receivables or 0.0), 2)
    total_payables = round(float(finance_summary.payables or 0.0), 2)
    total_margin = round(float(finance_summary.margin_amt or 0.0), 2)
    avg_margin_pct = round(float(finance_summary.avg_margin_pct or 0.0), 2)

    # 3. Quote to Approval Conversion %
    total_proposals = db.query(func.count(FreightQuote.id)).filter(
        FreightQuote.status.in_(["AWAITING_APPROVAL", "APPROVED", "IN_TRANSIT", "COMPLETED", "LOST"]),
        FreightQuote.user_id == current_user.id
    ).scalar() or 0
    
    total_approved = db.query(func.count(FreightQuote.id)).filter(
        FreightQuote.status.in_(financial_states),
        FreightQuote.user_id == current_user.id
    ).scalar() or 0
    
    conversion_pct = round((total_approved / total_proposals * 100.0), 2) if total_proposals > 0 else 0.0

    # 4. Average Response / Turnaround Time (Intake to Customer Quote Sent)
    transitions = db.query(StateTransition).join(FreightQuote).filter(
        StateTransition.to_status == "AWAITING_APPROVAL",
        FreightQuote.user_id == current_user.id
    ).all()
    
    durations = []
    for t in transitions:
        intake_t = db.query(StateTransition).filter(
            StateTransition.freight_quote_id == t.freight_quote_id,
            StateTransition.to_status == "OUT_TO_CARRIERS"
        ).first()
        if intake_t:
            delta = t.timestamp - intake_t.timestamp
            durations.append(delta.total_seconds())

    avg_turnaround_seconds = sum(durations) / len(durations) if durations else 0.0
    avg_turnaround_str = "N/A"
    if avg_turnaround_seconds > 0:
        minutes = int(avg_turnaround_seconds // 60)
        seconds = int(avg_turnaround_seconds % 60)
        avg_turnaround_str = f"{minutes}m {seconds}s"

    # 5. Win Rate & Competitiveness by Carrier
    carriers = db.query(Carrier).filter(Carrier.user_id == current_user.id).all()
    carrier_stats = []
    for carrier in carriers:
        total_bids = db.query(func.count(CarrierBid.id)).filter(
            CarrierBid.carrier_id == carrier.id
        ).scalar() or 0

        wins = db.query(func.count(FreightQuote.id)).filter(
            FreightQuote.winning_carrier_id == carrier.id,
            FreightQuote.status.in_(financial_states),
            FreightQuote.user_id == current_user.id
        ).scalar() or 0

        win_rate_pct = round((wins / total_bids * 100.0), 2) if total_bids > 0 else 0.0

        if carrier.is_override:
            carrier.competitiveness_score = carrier.simulated_score
            effective_win_rate = carrier.simulated_score * 10.0
        else:
            carrier.competitiveness_score = round(win_rate_pct / 10.0, 1)
            effective_win_rate = win_rate_pct
            
        db.commit()

        avg_bid = db.query(func.avg(CarrierBid.bid_amount)).filter(
            CarrierBid.carrier_id == carrier.id
        ).scalar() or 0.0

        carrier_stats.append({
            "id": carrier.id,
            "name": carrier.name,
            "email": carrier.email,
            "total_bids": total_bids,
            "wins": wins,
            "win_rate_pct": effective_win_rate,
            "avg_bid": round(float(avg_bid), 2)
        })

    # 6. Win Rate by Customer
    customers = db.query(Customer).filter(Customer.user_id == current_user.id).all()
    customer_stats = []
    for customer in customers:
        total_quotes = db.query(func.count(FreightQuote.id)).filter(
            FreightQuote.customer_id == customer.id,
            FreightQuote.user_id == current_user.id
        ).scalar() or 0

        wins = db.query(func.count(FreightQuote.id)).filter(
            FreightQuote.customer_id == customer.id,
            FreightQuote.status.in_(financial_states),
            FreightQuote.user_id == current_user.id
        ).scalar() or 0

        conv_pct = round((wins / total_quotes * 100.0), 2) if total_quotes > 0 else 0.0

        customer_stats.append({
            "id": customer.id,
            "name": customer.name,
            "total_quotes": total_quotes,
            "approved_quotes": wins,
            "conversion_pct": conv_pct
        })

    # 7. Pipeline stage distributions (for charts)
    pipeline_stages = {
        "INTAKE": status_counts_dict.get("INTAKE", 0),
        "OUT_TO_CARRIERS": status_counts_dict.get("OUT_TO_CARRIERS", 0),
        "FIRST_ROUND_RECEIVED": status_counts_dict.get("FIRST_ROUND_RECEIVED", 0),
        "RE_BID_ROUND": status_counts_dict.get("RE_BID_ROUND", 0),
        "QUOTE_SENT": status_counts_dict.get("QUOTE_SENT", 0),
        "AWAITING_APPROVAL": status_counts_dict.get("AWAITING_APPROVAL", 0),
        "APPROVED": status_counts_dict.get("APPROVED", 0),
        "IN_TRANSIT": status_counts_dict.get("IN_TRANSIT", 0),
        "COMPLETED": status_counts_dict.get("COMPLETED", 0),
        "LOST": status_counts_dict.get("LOST", 0)
    }

    return {
        "pipeline_stages": pipeline_stages,
        "receivables": total_receivables,
        "payables": total_payables,
        "gross_margin_value": total_margin,
        "average_margin_percent": avg_margin_pct,
        "quote_to_approval_conversion_pct": conversion_pct,
        "average_turnaround_time": avg_turnaround_str,
        "carrier_stats": carrier_stats,
        "customer_stats": customer_stats
    }
