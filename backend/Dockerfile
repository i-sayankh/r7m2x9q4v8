FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SNAPSHOT_PATH=/app/data/january_2026_snapshot.json
WORKDIR /app

COPY pyproject.toml ./pyproject.toml
COPY app ./app
COPY data ./data
RUN pip install --no-cache-dir .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
