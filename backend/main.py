"""FastAPI backend for Grover's Ocean.

Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import quantum

app = FastAPI(title="Grover's Ocean — quantum backend")

# The Vite dev server runs on another port, so allow it to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CircuitRequest(BaseModel):
    num_tiles: int = Field(default=16, description="Number of tiles/shells (power of 2)")
    target: int = Field(description="Index of the pearl/fish tile")
    ops: list[str] = Field(default_factory=list, description='Sequence of "spread"|"mark"|"mirror"')


class SampleRequest(CircuitRequest):
    shots: int = Field(default=1, description="Number of measurement shots")


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/state")
def get_state(req: CircuitRequest) -> dict:
    """Exact amplitudes + probabilities + live circuit diagram for a sequence of ops."""
    try:
        return quantum.state(req.num_tiles, req.target, req.ops)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/sample")
def get_sample(req: SampleRequest) -> dict:
    """Honest measurement: sample shots from the circuit's true output distribution."""
    try:
        return quantum.sample(req.num_tiles, req.target, req.ops, req.shots)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class BenchRequest(BaseModel):
    columns: list[list[dict]] = Field(default_factory=list, description="Workbench gate columns")
    puzzle: str = Field(default="free", description='"flip"|"spread"|"mark0".."mark3"|"mirror"|"free"')
    shots: int | None = Field(default=None, description="Optional: sample measurement shots")


@app.post("/api/bench")
def post_bench(req: BenchRequest) -> dict:
    """Level 7 (The Spellsmith): run and verify a player-built gate circuit."""
    try:
        return quantum.bench(req.columns, req.puzzle, req.shots)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
