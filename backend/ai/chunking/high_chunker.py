import re

# =========================
# HIGH CHUNKING
# Metadata-aware chunking
# =========================

def high_chunking(
    text,
    document_name="Unknown Document"
):

    lines = text.split("\n")

    chunks = []

    current_heading = "General"

    current_content = []

    chunk_id = 0

    for line in lines:

        line = line.strip()

        if not line:
            continue

        # Detect headings

        if (
            len(line) < 60
            and len(line.split()) <= 10
            and not line.startswith("•")
        ):

            # Save previous chunk

            if current_content:

                chunk_text = " ".join(current_content)

                chunks.append({

                    "chunk_id": chunk_id,

                    "document": document_name,

                    "section": current_heading,

                    "content": chunk_text

                })

                chunk_id += 1

            # New heading

            current_heading = line

            current_content = []

        else:

            current_content.append(line)

    # Save final chunk

    if current_content:

        chunk_text = " ".join(current_content)

        chunks.append({

            "chunk_id": chunk_id,

            "document": document_name,

            "section": current_heading,

            "content": chunk_text

        })

    return chunks