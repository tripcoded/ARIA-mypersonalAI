import os
import shutil

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.ingestion import process_github, process_pdf, process_youtube
from services.rag import (
    add_to_vector_db,
    get_answer,
    get_knowledge_stats,
    semantic_search,
)

load_dotenv()

app = FastAPI(title="ARIA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class URLRequest(BaseModel):
    url: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=5, ge=1, le=10)


@app.get("/")
def read_root():
    return {"message": "Welcome to ARIA API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/knowledge/stats")
def knowledge_stats():
    try:
        return get_knowledge_stats()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/search")
def search_knowledge(request: SearchRequest):
    try:
        return {"results": semantic_search(request.query, request.limit)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ingest/pdf")
async def ingest_pdf(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        text = process_pdf(file_path)
        add_to_vector_db(text, f"PDF: {file.filename}", source_type="pdf")
        return {"filename": file.filename, "status": "processed"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ingest/youtube")
async def ingest_youtube(request: URLRequest):
    try:
        text = process_youtube(request.url)
        add_to_vector_db(text, f"YouTube: {request.url}", source_type="youtube")
        return {"url": request.url, "status": "processed"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ingest/github")
async def ingest_github(request: URLRequest):
    try:
        data = process_github(request.url, os.getenv("GITHUB_TOKEN"))
        for file in data:
            add_to_vector_db(
                file["content"],
                f"GitHub: {request.url}/{file['path']}",
                source_type="github",
            )
        return {"url": request.url, "status": "processed", "files_count": len(data)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/chat")
async def chat(request: ChatRequest = Body(...)):
    try:
        response = get_answer(request.message)

        if response is None:
            raise HTTPException(status_code=500, detail="ARIA failed to generate a response.")

        return {
            "query": request.message,
            "answer": response.get("answer", ""),
            "sources": response.get("sources", []),
            }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
