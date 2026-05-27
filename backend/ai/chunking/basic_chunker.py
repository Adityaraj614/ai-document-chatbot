# =========================
# BASIC CHUNKING
# Fixed-size baseline chunking
# =========================

def basic_chunking(
    text,
    chunk_size=500
):

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end]

        chunks.append(chunk)

        start += chunk_size

    return chunks