import asyncio
import hashlib
import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:55432/mitraai_test"
)

from collections.abc import AsyncIterator, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app import rag
from app.api import conversations
from app.api.conversations import chat_limiter
from app.db.base import Base
from app.db.models import EMBEDDING_DIMENSIONS
from app.db.session import engine
from app.main import app


@pytest.fixture
def database() -> Iterator[None]:
    async def reset() -> None:
        async with engine.begin() as connection:
            await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)
        await engine.dispose()

    chat_limiter.reset()
    asyncio.run(reset())
    yield
    # close=False abandons the pool instead of closing sockets owned by the client's loop.
    asyncio.run(engine.dispose(close=False))


@pytest.fixture
def client(database: None) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def signed_up(client: TestClient) -> dict[str, str]:
    credentials = {
        "email": "alice@example.com",
        "display_name": "Alice",
        "password": "correct-horse-battery",
    }
    response = client.post("/api/auth/signup", json=credentials)
    assert response.status_code == 201
    return credentials


def keyword_embedding(text: str) -> list[float]:
    """Deterministic bag-of-words vector: shared words give high cosine similarity."""
    vector = [0.0] * EMBEDDING_DIMENSIONS
    for word in text.lower().split():
        digest = hashlib.sha256(word.encode()).digest()
        vector[int.from_bytes(digest[:4], "big") % EMBEDDING_DIMENSIONS] += 1.0

    magnitude = sum(value * value for value in vector) ** 0.5
    return [value / magnitude for value in vector] if magnitude else vector


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers", "real_embeddings: exercise app.rag.embed_batch itself, unstubbed"
    )


@pytest.fixture(autouse=True)
def fake_embeddings(
    request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch
) -> Iterator[list[list[str]]]:
    """Autouse so no test ever reaches a real Ollama instance."""
    calls: list[list[str]] = []
    if "real_embeddings" in request.keywords:
        yield calls
        return

    async def fake_embed(texts: list[str]) -> list[list[float]]:
        calls.append(texts)
        return [keyword_embedding(text) for text in texts]

    monkeypatch.setattr(rag, "embed_batch", fake_embed)
    yield calls


@pytest.fixture
def fake_ollama(monkeypatch: pytest.MonkeyPatch) -> Iterator[list[list[dict[str, str]]]]:
    """Replace the Ollama call with a deterministic token stream."""
    captured: list[list[dict[str, str]]] = []

    async def fake_stream(messages: list[dict[str, str]]) -> AsyncIterator[str]:
        captured.append(messages)
        for token in ["Hello", " ", "there"]:
            yield token

    monkeypatch.setattr(conversations, "stream_chat", fake_stream)
    yield captured
