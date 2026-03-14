import os
from collections import Counter
from datetime import datetime, timezone

from dotenv import load_dotenv
from services.memory_service import search_memory, save_memory

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq

load_dotenv()

CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")


# Load embeddings once (important for performance)
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


def get_vector_db():
    return Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings
    )


# -----------------------------
# INGESTION
# -----------------------------

def add_to_vector_db(text: str, source: str, source_type: str = "unknown"):

    if not text.strip():
        raise ValueError("No extractable text found.")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )

    ingested_at = datetime.now(timezone.utc).isoformat()

    docs = [
        Document(
            page_content=chunk,
            metadata={
                "source": source,
                "source_type": source_type,
                "ingested_at": ingested_at,
            }
        )
        for chunk in splitter.split_text(text)
    ]

    db = get_vector_db()
    db.add_documents(docs)
    db.persist()


def add_texts_to_vector_db(items: list[dict], source_type: str = "unknown"):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )

    ingested_at = datetime.now(timezone.utc).isoformat()
    docs = []

    for item in items:

        text = item.get("text", "")
        source = item.get("source", "Unknown")

        if not text.strip():
            continue

        for chunk in splitter.split_text(text):

            docs.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "source": source,
                        "source_type": source_type,
                        "ingested_at": ingested_at,
                    }
                )
            )

    if not docs:
        raise ValueError("No extractable text found.")

    db = get_vector_db()
    db.add_documents(docs)
    db.persist()


# -----------------------------
# SEARCH
# -----------------------------

def semantic_search(query: str, limit: int = 5):

    db = get_vector_db()

    results = db.similarity_search_with_score(query, k=limit)

    return [
        {
            "content": doc.page_content,
            "source": doc.metadata.get("source", "Unknown"),
            "source_type": doc.metadata.get("source_type", "unknown"),
            "ingested_at": doc.metadata.get("ingested_at"),
            "score": float(score),
        }
        for doc, score in results
    ]


# -----------------------------
# KNOWLEDGE STATS
# -----------------------------

def get_knowledge_stats():

    db = get_vector_db()

    raw = db.get(include=["metadatas"])

    metadatas = raw.get("metadatas") or []

    unique_sources = {}
    source_type_counts = Counter()

    for metadata in metadatas:

        source = metadata.get("source", "Unknown")
        source_type = metadata.get("source_type", "unknown")

        source_type_counts[source_type] += 1

        if source not in unique_sources:
            unique_sources[source] = {
                "source": source,
                "source_type": source_type,
                "ingested_at": metadata.get("ingested_at"),
            }

    sources = sorted(
        unique_sources.values(),
        key=lambda item: item.get("ingested_at") or "",
        reverse=True,
    )

    return {
        "chunk_count": len(raw.get("ids") or []),
        "source_count": len(sources),
        "source_types": dict(source_type_counts),
        "sources": sources,
    }


# -----------------------------
# DELETE SOURCE
# -----------------------------

def delete_source(source: str):

    if not source.strip():
        raise ValueError("Source required")

    db = get_vector_db()

    matches = db.get(where={"source": source}, include=[])

    ids = matches.get("ids") or []

    if not ids:
        raise ValueError("Source not found")

    db.delete(ids=ids)
    db.persist()

    return {"deleted_count": len(ids), "source": source}


# -----------------------------
# MAIN AI RESPONSE
# -----------------------------

def get_answer(query: str):

    db = get_vector_db()
    # simple memory trigger
    if "remember this" in query.lower() or "save this" in query.lower():
        save_memory(query)

    # Retrieve personal memories
    memories = search_memory(query)
    memory_text = "\n".join(memories[0]) if memories else ""

    # Retrieve knowledge docs
    retriever = db.as_retriever(search_kwargs={"k": 5})
    docs = retriever.invoke(query)

    knowledge_context = "\n\n".join(doc.page_content for doc in docs)

    prompt = f"""

                Your role is to help Om by answering questions using the provided context from his saved knowledge
                (PDFs, YouTube videos, GitHub repositories).

                Your personality:
                You are intelligent, calm, slightly witty, and easy to talk to. You respond like a thoughtful human assistant rather than a robotic system. You can occasionally add a light, subtle touch of humor when appropriate, but you always remain mature and helpful.

                Conversation style:

                * Speak naturally like a friendly and thoughtful AI assistant.
                * Adapt your tone based on the user's question. If the question is serious or technical, respond clearly and professionally. If the conversation is casual, you may sound a bit more relaxed and conversational.
                * Avoid sounding robotic or overly formal.
                * Explain things smoothly as if you are talking to a person sitting in front of you.
                * Keep responses clear and easy to understand.

                Rules:

                * Only use information from the provided context when answering.
                * If the context does not contain the answer, politely say that you cannot find the information in Om's saved knowledge.
                * Avoid bullet lists unless the user explicitly asks for a list.
                * Do NOT say phrases like "Here is a summary" or "Based on the context provided".
                * Do not mention the word "context" to the user.
                * Respond directly and naturally.

Known memories about Om:
{memory_text}

Knowledge from Om's saved sources:
{knowledge_context}

User question:
{query}

Answer naturally as ARIA.
"""

    llm = ChatGroq(
        model=CHAT_MODEL,
        api_key=GROQ_API_KEY
    )

    response = llm.invoke(prompt)

    return {
        "answer": response.content,
        "sources": [doc.metadata.get("source", "Unknown") for doc in docs]
    }