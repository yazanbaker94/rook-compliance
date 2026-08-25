import os
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pypdf import PdfReader
from .extractor import extract_obligations

app = FastAPI(title="Rook Document Intelligence", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

class ExtractionRequest(BaseModel):
    document_name: str = Field(min_length=3, max_length=180)
    text: str = Field(min_length=25, max_length=500_000)

@app.get("/health")
def health():
    return {"status": "ok", "service": "rook-document-intelligence"}

@app.post("/extract")
def extract(request: ExtractionRequest):
    proposals = extract_obligations(request.text)
    return {
        "document_name": request.document_name,
        "proposal_count": len(proposals),
        "review_required": True,
        "notice": "Draft extraction only. A qualified reviewer must approve every proposal.",
        "proposals": proposals,
    }

@app.post("/extract-file")
async def extract_file(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only PDF approvals are supported")
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF exceeds the 25 MB demo limit")
    try:
        reader = PdfReader(BytesIO(content))
        marked_text = "\n".join(
            f"PAGE {page_number}\n{page.extract_text() or ''}"
            for page_number, page in enumerate(reader.pages, start=1)
        )
    except Exception as error:
        raise HTTPException(status_code=422, detail="The PDF could not be read") from error
    proposals = extract_obligations(marked_text)
    return {
        "document_name": file.filename or "approval.pdf",
        "page_count": len(reader.pages),
        "proposal_count": len(proposals),
        "review_required": True,
        "notice": "Draft extraction only. A qualified reviewer must approve every proposal.",
        "proposals": proposals,
    }
