#!/usr/bin/env bash
# Start backend + frontend together (deps must already be installed — see README).
set -e
cd "$(dirname "$0")"

(cd backend && { [ -d .venv ] && source .venv/bin/activate; } ; uvicorn main:app --reload --port 8000) &
BACK_PID=$!
trap "kill $BACK_PID" EXIT

cd frontend && npm run dev
