# ARIA

ARIA is a full-stack personal knowledge assistant that ingests PDFs, YouTube transcripts, and GitHub repositories, stores them in a Chroma vector database, and answers questions through a chat interface backed by retrieval-augmented generation.

## Overview

The repository contains:

- `frontend/`: Next.js application for ingestion, chat, knowledge review, and source deletion
- `backend/`: FastAPI service for ingestion, vector storage, retrieval, and chat orchestration

## Core Features

- PDF ingestion
- YouTube transcript ingestion
- GitHub repository ingestion with file limits for practical indexing
- Retrieval-augmented chat over indexed knowledge
- Indexed source ledger with per-source deletion
- Chroma-backed semantic search and source metadata tracking

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, LangChain, Chroma, HuggingFace embeddings
- LLM provider: Groq

## Repository Structure

```text
.
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- services/
|   |   |-- ingestion.py
|   |   `-- rag.py
|   `-- .env.example
|-- frontend/
|   |-- package.json
|   `-- src/
`-- README.md
```

## Environment Configuration

Create `backend/.env` from `backend/.env.example`.

Required backend settings:

- `GROQ_API_KEY`

Optional backend settings:

- `GROQ_CHAT_MODEL`
- `CHROMA_DB_DIR`
- `GITHUB_TOKEN`
- `GITHUB_MAX_FILES`
- `GITHUB_MAX_FILE_BYTES`

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000` unless `NEXT_PUBLIC_API_URL` is set.

## Operational Notes

- GitHub ingestion is intentionally bounded to avoid excessively long indexing jobs.
- YouTube ingestion is currently unreliable and should be treated as experimental.
- A YouTube URL may be accepted by the UI and sent to the backend, but transcript retrieval can still fail or return no usable content.
- At the moment, YouTube ingestion should not be considered a dependable source of indexed knowledge for this project.
- Indexed sources can be removed directly from the frontend knowledge ledger.
- Local runtime artifacts such as `chroma_db/`, `uploads/`, logs, virtual environments, and build output should not be committed.

## Security

- Do not commit live API keys, GitHub tokens, or populated `.env` files.
- Use `backend/.env.example` as the public configuration template.
- Rotate any credential that has already been exposed in version control or screenshots.

## Copyright

Copyright (c) 2026 Om.
All rights reserved.

This repository, its source code, documentation, design, and associated materials are proprietary.
No part of this repository may be copied, reproduced, distributed, modified, sublicensed, published, or used for commercial or non-commercial redistribution without prior explicit written permission from the copyright holder.
