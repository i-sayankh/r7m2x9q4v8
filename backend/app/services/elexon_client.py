from datetime import date, datetime
from typing import Any

import httpx

from app.config import get_settings
from app.schemas import ActualRecord, ForecastRecord


class ElexonUpstreamError(RuntimeError):
    """The public Elexon API could not provide a valid response."""


class ElexonClient:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        settings = get_settings()
        self.base_url = str(settings.elexon_base_url).rstrip("/")
        self.timeout = settings.elexon_timeout_seconds
        self._client = client

    async def _get_stream(self, dataset: str, params: dict[str, str]) -> list[dict[str, Any]]:
        url = f"{self.base_url}/datasets/{dataset}/stream"
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                if self._client is None:
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        response = await client.get(url, params=params)
                else:
                    response = await self._client.get(url, params=params)
                if response.status_code == 429 or response.status_code >= 500:
                    response.raise_for_status()
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, list):
                    raise ElexonUpstreamError(f"Unexpected {dataset} response: expected a JSON array")
                return payload
            except (httpx.HTTPError, ValueError) as exc:
                last_error = exc
                if attempt < 2:
                    import asyncio

                    await asyncio.sleep(0.4 * (2**attempt))
        raise ElexonUpstreamError(f"Elexon {dataset} request failed after retries: {last_error}") from last_error

    async def fetch_actuals(self, start_date: date, end_date: date) -> list[ActualRecord]:
        rows = await self._get_stream(
            "FUELHH",
            {
                "settlementDateFrom": start_date.isoformat(),
                "settlementDateTo": end_date.isoformat(),
                "fuelType": "WIND",
            },
        )
        return [ActualRecord.model_validate(row) for row in rows]

    async def fetch_forecasts(self, publish_from: datetime, publish_to: datetime) -> list[ForecastRecord]:
        rows = await self._get_stream(
            "WINDFOR",
            {
                "publishDateTimeFrom": publish_from.isoformat().replace("+00:00", "Z"),
                "publishDateTimeTo": publish_to.isoformat().replace("+00:00", "Z"),
            },
        )
        return [ForecastRecord.model_validate(row) for row in rows]
