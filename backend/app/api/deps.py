import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import hash_session_token
from app.db.models import Conversation, User, UserSession
from app.db.session import get_session

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_current_user(request: Request, session: SessionDep) -> User:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    user_session = await session.scalar(
        select(UserSession)
        .where(UserSession.token_hash == hash_session_token(token))
        .options(selectinload(UserSession.user))
    )
    if user_session is None or user_session.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    return user_session.user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_owned_conversation(
    conversation_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Conversation:
    conversation = await session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    if conversation.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your conversation")
    return conversation


OwnedConversation = Annotated[Conversation, Depends(get_owned_conversation)]
