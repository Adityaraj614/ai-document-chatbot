from pypdf import PdfReader
import re
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
# =========================
# EMBEDDING MODEL
# =========================

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2",
    device="cuda"
)
# =========================
# EXTRACT TEXT FROM PDF
# =========================

def extract_text_from_pdf(pdf_path):

    reader = PdfReader(pdf_path)

    extracted_text = ""

    for page in reader.pages:

        text = page.extract_text()

        if text:
            extracted_text += text + "\n"

    return extracted_text


# =========================
# CLEAN TEXT
# =========================

def clean_text(text):

    # Remove newlines

    text = text.replace("\n", " ")

    # Remove excessive spaces

    text = " ".join(text.split())

    # Fix broken spacing

    text = re.sub(r'(\w)\s(?=\w\s)', r'\1', text)

    return text


# =========================
# BASIC CHUNKING
# =========================

def basic_chunking(text, chunk_size=500):

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end]

        chunks.append(chunk)

        start += chunk_size

    return chunks


# =========================
# MEDIUM CHUNKING
# CLEAN + OVERLAP
# =========================

def medium_chunking(text, chunk_size=500, overlap=100):

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end]

        chunks.append(chunk)

        start += chunk_size - overlap

    return chunks


# =========================
# DETECT HEADINGS
# =========================

def detect_headings(text):

    lines = text.split(".")

    headings = []

    for line in lines:

        line = line.strip()

        if len(line) < 60 and len(line.split()) <= 8:

            headings.append(line)

    return headings


# =========================
# HIGH CHUNKING
# METADATA-AWARE
# =========================

def high_chunking(text, chunk_size=500, overlap=100):

    chunks = []

    headings = detect_headings(text)

    current_heading = "General Section"

    start = 0

    heading_index = 0

    while start < len(text):

        end = start + chunk_size

        chunk_content = text[start:end]

        # Assign heading progressively

        if heading_index < len(headings):

            current_heading = headings[heading_index]

            heading_index += 1

        chunk = f"""

Document Section:
{current_heading}

Content:
{chunk_content}

"""

        chunks.append(chunk)

        start += chunk_size - overlap

    return chunks

# =========================
# GENERATE EMBEDDINGS
# =========================

def generate_embeddings(chunks):

    embeddings = embedding_model.encode(chunks)

    return embeddings
# =========================
# CREATE FAISS INDEX
# =========================

def create_faiss_index(embeddings):

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatL2(dimension)

    index.add(
        np.array(embeddings).astype("float32")
    )

    return index

# =========================
# SEARCH SIMILAR CHUNKS
# =========================

def search_similar_chunks(
    query,
    chunks,
    index,
    top_k=3
):

    # Convert query into embedding

    query_embedding = embedding_model.encode([query])

    # Search nearest vectors

    distances, indices = index.search(
        np.array(query_embedding).astype("float32"),
        top_k
    )

    # Retrieve chunks

    retrieved_chunks = []

    for idx in indices[0]:

        retrieved_chunks.append(chunks[idx])

    return retrieved_chunks