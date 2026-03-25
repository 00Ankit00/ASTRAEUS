#!/usr/bin/env bash

# Change to the script's directory so it can be run from anywhere
cd "$(dirname "$0")"

echo "=========================================="
echo "    🚀 STARTING PROJECT ASTRAEUS 🚀    "
echo "=========================================="

cleanup() {
    echo ""
    echo "=========================================="
    echo "    🛑 SHUTTING DOWN ASTRAEUS 🛑       "
    echo "=========================================="
    
    echo "Stopping infrastructure containers..."
    (cd infrastructure && docker-compose down)
    
    echo "Stopping backend and frontend processes..."
    # kill 0 sends SIGTERM to all processes in the current process group
    # We trap EXIT so it runs automatically. We disable the trap first to avoid recursion.
    trap - SIGINT SIGTERM EXIT
    kill 0
}

# Trap INT and TERM signals to trigger cleanup gracefully on Ctrl+C or kill
trap cleanup SIGINT SIGTERM EXIT

echo ""
echo "🐳 [1/3] Starting Infrastructure (PostgreSQL, Redis, MinIO)..."
(cd infrastructure && docker-compose up -d)

echo "⏳ Waiting 3s for databases to initialize..."
sleep 3

echo ""
echo "⚙️  [2/3] Starting FastAPI Backend..."
(
    cd backend
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    fi
    # Optionally pipe to sed to cleanly prefix logs
    echo "Starting Uvicorn..."
    uvicorn main:app --reload --port 8000
) &

echo ""
echo "💻 [3/3] Starting Vite Frontend..."
(
    cd frontend
    echo "Starting npm..."
    npm run dev
) &

echo ""
echo "=========================================="
echo "✨ All systems are online! ✨"
echo "🟢 Backend API: http://localhost:8000/docs"
echo "🟢 Frontend UI: http://localhost:5173"
echo "=========================================="
echo "Press Ctrl+C at any time to gracefully shut down all services."

# Wait indefinitely for background jobs so the trap stays active listening for Ctrl+C
wait
