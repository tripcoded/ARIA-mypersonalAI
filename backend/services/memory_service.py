import os

import chromadb
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()

DATA_DIR = os.getenv("DATA_DIR", ".")
CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", os.path.join(DATA_DIR, "chroma_db"))

client = chromadb.Client(
    settings=chromadb.config.Settings(
        persist_directory=CHROMA_DB_DIR
    )
)

collection = client.get_or_create_collection("aria_memory")

model = SentenceTransformer("all-MiniLM-L6-v2")


def save_memory(text):
    embedding = model.encode(text).tolist()

    collection.add(
        documents=[text],
        embeddings=[embedding],
        ids=[str(hash(text))]
    )


def search_memory(query):
    embedding = model.encode(query).tolist()

    results = collection.query(
        query_embeddings=[embedding],
        n_results=5
    )

    return results["documents"]

def delete_memory(memory_id: str):
    collection.delete(ids=[memory_id])
    return {"deleted": memory_id}
