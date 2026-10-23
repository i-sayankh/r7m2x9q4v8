from fastapi import FastAPI

from app.config import get_settings
from app.routes.analysis import router as analysis_router

settings = get_settings()
app = FastAPI(title="Wind Forecast Review API", version="0.1.0")
app.include_router(analysis_router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
