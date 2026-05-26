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