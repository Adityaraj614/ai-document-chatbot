# ai-document-chatbot

CareerMind AI 🚀
AI-powered RAG-based Study Assistant for intelligent PDF learning, semantic search, and contextual AI conversations.

✨ Features
📄 PDF Upload & Text Extraction
🧹 Text Cleaning Pipeline
✂️ Multiple Chunking Modes
Basic Chunking
Medium Chunking
High Chunking
🧠 Embedding Generation using Sentence Transformers
⚡ FAISS Vector Database Integration
🔍 Semantic Retrieval (RAG)
🤖 AI-powered Question Answering
💬 Dynamic AI Chat Workspace
📊 Processing Insights Dashboard
🌙 Modern Dark UI Design
🧠 Project Architecture
PDF Upload
↓
Extract Text
↓
Clean Text
↓
Chunking
↓
Generate Embeddings
↓
Store in FAISS
↓
Semantic Retrieval
↓
Send Context to LLM
↓
Generate AI Response
🛠️ Tech Stack
Frontend
HTML
CSS
JavaScript
Backend
FastAPI
Python
AI / ML
Sentence Transformers
FAISS
RAG Pipeline
Groq API / Gemini API
PDF Processing
PyMuPDF
📂 Project Structure
CareerMind-AI/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   │
│   ├── ai/
│   │   ├── rag.py
│   │   ├── llm.py
│   │
│   ├── static/
│   │   ├── style.css
│   │   ├── app.js
│   │
│   ├── templates/
│   │   ├── study.html
│   │
│   ├── uploads/
│
├── README.md
⚙️ Installation
1️⃣ Clone Repository
git clone https://github.com/YOUR_USERNAME/CareerMind-AI.git
2️⃣ Open Project
cd CareerMind-AI/backend
3️⃣ Create Environment
conda create -n pytorch_dl python=3.10
conda activate pytorch_dl
4️⃣ Install Requirements
pip install -r requirements.txt
🔑 Environment Variables

Create a .env file inside backend/

GROQ_API_KEY=your_api_key_here

OR

GEMINI_API_KEY=your_api_key_here
▶️ Run Project
uvicorn app:app --reload

Open browser:

http://127.0.0.1:8000/study
📸 Current Capabilities

✅ Upload study PDFs
✅ Generate embeddings locally
✅ Store vectors using FAISS
✅ Ask contextual AI questions
✅ Retrieve relevant chunks
✅ AI Study Workspace
✅ Multiple processing modes
✅ Real-time semantic retrieval

🔥 Future Improvements
Metadata-aware chunking
Semantic chunking
Conversation memory
Source citations
Hybrid search
OCR support
Notes generation
Quiz generation
Resume AI integration
📌 Learning Concepts Implemented

This project demonstrates practical implementation of:

Retrieval-Augmented Generation (RAG)
Embeddings
Vector Databases
Semantic Search
Chunking Strategies
LLM Integration
AI-powered Study Systems
👨‍💻 Author

Kumar
BTech CSE Student | AI/ML Enthusiast | Building AI Systems

⭐ If You Like This Project

Give this repository a star ⭐
