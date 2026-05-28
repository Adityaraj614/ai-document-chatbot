from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import UploadFile, File, Form

from ai.llm import (
    generate_rag_response,
    generate_summary,
    generate_exam_notes,
    generate_beginner_mode
)
import shutil
import os
import json

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
# STATIC FILES
# =========================

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

# =========================
# TEMP RAG STORAGE
# =========================

stored_chunks = []

stored_index = None

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

        if isinstance(chunk, dict) and chunk.get("section"):

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

        if isinstance(chunk, dict) and chunk.get("section"):

            sources.append({

                "document": chunk["document"],

                "section": chunk["section"],

                "chunk": chunk.get("subsection"),

                "preview": chunk.get("content", "")[:500]

            })

    # Remove duplicates

    unique_sources = []

    seen = set()

    for source in sources:

        key = (
            source["document"],
            source["section"],
            source.get("chunk")
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
# GENERATE SUMMARY
# =========================

@app.post("/generate-summary")

async def generate_ai_summary():

    global stored_chunks

    # No uploaded document

    if not stored_chunks:

        return {
            "error": "No document uploaded"
        }

    # =========================
    # BUILD SUMMARY CONTEXT
    # =========================

    summary_parts = []

    for chunk in stored_chunks[:10]:

        # High Mode metadata chunk

        if isinstance(chunk, dict):

            summary_parts.append(
                chunk["content"]
            )

        # Basic / Medium chunk

        else:

            summary_parts.append(chunk)

    # Merge context

    context = "\n\n".join(summary_parts)

    # =========================
    # GENERATE SUMMARY
    # =========================

    summary = generate_summary(context)

    # =========================
    # RETURN RESPONSE
    # =========================

    return {

        "summary": summary

    }

# =========================
# GENERATE EXAM NOTES
# =========================

@app.post("/generate-exam-notes")

async def generate_ai_exam_notes():

    global stored_chunks

    if not stored_chunks:

        return {
            "error": "No document uploaded"
        }

    note_parts = []

    for chunk in stored_chunks[:12]:

        if isinstance(chunk, dict):

            note_parts.append(
                chunk["content"]
            )

        else:

            note_parts.append(chunk)

    context = "\n\n".join(note_parts)

    raw_notes = generate_exam_notes(context)

    try:

        notes = json.loads(raw_notes)

    except json.JSONDecodeError:

        start = raw_notes.find("{")
        end = raw_notes.rfind("}") + 1

        if start >= 0 and end > start:

            try:

                notes = json.loads(raw_notes[start:end])

            except json.JSONDecodeError:

                return {
                    "error": "Unable to format exam notes"
                }

        else:

            return {
                "error": "Unable to format exam notes"
            }

    return {
        "notes": notes
    }

# =========================
# GENERATE BEGINNER MODE
# =========================

@app.post("/generate-beginner-mode")

async def generate_ai_beginner_mode():

    global stored_chunks

    if not stored_chunks:

        return {
            "error": "No document uploaded"
        }

    learning_parts = []

    for chunk in stored_chunks[:10]:

        if isinstance(chunk, dict):

            learning_parts.append(
                chunk["content"]
            )

        else:

            learning_parts.append(chunk)

    context = "\n\n".join(learning_parts)

    raw_guide = generate_beginner_mode(context)

    try:

        guide = json.loads(raw_guide)

    except json.JSONDecodeError:

        start = raw_guide.find("{")
        end = raw_guide.rfind("}") + 1

        if start >= 0 and end > start:

            try:

                guide = json.loads(raw_guide[start:end])

            except json.JSONDecodeError:

                return {
                    "error": "Unable to format beginner guide"
                }

        else:

            return {
                "error": "Unable to format beginner guide"
            }

    return {
        "guide": guide
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
