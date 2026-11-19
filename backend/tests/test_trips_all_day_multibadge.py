import pytest
from datetime import datetime
from httpx import AsyncClient
from app.services.timetable_sync_service import BUCHAREST_TZ
from app.schemas.route_plan import compute_plan_signature, TransitRoutePlan, TransitRouteQuery, LocationQuery, TransitMode
from app.services.routing_service import routing_service


@pytest.mark.asyncio
async def test_full_day_routes_galati_to_bucharest(client: AsyncClient):
    """
    Verifies that POST /api/v1/routes/plan returns ALL unique day-X trains
    for Galați ➔ București Nord (> 3 plans), without 3-route truncation,
    with 0 duplicate canonical leg signatures.
    """
    today_str = datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")
    payload = {
        "origin": {"name": "Galați", "city": "Galați"},
        "destination": {"name": "București Nord", "city": "București"},
        "departureTime": f"{today_str}T08:00:00+02:00",
        "allowedModes": ["TRAIN"],
        "optimizationPreference": "MOST_RELIABLE",
    }

    res = await client.post("/api/v1/routes/plan", json=payload)
    assert res.status_code == 200
    data = res.json()

    plans = data["plans"]
    assert len(plans) > 3, f"Expected > 3 unique routes for Galați -> București, got {len(plans)}"
    assert data["totalDayRoutes"] == len(plans)

    # Assert strict physical deduplication (zero duplicates)
    signatures = []
    for plan in plans:
        legs = plan["legs"]
        sig = "->".join(
            f"{(l['names']['lineCode'] or '').strip().upper()}|{l['names']['originName']}|{l['names']['destinationName']}|{l['timings']['scheduledDeparture']}|{l['timings']['scheduledArrival']}"
            for l in legs
        )
        assert sig not in signatures, f"Duplicate physical leg signature found: {sig}"
        signatures.append(sig)

    assert len(signatures) == len(plans)


@pytest.mark.asyncio
async def test_full_day_routes_bucharest_to_brasov(client: AsyncClient):
    """
    Verifies that POST /api/v1/routes/plan returns ALL unique real trains
    for București Nord ➔ Brașov (> 3 plans, 40+ real trains), 0 duplicates.
    """
    today_str = datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")
    payload = {
        "origin": {"name": "București Nord", "city": "București"},
        "destination": {"name": "Brașov", "city": "Brașov"},
        "departureTime": f"{today_str}T08:00:00+02:00",
        "allowedModes": ["TRAIN"],
        "optimizationPreference": "FASTEST",
    }

    res = await client.post("/api/v1/routes/plan", json=payload)
    assert res.status_code == 200
    data = res.json()

    plans = data["plans"]
    assert len(plans) > 3, f"Expected > 3 routes for București -> Brașov, got {len(plans)}"
    assert data["totalDayRoutes"] == len(plans)

    signatures = set()
    for plan in plans:
        legs = plan["legs"]
        sig = "->".join(
            f"{(l['names']['lineCode'] or '').strip().upper()}|{l['names']['originName']}|{l['names']['destinationName']}|{l['timings']['scheduledDeparture']}|{l['timings']['scheduledArrival']}"
            for l in legs
        )
        assert sig not in signatures, f"Duplicate physical leg signature found: {sig}"
        signatures.add(sig)

    assert len(signatures) == len(plans)


@pytest.mark.asyncio
async def test_multi_badge_pillar_assignment_single_route():
    """
    Simulates a route that wins multiple pillars simultaneously (e.g. safest AND cheapest).
    Asserts set(plan.curatedPillars) >= {"MOST_RELIABLE", "BEST_VALUE"} on a single route
    with zero card duplication.
    """
    query = TransitRouteQuery(
        origin=LocationQuery(name="Galați", city="Galați"),
        destination=LocationQuery(name="București Nord", city="București"),
        departureTime="2026-11-19T08:00:00+02:00",
        allowedModes=[TransitMode.TRAIN],
        optimizationPreference="SAFE_BUFFERS",
    )

    plans = await routing_service.plan_routes(query)
    assert len(plans) > 3

    # Check that at least one plan carries curatedPillars
    winning_plans = [p for p in plans if len(p.curatedPillars) > 0]
    assert len(winning_plans) >= 1

    # Check multi-badge assignment logic when one plan is both cheapest and lowest risk
    test_plans = [p.model_copy(deep=True) for p in plans[:4]]
    # Force first plan to have the lowest risk AND lowest fare
    test_plans[0].riskAnalysis.overallRiskScore = 5.0
    test_plans[0].riskAnalysis.missedConnectionProbability = 0.01
    test_plans[0].fare.totalAmountLei = 25.0
    # Other plans have higher risk and fare
    for other in test_plans[1:]:
        other.riskAnalysis.overallRiskScore = 50.0
        other.fare.totalAmountLei = 90.0

    multi_badge_plans = routing_service._assign_pillars_and_sort(test_plans, query)
    top_plan = next(p for p in multi_badge_plans if p.id == test_plans[0].id)

    assert "MOST_RELIABLE" in top_plan.curatedPillars
    assert "BEST_VALUE" in top_plan.curatedPillars
    assert set(top_plan.curatedPillars) >= {"MOST_RELIABLE", "BEST_VALUE"}
    # Top plan is not duplicated in the output list
    matching_ids = [p.id for p in multi_badge_plans if p.id == top_plan.id]
    assert len(matching_ids) == 1
