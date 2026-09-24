import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.api.deps import CurrentUser, OwnedConversation, SessionDep
from app.core.config import settings
from app.core.ratelimit import RateLimiter
from app.db.models import Conversation, Message
from app.db.session import SessionLocal
from app.ollama import OllamaError, stream_chat
from app.rag import build_grounded_prompt, search_chunks
from app.schemas import (
    ChatRequest,
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageCreate,
    MessageResponse,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

chat_limiter = RateLimiter(settings.chat_requests_per_minute)


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(user: CurrentUser, session: SessionDep) -> list[Conversation]:
    result = await session.scalars(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.created_at.desc())
    )
    return list(result)


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate, user: CurrentUser, session: SessionDep
) -> Conversation:
    conversation = Conversation(user_id=user.id, title=payload.title)
    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation: OwnedConversation) -> Conversation:
    return conversation


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    payload: ConversationUpdate, conversation: OwnedConversation, session: SessionDep
) -> Conversation:
    conversation.title = payload.title
    await session.commit()
    await session.refresh(conversation)
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation: OwnedConversation, session: SessionDep) -> None:
    await session.delete(conversation)
    await session.commit()


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation: OwnedConversation,
    session: SessionDep,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[Message]:
    result = await session.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at, Message.id)
        .limit(limit)
        .offset(offset)
    )
    return list(result)


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_message(
    payload: MessageCreate, conversation: OwnedConversation, session: SessionDep
) -> Message:
    message = Message(
        conversation_id=conversation.id, role=payload.role, content=payload.content
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return message


def _event(payload: dict[str, object]) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _serialize(message: Message) -> dict[str, object]:
    return json.loads(MessageResponse.model_validate(message).model_dump_json())


@router.post("/{conversation_id}/chat")
async def chat(
    payload: ChatRequest,
    conversation: OwnedConversation,
    user: CurrentUser,
    session: SessionDep,
) -> StreamingResponse:
    if not chat_limiter.allow(user.id):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Please slow down."
        )

    user_message = Message(
        conversation_id=conversation.id, role="user", content=payload.content
    )
    session.add(user_message)
    await session.commit()
    await session.refresh(user_message)

    recent = await session.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(settings.chat_context_messages)
    )
    context = [
        {"role": message.role, "content": message.content} for message in reversed(list(recent))
    ]

    retrieved = await search_chunks(session, user.id, payload.content)
    if retrieved:
        context.insert(0, {"role": "system", "content": build_grounded_prompt(retrieved)})

    sources = [
        {"filename": item.filename, "page": item.page, "similarity": round(item.similarity, 4)}
        for item in retrieved
    ]
    conversation_id = conversation.id
    user_event = _event({"type": "user_message", "message": _serialize(user_message)})

    async def events() -> AsyncIterator[str]:
        yield user_event
        if sources:
            yield _event({"type": "sources", "sources": sources})

        chunks: list[str] = []
        try:
            async for token in stream_chat(context):
                chunks.append(token)
                yield _event({"type": "token", "text": token})
        except OllamaError as error:
            yield _event({"type": "error", "detail": str(error)})
            return

        reply = "".join(chunks).strip()
        if not reply:
            yield _event({"type": "error", "detail": "The AI service returned no reply."})
            return

        async with SessionLocal() as write_session:
            assistant_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=reply,
                sources=sources or None,
            )
            write_session.add(assistant_message)
            await write_session.commit()
            await write_session.refresh(assistant_message)
            yield _event({"type": "done", "message": _serialize(assistant_message)})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
