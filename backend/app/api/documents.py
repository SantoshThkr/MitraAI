import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.db.models import Document
from app.rag import SUPPORTED_EXTENSIONS, index_document
from app.schemas import DocumentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


def storage_path(document_id: uuid.UUID) -> Path:
    """Files are stored under an id we generate, never under a client-supplied name."""
    return Path(settings.upload_dir) / str(document_id)


@router.get("", response_model=list[DocumentResponse])
async def list_documents(user: CurrentUser, session: SessionDep) -> list[Document]:
    result = await session.scalars(
        select(Document)
        .where(Document.user_id == user.id)
        .order_by(Document.created_at.desc())
    )
    return list(result)


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    user: CurrentUser, session: SessionDep, file: UploadFile = File(...)
) -> Document:
    filename = Path(file.filename or "").name
    if Path(filename).suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only PDF, TXT and Markdown are supported"
        )

    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The file is empty")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Files must be {settings.max_upload_bytes // (1024 * 1024)}MB or smaller",
        )

    document = Document(user_id=user.id, filename=filename, status="uploaded")
    session.add(document)
    await session.commit()
    await session.refresh(document)

    path = storage_path(document.id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)

    document.status = "processing"
    await session.commit()

    try:
        await index_document(session, document, data)
        document.status = "ready"
    except Exception:
        logger.exception("Indexing failed for document %s", document.id)
        await session.rollback()
        document = await session.get(Document, document.id)
        document.status = "failed"

    await session.commit()
    await session.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> None:
    document = await session.get(Document, document_id)
    if document is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if document.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your document")

    await session.delete(document)
    await session.commit()
    storage_path(document_id).unlink(missing_ok=True)
