import os

from dotenv import load_dotenv

from openai import OpenAI

# =========================
# LOAD ENV VARIABLES
# =========================

load_dotenv()

# =========================
# GROQ CLIENT
# =========================

client = OpenAI(

    api_key=os.getenv("GROQ_API_KEY"),

    base_url="https://api.groq.com/openai/v1"

)

# =========================
# GENERATE RAG RESPONSE
# =========================

def generate_rag_response(question, context):

    prompt = f"""
You are an AI Study Assistant.

Answer the user's question ONLY using the provided context.

If the answer is not found in the context,
reply:
"Answer not found in uploaded document."

=========================
DOCUMENT CONTEXT
=========================

{context}

=========================
QUESTION
=========================

{question}

=========================
ANSWER
=========================
"""

    response = client.chat.completions.create(

        model="llama-3.1-8b-instant",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.3

    )

    return response.choices[0].message.content

# =========================
# GENERATE AI SUMMARY
# =========================

def generate_summary(context):

    prompt = f"""
You are an AI Study Assistant.

Analyze the provided study material and generate a clear,
well-structured summary.

Keep the summary concise and readable.
Use paragraphs or bullet points when appropriate.
Requirements:
- Focus on the most important concepts
- Keep explanations concise but meaningful
- Preserve important terminology
- Organize information logically
- Avoid unnecessary repetition

=========================
DOCUMENT CONTENT
=========================

{context}

=========================
SUMMARY
=========================
"""

    response = client.chat.completions.create(

        model="llama-3.1-8b-instant",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.4

    )

    return response.choices[0].message.content

# =========================
# GENERATE EXAM NOTES
# =========================

def generate_exam_notes(context):

    prompt = f"""
You are an AI Study Assistant creating exam revision notes.

Analyze the provided study material and return ONLY valid JSON.
Do not wrap the JSON in markdown.

The notes must be concise, scannable, and useful for students before exams.

JSON schema:
{{
  "estimated_revision_minutes": 10,
  "important_topics": [
    {{
      "title": "Topic name",
      "explanation": "One concise revision explanation.",
      "points": ["Short point", "Short point", "Short point"],
      "example": "Mini example"
    }}
  ],
  "practice_questions": {{
    "three_mark": ["Question", "Question"],
    "five_mark": ["Question", "Question"],
    "long": ["Question"]
  }},
  "key_concepts": [
    {{
      "term": "Concept",
      "definition": "Short exam-friendly definition"
    }}
  ],
  "revision_checklist": [
    {{
      "text": "Revision task",
      "completed": true
    }}
  ]
}}

Requirements:
- Provide 4 to 6 important topics.
- Each topic must have 3 short bullet points.
- Provide 3 to 5 questions per question category.
- Provide 6 to 10 key concepts.
- Provide 4 to 6 checklist items.
- Keep all text grounded in the uploaded material.

=========================
DOCUMENT CONTENT
=========================

{context}
"""

    response = client.chat.completions.create(

        model="llama-3.1-8b-instant",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.25

    )

    return response.choices[0].message.content

# =========================
# GENERATE BEGINNER MODE
# =========================

def generate_beginner_mode(context):

    prompt = f"""
You are an AI tutor for beginner students.

Analyze the uploaded study material and return ONLY valid JSON.
Do not wrap the JSON in markdown.

Create a calm, simple learning guide that explains difficult concepts in
plain language with analogies, steps, examples, and revision takeaways.

JSON schema:
{{
  "topic": "Main topic",
  "learning_level": "Beginner",
  "estimated_learning_minutes": 12,
  "difficulty": "Easy → Medium",
  "simplified_explanation": {{
    "title": "What is this topic?",
    "paragraphs": [
      "Short beginner-friendly paragraph.",
      "Another simple paragraph."
    ],
    "analogy": "Think of it like..."
  }},
  "how_it_works": [
    {{
      "label": "Step 1",
      "title": "Simple step title",
      "description": "One short explanation."
    }}
  ],
  "examples": [
    {{
      "title": "Real-world example",
      "description": "Simple explanation of the example."
    }}
  ],
  "takeaways": [
    "Short revision point"
  ],
  "learned": [
    "What the learner now understands"
  ]
}}

Requirements:
- Use simple, conversational language.
- Avoid textbook wording.
- Use 3 to 5 steps.
- Use 3 real-world examples.
- Use 4 to 6 quick takeaways.
- Use 4 completion points.
- Keep everything grounded in the uploaded material.

=========================
DOCUMENT CONTENT
=========================

{context}
"""

    response = client.chat.completions.create(

        model="llama-3.1-8b-instant",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.35

    )

    return response.choices[0].message.content
