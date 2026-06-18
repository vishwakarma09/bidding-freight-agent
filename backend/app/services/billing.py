import uuid
import logging

logger = logging.getLogger(__name__)

def generate_mock_invoice(quote_id: str, customer_name: str, amount: float) -> dict:
    """
    Simulates calling PandaDoc API to create a draft invoice for the customer.
    """
    invoice_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    logger.info(f"PandaDoc draft invoice created: {invoice_id} for {customer_name} of amount ${amount}")
    return {
        "invoice_id": invoice_id,
        "invoice_url": f"https://pandadoc.mock/invoices/{invoice_id}",
        "status": "DRAFT"
    }

def generate_mock_bol(quote_id: str, carrier_name: str) -> dict:
    """
    Simulates receiving a Bill of Lading (BOL) from the winning carrier.
    """
    bol_id = f"BOL-{uuid.uuid4().hex[:8].upper()}"
    logger.info(f"BOL received from carrier {carrier_name}: {bol_id}")
    return {
        "bol_id": bol_id,
        "bol_url": f"https://carrier.mock/bol/{bol_id}",
        "status": "ISSUED"
    }
