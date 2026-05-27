from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import UploadFile, File, Form
from torch import mode
from ai.llm import generate_rag_response
import shutil
import os

from ai.rag import (
    extract_text_from_pdf,
    clean_text,
    generate_embeddings,
    create_faiss_index,
    search_similar_chunks
)

from ai.chunking.basic_chunker import basic_chunking
from ai.chunking.medium_chunker import medium_chunking
from ai.chunking.high_chunker import high_chunking
# =========================
# FASTAPI APP
# =========================

app = FastAPI()

# =========================
# TEMP RAG STORAGE
# =========================

stored_chunks = []

stored_index = None
# =========================
# STATIC FILES
# =========================

app.mount("/static", StaticFiles(directory="static"), name="static")

# =========================
# TEMPLATES
# =========================

templates = Jinja2Templates(directory="templates")

# =========================
# HOME PAGE
# =========================

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )

# =========================
# STUDY PAGE
# =========================

@app.get("/study", response_class=HTMLResponse)
async def study(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="study.html"
    )

# =========================
# RESUME PAGE
# =========================

@app.get("/resume", response_class=HTMLResponse)
async def resume(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="resume.html"
    )

# =========================
# NOTES PAGE
# =========================

@app.get("/notes", response_class=HTMLResponse)
async def notes(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="notes.html"
    )

# =========================
# STUDY PDF UPLOAD
# =========================

@app.post("/upload-study-pdf")
async def upload_study_pdf(
    file: UploadFile = File(...),
    mode: str = Form("basic")
):

    upload_path = f"uploads/{file.filename}"

    # Save PDF

    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract text

    extracted_text = extract_text_from_pdf(upload_path)

    # =========================
    # BASIC MODE
    # =========================

    if mode == "basic":

        cleaned_text = clean_text(extracted_text)

        chunks = basic_chunking(cleaned_text)

        preview = cleaned_text[:1000]
        strategy = "Fixed-size chunking"
    # =========================
    # MEDIUM MODE
    # =========================

    elif mode == "medium":

        cleaned_text = clean_text(extracted_text)

        chunks = medium_chunking(cleaned_text)

        preview = cleaned_text[:1000]
        strategy = "Cleaned overlap chunking"
    
    # =========================
    # HIGH MODE
    # =========================

    elif mode == "high":

        cleaned_text = clean_text(extracted_text)

        chunks = high_chunking(
            cleaned_text,
            document_name=file.filename
        )

        preview = chunks[0]["content"][:1000] if chunks else ""

        strategy = "Heading-aware semantic chunking"

    # =========================
    # INVALID MODE FALLBACK
    # =========================

    else:

        return {
            "error": "Invalid retrieval mode selected"
        }
    
    # =========================
    # PREPARE TEXT FOR EMBEDDINGS
    # =========================

    if mode == "high":

        embedding_texts = [

            chunk["content"]

            for chunk in chunks
        ]

    else:

        embedding_texts = chunks

    # =========================
    # GENERATE EMBEDDINGS
    # =========================

    embeddings = generate_embeddings(
        embedding_texts
    )


    # Create FAISS index

    index = create_faiss_index(embeddings)

    # Store globally

    global stored_chunks
    global stored_index

    stored_chunks = chunks
    stored_index = index

    # Response

    return {

        "message": "PDF processed successfully",

        "filename": file.filename,

        "chunk_count": len(chunks),

        "preview": preview,

        "mode": mode,

        "strategy": strategy,

        "embedding_dimension": len(embeddings[0]),
    }

# =========================
# ASK QUESTIONS
# =========================

@app.post("/ask-question")

async def ask_question(request: Request):

    data = await request.json()

    question = data.get("question")

    # =========================
    # RETRIEVE RELEVANT CHUNKS
    # =========================

    retrieved_chunks = search_similar_chunks(
        query=question,
        chunks=stored_chunks,
        index=stored_index
    )

    # =========================
    # MERGE CONTEXT
    # =========================

    context_parts = []

    for chunk in retrieved_chunks:

    # High Mode / Metadata Chunk

        if chunk["section"]:

            formatted_chunk = f"""

    SECTION:
    {chunk['section']}

    CONTENT:
    {chunk['content']}

    """

    # Basic / Medium Chunk

        else:

            formatted_chunk = chunk["content"]

        context_parts.append(formatted_chunk)

    # Final merged context

    context = "\n\n".join(context_parts)

    

    # =========================
    # GENERATE FINAL RESPONSE
    # =========================

    final_answer = generate_rag_response(
        question,
        context
    )

    # =========================
    # SOURCE CITATIONS
    # =========================

    sources = []

    for chunk in retrieved_chunks:

        if chunk["section"]:

            sources.append({

                "document": chunk["document"],

                "section": chunk["section"]

            })

    # Remove duplicates

    unique_sources = []

    seen = set()

    for source in sources:

        key = (
            source["document"],
            source["section"]
        )

        if key not in seen:

            seen.add(key)

            unique_sources.append(source)

    # =========================
    # FINAL RESPONSE
    # =========================

    return {

        "answer": final_answer,

        "sources": unique_sources

    }

# =========================
# RESUME PDF UPLOAD
# =========================

@app.post("/upload-resume-pdf")
async def upload_resume_pdf(file: UploadFile = File(...)):

    upload_path = f"uploads/{file.filename}"

    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {

        "message": "Resume uploaded successfully",

        "filename": file.filename

    }
