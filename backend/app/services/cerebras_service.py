import json
import logging
import re
import httpx
from ..config import settings

logger = logging.getLogger(__name__)

def call_cerebras_chat(messages: list, temperature: float = 0.2) -> str:
    """
    Calls Cerebras chat completions API using httpx.
    """
    if not settings.CEREBRAS_API_KEY or settings.CEREBRAS_API_KEY == "YOUR_CEREBRAS_API_KEY":
        raise ValueError("Cerebras API key is not configured.")

    url = "https://api.cerebras.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.CEREBRAS_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # We use llama3.1-70b as the standard performant parsing model on Cerebras
    data = {
        "model": "llama3.1-70b",
        "messages": messages,
        "temperature": temperature
    }

    with httpx.Client(timeout=15.0) as client:
        response = client.post(url, headers=headers, json=data)
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
        else:
            raise ValueError(f"Cerebras API returned status {response.status_code}: {response.text}")


def parse_customer_email(subject: str, body: str, sender_email: str) -> dict:
    """
    Parses a customer freight inquiry email into structured shipment parameters.
    """
    combined_text = f"Subject: {subject}\nSender: {sender_email}\nBody:\n{body}"
    
    prompt = (
        "You are an expert freight logistics assistant. Your job is to extract structured shipment parameters "
        "from the following customer email. Identify the origin city/state, destination city/state, weight in lbs, "
        "dimensions, freight class, hazmat flag, requested accessorials (like liftgate, residential delivery, inside pickup, etc.), "
        "and the estimated/required pickup date.\n\n"
        f"Email Content:\n{combined_text}\n\n"
        "Return the result ONLY as a raw JSON object with the following schema, containing no extra text or markdown formatting:\n"
        "{\n"
        "  \"customer_name_guess\": \"string or null\",\n"
        "  \"origin\": \"City, State (e.g. Los Angeles, CA)\",\n"
        "  \"destination\": \"City, State (e.g. Chicago, IL)\",\n"
        "  \"weight_lbs\": float_number,\n"
        "  \"dimensions\": \"string (e.g. 48x48x50) or null\",\n"
        "  \"freight_class\": \"string (e.g. 70) or null\",\n"
        "  \"hazmat\": boolean_flag,\n"
        "  \"accessorials\": [\"list\", \"of\", \"strings\"],\n"
        "  \"pickup_date\": \"YYYY-MM-DD (estimate based on text, or null)\"\n"
        "}"
    )

    messages = [
        {"role": "system", "content": "You are a precise data extraction bot. Output only raw JSON."},
        {"role": "user", "content": prompt}
    ]

    try:
        content = call_cerebras_chat(messages, temperature=0.1)
        # Clean markdown wrappers if any
        if content.startswith("```"):
            parts = content.split("```")
            if len(parts) > 1:
                content = parts[1]
                if content.startswith("json"):
                    content = content[4:]
        content = content.strip("` \n")
        return json.loads(content)
    except Exception as e:
        logger.warning(f"Cerebras parsing failed: {e}. Running regex-based fallback...")
        return run_customer_regex_fallback(subject, body)


def parse_carrier_bid_email(body: str) -> dict:
    """
    Parses a carrier bid response email into structured bid details.
    """
    prompt = (
        "You are a logistics coordinator. Extract the carrier bid details from the following email reply. "
        "Find the total bid amount (cost), estimated transit time in days, pickup window/schedule details, "
        "service level (e.g. Standard LTL, Guaranteed, Expedited), and any accessorials included or extra notes.\n\n"
        f"Email Reply:\n{body}\n\n"
        "Return the result ONLY as a raw JSON object with the following schema, containing no extra text or markdown formatting:\n"
        "{\n"
        "  \"bid_amount\": float_number,\n"
        "  \"transit_time_days\": integer_number_or_null,\n"
        "  \"pickup_window\": \"string or null\",\n"
        "  \"accessorials_text\": \"string or null\",\n"
        "  \"service_level\": \"string or null (e.g. Standard LTL, Guaranteed)\",\n"
        "  \"notes\": \"string or null\"\n"
        "}"
    )

    messages = [
        {"role": "system", "content": "You are a precise data extraction bot. Output only raw JSON."},
        {"role": "user", "content": prompt}
    ]

    try:
        content = call_cerebras_chat(messages, temperature=0.1)
        if content.startswith("```"):
            parts = content.split("```")
            if len(parts) > 1:
                content = parts[1]
                if content.startswith("json"):
                    content = content[4:]
        content = content.strip("` \n")
        return json.loads(content)
    except Exception as e:
        logger.warning(f"Cerebras bid parsing failed: {e}. Running regex-based fallback...")
        return run_carrier_regex_fallback(body)


