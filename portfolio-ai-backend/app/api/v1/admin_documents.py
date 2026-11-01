"""Private, authenticated document management API."""

from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile

from app.admin.schemas import DocumentUpdate, DocumentView, JobView
from app.admin.security import require_admin

router = APIRouter(prefix="/admin/documents", tags=["admin documents"], dependencies=[Depends(require_admin)])


def service(request: Request):
    return request.app.state.document_service


def checked_metadata(category: str, title: str | None, description: str):
    values = DocumentUpdate(category=category, description=description, **({"title": title} if title is not None else {}))
    if not values.category or not values.title and title is not None:
        raise HTTPException(422, "Category and title must contain text.")
    return values.category, values.title, values.description or ""


@router.post("", status_code=202, response_model=DocumentView)
async def upload_document(request: Request, file: UploadFile = File(...), category: str = Form(...),
                          title: str | None = Form(None), description: str = Form("")):
    category, title, description = checked_metadata(category, title, description)
    return await service(request).upload(file, category=category, title=title, description=description)


@router.post("/batch")
async def upload_many(request: Request, files: list[UploadFile] = File(...), category: str = Form(...)):
    if not files or len(files) > request.app.state.settings.document_max_files_per_upload:
        raise HTTPException(422, "Invalid PDF file count.")
    category, _, _ = checked_metadata(category, None, "")
    results = []
    for file in files:
        try:
            document = await service(request).upload(file, category=category, title=None, description="")
            results.append({"filename": file.filename, "status": "queued", "document": DocumentView.model_validate(document).model_dump(mode="json")})
        except HTTPException as exc:
            results.append({"filename": file.filename, "status": "rejected", "error": str(exc.detail)})
        except Exception:
            results.append({"filename": file.filename, "status": "failed", "error": "Storage or database operation failed."})
    return {"results": results}


@router.get("", response_model=list[DocumentView])
async def list_documents(request: Request, limit: int = 50, offset: int = 0):
    if not 1 <= limit <= 100 or offset < 0:
        raise HTTPException(422, "Invalid pagination parameters.")
    import asyncio
    return await asyncio.to_thread(service(request).repository.list, limit, offset)


@router.get("/{document_id}", response_model=DocumentView)
async def get_document(document_id: UUID, request: Request):
    import asyncio
    document = await asyncio.to_thread(service(request).repository.get, document_id)
    if document is None:
        raise HTTPException(404, "Document not found.")
    return document


@router.get("/{document_id}/download")
async def download_document(document_id: UUID, request: Request):
    import asyncio
    document = await asyncio.to_thread(service(request).repository.get, document_id)
    if document is None or document.status == "deleting":
        raise HTTPException(404, "Document not found.")
    content = await asyncio.to_thread(service(request).storage.download, document.storage_path)
    if len(content) != document.file_size:
        raise HTTPException(503, "Stored document is unavailable.")
    return Response(content=content, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename*=UTF-8''{quote(document.original_filename)}",
        "Cache-Control": "no-store",
    })


@router.patch("/{document_id}", response_model=DocumentView)
async def update_document(document_id: UUID, body: DocumentUpdate, request: Request):
    import asyncio
    document = await asyncio.to_thread(service(request).repository.update_metadata, document_id, **body.model_dump(exclude_unset=True))
    if document is None:
        raise HTTPException(404, "Document not found.")
    return document


@router.put("/{document_id}/file", status_code=202, response_model=DocumentView)
async def replace_document(document_id: UUID, request: Request, file: UploadFile = File(...)):
    return await service(request).replace(document_id, file)


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: UUID, request: Request):
    await service(request).remove(document_id)


@router.post("/{document_id}/reindex", status_code=202)
async def reindex_document(document_id: UUID, request: Request):
    import asyncio
    queued = await asyncio.to_thread(service(request).repository.queue, document_id)
    if queued is None:
        raise HTTPException(404, "Document not found.")
    if queued is False:
        raise HTTPException(409, "Document is already queued or processing.")
    return {"status": "queued"}


@router.get("/{document_id}/jobs", response_model=list[JobView])
async def document_jobs(document_id: UUID, request: Request):
    import asyncio
    if await asyncio.to_thread(service(request).repository.get, document_id) is None:
        raise HTTPException(404, "Document not found.")
    return await asyncio.to_thread(service(request).repository.jobs, document_id)
