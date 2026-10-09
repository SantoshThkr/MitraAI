import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = httpx.Timeout(10.0, read=300.0)


class OllamaError(RuntimeError):
    """Raised with a message that is safe to show to the client."""


def describe_failure(status_code: int, body: str, model: str) -> str:
    """A client-safe message that still tells the operator what to do.

    Ollama answers 404 when the server is healthy but the model was never pulled, which
    is the normal state of a fresh install. Reporting that as "unavailable" sends people
    looking for a network fault instead of running `ollama pull`.
    """
    if status_code == 404 and "not found" in body.lower():
        return f"The model '{model}' is not installed on the AI service."
    return "The AI service is unavailable."


async def stream_chat(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    """Yield reply chunks from Ollama as they arrive."""
    payload = {"model": settings.ollama_model, "messages": messages, "stream": True}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            async with client.stream(
                "POST", f"{settings.ollama_base_url}/api/chat", json=payload
            ) as response:
                if response.status_code != 200:
                    await response.aread()
                    logger.error(
                        "Ollama returned %s: %s", response.status_code, response.text
                    )
                    raise OllamaError(
                        describe_failure(
                            response.status_code, response.text, settings.ollama_model
                        )
                    )

                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        logger.warning("Skipping malformed Ollama line")
                        continue

                    content = chunk.get("message", {}).get("content", "")
                    if content:
                        yield content
                    if chunk.get("done"):
                        return
    except httpx.HTTPError as error:
        logger.error("Ollama request failed: %s", error)
        raise OllamaError("The AI service is unavailable.") from error