def run_customer_regex_fallback(subject: str, body: str) -> dict:
    """
    A robust regex parsing fallback for customer requests.
    """
    text = f"{subject} {body}".lower()
    
    # Try from...to... pattern first
    from_to_match = re.search(r'from\s+([a-zA-Z\s,]+?)\s+to\s+([a-zA-Z\s,]+?)(?:\.|\n|class|weight|\d|$)', text)
    if from_to_match:
        origin = from_to_match.group(1).strip().title()
        destination = from_to_match.group(2).strip().title()
    else:
        # Origin extraction
        origin = "Los Angeles, CA" # default fallback
        origin_matches = re.findall(r'(?:origin|from):\s*([a-zA-Z\s,]+(?:\b[a-zA-Z]{2}\b)?)', text)
        if origin_matches:
            origin = origin_matches[0].strip().title()
        else:
            # Search for common city patterns, e.g. "los angeles" or "dallas"
            for city in ["los angeles", "new york", "chicago", "dallas", "miami", "atlanta", "seattle"]:
                if city in text:
                    origin = f"{city.title()}, USA"
                    break

        # Destination extraction
        destination = "Chicago, IL" # default fallback
        dest_matches = re.findall(r'(?:destination|to):\s*([a-zA-Z\s,]+(?:\b[a-zA-Z]{2}\b)?)', text)
        if dest_matches:
            destination = dest_matches[0].strip().title()
        else:
            for city in ["chicago", "dallas", "new york", "houston", "phoenix", "philadelphia", "seattle"]:
                if city in text and city.title() not in origin:
                    destination = f"{city.title()}, USA"
                    break

    # Weight extraction
    weight = 1500.0
    weight_match = re.search(r'(\d{2,6})\s*(?:lbs|lb|weight|pounds|kg)', text)
    if weight_match:
        weight = float(weight_match.group(1))

    # Freight Class
    freight_class = "70"
    class_match = re.search(r'(?:class|freight class)\s*#?\s*(\d{2,3})', text)
    if class_match:
        freight_class = class_match.group(1)

    # Hazmat flag
    hazmat = "hazmat" in text or "hazardous" in text or "class 9" in text

    # Accessorials
    accessorials = []
    for acc in ["liftgate", "residential", "inside delivery", "inside pickup", "appointment"]:
        if acc in text:
            accessorials.append(acc.title())

    # Pickup Date
    pickup_date = None
    # Look for dates like 2026-06-25 or 06/25/2026
    date_match = re.search(r'(\d{4}[-/]\d{2}[-/]\d{2})', text)
    if date_match:
        pickup_date = date_match.group(1)
    else:
        date_match_alt = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4})', text)
        if date_match_alt:
            parts = re.split(r'[-/]', date_match_alt.group(1))
            pickup_date = f"{parts[2]}-{parts[0]}-{parts[1]}"
            
    if not pickup_date:
        # Defaults to 3 days from now
        import datetime
        pickup_date = (datetime.date.today() + datetime.timedelta(days=3)).isoformat()

    return {
        "customer_name_guess": "Dispatch Customer",
        "origin": origin,
        "destination": destination,
        "weight_lbs": weight,
        "dimensions": "48x48x48",
        "freight_class": freight_class,
        "hazmat": hazmat,
        "accessorials": accessorials,
        "pickup_date": pickup_date
    }


def run_carrier_regex_fallback(body: str) -> dict:
    """
    A robust regex parsing fallback for carrier bids.
    """
    text = body.lower()
    
    # Bid amount (cost) extraction: look for dollar values
    bid_amount = 1000.0
    money_matches = re.findall(r'\$\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)', text)
    if money_matches:
        bid_amount = float(money_matches[0].replace(',', ''))
    else:
        # Fallback search for a standalone number like "quote: 850" or "price is 900"
        num_matches = re.findall(r'(?:quote|price|rate|cost|for|is)\s*:?\s*(\d{3,4})', text)
        if num_matches:
            bid_amount = float(num_matches[0])
            
    # Transit time
    transit_time_days = 3
    transit_matches = re.search(r'(\d+)\s*(?:day|days|transit|business days)', text)
    if transit_matches:
        transit_time_days = int(transit_matches.group(1))

    # Accessorials
    accessorials_text = "Standard accessorials"
    if "liftgate" in text:
        accessorials_text = "Liftgate included"

    # Service level
    service_level = "Standard LTL"
    if "expedited" in text or "guaranteed" in text:
        service_level = "Guaranteed LTL"

    return {
        "bid_amount": bid_amount,
        "transit_time_days": transit_time_days,
        "pickup_window": "09:00 AM - 05:00 PM",
        "accessorials_text": accessorials_text,
        "service_level": service_level,
        "notes": "Extracted via regex fallback."
    }
