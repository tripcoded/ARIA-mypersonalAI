import os
import shutil

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.memory_service import save_memory, search_memory
from services.memory_service import delete_memory
from services.ingestion import process_github, process_pdf, process_youtube
from services.rag import (
    add_to_vector_db,
    add_texts_to_vector_db,
    delete_source,
    get_answer,
    get_knowledge_stats,
    semantic_search,
)

load_dotenv()

app = FastAPI(title="ARIA API")
APP_VERSION = "2026-03-29-chat-history-v2"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aria-mypersonal-ai.vercel.app",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class URLRequest(BaseModel):
    url: str


class ChatMessage(BaseModel):
    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    message: str | None = Field(default=None, min_length=1)
    messages: list[ChatMessage] = Field(default_factory=list)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=5, ge=1, le=10)


class DeleteSourceRequest(BaseModel):
    source: str = Field(..., min_length=1)


@app.get("/")
def read_root():
    return {"message": "Welcome to ARIA API"}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": APP_VERSION,
        "features": {
            "conversation_history": True,
        },
    }


@app.get("/knowledge/stats")
def knowledge_stats():
    try:
        return get_knowledge_stats()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.delete("/knowledge/source")
def remove_knowledge_source(request: DeleteSourceRequest = Body(...)):
    try:
        return delete_source(request.source)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
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
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ingest/youtube")
async def ingest_youtube(request: URLRequest):
    try:
        text = process_youtube(request.url)
        add_to_vector_db(text, f"YouTube: {request.url}", source_type="youtube")
        return {"url": request.url, "status": "processed"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ingest/github")
async def ingest_github(request: URLRequest):
    try:
        data = process_github(request.url, os.getenv("GITHUB_TOKEN"))
        add_texts_to_vector_db(
            [
                {
                    "text": file["content"],
                    "source": f"GitHub: {request.url}/{file['path']}",
                }
                for file in data
            ],
            source_type="github",
        )
        return {"url": request.url, "status": "processed", "files_count": len(data)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/chat")
async def chat(request: ChatRequest = Body(...)):
    try:
        conversation = [
            {"role": item.role, "content": item.content}
            for item in request.messages
            if item.content.strip()
        ]

        current_message = request.message.strip() if request.message else ""

        if not current_message and conversation:
            for item in reversed(conversation):
                if item["role"].lower() == "user":
                    current_message = item["content"].strip()
                    break

        if not current_message:
            raise HTTPException(status_code=400, detail="A user message is required.")

        if not conversation:
            conversation = [{"role": "user", "content": current_message}]

        response = get_answer(current_message, conversation=conversation)

        if response is None:
            raise HTTPException(status_code=500, detail="ARIA failed to generate a response.")

        return {
            "query": current_message,
            "answer": response.get("answer", ""),
            "sources": response.get("sources", []),
            }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    
from services.memory_service import search_memory
from chromadb import Client

@app.get("/memories")
def get_memories():
    from services.memory_service import collection
    return collection.get()

@app.delete("/memories/{memory_id}")
def remove_memory(memory_id: str):
    return delete_memory(memory_id)
