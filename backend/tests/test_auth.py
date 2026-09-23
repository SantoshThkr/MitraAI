from fastapi.testclient import TestClient

from app.core.config import settings


def test_signup_returns_user_without_password_hash(client: TestClient) -> None:
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "new@example.com",
            "display_name": "New User",
            "password": "correct-horse-battery",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["display_name"] == "New User"
    assert "password" not in body and "password_hash" not in body
    assert settings.session_cookie_name in response.cookies


def test_duplicate_signup_is_rejected(client: TestClient, signed_up: dict[str, str]) -> None:
    response = client.post("/api/auth/signup", json=signed_up)

    assert response.status_code == 409
    assert response.json()["detail"] == "Email already registered"


def test_login_succeeds_with_correct_password(
    client: TestClient, signed_up: dict[str, str]
) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": signed_up["email"], "password": signed_up["password"]},
    )

    assert response.status_code == 200
    assert response.json()["email"] == signed_up["email"]


def test_login_fails_with_wrong_password(
    client: TestClient, signed_up: dict[str, str]
) -> None:
    response = client.post(
        "/api/auth/login", json={"email": signed_up["email"], "password": "wrong-password"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_fails_for_unknown_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "whatever-123"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_me_returns_authenticated_user(client: TestClient, signed_up: dict[str, str]) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == signed_up["email"]


def test_me_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_logout_invalidates_the_session(client: TestClient, signed_up: dict[str, str]) -> None:
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_short_password_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/auth/signup",
        json={"email": "short@example.com", "display_name": "Short", "password": "abc"},
    )

    assert response.status_code == 422
