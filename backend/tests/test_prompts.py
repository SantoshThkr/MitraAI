"""The application's own system prompt.

These assert the prompt's contract, not model quality: without a system prompt the model
answered as its vendor ("I am Qwen, created by Alibaba Cloud") and that identity bled into
unrelated questions.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.prompts import system_prompt


def test_prompt_uses_the_configured_assistant_name(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "assistant_name", "SantoshAI")

    prompt = system_prompt()

    assert "You are SantoshAI" in prompt
    assert "Your name is SantoshAI" in prompt


def test_prompt_names_the_real_model_and_forbids_impersonation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ollama_model", "llama3.2:3b")

    prompt = system_prompt()

    assert "llama3.2:3b" in prompt
    assert "Never claim to be a model other than the one named here." in prompt


def test_prompt_explains_renaming_without_promising_a_model_change() -> None:
    prompt = system_prompt()

    assert "ASSISTANT_NAME" in prompt
    assert "does not change the underlying model" in prompt


def test_prompt_states_cost_accurately() -> None:
    prompt = system_prompt()

    assert "no payment to an AI API provider" in prompt
    assert "Hardware, electricity" in prompt
    assert "Do not claim that every deployment" in prompt


def test_prompt_asks_for_direct_answers_and_clean_markdown() -> None:
    prompt = system_prompt()

    assert "Answer the question that was actually asked" in prompt
    assert "working example code" in prompt
    assert "Do not backslash-escape Markdown." in prompt


def test_chat_always_sends_the_system_prompt_first(
    client: TestClient, signed_up: dict[str, str], fake_ollama: list
) -> None:
    conversation_id = client.post("/api/conversations", json={"title": "c"}).json()["id"]

    client.post(f"/api/conversations/{conversation_id}/chat", json={"content": "hi"})

    sent = fake_ollama[0]
    assert sent[0]["role"] == "system"
    assert settings.assistant_name in sent[0]["content"]
    assert sent[-1] == {"role": "user", "content": "hi"}
