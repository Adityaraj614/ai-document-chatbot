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
import uuid
import faiss
from datetime import datetime, timedelta, timezone

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

active_session_id = None

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, "database", "sessions")
SESSION_EXPIRY_HOURS = 2

SESSION_CACHE_FILES = {
    "summary": "summary.json",
    "exam_notes": "exam_notes.json",
    "beginner_mode": "beginner_mode.json"
}

os.makedirs(SESSIONS_DIR, exist_ok=True)


def get_utc_now():

    return datetime.now(timezone.utc)


def parse_created_at(value):

    if not value:
        return None

    try:
        created_at = datetime.fromisoformat(value)

        if created_at.tzinfo is None:
            return created_at.replace(tzinfo=timezone.utc)

        return created_at
    except ValueError:
        return None


def is_valid_session_id(session_id):

    if not session_id:
        return False

    try:
        uuid.UUID(session_id)
        return True
    except ValueError:
        return False


def has_readable_text(items):

    if not items:
        return False

    for item in items:

        if isinstance(item, dict):
            text = item.get("content", "")
        else:
            text = item

        if str(text).strip():
            return True

    return False


def cleanup_expired_sessions():

    if not os.path.exists(SESSIONS_DIR):
        return

    expiry_cutoff = get_utc_now() - timedelta(hours=SESSION_EXPIRY_HOURS)

    for session_id in os.listdir(SESSIONS_DIR):

        session_path = os.path.join(SESSIONS_DIR, session_id)

        if not os.path.isdir(session_path):
            continue

        metadata_path = os.path.join(session_path, "metadata.json")
        should_delete = False

        if os.path.exists(metadata_path):

            try:
                with open(metadata_path, "r", encoding="utf-8") as file:
                    metadata = json.load(file)

                created_at = parse_created_at(metadata.get("created_at"))
                should_delete = not created_at or created_at < expiry_cutoff

            except (OSError, json.JSONDecodeError):
                should_delete = True

        else:
            should_delete = True

        if should_delete:
            shutil.rmtree(session_path, ignore_errors=True)


def get_session_path(session_id=None):

    target_session_id = session_id or active_session_id

    if not is_valid_session_id(target_session_id):
        return None

    return os.path.join(SESSIONS_DIR, target_session_id)


