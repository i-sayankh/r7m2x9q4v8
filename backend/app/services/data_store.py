import asyncio
import json
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
from pathlib import Path

from app.schemas import ActualRecord, ForecastRecord, JanuarySnapshot
from app.config import get_settings
from app.services.elexon_client import ElexonClient, ElexonUpstreamError

JANUARY_START = date(2026, 1, 1)
JANUARY_END = date(2026, 1, 31)
FORECAST_PUBLISH_FROM = datetime(2025, 12, 30, tzinfo=timezone.utc)
FORECAST_PUBLISH_TO = datetime(2026, 1, 30, 9, 20, tzinfo=timezone.utc)
SNAPSHOT_PATH = Path(__file__).resolve().parents[2] / "data" / "january_2026_snapshot.json"


@dataclass
class Dataset:
    actuals: list[ActualRecord]
    forecasts: list[ForecastRecord]
    source_mode: str
    detail: str | None = None
    loaded_at: datetime | None = None


class DataStore:
    def __init__(self) -> None:
        self._dataset: Dataset | None = None
        self._lock = asyncio.Lock()
        self._refresh_lock = asyncio.Lock()

    def _snapshot(self, detail: str | None = None) -> Dataset:
        raw = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
        snapshot = JanuarySnapshot.model_validate(raw)
        return Dataset(snapshot.actuals, snapshot.forecasts, "snapshot", detail, datetime.now(timezone.utc))

    async def get(self, force_refresh: bool = False) -> Dataset:
        async with self._lock:
            if self._dataset is not None and not force_refresh and self._dataset.loaded_at is not None:
                age = (datetime.now(timezone.utc) - self._dataset.loaded_at).total_seconds()
                if age < get_settings().cache_ttl_seconds:
                    return self._dataset
            async with self._refresh_lock:
                try:
                    client = ElexonClient()
                    actuals, forecasts = await asyncio.gather(
                        client.fetch_actuals(JANUARY_START, JANUARY_END),
                        client.fetch_forecasts(FORECAST_PUBLISH_FROM, FORECAST_PUBLISH_TO),
                    )
                    if len(actuals) < 1000 or len(forecasts) < 1000:
                        raise ElexonUpstreamError(
                            f"Incomplete live window: {len(actuals)} actual and {len(forecasts)} forecast rows"
                        )
                    dataset = Dataset(actuals, forecasts, "live", loaded_at=datetime.now(timezone.utc))
                except Exception as exc:
                    dataset = self._snapshot(f"Live API unavailable; using saved January snapshot ({type(exc).__name__}).")
                self._dataset = dataset
                return dataset


data_store = DataStore()
