from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, conversations, documents
from app.core.config import settings

app = FastAPI(title="MitraAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(documents.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
