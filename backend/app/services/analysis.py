from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from math import sqrt
from zoneinfo import ZoneInfo

from app.schemas import AccuracyMetrics, ActualRecord, ForecastRecord, SeriesPoint

LONDON = ZoneInfo("Europe/London")
UTC = timezone.utc


@dataclass
class VintageSelection:
    selected: dict[datetime, ForecastRecord]
    conflicts: set[datetime]


@dataclass
class ActualSelection:
    selected: dict[datetime, ActualRecord]
    conflicts: set[datetime]


def _same_value(records: list[ActualRecord | ForecastRecord]) -> bool:
    return len({record.generation_mw for record in records}) <= 1


def select_vintages(
    forecasts: list[ForecastRecord], delivery_date: date, cutoff_time: time
) -> VintageSelection:
    cutoff = datetime.combine(delivery_date - timedelta(days=1), cutoff_time, LONDON).astimezone(UTC)
    grouped: dict[datetime, list[ForecastRecord]] = defaultdict(list)
    for forecast in forecasts:
        if forecast.start_time.astimezone(LONDON).date() != delivery_date or forecast.publish_time > cutoff:
            continue
        grouped[forecast.start_time.astimezone(UTC)].append(forecast)

    selected: dict[datetime, ForecastRecord] = {}
    conflicts: set[datetime] = set()
    for delivery_time, records in grouped.items():
        latest_publish = max(record.publish_time for record in records)
        latest_rows = [record for record in records if record.publish_time == latest_publish]
        if not _same_value(latest_rows):
            conflicts.add(delivery_time)
            continue
        selected[delivery_time] = latest_rows[0]
    return VintageSelection(selected=selected, conflicts=conflicts)


def select_final_actuals(actuals: list[ActualRecord]) -> ActualSelection:
    grouped: dict[datetime, list[ActualRecord]] = defaultdict(list)
    for actual in actuals:
        grouped[actual.start_time.astimezone(UTC)].append(actual)

    selected: dict[datetime, ActualRecord] = {}
    conflicts: set[datetime] = set()
    for delivery_time, records in grouped.items():
        latest_publish = max(record.publish_time for record in records)
        latest_rows = [record for record in records if record.publish_time == latest_publish]
        if not _same_value(latest_rows):
            conflicts.add(delivery_time)
            continue
        selected[delivery_time] = latest_rows[0]
    return ActualSelection(selected=selected, conflicts=conflicts)


def align_periods(
    actuals: list[ActualRecord], forecasts: list[ForecastRecord],
    actual_conflicts: set[datetime] | None = None,
    forecast_conflicts: set[datetime] | None = None,
    delivery_date: date | None = None,
) -> list[SeriesPoint]:
    actual_selection = select_final_actuals(actuals)
    actual_map = actual_selection.selected
    actual_conflicts = actual_conflicts or set()
    actual_conflicts = actual_conflicts | actual_selection.conflicts
    forecast_conflicts = forecast_conflicts or set()
    forecast_map = {row.start_time.astimezone(UTC): row for row in forecasts}
    hourly_forecast = delivery_date is not None or any(
        following - current >= timedelta(minutes=55)
        for current, following in zip(sorted(forecast_map), sorted(forecast_map)[1:])
    )

    mapped_actuals: dict[datetime, float] = {}
    actual_quality: dict[datetime, str] = {}
    if hourly_forecast:
        actual_hours = {stamp.replace(minute=0, second=0, microsecond=0) for stamp in actual_map}
        conflict_hours = {stamp.replace(minute=0, second=0, microsecond=0) for stamp in actual_conflicts}
        expected_hours: set[datetime] = set()
        if delivery_date is not None:
            hour = datetime.combine(delivery_date, time.min, LONDON).astimezone(UTC)
            next_day = datetime.combine(delivery_date + timedelta(days=1), time.min, LONDON).astimezone(UTC)
            while hour < next_day:
                expected_hours.add(hour)
                hour += timedelta(hours=1)
        for hour in forecast_map.keys() | actual_hours | conflict_hours | expected_hours:
            slots = [hour, hour + timedelta(minutes=30)]
            present = [slot for slot in slots if slot in actual_map and slot not in actual_conflicts]
            if len(present) == 2:
                mapped_actuals[hour] = sum(actual_map[slot].generation_mw for slot in present) / 2
            elif any(slot in actual_conflicts for slot in slots):
                actual_quality[hour] = "conflicting actual"
            elif present:
                actual_quality[hour] = "partial actual"
            else:
                actual_quality[hour] = "missing actual"
    else:
        mapped_actuals = {stamp: row.generation_mw for stamp, row in actual_map.items() if stamp not in actual_conflicts}

    times = set(forecast_map) | set(mapped_actuals)
    times |= forecast_conflicts
    times |= set(actual_quality)
    if not hourly_forecast:
        times |= actual_conflicts
    points: list[SeriesPoint] = []
    for stamp in sorted(times):
        forecast = forecast_map.get(stamp)
        forecast_conflict = stamp in forecast_conflicts
        if forecast_conflict:
            forecast = None
        actual_value = mapped_actuals.get(stamp)
        quality = "matched"
        if forecast_conflict:
            quality = "conflicting forecast"
        elif stamp in actual_quality:
            quality = actual_quality[stamp]
        elif stamp in actual_conflicts:
            quality = "conflicting actual"
        elif forecast is None:
            quality = "missing forecast"
        elif actual_value is None:
            quality = "missing actual"
        error = forecast.generation_mw - actual_value if forecast and actual_value is not None else None
        points.append(SeriesPoint(
            delivery_time=stamp,
            forecast_mw=forecast.generation_mw if forecast else None,
            actual_mw=actual_value,
            error_mw=error,
            forecast_publish_time=forecast.publish_time if forecast else None,
            quality=quality,
        ))
    return points


def calculate_metrics(points: list[SeriesPoint]) -> AccuracyMetrics:
    errors = [point.error_mw for point in points if point.error_mw is not None]
    count = len(errors)
    if not count:
        return AccuracyMetrics(mae_mw=None, rmse_mw=None, bias_mw=None, wape_percent=None, matched_periods=0)
    actual_total = sum(point.actual_mw or 0 for point in points if point.error_mw is not None)
    wape = sum(abs(error) for error in errors) / actual_total * 100 if actual_total > 0 else None
    return AccuracyMetrics(
        mae_mw=sum(abs(error) for error in errors) / count,
        rmse_mw=sqrt(sum(error**2 for error in errors) / count),
        bias_mw=sum(errors) / count,
        wape_percent=wape,
        matched_periods=count,
    )
