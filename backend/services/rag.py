import os
from collections import Counter
from datetime import datetime, timezone

from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import (
    ChatGoogleGenerativeAI,
    GoogleGenerativeAIEmbeddings,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")


def get_vector_db():
    embeddings = GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=GEMINI_API_KEY,
    )
    return Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embeddings)


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


def get_answer(query: str):
    db = get_vector_db()
    llm = ChatGoogleGenerativeAI(model=CHAT_MODEL, google_api_key=GEMINI_API_KEY)

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
