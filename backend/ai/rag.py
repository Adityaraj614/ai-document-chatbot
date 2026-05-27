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

    # Normalize line endings

    text = text.replace("\r", "\n")

    # Preserve paragraph breaks

    text = re.sub(r'\n\s*\n', '\n\n', text)

    # Clean spaces inside lines

    lines = text.split("\n")

    cleaned_lines = []

    for line in lines:

        # Remove excessive spaces
        line = " ".join(line.split())

        cleaned_lines.append(line)

    # Rebuild text with preserved paragraphs

    cleaned_text = "\n".join(cleaned_lines)

    return cleaned_text


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
# Metadata-aware retrieval
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

    retrieved_chunks = []

    for idx in indices[0]:

        chunk = chunks[idx]

        # High mode metadata chunk

        if isinstance(chunk, dict):

            retrieved_chunks.append({

                "chunk_id": chunk["chunk_id"],

                "document": chunk["document"],

                "section": chunk["section"],

                "content": chunk["content"]

            })

        # Basic / Medium text chunk

        else:

            retrieved_chunks.append({

                "chunk_id": None,

                "document": None,

                "section": None,

                "content": chunk

            })

    return retrieved_chunks