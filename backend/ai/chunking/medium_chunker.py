import re

# =========================
# MEDIUM CHUNKING
# Semantic accumulation chunking
# =========================

def medium_chunking(
    text,
    max_chunk_size=500,
    overlap_sections=1
):

    # Split using paragraphs + bullets

    sections = re.split(
        r'\n\s*\n|•',
        text
    )

    # Clean empty sections

    sections = [
        section.strip()
        for section in sections
        if section.strip()
    ]

    chunks = []

    current_chunk = []

    current_length = 0

    for section in sections:

        section_length = len(section)

        # If chunk exceeds limit
        # finalize current chunk

        if (
            current_length + section_length
            > max_chunk_size
        ):

            # Save chunk

            chunks.append(
                "\n\n".join(current_chunk)
            )

            # Overlap previous sections

            overlap = current_chunk[
                -overlap_sections:
            ]

            # Start new chunk

            current_chunk = overlap.copy()

            current_length = sum(
                len(s)
                for s in current_chunk
            )

        # Add current section

        current_chunk.append(section)

        current_length += section_length

    # Add remaining chunk

    if current_chunk:

        chunks.append(
            "\n\n".join(current_chunk)
        )

    return chunks