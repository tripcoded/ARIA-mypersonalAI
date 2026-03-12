# ARIA — Personal Knowledge AI Assistant

ARIA is a **full-stack personal knowledge assistant** that ingests multiple knowledge sources and allows users to query them through an intelligent chat interface powered by **Retrieval-Augmented Generation (RAG)**.

ARIA can process:

* PDF documents
* YouTube video transcripts
* GitHub repositories

The system converts these sources into vector embeddings stored in a semantic database and retrieves the most relevant information to generate contextual answers.

ARIA aims to function as a **personal AI knowledge brain**, allowing users to build a searchable memory of their documents, repositories, and learning resources.

---

# Key Features

### Multi-Source Knowledge Ingestion

ARIA can ingest knowledge from multiple sources including:

* PDF documents
* YouTube transcripts
* GitHub repositories

Each source is processed and converted into embeddings for semantic retrieval.

---

### Retrieval-Augmented Chat

ARIA answers questions by retrieving the most relevant knowledge chunks from the vector database and passing them to a language model for contextual response generation.

This approach ensures:

* grounded answers
* traceable sources
* reduced hallucinations

---

### Source Management

Users can review all indexed knowledge sources through a **knowledge ledger** interface and remove individual sources if necessary.

This allows dynamic control of the knowledge base.

---

### Vector Database Powered Search

All document chunks are embedded using **HuggingFace embeddings** and stored in a **Chroma vector database**, enabling fast semantic search.

---

### GitHub Repository Indexing

ARIA can ingest GitHub repositories and index source files.

To prevent excessively long indexing jobs, repository ingestion is intentionally limited by:

* maximum file count
* maximum file size

---

# System Architecture

ARIA uses a **Retrieval Augmented Generation pipeline**.

```
User
 │
 ▼
Frontend (Next.js)
 │
 ▼
FastAPI Backend
 │
 ├── Ingestion Pipeline
 │     ├ PDF parsing
 │     ├ GitHub repository crawling
 │     └ YouTube transcript extraction
 │
 ├── Embedding Generation
 │     └ HuggingFace embeddings
 │
 ├── Vector Storage
 │     └ Chroma database
 │
 ▼
Retriever
 │
 ▼
LLM (Groq)
 │
 ▼
Generated Response
```

---

# Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Backend

* FastAPI
* LangChain
* Chroma Vector Database
* HuggingFace Embeddings

## AI Infrastructure

* Groq LLM API
* Retrieval Augmented Generation (RAG)

---

# Repository Structure

```
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── services/
│   │   ├── ingestion.py
│   │   └── rag.py
│   └── .env.example
│
├── frontend/
│   ├── package.json
│   └── src/
│
└── README.md
```

---

# Environment Configuration

Create a `.env` file in the backend directory using `.env.example`.

### Required

```
GROQ_API_KEY=
```

### Optional

```
GROQ_CHAT_MODEL=
CHROMA_DB_DIR=
GITHUB_TOKEN=
GITHUB_MAX_FILES=
GITHUB_MAX_FILE_BYTES=
```

---

# Local Development Setup

## Backend

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

---

## Frontend

```
cd frontend
npm install
npm run dev
```

The frontend will connect to:

```
http://localhost:8000
```

unless overridden using:

```
NEXT_PUBLIC_API_URL
```

---

# Operational Notes

### GitHub Repository Ingestion

GitHub repositories are indexed with limits to prevent extremely long ingestion jobs.

This keeps indexing practical and prevents excessive memory usage.

---

### YouTube Ingestion

YouTube transcript ingestion is currently **experimental**.

In some cases:

* transcript extraction may fail
* transcripts may be unavailable
* ingestion may return empty content

Because of this, YouTube ingestion should not yet be considered fully reliable.

---

# Current Limitations

## Backend Deployment

The backend service is currently intended to run **locally**.

ARIA performs several compute-intensive operations including:

* document parsing
* chunk generation
* embedding creation
* vector indexing
* retrieval orchestration

Most free-tier cloud platforms provide limited resources such as:

* low memory
* limited CPU
* restricted execution time
* non-persistent disk storage

These limitations make stable deployment difficult without dedicated infrastructure.

Future deployment will require infrastructure capable of supporting:

* persistent vector storage
* longer ingestion jobs
* higher memory availability

---

## Voice Input

ARIA includes an experimental voice interaction interface.

Voice input is currently **not fully reliable** and may fail due to:

* browser speech recognition inconsistencies
* microphone permission handling
* device compatibility differences
* speech-to-text accuracy variations

For now, **text input is the recommended interaction method**.

---

# Security

Never commit the following:

* `.env` files
* API keys
* GitHub tokens

Always use `.env.example` as the public configuration template.

If any credential has been exposed in commits or screenshots, it should be rotated immediately.

---

# Roadmap

Future improvements planned for ARIA include:

* scalable backend deployment
* improved YouTube ingestion reliability
* persistent cloud vector storage
* improved document chunking
* better source attribution
* real-time streaming responses
* improved voice interaction

---

# License

Copyright (c) 2026 Om
All rights reserved.

This repository, its source code, documentation, design, and associated materials are proprietary.

No part of this repository may be copied, reproduced, distributed, modified, sublicensed, published, or used for commercial or non-commercial redistribution without prior explicit written permission from the copyright holder.
