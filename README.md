# Wind Forecast Review

A compact review dashboard for comparing Elexon's day-ahead national wind forecasts with reported wind generation during January 2026. The interface shows forecast error by delivery hour, daily accuracy measures, and the month-wide error trend.

## Status

- Hosted application: [Open the deployed app](https://r7m2x9q4v8.vercel.app/).
- Walkthrough video: [Watch the YouTube demo](https://youtu.be/eJ5Ug8N1-40).
- Analysis window: **1–31 January 2026**.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Shadcn UI patterns, Recharts.
- Backend: Python, FastAPI, Pydantic, HTTPX.
- Data: Elexon Insights public API, with a checked-in January fallback snapshot.
- Containers: Docker and Docker Compose.

## Data and method

The app reads Elexon `WINDFOR` wind-generation forecasts and `FUELHH` actual wind output. Elexon's API is public and does not require an API key. The source data is national operationally metered output; it does not include embedded wind generation, so it should not be interpreted as all wind generation connected to Great Britain.

For each delivery day, the forecast decision cutoff is **09:20 Europe/London on the preceding day**. For each delivery interval, the app selects the newest WINDFOR publication at or before that cutoff. It compares those values with the latest available FUELHH actual values. WINDFOR is hourly and FUELHH is half-hourly; the two actual MW readings are averaged for each forecast hour. Missing periods are left missing, and conflicting values at the latest publication are excluded from the score and surfaced as a quality note.

The reported metrics use matched hourly periods only:

- **MAE**: mean of the absolute forecast error.
- **RMSE**: square root of the mean squared forecast error.
- **Bias**: mean of `forecast − actual`; positive means over-forecast.
- **WAPE**: sum of absolute errors divided by total matched actual generation, multiplied by 100. It is unavailable when the denominator is zero.
- **Matched periods**: number of hourly forecast and actual pairs included in the metrics.

Live data is preferred. If Elexon is unavailable, rate-limited, returns a malformed response, or provides an incomplete January window, the API serves `backend/data/january_2026_snapshot.json` and labels the source as a snapshot in the dashboard.

Source documentation: [Elexon Insights API guide](https://github.com/elexon-data/insights-docs/blob/main/docs/insights_data_platform.md) · [Elexon wind generation](https://bmrs.elexon.co.uk/wind-generation).

## Run locally with Docker Compose

Requirements: Docker Engine/Desktop with Compose.

```sh
docker compose up --build
```

Open the dashboard at [http://localhost:5173](http://localhost:5173). The FastAPI service is at [http://localhost:8000](http://localhost:8000); its interactive API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

Optional local settings can be placed in an untracked `.env` file. Start from `.env.example`. The Compose setup passes the Elexon API base URL, cache TTL, and request timeout to the backend.

## Build the single-container app

The root `Dockerfile` builds the React bundle and serves the frontend and API from FastAPI in one image.

```sh
docker build -t wind-forecast-review .
docker run --rm -p 8000:8000 wind-forecast-review
```

Open [http://localhost:8000](http://localhost:8000). The container honors the `PORT` environment variable for platform hosting.

## API

- `GET /api/health` — liveness response.
- `GET /api/analysis/january-2026?date=2026-01-15&cutoff=09:20` — interval series, daily metrics, monthly aggregate, coverage, quality notes, and source mode.
- `GET /api/analysis/january-2026/daily?cutoff=09:20` — daily January metrics for the trend chart.
- `POST /api/refresh` — refresh the in-memory live-data cache; returns fallback mode if the upstream API cannot provide the complete window.

## Project layout

```text
backend/       FastAPI app, Elexon adapter, analysis services, January snapshot
frontend/      React dashboard and reusable UI components
Dockerfile     Single-container production build
docker-compose.yml  Local frontend and backend services
```

## AI tools disclosure

OpenAI Codex assisted with implementation and code drafting. The data source, forecast cutoff, scoring definitions, and product scope were selected for this assignment.
