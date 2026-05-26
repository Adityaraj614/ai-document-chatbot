##ai-document-chatbot

# 🧠 CareerMind AI
### AI-Powered RAG-Based Study Assistant
*Intelligent PDF learning through semantic retrieval and contextual AI interaction*


---

## 📌 Overview

CareerMind AI is a **Retrieval-Augmented Generation (RAG)** powered study assistant built for intelligent document understanding. It transforms static PDFs into an interactive AI-powered knowledge base — enabling semantic search, contextual Q&A, and dynamic AI chat grounded in your actual documents.

> Built not just to ship an app, but to deeply understand how modern RAG systems, semantic retrieval pipelines, and AI-powered workflows are designed in real-world applications.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 PDF Upload & Processing | Extract and clean text from uploaded PDFs |
| ✂️ Multiple Chunking Strategies | Basic, Medium, and High chunking modes for comparison |
| 🧠 Local Embedding Generation | Uses Sentence Transformers — no paid API required |
| ⚡ FAISS Vector Storage | Fast, scalable semantic vector indexing |
| 🔍 Semantic Retrieval | Retrieve contextually relevant chunks from documents |
| 🤖 AI-Powered Responses | LLM responses grounded in retrieved document context |
| 💬 Dynamic AI Chat Workspace | Dedicated chat interface separate from document view |
| 📊 Processing Insights | Visualize pipeline metrics and chunk analytics |

---

## 🧠 RAG Pipeline

```
PDF Upload
    ↓
Text Extraction (PyMuPDF)
    ↓
Text Cleaning
    ↓
Chunking (Basic / Medium / High)
    ↓
Embedding Generation (Sentence Transformers)
    ↓
FAISS Vector Storage
    ↓
Semantic Retrieval
    ↓
LLM Context Injection
    ↓
AI Response Generation (Groq / Gemini)
```

---

## 🛠️ Tech Stack

**Frontend**
- HTML, CSS, JavaScript

**Backend**
- FastAPI (Python)

**AI / ML**
- Sentence Transformers — local embedding generation
- FAISS — vector database
- Groq / Gemini — LLM response generation

**PDF Processing**
- PyMuPDF (fitz)

---

## ⚙️ Design Decisions

### ✅ Local Embeddings (No Paid API)
Embeddings are generated locally using Sentence Transformers to:
- Eliminate API costs
- Avoid token rate limits
- Enable flexible experimentation with chunking strategies

### ✅ Multiple Chunking Modes
Three chunking levels allow direct comparison of retrieval quality:
- **Basic** — larger chunks, broader context
- **Medium** — balanced retrieval precision
- **High** — fine-grained chunks, higher specificity

### ✅ Dual Workspace Architecture
Chat and document views are intentionally separated into:
- **Document Workspace** — view, upload, and inspect PDFs
- **AI Chat Workspace** — interact with document content via AI

---

## 🚀 Getting Started

### Prerequisites
```
python >= 3.10
pip
```

### Installation
```bash
git clone https://github.com/your-username/careermind-ai.git
cd careermind-ai
pip install -r requirements.txt
```

### Run
```bash
uvicorn main:app --reload
```
Open `http://localhost:8000` in your browser.

---

## 📚 Key Concepts Implemented

- Retrieval-Augmented Generation (RAG)
- Semantic Search & Text Embeddings
- Vector Databases (FAISS)
- Chunking Strategies
- Context Injection
- AI-powered Document Understanding

---

## 🗺️ Roadmap

- [ ] Metadata-aware chunking
- [ ] Semantic chunking
- [ ] Hybrid retrieval (dense + sparse)
- [ ] Source citation bubbles in chat
- [ ] Conversation memory
- [ ] OCR support for scanned PDFs
- [ ] AI-generated summaries
- [ ] Quiz generation from documents
- [ ] Resume AI integration
- [ ] Advanced RAG evaluation metrics

---

## 🎯 Use Cases

CareerMind AI can be extended into:
- 📖 AI Study Assistant
- 🔬 Research Paper Analyzer
- 📝 AI Notes Generator
- 🎓 Exam Preparation Tool
- 🏢 Enterprise Knowledge Assistant
- 💼 Resume & Career Guidance Platform

---

## 👨‍💻 Developer

**Aditya Kumar** — BTech CSE (AI Specialization) | AI/ML Enthusiast

*Building practical AI systems through hands-on learning.*

---

⭐ If you found this project useful, consider giving it a star!
