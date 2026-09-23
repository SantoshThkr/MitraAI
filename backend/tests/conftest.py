import asyncio
import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:55432/mitraai_test"
)

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


@pytest.fixture
def database() -> Iterator[None]:
    async def reset() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(reset())
    yield
    asyncio.run(engine.dispose())


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
