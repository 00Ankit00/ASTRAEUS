# ASTRAEUS

ASTRAEUS is a visualization-first satellite intelligence platform for exploring geospatial change, administrative boundaries, and natural-language-driven analysis. The project combines a FastAPI backend, a React + TypeScript frontend, and supporting infrastructure for PostgreSQL, Redis, and MinIO.

## Overview

This repository includes:

- A FastAPI backend for geospatial queries, change detection workflows, and chat-style analysis
- A Vite + React + TypeScript frontend for interactive map-based visualization
- Docker-based infrastructure for PostgreSQL, Redis, and MinIO
- A convenience launcher for starting the full stack locally

## Project Structure

- backend/ - FastAPI application, database models, schemas, and services
- frontend/ - React frontend and map UI
- infrastructure/ - Docker Compose configuration and SQL initialization
- start.sh - Script to run the full stack locally

## Prerequisites

Before running the project locally, make sure you have:

- Python 3.11+
- Node.js 18+
- npm
- Docker Desktop (for local infrastructure services)

## Quick Start

### 1. Start infrastructure services

```bash
cd infrastructure
docker compose up -d
```

### 2. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at:

- http://localhost:8000/docs

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:

- http://localhost:5173

### 4. Or use the launcher script

```bash
./start.sh
```

## Main API Endpoints

- GET /api/health - Health check
- GET /api/scenes - List satellite scenes
- GET /api/scenes/{scene_id} - Fetch one scene
- POST /api/change-detect - Start change detection
- GET /api/change-detect/{job_id}/status - Check job status
- POST /api/analyze - Run natural-language analysis
- POST /api/chat - Chat-based interaction endpoint

## Development Notes

- Backend tests can be run with:

```bash
cd backend
pytest
```

- The frontend can be built with:

```bash
cd frontend
npm run build
```

## Technologies

- Backend: FastAPI, SQLAlchemy, Pydantic
- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand
- Data/Infra: PostgreSQL + PostGIS, Redis, MinIO, Docker

## License

This project is currently for development and demonstration purposes.
