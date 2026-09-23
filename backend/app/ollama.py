import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = httpx.Timeout(10.0, read=300.0)


class OllamaError(RuntimeError):
    """Raised with a message that is safe to show to the client."""


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
                    raise OllamaError("The AI service is unavailable.")

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
