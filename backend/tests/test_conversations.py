import uuid

from fastapi.testclient import TestClient

OTHER_USER = {
    "email": "bob@example.com",
    "display_name": "Bob",
    "password": "another-good-password",
}


def create_conversation(client: TestClient, title: str = "First chat") -> str:
    response = client.post("/api/conversations", json={"title": title})
    assert response.status_code == 201
    return response.json()["id"]


def test_conversation_crud(client: TestClient, signed_up: dict[str, str]) -> None:
    conversation_id = create_conversation(client)

    assert [item["id"] for item in client.get("/api/conversations").json()] == [
        conversation_id
    ]

    renamed = client.patch(
        f"/api/conversations/{conversation_id}", json={"title": "Renamed"}
    )
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Renamed"

    assert client.get(f"/api/conversations/{conversation_id}").json()["title"] == "Renamed"
    assert client.delete(f"/api/conversations/{conversation_id}").status_code == 204
    assert client.get(f"/api/conversations/{conversation_id}").status_code == 404


def test_conversation_endpoints_require_authentication(client: TestClient) -> None:
    assert client.get("/api/conversations").status_code == 401
    assert client.post("/api/conversations", json={"title": "Nope"}).status_code == 401


def test_missing_conversation_returns_404(client: TestClient, signed_up: dict[str, str]) -> None:
    assert client.get(f"/api/conversations/{uuid.uuid4()}").status_code == 404


def test_invalid_uuid_is_rejected(client: TestClient, signed_up: dict[str, str]) -> None:
    assert client.get("/api/conversations/not-a-uuid").status_code == 422


def test_other_users_conversation_is_forbidden(
    client: TestClient, signed_up: dict[str, str]
) -> None:
    conversation_id = create_conversation(client, "Alice private")
    client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "secret"},
    )

    client.cookies.clear()
    assert client.post("/api/auth/signup", json=OTHER_USER).status_code == 201

    assert client.get("/api/conversations").json() == []
    assert client.get(f"/api/conversations/{conversation_id}").status_code == 403
    assert (
        client.patch(
            f"/api/conversations/{conversation_id}", json={"title": "Stolen"}
        ).status_code
        == 403
    )
    assert client.delete(f"/api/conversations/{conversation_id}").status_code == 403
    assert client.get(f"/api/conversations/{conversation_id}/messages").status_code == 403
    assert (
        client.post(
            f"/api/conversations/{conversation_id}/messages",
            json={"role": "user", "content": "intruder"},
        ).status_code
        == 403
    )


def test_messages_are_stored_and_paginated(
    client: TestClient, signed_up: dict[str, str]
) -> None:
    conversation_id = create_conversation(client)

    for index in range(3):
        response = client.post(
            f"/api/conversations/{conversation_id}/messages",
            json={"role": "user" if index % 2 == 0 else "assistant", "content": f"m{index}"},
        )
        assert response.status_code == 201

    all_messages = client.get(f"/api/conversations/{conversation_id}/messages").json()
    assert [message["content"] for message in all_messages] == ["m0", "m1", "m2"]

    page = client.get(
        f"/api/conversations/{conversation_id}/messages", params={"limit": 2, "offset": 1}
    ).json()
    assert [message["content"] for message in page] == ["m1", "m2"]


def test_invalid_message_role_is_rejected(
    client: TestClient, signed_up: dict[str, str]
) -> None:
    conversation_id = create_conversation(client)

    response = client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"role": "system", "content": "nope"},
    )

    assert response.status_code == 422


def test_data_persists_across_sessions(client: TestClient, signed_up: dict[str, str]) -> None:
    conversation_id = create_conversation(client, "Persisted")
    client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "still here"},
    )
    client.post("/api/auth/logout")

    client.cookies.clear()
    assert client.get("/api/conversations").status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"email": signed_up["email"], "password": signed_up["password"]},
    )
    assert login.status_code == 200

    conversations = client.get("/api/conversations").json()
    assert [item["title"] for item in conversations] == ["Persisted"]

    messages = client.get(f"/api/conversations/{conversation_id}/messages").json()
    assert [message["content"] for message in messages] == ["still here"]
