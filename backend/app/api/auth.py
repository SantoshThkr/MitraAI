from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)
from app.db.models import User, UserSession
from app.schemas import LoginRequest, SignupRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def _start_session(response: Response, session: SessionDep, user: User) -> None:
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.session_ttl_days)
    session.add(
        UserSession(user_id=user.id, token_hash=hash_session_token(token), expires_at=expires_at)
    )
    await session.commit()

    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, response: Response, session: SessionDep) -> User:
    email = payload.email.lower()
    if await session.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        email=email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.flush()
    await _start_session(response, session, user)
    return user


@router.post("/login", response_model=UserResponse)
async def login(payload: LoginRequest, response: Response, session: SessionDep) -> User:
    user = await session.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    await _start_session(response, session, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, session: SessionDep) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        user_session = await session.scalar(
            select(UserSession).where(UserSession.token_hash == hash_session_token(token))
        )
        if user_session is not None:
            await session.delete(user_session)
            await session.commit()

    response.delete_cookie(settings.session_cookie_name, path="/")


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser) -> User:
    return user
