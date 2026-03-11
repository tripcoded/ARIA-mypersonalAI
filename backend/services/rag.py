import os
from collections import Counter
from datetime import datetime, timezone

from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")


def get_vector_db():
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    return Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings
    )
    

def add_to_vector_db(text: str, source: str, source_type: str = "unknown"):
    if not text.strip():
        raise ValueError("No extractable text found for ingestion.")

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    ingested_at = datetime.now(timezone.utc).isoformat()
    docs = [
        Document(
            page_content=chunk,
            metadata={
                "source": source,
                "source_type": source_type,
                "ingested_at": ingested_at,
            },
        )
        for chunk in text_splitter.split_text(text)
    ]

    db = get_vector_db()
    db.add_documents(docs)
    db.persist()


def add_texts_to_vector_db(items: list[dict], source_type: str = "unknown"):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    ingested_at = datetime.now(timezone.utc).isoformat()
    docs = []

    for item in items:
        text = item.get("text", "")
        source = item.get("source", "Unknown source")

        if not text or not text.strip():
            continue

        for chunk in text_splitter.split_text(text):
            docs.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "source": source,
                        "source_type": source_type,
                        "ingested_at": ingested_at,
                    },
                )
            )

    if not docs:
        raise ValueError("No extractable text found for ingestion.")

    db = get_vector_db()
    db.add_documents(docs)
    db.persist()


def semantic_search(query: str, limit: int = 5):
    db = get_vector_db()
    results = db.similarity_search_with_score(query, k=limit)

    return [
        {
            "content": doc.page_content,
            "source": doc.metadata.get("source", "Unknown source"),
            "source_type": doc.metadata.get("source_type", "unknown"),
            "ingested_at": doc.metadata.get("ingested_at"),
            "score": float(score),
        }
        for doc, score in results
    ]


def get_knowledge_stats():
    db = get_vector_db()
    raw = db.get(include=["metadatas"])
    metadatas = raw.get("metadatas") or []
    unique_sources = {}
    source_type_counts = Counter()

    for metadata in metadatas:
        source = metadata.get("source", "Unknown source")
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


def delete_source(source: str):
    if not source or not source.strip():
        raise ValueError("Source is required.")

    db = get_vector_db()
    matches = db.get(where={"source": source}, include=[])
    ids = matches.get("ids") or []

    if not ids:
        raise ValueError("Indexed source not found.")

    db.delete(ids=ids)
    db.persist()

    return {"deleted_count": len(ids), "source": source}


def get_answer(query: str):
    db = get_vector_db()
    llm = ChatGroq(
        model=CHAT_MODEL,
        api_key=GROQ_API_KEY
    )

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=(
          """
            You are ARIA, Om's personal AI memory assistant.

            Your job is to answer questions using the provided context from Om's saved knowledge
            (PDFs, YouTube videos, GitHub repositories).

            Respond like a natural assistant in conversation.

            Rules:
            - Speak naturally like a helpful AI assistant.
            - Avoid bullet lists unless the user explicitly asks for a list.
            - Do NOT say phrases like "Here is a summary".
            - Explain information smoothly like you are talking to a person.
            - Only use information from the provided context.

            Context:
            {context}

            User Question:
            {question}

            Answer naturally:
            """
        ),
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=db.as_retriever(search_kwargs={"k": 5}),
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True,
    )

    result = qa_chain.invoke({"query": query})
    
    # Deduplicate sources while maintaining order
    seen_sources = set()
    unique_sources = []
    for doc in result["source_documents"]:
        source = doc.metadata.get("source", "Unknown source")
        if source not in seen_sources:
            unique_sources.append(source)
            seen_sources.add(source)
    
    return {
        "answer": result["result"],
        "sources": unique_sources,
    }
