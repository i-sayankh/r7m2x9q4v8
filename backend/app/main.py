from fastapi import FastAPI

from app.config import get_settings

settings = get_settings()
app = FastAPI(title="Wind Forecast Review API", version="0.1.0")


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
