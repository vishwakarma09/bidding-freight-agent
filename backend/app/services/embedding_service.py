import hashlib
import re

def get_embedding(text: str) -> list[float]:
    """
    Generates a deterministic 1536-dimensional unit vector (embedding) 
    for the given text using a local hash-based bag-of-words representation.
    This enables full semantic-like RAG vector search via pgvector 
    without needing external embedding APIs.
    """
    vector = [0.0] * 1536
    if not text:
        return vector

    # Normalize text: lowercase and split into word tokens
    clean_text = text.lower().strip()
    words = re.findall(r'[a-z0-9]+', clean_text)
    
    if not words:
        # Fallback if text consists only of special characters
        words = [clean_text]

    for word in words:
        # Deterministically hash each word to an index in [0, 1535]
        sha256 = hashlib.sha256(word.encode("utf-8")).digest()
        index = int.from_bytes(sha256, "big") % 1536
        vector[index] += 1.0

    # Normalize to a unit vector (so cosine distance behaves correctly)
    magnitude = sum(x*x for x in vector) ** 0.5
    if magnitude > 0:
        vector = [x / magnitude for x in vector]

    return vector
