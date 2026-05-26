from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import UploadFile, File
from ai.llm import generate_rag_response
import shutil
import os

from ai.rag import (
    extract_text_from_pdf,
    clean_text,
    basic_chunking,
    medium_chunking,
    high_chunking,
    generate_embeddings,
    create_faiss_index,
    search_similar_chunks
)
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
    mode: str = "basic"
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

        chunks = basic_chunking(extracted_text)

        preview = extracted_text[:1000]
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

    else:

        cleaned_text = clean_text(extracted_text)

        chunks = high_chunking(cleaned_text)

        preview = chunks[0] if chunks else ""
        strategy = "Metadata-aware hybrid chunking"
    
    
    # =========================
        # GENERATE EMBEDDINGS
    # =========================

    embeddings = generate_embeddings(chunks)

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

    context = "\n\n".join(retrieved_chunks)

    # =========================
    # GENERATE FINAL RESPONSE
    # =========================

    final_answer = generate_rag_response(
        question,
        context
    )

    # =========================
    # RETURN RESPONSE
    # =========================

    return {

        "question": question,

        "context": context,

        "answer": final_answer

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
