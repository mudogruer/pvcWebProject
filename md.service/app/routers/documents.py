import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..data_loader import load_json, save_json

router = APIRouter(prefix="/documents", tags=["documents"])

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DOCS_DIR = BASE_DIR / "md.docs" / "documents"

# Ensure directories exist
DOCS_DIR.mkdir(parents=True, exist_ok=True)
for subdir in ["olcu", "teknik", "sozlesme", "teklif", "diger"]:
    (DOCS_DIR / subdir).mkdir(exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


class DocumentMeta(BaseModel):
    jobId: str
    type: str
    description: str | None = None


@router.get("/")
def list_documents(job_id: str | None = None, doc_type: str | None = None):
    """List all documents, optionally filtered by jobId or type"""
    docs = load_json("documents.json")
    if job_id:
        docs = [d for d in docs if d.get("jobId") == job_id]
    if doc_type:
        docs = [d for d in docs if d.get("type") == doc_type]
    return docs


@router.get("/{doc_id}")
def get_document(doc_id: str):
    """Get document metadata by ID"""
    docs = load_json("documents.json")
    for doc in docs:
        if doc.get("id") == doc_id:
            return doc
    raise HTTPException(status_code=404, detail="Döküman bulunamadı")


@router.get("/{doc_id}/download")
def download_document(doc_id: str):
    """Download a document file"""
    docs = load_json("documents.json")
    doc = None
    for d in docs:
        if d.get("id") == doc_id:
            doc = d
            break
    
    if not doc:
        raise HTTPException(status_code=404, detail="Döküman bulunamadı")
    
    file_path = BASE_DIR / "md.docs" / doc["path"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    return FileResponse(
        path=str(file_path),
        filename=doc.get("originalName", doc["filename"]),
        media_type=doc.get("mimeType", "application/octet-stream")
    )


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    jobId: str = Form(...),
    docType: str = Form(...),
    description: str = Form(None)
):
    """
    Upload a document file.
    docType: olcu, teknik, sozlesme, teklif, diger
    """
    # Validate type
    if docType not in ["olcu", "teknik", "sozlesme", "teklif", "diger"]:
        raise HTTPException(status_code=400, detail="Geçersiz döküman tipi")
    
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya tipi: {content_type}. Desteklenen: JPEG, PNG, GIF, PDF, DOC, DOCX"
        )
    
    # Generate unique filename
    ext = ALLOWED_TYPES.get(content_type, ".bin")
    doc_id = f"DOC-{str(uuid.uuid4())[:8].upper()}"
    safe_name = f"{doc_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{ext}"
    
    # Save file
    target_dir = DOCS_DIR / docType
    target_path = target_dir / safe_name
    
    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya kaydedilemedi: {str(e)}")
    
    # Get file size
    file_size = target_path.stat().st_size
    
    # Create metadata
    doc_meta = {
        "id": doc_id,
        "jobId": jobId,
        "type": docType,
        "filename": safe_name,
        "originalName": file.filename,
        "path": f"documents/{docType}/{safe_name}",
        "mimeType": content_type,
        "size": file_size,
        "uploadedBy": "Kullanıcı",
        "uploadedAt": datetime.utcnow().isoformat() + "Z",
        "description": description
    }
    
    # Save to database
    docs = load_json("documents.json")
    docs.insert(0, doc_meta)
    save_json("documents.json", docs)
    
    return doc_meta


@router.delete("/{doc_id}")
def delete_document(doc_id: str):
    """Delete a document and its file"""
    docs = load_json("documents.json")
    doc = None
    doc_idx = -1
    
    for idx, d in enumerate(docs):
        if d.get("id") == doc_id:
            doc = d
            doc_idx = idx
            break
    
    if not doc:
        raise HTTPException(status_code=404, detail="Döküman bulunamadı")
    
    # Delete file
    file_path = BASE_DIR / "md.docs" / doc["path"]
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass  # File deletion is best effort
    
    # Remove from database
    docs.pop(doc_idx)
    save_json("documents.json", docs)
    
    return {"success": True, "id": doc_id}


@router.get("/job/{job_id}")
def get_job_documents(job_id: str):
    """Get all documents for a specific job"""
    docs = load_json("documents.json")
    return [d for d in docs if d.get("jobId") == job_id]

