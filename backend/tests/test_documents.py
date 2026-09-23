import io

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app import rag
from app.core.config import settings
from app.ollama import OllamaError
from app.rag import Chunk, chunk_pages, extract_pages

OTHER_USER = {
    "email": "carol@example.com",
    "display_name": "Carol",
    "password": "another-good-password",
}


def upload(client: TestClient, name: str, data: bytes, content_type: str = "text/plain"):
    return client.post("/api/documents", files={"file": (name, data, content_type)})


def make_pdf(pages: list[str]) -> bytes:
    writer = PdfWriter()
    for _ in pages:
        writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


# --- extraction and chunking (pure functions, no I/O) ---


def test_extract_pages_reads_text_files() -> None:
    assert extract_pages("notes.txt", b"hello world") == [(None, "hello world")]
    assert extract_pages("notes.md", b"# Title") == [(None, "# Title")]


def test_extract_pages_reads_pdf_pages() -> None:
    pages = extract_pages("blank.pdf", make_pdf(["", ""]))

    assert [page for page, _ in pages] == [1, 2]


def test_chunking_is_deterministic_and_indexed() -> None:
    text = " ".join(f"word{index}" for index in range(500))

    first = chunk_pages([(None, text)])
    second = chunk_pages([(None, text)])

    assert first == second
    assert [chunk.chunk_index for chunk in first] == list(range(len(first)))
    assert all(len(chunk.content) <= settings.chunk_chars for chunk in first)
    assert len(first) > 1


def test_chunking_keeps_page_numbers() -> None:
    chunks = chunk_pages([(1, "alpha"), (2, "beta")])

    assert chunks == [Chunk(0, 1, "alpha"), Chunk(1, 2, "beta")]


# --- upload validation and ownership ---


def test_upload_requires_authentication(client: TestClient) -> None:
    assert upload(client, "a.txt", b"hello").status_code == 401


def test_upload_rejects_unsupported_type(
    client: TestClient, signed_up: dict[str, str], fake_embeddings: list
) -> None:
    response = upload(client, "malware.exe", b"MZ", "application/octet-stream")

    assert response.status_code == 415
    assert client.get("/api/documents").json() == []


def test_upload_rejects_empty_file(
    client: TestClient, signed_up: dict[str, str], fake_embeddings: list
) -> None:
    assert upload(client, "empty.txt", b"").status_code == 422


def test_upload_rejects_oversized_file(
    client: TestClient, signed_up: dict[str, str], fake_embeddings: list
) -> None:
    oversized = b"x" * (settings.max_upload_bytes + 1)

    assert upload(client, "big.txt", oversized).status_code == 413


def test_upload_indexes_document_and_reports_ready(
    client: TestClient, signed_up: dict[str, str], fake_embeddings: list
) -> None:
    response = upload(client, "notes.md", b"Photosynthesis converts light into sugar.")

    assert response.status_code == 201
    body = response.json()
    assert body["filename"] == "notes.md"
    assert body["status"] == "ready"
    assert fake_embeddings, "embeddings were never generated"

    assert [item["id"] for item in client.get("/api/documents").json()] == [body["id"]]


def test_upload_marks_document_failed_when_embedding_fails(
    client: TestClient, signed_up: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    async def broken_embed(texts: list[str]) -> list[list[float]]:
        raise OllamaError("The AI service is unavailable.")

    monkeypatch.setattr(rag, "embed_texts", broken_embed)

    response = upload(client, "notes.txt", b"some content")

    assert response.status_code == 201
    assert response.json()["status"] == "failed"


def test_documents_are_scoped_to_their_owner(
    client: TestClient, signed_up: dict[str, str], fake_embeddings: list
) -> None:
    document_id = upload(client, "private.txt", b"secret plans").json()["id"]

    client.cookies.clear()
    client.post("/api/auth/signup", json=OTHER_USER)

    assert client.get("/api/documents").json() == []
    assert client.delete(f"/api/documents/{document_id}").status_code == 403


def test_delete_removes_document(
    client: TestClient, signed_up: dict[str, str], fake_embeddings: list
) -> None:
    document_id = upload(client, "notes.txt", b"content here").json()["id"]

    assert client.delete(f"/api/documents/{document_id}").status_code == 204
    assert client.get("/api/documents").json() == []
    assert client.delete(f"/api/documents/{document_id}").status_code == 404
