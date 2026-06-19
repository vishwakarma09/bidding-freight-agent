import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
import logging
from ..models import FreightQuote, CarrierBid, StateTransition, Customer, Carrier
from ..config import settings
from .email_service import send_email
from .billing import generate_mock_invoice, generate_mock_bol

logger = logging.getLogger(__name__)

def record_transition(db: Session, quote_id: str, from_status: str, to_status: str, notes: str = None):
    """
    Saves a state transition record in the audit trail.
    """
    transition = StateTransition(
        freight_quote_id=quote_id,
        from_status=from_status,
        to_status=to_status,
        timestamp=datetime.datetime.utcnow(),
        notes=notes
    )
    db.add(transition)
    db.commit()
    logger.info(f"Transitioned {quote_id} from {from_status} to {to_status}. Notes: {notes}")


def transition_quote(db: Session, quote: FreightQuote, to_status: str, notes: str = None) -> FreightQuote:
    """
    Handles state transitions and triggers corresponding side effects.
    """
    from_status = quote.status
    if from_status == to_status:
        return quote

    quote.status = to_status
    quote.updated_at = datetime.datetime.utcnow()
    db.commit()

    record_transition(db, quote.id, from_status, to_status, notes)

    # Trigger actions based on new state
    if to_status == "OUT_TO_CARRIERS":
        # 1. Start the first round timer: 2 hours (or 1 minute in simulation fast-mode)
        # We store the timer. Let's make it 2 minutes for testing if fast-mode, or 2 hours.
        # We check if there's a header or query that sets simulation speed, but let's default to
        # 2 minutes for simulation, or 2 hours for standard.
        # Let's say if subject contains "[FAST]" or similar, or just default to 2 minutes for a swift demo experience,
        # otherwise 2 hours.
        is_fast = "[fast]" in (quote.origin.lower() or "") or True # Default to fast-mode for local dev responsiveness
        duration = datetime.timedelta(minutes=2) if is_fast else datetime.timedelta(hours=2)
        quote.first_round_ends_at = datetime.datetime.utcnow() + duration
        db.commit()

        # 2. Email all carriers belonging to this user
        carriers_query = db.query(Carrier)
        if quote.user_id:
            carriers_query = carriers_query.filter(Carrier.user_id == quote.user_id)
        carriers = carriers_query.all()
        for carrier in carriers:
            email_body = f"""
            <h3>Freight Bid Request - Quote {quote.id}</h3>
            <p>We require competitive bidding for the following shipment:</p>
            <ul>
                <li><b>Origin:</b> {quote.origin}</li>
                <li><b>Destination:</b> {quote.destination}</li>
                <li><b>Weight:</b> {quote.weight_lbs} lbs</li>
                <li><b>Class:</b> {quote.freight_class or "N/A"}</li>
                <li><b>Hazmat:</b> {'Yes' if quote.hazmat else 'No'}</li>
                <li><b>Pickup Date:</b> {quote.pickup_date.strftime('%Y-%m-%d')}</li>
                <li><b>Accessorials required:</b> {quote.accessorials or "None"}</li>
            </ul>
            <p>Please reply to this email with your rate (e.g. "$1,200") and transit days.</p>
            """
            send_email(
                to_email=carrier.email,
                subject=f"RFQ: Freight Quote {quote.id} - {quote.origin} to {quote.destination}",
                body_html=email_body
            )
            # Store RFQ in DB
            from ..models import RequestForQuote
            rfq = RequestForQuote(
                freight_quote_id=quote.id,
                carrier_id=carrier.id,
                supplier_id=carrier.id,
                status="SENT",
                sent_at=datetime.datetime.utcnow(),
                subject=f"RFQ: Freight Quote {quote.id} - {quote.origin} to {quote.destination}",
                body=email_body
            )
            db.add(rfq)
        db.commit()

    elif to_status == "RE_BID_ROUND":
        # 1. Identify the lowest rate from Round 1
        bids_r1 = db.query(CarrierBid).filter(
            CarrierBid.freight_quote_id == quote.id,
            CarrierBid.round == 1
        ).all()

        if not bids_r1:
            # If no bids received, transition straight to quoting with a default high price
            # or extend timer. Let's create a mock bid so the flow doesn't break
            mock_carrier_query = db.query(Carrier)
            if quote.user_id:
                mock_carrier_query = mock_carrier_query.filter(Carrier.user_id == quote.user_id)
            mock_carrier = mock_carrier_query.first()
            if mock_carrier:
                bid = CarrierBid(
                    freight_quote_id=quote.id,
                    carrier_id=mock_carrier.id,
                    round=1,
                    bid_amount=1500.0,
                    transit_time_days=4,
                    pickup_window="09:00 - 17:00",
                    accessorials_text="None",
                    service_level="Standard",
                    notes="Auto-generated due to no carrier responses.",
                    is_winning=False
                )
                db.add(bid)
                db.commit()
                bids_r1 = [bid]

        lowest_bid = min(bids_r1, key=lambda b: b.bid_amount)
        logger.info(f"Round 1 lowest bid for {quote.id} is ${lowest_bid.bid_amount} by carrier ID {lowest_bid.carrier_id}")

        # 2. Trigger Best and Final round (30 minutes or 30 seconds for demo)
        is_fast = True
        duration = datetime.timedelta(seconds=30) if is_fast else datetime.timedelta(minutes=30)
        quote.rebid_round_ends_at = datetime.datetime.utcnow() + duration
        db.commit()

        # 3. Notify other carriers belonging to this user
        carriers_query = db.query(Carrier)
        if quote.user_id:
            carriers_query = carriers_query.filter(Carrier.user_id == quote.user_id)
        carriers = carriers_query.all()
        for carrier in carriers:
            # Skip the carrier who is already the lowest
            if carrier.id == lowest_bid.carrier_id:
                # Notify them they are currently leading
                lead_body = f"""
                <h3>Bid Status Update - Quote {quote.id}</h3>
                <p>You are currently the lowest bidder at <b>${lowest_bid.bid_amount}</b>. We will lock final bids shortly.</p>
                """
                send_email(
                    to_email=carrier.email,
                    subject=f"Bid Leading: Quote {quote.id}",
                    body_html=lead_body
                )
                from ..models import RequestForQuote
                rfq = RequestForQuote(
                    freight_quote_id=quote.id,
                    carrier_id=carrier.id,
                    supplier_id=carrier.id,
                    status="LEADING_NOTIFIED",
                    sent_at=datetime.datetime.utcnow(),
                    subject=f"Bid Leading: Quote {quote.id}",
                    body=lead_body
                )
                db.add(rfq)
                continue

            rebid_body = f"""
            <h3>Bid Status Update - Quote {quote.id}</h3>
            <p>The current lowest bid for this lane is <b>${lowest_bid.bid_amount}</b>.</p>
            <p>If you can beat this rate, please reply to this email with your best and final offer within the next 30 minutes.</p>
            """
            send_email(
                to_email=carrier.email,
                subject=f"RE-BID: Quote {quote.id} - Current Low ${lowest_bid.bid_amount}",
                body_html=rebid_body
            )
            from ..models import RequestForQuote
            rfq = RequestForQuote(
                freight_quote_id=quote.id,
                carrier_id=carrier.id,
                supplier_id=carrier.id,
                status="RE_BID_SENT",
                sent_at=datetime.datetime.utcnow(),
                subject=f"RE-BID: Quote {quote.id} - Current Low ${lowest_bid.bid_amount}",
                body=rebid_body
            )
            db.add(rfq)
        db.commit()

    elif to_status == "QUOTE_SENT":
        # 1. Lock winning rate
        all_bids = db.query(CarrierBid).filter(CarrierBid.freight_quote_id == quote.id).all()
        if not all_bids:
            # Fallback
            quote.status = "LOST"
            quote.lost_reason = "No bids received from any carrier"
            db.commit()
            return quote

        winning_bid = min(all_bids, key=lambda b: b.bid_amount)
        winning_bid.is_winning = True
        quote.winning_carrier_id = winning_bid.carrier_id
        quote.cost_price = winning_bid.bid_amount

        # 2. Apply customer specific markup
        customer = db.query(Customer).filter(Customer.id == quote.customer_id).first()
        markup_pct = customer.default_markup_percent if customer else 10.0
        
        quote.markup_percent = markup_pct
        quote.sell_price = round(quote.cost_price * (1 + markup_pct / 100.0), 2)
        quote.margin_amt = round(quote.sell_price - quote.cost_price, 2)
        quote.margin_pct = round((quote.margin_amt / quote.sell_price) * 100.0, 2) if quote.sell_price > 0 else 0.0
        
        # 3. Set quote expiration (e.g. 24 hours)
        quote.quote_expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        db.commit()

        # 4. Email customer structured quote
        carrier_name = winning_bid.carrier.name if winning_bid.carrier else "Partner Carrier"
        customer_email = customer.email if customer else "customer@example.com"
        
        customer_body = f"""
        <h3>Freight Quote Proposal - Ref: {quote.id}</h3>
        <p>We are pleased to offer the following competitive freight rate:</p>
        <table border="1" cellpadding="8" style="border-collapse:collapse;">
            <tr><td><b>Route:</b></td><td>{quote.origin} to {quote.destination}</td></tr>
            <tr><td><b>Weight:</b></td><td>{quote.weight_lbs} lbs</td></tr>
            <tr><td><b>Transit Time:</b></td><td>{winning_bid.transit_time_days or 3} Days</td></tr>
            <tr><td><b>Service Level:</b></td><td>{winning_bid.service_level or 'Standard LTL'}</td></tr>
            <tr><td><b>Total Cost:</b></td><td><b>${quote.sell_price}</b> (includes all accessorials)</td></tr>
        </table>
        <p>This quote is valid for 24 hours. Please reply to this email with <b>"APPROVED"</b> to book, or <b>"REJECTED"</b> to decline.</p>
        """
        send_email(
            to_email=customer_email,
            subject=f"FREIGHT PROPOSAL: {quote.origin} to {quote.destination} - ${quote.sell_price} ({quote.id})",
            body_html=customer_body
        )
        
        # Transition automatically to AWAITING_APPROVAL
        quote.status = "AWAITING_APPROVAL"
        db.commit()
        record_transition(db, quote.id, "QUOTE_SENT", "AWAITING_APPROVAL", "Quote generated and sent to customer")

    elif to_status == "APPROVED":
        # 1. Notify winning carrier
        winning_carrier = db.query(Carrier).filter(Carrier.id == quote.winning_carrier_id).first()
        if winning_carrier:
            carrier_body = f"""
            <h3>Booking Confirmation - Ref: {quote.id}</h3>
            <p>Your bid of <b>${quote.cost_price}</b> has been selected. Please proceed with booking.</p>
            <p>Shipment details:</p>
            <ul>
                <li><b>Origin:</b> {quote.origin}</li>
                <li><b>Destination:</b> {quote.destination}</li>
                <li><b>Weight:</b> {quote.weight_lbs} lbs</li>
            </ul>
            <p>Please upload the BOL and schedule pickup.</p>
            """
            send_email(
                to_email=winning_carrier.email,
                subject=f"BOOKING CONFIRMED: Freight Quote {quote.id}",
                body_html=carrier_body
            )

        # 2. Get BOL and PandaDoc invoice
        bol_data = generate_mock_bol(quote.id, winning_carrier.name if winning_carrier else "Carrier")
        quote.bol_url = bol_data["bol_url"]

        cust = db.query(Customer).filter(Customer.id == quote.customer_id).first()
        invoice_data = generate_mock_invoice(quote.id, cust.name if cust else "Customer", quote.sell_price)
        quote.invoice_url = invoice_data["invoice_url"]
        
        quote.payment_status = "PENDING"
        db.commit()

        # Update to IN_TRANSIT
        quote.status = "IN_TRANSIT"
        db.commit()
        record_transition(db, quote.id, "APPROVED", "IN_TRANSIT", "Carrier notified, BOL generated, Invoice generated.")

    elif to_status == "LOST":
        # Quote was rejected or expired
        # Increment competitiveness score of the winner if applicable
        pass

    return quote


