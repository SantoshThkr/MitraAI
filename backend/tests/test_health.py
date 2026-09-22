from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_health_returns_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_allows_frontend_origin() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health", headers={"Origin": settings.cors_origin})

    assert response.headers["access-control-allow-origin"] == settings.cors_origin
