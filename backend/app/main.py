import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routes.analysis import router as analysis_router

settings = get_settings()
app = FastAPI(title="Wind Forecast Review API", version="0.1.0")
app.include_router(analysis_router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


frontend_dist = os.getenv("FRONTEND_DIST")
if frontend_dist and (Path(frontend_dist) / "index.html").is_file():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
