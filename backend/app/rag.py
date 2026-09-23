import io
import logging
import uuid
from dataclasses import dataclass

import httpx
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import Document, DocumentChunk
from app.ollama import OllamaError

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}


@dataclass(frozen=True)
class Chunk:
    chunk_index: int
    page: int | None
    content: str


@dataclass(frozen=True)
class Retrieved:
    content: str
    filename: str
    page: int | None
    similarity: float


def extract_pages(filename: str, data: bytes) -> list[tuple[int | None, str]]:
    """Return (page number, text) pairs. Page is None for formats without pages."""
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        return [
            (number, page.extract_text() or "")
            for number, page in enumerate(reader.pages, start=1)
        ]
    return [(None, data.decode("utf-8", errors="replace"))]


def chunk_pages(pages: list[tuple[int | None, str]]) -> list[Chunk]:
    """Fixed-size overlapping windows, numbered continuously across the document."""
    size = settings.chunk_chars
    step = max(size - settings.chunk_overlap_chars, 1)

    chunks: list[Chunk] = []
    for page, text in pages:
        normalized = " ".join(text.split())
        for start in range(0, len(normalized), step):
            window = normalized[start : start + size].strip()
            if window:
                chunks.append(Chunk(len(chunks), page, window))
            if start + size >= len(normalized):
                break
    return chunks


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed with the local Ollama embedding model."""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=300.0)) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/embed",
                json={"model": settings.ollama_embed_model, "input": texts},
            )
            if response.status_code != 200:
                logger.error("Ollama embed returned %s: %s", response.status_code, response.text)
                raise OllamaError("The AI service is unavailable.")
            embeddings = response.json().get("embeddings")
    except httpx.HTTPError as error:
        logger.error("Ollama embed request failed: %s", error)
        raise OllamaError("The AI service is unavailable.") from error

    if not embeddings or len(embeddings) != len(texts):
        logger.error("Ollama embed returned %s vectors for %s inputs", len(embeddings or []), len(texts))
        raise OllamaError("The AI service is unavailable.")
    return embeddings


async def index_document(session: AsyncSession, document: Document, data: bytes) -> int:
    """Extract, chunk, embed and store. Returns the number of chunks stored."""
    chunks = chunk_pages(extract_pages(document.filename, data))
    if not chunks:
        return 0

    embeddings = await embed_texts([chunk.content for chunk in chunks])
    session.add_all(
        [
            DocumentChunk(
                document_id=document.id,
                chunk_index=chunk.chunk_index,
                page=chunk.page,
                content=chunk.content,
                embedding=embedding,
            )
            for chunk, embedding in zip(chunks, embeddings, strict=True)
        ]
    )
    return len(chunks)


async def search_chunks(
    session: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int | None = None,
    threshold: float | None = None,
) -> list[Retrieved]:
    """Cosine similarity search restricted to one user's ready documents."""
    limit = top_k if top_k is not None else settings.rag_top_k
    minimum = threshold if threshold is not None else settings.rag_similarity_threshold

    embedding = (await embed_texts([query]))[0]
    similarity = (1 - DocumentChunk.embedding.cosine_distance(embedding)).label("similarity")

    rows = await session.execute(
        select(DocumentChunk.content, Document.filename, DocumentChunk.page, similarity)
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(Document.user_id == user_id, Document.status == "ready")
        .order_by(similarity.desc())
        .limit(limit)
    )

    return [
        Retrieved(content, filename, page, float(score))
        for content, filename, page, score in rows
        if score >= minimum
    ]


def build_grounded_prompt(retrieved: list[Retrieved]) -> str:
    sources = "\n\n".join(
        f"[{index}] {item.filename}"
        + (f" (page {item.page})" if item.page else "")
        + f"\n{item.content}"
        for index, item in enumerate(retrieved, start=1)
    )
    return (
        "Answer the user's question using only the document excerpts below. "
        "If the excerpts do not contain the answer, say you could not find it in "
        "the documents. Do not invent facts.\n\n"
        f"{sources}"
    )
