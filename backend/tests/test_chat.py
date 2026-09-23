import json
from collections.abc import AsyncIterator, Iterator

import pytest
from fastapi.testclient import TestClient

from app.api import conversations
from app.ollama import OllamaError


def parse_events(body: str) -> list[dict]:
    return [
        json.loads(frame[len("data: ") :])
        for frame in body.split("\n\n")
        if frame.startswith("data: ")
    ]


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


@pytest.fixture
def failing_ollama(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_stream(messages: list[dict[str, str]]) -> AsyncIterator[str]:
        raise OllamaError("The AI service is unavailable.")
        yield ""  # pragma: no cover - makes this an async generator

    monkeypatch.setattr(conversations, "stream_chat", fake_stream)


def new_conversation(client: TestClient) -> str:
    return client.post("/api/conversations", json={"title": "Chat"}).json()["id"]


def test_chat_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/api/conversations/00000000-0000-0000-0000-000000000000/chat",
        json={"content": "hi"},
    )

    assert response.status_code == 401


def test_chat_rejects_other_users_conversation(
    client: TestClient, signed_up: dict[str, str], fake_ollama: list
) -> None:
    conversation_id = new_conversation(client)

    client.cookies.clear()
    client.post(
        "/api/auth/signup",
        json={
            "email": "mallory@example.com",
            "display_name": "Mallory",
            "password": "another-good-password",
        },
    )

    response = client.post(
        f"/api/conversations/{conversation_id}/chat", json={"content": "let me in"}
    )

    assert response.status_code == 403
    assert fake_ollama == []


def test_chat_streams_and_persists_both_messages(
    client: TestClient, signed_up: dict[str, str], fake_ollama: list
) -> None:
    conversation_id = new_conversation(client)

    response = client.post(
        f"/api/conversations/{conversation_id}/chat", json={"content": "hi there"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = parse_events(response.text)
    assert events[0]["type"] == "user_message"
    assert events[0]["message"]["content"] == "hi there"
    assert [event["text"] for event in events if event["type"] == "token"] == [
        "Hello",
        " ",
        "there",
    ]
    assert events[-1]["type"] == "done"
    assert events[-1]["message"]["content"] == "Hello there"

    stored = client.get(f"/api/conversations/{conversation_id}/messages").json()
    assert [(item["role"], item["content"]) for item in stored] == [
        ("user", "hi there"),
        ("assistant", "Hello there"),
    ]


def test_chat_sends_bounded_context(
    client: TestClient, signed_up: dict[str, str], fake_ollama: list
) -> None:
    from app.core.config import settings

    conversation_id = new_conversation(client)
    for index in range(settings.chat_context_messages + 5):
        client.post(
            f"/api/conversations/{conversation_id}/messages",
            json={"role": "user", "content": f"old-{index}"},
        )

    client.post(f"/api/conversations/{conversation_id}/chat", json={"content": "newest"})

    sent = fake_ollama[0]
    assert len(sent) == settings.chat_context_messages
    assert sent[-1] == {"role": "user", "content": "newest"}
    assert all("old-0" != message["content"] for message in sent)


def test_chat_reports_provider_failure_without_leaking_details(
    client: TestClient, signed_up: dict[str, str], failing_ollama: None
) -> None:
    conversation_id = new_conversation(client)

    response = client.post(
        f"/api/conversations/{conversation_id}/chat", json={"content": "hi"}
    )
    events = parse_events(response.text)

    assert events[-1] == {"type": "error", "detail": "The AI service is unavailable."}

    stored = client.get(f"/api/conversations/{conversation_id}/messages").json()
    assert [item["role"] for item in stored] == ["user"]


def test_chat_rejects_empty_content(client: TestClient, signed_up: dict[str, str]) -> None:
    conversation_id = new_conversation(client)

    response = client.post(
        f"/api/conversations/{conversation_id}/chat", json={"content": ""}
    )

    assert response.status_code == 422
