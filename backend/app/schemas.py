from datetime import date, datetime, time, timezone
from math import isfinite

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SourceRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    start_time: datetime = Field(alias="startTime")
    publish_time: datetime = Field(alias="publishTime")
    settlement_date: date | None = Field(default=None, alias="settlementDate")
    settlement_period: int | None = Field(default=None, alias="settlementPeriod", ge=1)
    generation_mw: float = Field(alias="generation")

    @field_validator("start_time", "publish_time")
    @classmethod
    def require_aware_datetime(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Elexon timestamps must include a timezone")
        return value.astimezone(timezone.utc)

    @field_validator("generation_mw")
    @classmethod
    def require_finite_generation(cls, value: float) -> float:
        if not isfinite(value):
            raise ValueError("Generation must be a finite number")
        return value


class ActualRecord(SourceRecord):
    pass


class ForecastRecord(SourceRecord):
    pass


class JanuarySnapshot(BaseModel):
    source: str
    retrieved_at: datetime = Field(alias="retrievedAt")
    actuals: list[ActualRecord]
    forecasts: list[ForecastRecord]

    model_config = ConfigDict(populate_by_name=True)


class AccuracyMetrics(BaseModel):
    mae_mw: float | None
    rmse_mw: float | None
    bias_mw: float | None
    wape_percent: float | None
    matched_periods: int


class SeriesPoint(BaseModel):
    delivery_time: datetime
    forecast_mw: float | None
    actual_mw: float | None
    error_mw: float | None
    forecast_publish_time: datetime | None = None
    quality: str = "matched"


class DailyMetricRow(BaseModel):
    delivery_date: date
    metrics: AccuracyMetrics


class DailyAnalysis(BaseModel):
    delivery_date: date
    cutoff_time: time
    cutoff_datetime: datetime
    source_mode: str
    selected_publication_time: datetime | None
    metrics: AccuracyMetrics
    monthly_metrics: AccuracyMetrics
    periods: list[SeriesPoint]
    quality_notes: list[str]
    forecast_coverage_percent: float


class RefreshResult(BaseModel):
    status: str
    source_mode: str
    actual_count: int
    forecast_count: int
    detail: str | None = None
