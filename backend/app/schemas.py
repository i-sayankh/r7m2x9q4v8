from datetime import date, datetime, timezone
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