def load_session_metadata(session_id):

    session_path = get_session_path(session_id)

    if not session_path:
        return None

    metadata_path = os.path.join(session_path, "metadata.json")

    if not os.path.exists(metadata_path):
        return None

    try:
        with open(metadata_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return None


def get_latest_session_metadata():

    if not os.path.exists(SESSIONS_DIR):
        return None

    latest_metadata = None
    latest_created_at = None

    for session_id in os.listdir(SESSIONS_DIR):

        session_path = os.path.join(SESSIONS_DIR, session_id)

        if not os.path.isdir(session_path):
            continue

        metadata = load_session_metadata(session_id)

        if not metadata:
            continue

        created_at = parse_created_at(metadata.get("created_at"))

        if not created_at:
            continue

        if latest_created_at is None or created_at > latest_created_at:
            latest_created_at = created_at
            latest_metadata = metadata

    return latest_metadata


def get_all_session_metadata():

    if not os.path.exists(SESSIONS_DIR):
        return []

    sessions = []

    for session_id in os.listdir(SESSIONS_DIR):

        session_path = os.path.join(SESSIONS_DIR, session_id)

        if not os.path.isdir(session_path):
            continue

        metadata = load_session_metadata(session_id)

        if not metadata:
            continue

        sessions.append({
            "session_id": metadata.get("session_id"),
            "filename": metadata.get("filename"),
            "processing_mode": metadata.get("processing_mode"),
            "created_at": metadata.get("created_at")
        })

    return sorted(
        sessions,
        key=lambda session: session.get("created_at") or "",
        reverse=True
    )


def get_session_file_path(session_id, filename):

    session_path = get_session_path(session_id)

    if not session_path:
        return None

    return os.path.join(session_path, filename)


def save_chunks(session_id, chunks):

    path = get_session_file_path(session_id, "chunks.json")

    if not path:
        return None

    os.makedirs(os.path.dirname(path), exist_ok=True)

    with open(path, "w", encoding="utf-8") as file:
        json.dump(chunks, file, ensure_ascii=False, indent=2)

    return path


def load_chunks(session_id):

    path = get_session_file_path(session_id, "chunks.json")

    if not path or not os.path.exists(path):
        return None

    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return None


def save_faiss_index(session_id, index):

    path = get_session_file_path(session_id, "faiss.index")

    if not path:
        return None

    os.makedirs(os.path.dirname(path), exist_ok=True)
    faiss.write_index(index, path)

    return path


def load_faiss_index(session_id):

    path = get_session_file_path(session_id, "faiss.index")

    if not path or not os.path.exists(path):
        return None

    try:
        return faiss.read_index(path)
    except RuntimeError:
        return None


def load_chat_history(session_id):

    path = get_session_file_path(session_id, "chat_history.json")

    if not path or not os.path.exists(path):
        return []

    try:
        with open(path, "r", encoding="utf-8") as file:
            history = json.load(file)

        return history if isinstance(history, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def save_chat_history(session_id, history):

    path = get_session_file_path(session_id, "chat_history.json")

    if not path:
        return

    os.makedirs(os.path.dirname(path), exist_ok=True)

    safe_history = []

    for message in history:

        if not isinstance(message, dict):
            continue

        role = message.get("role")
        content = message.get("content")

        if role not in {"user", "assistant"} or not content:
            continue

        safe_history.append({
            "role": role,
            "content": content
        })

    with open(path, "w", encoding="utf-8") as file:
        json.dump(safe_history, file, ensure_ascii=False, indent=2)


def create_study_session(
    session_id,
    filename,
    processing_mode,
    chunk_count,
    strategy,
    embedding_dimension,
    preview,
    chunks_path,
    faiss_index_path
):

    session_path = get_session_path(session_id)

    os.makedirs(session_path, exist_ok=True)

    metadata = {
        "session_id": session_id,
        "filename": filename,
        "processing_mode": processing_mode,
        "chunk_count": chunk_count,
        "strategy": strategy,
        "embedding_dimension": embedding_dimension,
        "preview": preview,
        "chunks_path": chunks_path,
        "faiss_index_path": faiss_index_path,
        "created_at": get_utc_now().isoformat()
    }

    save_session_json(session_id, "metadata.json", metadata)

    return session_id


def get_cache_path(cache_name, session_id=None):

    session_path = get_session_path(session_id)

    if not session_path:
        return None

    filename = SESSION_CACHE_FILES.get(cache_name)

    if not filename:
        return None

    return os.path.join(session_path, filename)


def load_cache(cache_name, session_id=None):

    cache_path = get_cache_path(cache_name, session_id)

    if not cache_path or not os.path.exists(cache_path):
        return None

    try:
        with open(cache_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return None


def save_cache(cache_name, data, session_id=None):

    cache_path = get_cache_path(cache_name, session_id)

    if not cache_path:
        return

    os.makedirs(os.path.dirname(cache_path), exist_ok=True)

    with open(cache_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def save_session_json(session_id, filename, data):

    session_path = get_session_path(session_id)

    os.makedirs(session_path, exist_ok=True)

    path = os.path.join(session_path, filename)

    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


@app.on_event("startup")
async def startup_cleanup():

    cleanup_expired_sessions()

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

    cleanup_expired_sessions()

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

    if not has_readable_text(chunks):

        return {
            "error": "No readable text found in PDF"
        }

    session_id = str(uuid.uuid4())
    chunks_path = save_chunks(session_id, chunks)
    
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

    if not has_readable_text(embedding_texts):

        return {
            "error": "No readable text found in PDF"
        }

    # =========================
    # GENERATE EMBEDDINGS
    # =========================

    embeddings = generate_embeddings(
        embedding_texts
    )

    if len(embeddings) == 0:

        return {
            "error": "No readable text found in PDF"
        }

    # Create FAISS index

    index = create_faiss_index(embeddings)

    # Store globally

    global active_session_id

    faiss_index_path = save_faiss_index(session_id, index)

    active_session_id = create_study_session(
        session_id=session_id,
        filename=file.filename,
        processing_mode=mode,
        chunk_count=len(chunks),
        strategy=strategy,
        embedding_dimension=len(embeddings[0]),
        preview=preview,
        chunks_path=chunks_path,
        faiss_index_path=faiss_index_path
    )

    # Response

    return {

        "message": "PDF processed successfully",

        "filename": file.filename,

        "chunk_count": len(chunks),

        "preview": preview,

        "mode": mode,

        "strategy": strategy,

        "embedding_dimension": len(embeddings[0]),

        "session_id": active_session_id
    }

# =========================
# SESSION CACHE LOOKUP
# =========================

@app.get("/session-cache/{cache_name}")
async def get_session_cache(cache_name: str, session_id: str = None):

    cleanup_expired_sessions()

    if not is_valid_session_id(session_id):
        return {
            "exists": False
        }

    cached_data = load_cache(cache_name, session_id)

    if not cached_data:
        return {
            "exists": False,
            "session_id": session_id
        }

    return {
        "exists": True,
        "session_id": session_id,
        **cached_data
    }

# =========================
# RECENT SESSIONS
# =========================

@app.get("/sessions")
async def get_sessions():

    cleanup_expired_sessions()

    return {
        "sessions": get_all_session_metadata()
    }

# =========================
# SESSION METADATA
# =========================

@app.get("/session-metadata")
async def get_session_metadata(session_id: str = None):

    cleanup_expired_sessions()

    global active_session_id

    metadata = None
    requested_session_id = session_id

    if is_valid_session_id(session_id):
        metadata = load_session_metadata(session_id)

    if not metadata and not requested_session_id:
        metadata = load_session_metadata(active_session_id)

    if not metadata:
        metadata = get_latest_session_metadata()

    if not metadata:
        return {
            "exists": False
        }

    active_session_id = metadata.get("session_id")

    return {
        "exists": True,
        "metadata": metadata
    }

# =========================
# CHAT HISTORY
# =========================

@app.get("/chat-history")
async def get_chat_history(session_id: str = None):

    cleanup_expired_sessions()

    if not is_valid_session_id(session_id):
        return {
            "exists": False,
            "history": []
        }

    metadata = load_session_metadata(session_id)

    if not metadata:
        return {
            "exists": False,
            "history": []
        }

    return {
        "exists": True,
        "history": load_chat_history(session_id)
    }

# =========================
# ASK QUESTIONS
# =========================

@app.post("/ask-question")

async def ask_question(request: Request):

    cleanup_expired_sessions()

    data = await request.json()

    question = data.get("question")
    session_id = data.get("session_id")

    if not question:

        return {
            "error": "Question is required"
        }

    if not is_valid_session_id(session_id):

        return {
            "error": "No document session found"
        }

    chunks = load_chunks(session_id)
    index = load_faiss_index(session_id)

    if not chunks or index is None:

        return {
            "error": "Document session is unavailable"
        }

    # =========================
    # RETRIEVE RELEVANT CHUNKS
    # =========================

    retrieved_chunks = search_similar_chunks(
        query=question,
        chunks=chunks,
        index=index
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

    chat_history = load_chat_history(session_id)
    chat_history.extend([
        {
            "role": "user",
            "content": question
        },
        {
            "role": "assistant",
            "content": final_answer
        }
    ])
    save_chat_history(session_id, chat_history)

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

async def generate_ai_summary(request: Request):

    cleanup_expired_sessions()

    data = await request.json()
    session_id = data.get("session_id")

    if not is_valid_session_id(session_id):

        return {
            "error": "No document session found"
        }

    cached_summary = load_cache("summary", session_id)

    if cached_summary:
        return cached_summary

    chunks = load_chunks(session_id)

    # No uploaded document

    if not chunks:
        return {
            "error": "No document uploaded"
        }

    # =========================
    # BUILD SUMMARY CONTEXT
    # =========================

    summary_parts = []

    for chunk in chunks[:10]:

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

    save_cache(
        "summary",
        {
            "summary": summary
        },
        session_id
    )

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

async def generate_ai_exam_notes(request: Request):

    cleanup_expired_sessions()

    data = await request.json()
    session_id = data.get("session_id")

    if not is_valid_session_id(session_id):

        return {
            "error": "No document session found"
        }

    cached_notes = load_cache("exam_notes", session_id)

    if cached_notes:
        return cached_notes

    chunks = load_chunks(session_id)

    if not chunks:

        return {
            "error": "No document uploaded"
        }

    note_parts = []

    for chunk in chunks[:12]:

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

    response = {
        "notes": notes
    }

    save_cache("exam_notes", response, session_id)

    return response

# =========================
# GENERATE BEGINNER MODE
# =========================

@app.post("/generate-beginner-mode")

async def generate_ai_beginner_mode(request: Request):

    cleanup_expired_sessions()

    data = await request.json()
    session_id = data.get("session_id")

    if not is_valid_session_id(session_id):

        return {
            "error": "No document session found"
        }

    cached_guide = load_cache("beginner_mode", session_id)

    if cached_guide:
        return cached_guide

    chunks = load_chunks(session_id)

    if not chunks:

        return {
            "error": "No document uploaded"
        }

    learning_parts = []

    for chunk in chunks[:10]:

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

    response = {
        "guide": guide
    }

    save_cache("beginner_mode", response, session_id)

    return response

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
