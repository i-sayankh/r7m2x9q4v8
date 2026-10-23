from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query

from app.schemas import DailyAnalysis, DailyMetricRow, RefreshResult, SeriesPoint
from app.services.analysis import LONDON, align_periods, calculate_metrics, select_final_actuals, select_vintages
from app.services.data_store import JANUARY_END, JANUARY_START, data_store

router = APIRouter(prefix="/api", tags=["analysis"])


def _validate_date(value: date) -> date:
    if value < JANUARY_START or value > JANUARY_END:
        raise HTTPException(status_code=422, detail="date must be within January 2026")
    return value


def _validate_cutoff(value: time) -> time:
    if value.tzinfo is not None:
        raise HTTPException(status_code=422, detail="cutoff must be a local Europe/London time without a timezone suffix")
    return value


def _daily(dataset, delivery_date: date, cutoff: time) -> tuple[list[SeriesPoint], list[str], datetime | None]:
    selection = select_vintages(dataset.forecasts, delivery_date, cutoff)
    final_actuals = select_final_actuals(dataset.actuals)
    day_actuals = [
        row for stamp, row in final_actuals.selected.items()
        if stamp.astimezone(LONDON).date() == delivery_date
    ]
    day_conflicts = {stamp for stamp in final_actuals.conflicts if stamp.astimezone(LONDON).date() == delivery_date}
    points = align_periods(
        day_actuals,
        list(selection.selected.values()),
        actual_conflicts=day_conflicts,
        forecast_conflicts=selection.conflicts,
        delivery_date=delivery_date,
    )
    notes: list[str] = []
    if selection.conflicts:
        notes.append(f"{len(selection.conflicts)} forecast interval(s) have conflicting values at the latest eligible publication and are excluded from scoring.")
    if day_conflicts:
        notes.append(f"{len(day_conflicts)} actual interval(s) have conflicting latest revisions and are excluded from scoring.")
    if dataset.detail:
        notes.append(dataset.detail)
    if not selection.selected:
        notes.append("No eligible WINDFOR forecast vintage was available by the configured cutoff.")
    publication_times = [record.publish_time for record in selection.selected.values()]
    selected_publication = max(publication_times) if publication_times else None
    return points, notes, selected_publication


def _monthly_points(dataset, cutoff: time) -> tuple[list[SeriesPoint], list[DailyMetricRow]]:
    all_points: list[SeriesPoint] = []
    daily_rows: list[DailyMetricRow] = []
    for day in range(1, 32):
        delivery_date = date(2026, 1, day)
        points, _, _ = _daily(dataset, delivery_date, cutoff)
        all_points.extend(points)
        daily_rows.append(DailyMetricRow(delivery_date=delivery_date, metrics=calculate_metrics(points)))
    return all_points, daily_rows


@router.get("/analysis/january-2026", response_model=DailyAnalysis)
async def january_analysis(
    delivery_date: date = Query(alias="date"),
    cutoff: time = Query(default=time(9, 20)),
) -> DailyAnalysis:
    day = _validate_date(delivery_date)
    cutoff = _validate_cutoff(cutoff)
    dataset = await data_store.get()
    points, notes, publication_time = _daily(dataset, day, cutoff)
    monthly_points, _ = _monthly_points(dataset, cutoff)
    expected_periods = 24
    coverage = calculate_metrics(points).matched_periods / expected_periods * 100
    cutoff_datetime = datetime.combine(day - timedelta(days=1), cutoff, LONDON).astimezone(timezone.utc)
    notes.extend([
        "Elexon's reported WIND generation excludes embedded, non-operational-metered generation.",
        "WINDFOR is hourly; actual FUELHH is half-hourly and is averaged into hourly MW for matched scoring.",
        "Error is forecast minus actual; positive values mean over-forecast generation.",
        "WAPE is undefined when total matched actual generation is zero.",
    ])
    return DailyAnalysis(
        delivery_date=day,
        cutoff_time=cutoff,
        cutoff_datetime=cutoff_datetime,
        source_mode=dataset.source_mode,
        selected_publication_time=publication_time,
        metrics=calculate_metrics(points),
        monthly_metrics=calculate_metrics(monthly_points),
        periods=points,
        quality_notes=notes,
        forecast_coverage_percent=coverage,
    )


@router.get("/analysis/january-2026/daily", response_model=list[DailyMetricRow])
async def january_daily(cutoff: time = Query(default=time(9, 20))) -> list[DailyMetricRow]:
    cutoff = _validate_cutoff(cutoff)
    dataset = await data_store.get()
    _, rows = _monthly_points(dataset, cutoff)
    return rows


@router.post("/refresh", response_model=RefreshResult)
async def refresh() -> RefreshResult:
    dataset = await data_store.get(force_refresh=True)
    return RefreshResult(
        status="refreshed" if dataset.source_mode == "live" else "fallback",
        source_mode=dataset.source_mode,
        actual_count=len(dataset.actuals),
        forecast_count=len(dataset.forecasts),
        detail=dataset.detail,
    )