def check_pending_timers(db: Session):
    """
    Checks active timers (round 1, round 2, quote expiration) and progresses state machine.
    """
    now = datetime.datetime.utcnow()

    # 1. Check Round 1 (OUT_TO_CARRIERS -> FIRST_ROUND_RECEIVED -> RE_BID_ROUND)
    quotes_r1 = db.query(FreightQuote).filter(
        FreightQuote.status == "OUT_TO_CARRIERS",
        FreightQuote.first_round_ends_at <= now
    ).all()

    for q in quotes_r1:
        logger.info(f"Timer expired for Round 1 of quote {q.id}. Progressing to re-bid.")
        transition_quote(db, q, "FIRST_ROUND_RECEIVED", "Round 1 timer expired")
        transition_quote(db, q, "RE_BID_ROUND", "Triggering competitive re-bid round")

    # 2. Check Round 2 (RE_BID_ROUND -> QUOTE_SENT)
    quotes_r2 = db.query(FreightQuote).filter(
        FreightQuote.status == "RE_BID_ROUND",
        FreightQuote.rebid_round_ends_at <= now
    ).all()

    for q in quotes_r2:
        logger.info(f"Timer expired for Round 2 of quote {q.id}. Progressing to final quote formulation.")
        transition_quote(db, q, "QUOTE_SENT", "Round 2 timer expired, finalizing bids")

    # 3. Check Quote Expiration (AWAITING_APPROVAL -> LOST)
    expired_quotes = db.query(FreightQuote).filter(
        FreightQuote.status == "AWAITING_APPROVAL",
        FreightQuote.quote_expires_at <= now
    ).all()

    for q in expired_quotes:
        logger.info(f"Quote proposal {q.id} has expired without approval. Marking as LOST.")
        q.lost_reason = "Quote Expired"
        transition_quote(db, q, "LOST", "Proposal validation window expired")
