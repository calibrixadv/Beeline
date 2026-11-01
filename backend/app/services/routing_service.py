import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.schemas.route_plan import (
    BufferAdequacy,
    CuratedPillar,
    EcoBenchmark,
    GeoJSONLineString,
    GeoPoint,
    IntermediateStop,
    LegAmenities,
    LegCoordinates,
    LegFare,
    LegFareItem,
    LegInstructions,
    LegNames,
    LegRiskProfile,
    LegTimings,
    LocationQuery,
    MascotRecommendation,
    RiskLevel,
    RouteFareSummary,
    RouteRiskAnalysis,
    RouteRiskFactor,
    TransitDisruption,
    TransitLeg,
    TransitMode,
    TransitRoutePlan,
    TransitRouteQuery,
)


def compute_risk_analysis(legs: List[TransitLeg], min_buffer_required: int = 20) -> RouteRiskAnalysis:
    """
    Romanian Transfer Shield Risk Engine:
    Formula: Risk = 35% * (100 - Punctuality) + 45% * BufferPenalty + 20% * DisruptionPenalty
    """
    if not legs:
        return RouteRiskAnalysis(
            overallRiskScore=0.0,
            riskLevel=RiskLevel.LOW,
            historicalPunctualityRate=1.0,
            tightestBufferMinutes=999,
            bufferAdequacy=BufferAdequacy.GENEROUS,
            riskSummaryText="Direct transit route with no connection risk.",
            factors=[]
        )

    # 1. Punctuality rate average
    avg_punctuality = sum(l.risk.historicalPunctualityPercent for l in legs) / len(legs)
    punctuality_penalty = max(0.0, 100.0 - avg_punctuality)

    # 2. Transfer buffer analysis
    buffers = [
        l.risk.transferBufferAfterMinutes
        for l in legs[:-1]
        if l.risk.transferBufferAfterMinutes is not None
    ]
    tightest_buffer = min(buffers) if buffers else 999

    if len(buffers) == 0 or tightest_buffer >= 35:
        buffer_penalty = 5.0
        adequacy = BufferAdequacy.GENEROUS
    elif tightest_buffer >= 20:
        buffer_penalty = 15.0
        adequacy = BufferAdequacy.OPTIMAL
    elif tightest_buffer >= 15:
        buffer_penalty = 35.0
        adequacy = BufferAdequacy.TIGHT
    else:
        buffer_penalty = 70.0
        adequacy = BufferAdequacy.INSUFFICIENT

    # 3. Disruption penalties
    disruption_penalty = 0.0
    factors: List[RouteRiskFactor] = []

    for idx, leg in enumerate(legs):
        for d in leg.risk.disruptions:
            if d.severity == "CRITICAL":
                disruption_penalty += 40.0
            elif d.severity == "WARNING":
                disruption_penalty += 20.0
            else:
                disruption_penalty += 5.0

        if leg.risk.transferBufferAfterMinutes is not None and leg.risk.transferBufferAfterMinutes < 15:
            factors.append(RouteRiskFactor(
                code="SUB_15_MIN_TRANSFER",
                severity="WARNING" if leg.risk.transferBufferAfterMinutes >= 10 else "CRITICAL",
                description=f"Tight {leg.risk.transferBufferAfterMinutes} min transfer at {leg.names.destinationName}.",
                affectedLegIndex=idx
            ))

    # Weighting: 35% punctuality, 45% buffer, 20% disruptions
    raw_risk = (0.35 * punctuality_penalty) + (0.45 * buffer_penalty) + (0.20 * min(disruption_penalty, 100.0))
    overall_score = round(min(100.0, max(0.0, raw_risk)), 1)

    if overall_score <= 25.0:
        level = RiskLevel.LOW
        summary = f"Shielded connection: {tightest_buffer}-min buffer safely absorbs standard Romanian transit delays."
    elif overall_score <= 50.0:
        level = RiskLevel.MODERATE
        summary = f"Moderate connection: {tightest_buffer}-min buffer allows minor variance. Watch live tracking."
    elif overall_score <= 75.0:
        level = RiskLevel.HIGH
        summary = f"Elevated risk: {tightest_buffer}-min buffer leaves slim margin for platform changes."
    else:
        level = RiskLevel.CRITICAL
        summary = f"Critical risk: High chance of missed connection due to tight buffers or disruptions."

    return RouteRiskAnalysis(
        overallRiskScore=overall_score,
        riskLevel=level,
        historicalPunctualityRate=round(avg_punctuality / 100.0, 2),
        tightestBufferMinutes=tightest_buffer if tightest_buffer != 999 else 0,
        bufferAdequacy=adequacy,
        riskSummaryText=summary,
        factors=factors
    )


class RoutingService:
    @staticmethod
    def generate_micro19_to_unirii_plan(query: TransitRouteQuery) -> TransitRoutePlan:
        now_iso = datetime.now(timezone.utc).isoformat()
        dep_time = query.departureTime or "2026-10-21T06:40:00+03:00"

        legs: List[TransitLeg] = [
            TransitLeg(
                id="leg-gl-bus-102",
                legIndex=0,
                transportType=TransitMode.BUS,
                names=LegNames(
                    originName="Micro 19",
                    originCity="Galați",
                    destinationName="Gara CFR Galați",
                    destinationCity="Galați",
                    lineCode="102",
                    lineName="Micro 19 ⇄ Gara CFR Galați",
                    operatorName="Transurb S.A. Galați",
                    operatorShortName="Transurb",
                    headsign="Gara CFR",
                    vehicleIdentifier="Solaris Urbino 12"
                ),
                coords=LegCoordinates(
                    originCoords=GeoPoint(latitude=45.4125, longitude=27.9982, city="Galați", platform="B"),
                    destinationCoords=GeoPoint(latitude=45.4418, longitude=28.0583, city="Galați", platform="Terminal Gara"),
                    intermediateStops=[
                        IntermediateStop(stopSequence=1, name="Țiglina 1", coords=GeoPoint(latitude=45.4241, longitude=28.0256)),
                        IntermediateStop(stopSequence=2, name="Mazepa", coords=GeoPoint(latitude=45.4312, longitude=28.0415))
                    ],
                    geometry=GeoJSONLineString(
                        type="LineString",
                        coordinates=[
                            (27.9982, 45.4125),
                            (28.0256, 45.4241),
                            (28.0415, 45.4312),
                            (28.0583, 45.4418)
                        ]
                    )
                ),
                timings=LegTimings(
                    scheduledDeparture="2026-10-21T06:40:00+03:00",
                    scheduledArrival="2026-10-21T07:07:00+03:00",
                    estimatedDeparture="2026-10-21T06:40:00+03:00",
                    estimatedArrival="2026-10-21T07:07:00+03:00",
                    durationMinutes=27,
                    delayMinutes=0,
                    isRealtime=True
                ),
                risk=LegRiskProfile(
                    legRiskScore=8.0,
                    historicalPunctualityPercent=94.0,
                    transferBufferAfterMinutes=28,
                    isShieldedBuffer=True,
                    disruptions=[]
                ),
                fare=LegFare(
                    amount=3.00,
                    currency="RON",
                    ticketCategory="URBAN_TRANSIT",
                    providerPaymentMethods=["24PAY", "SMS_VALIDATION", "CONTACTLESS_CARD"]
                ),
                amenities=LegAmenities(
                    items=["AIR_CONDITIONING", "LOW_FLOOR_ACCESSIBLE"],
                    crowdingLevel="MEDIUM",
                    stepFreeAccess=True
                ),
                instructions=LegInstructions(
                    leadText="Board Transurb Bus 102 at Micro 19 Terminus Platform B",
                    detailSteps=["Ride 12 stops via Brăilei St to Gara CFR Galați"],
                    transferNotice="Exit bus and walk 80m into Gara Galați main concourse. Track 2."
                )
            ),
            TransitLeg(
                id="leg-cfr-ir-1572",
                legIndex=1,
                transportType=TransitMode.TRAIN,
                names=LegNames(
                    originName="Gara CFR Galați",
                    originCity="Galați",
                    destinationName="București Nord",
                    destinationCity="București",
                    lineCode="IR 1572",
                    lineName="Galați ⇄ București Nord",
                    operatorName="CFR Călători",
                    operatorShortName="CFR",
                    headsign="București Nord",
                    vehicleIdentifier="Alstom Coradia Stream / Desiro"
                ),
                coords=LegCoordinates(
                    originCoords=GeoPoint(latitude=45.4418, longitude=28.0583, city="Galați", platform="Linia 2"),
                    destinationCoords=GeoPoint(latitude=44.4473, longitude=26.0747, city="București", platform="Linia 5"),
                    intermediateStops=[
                        IntermediateStop(stopSequence=1, name="Brăila", coords=GeoPoint(latitude=45.2715, longitude=27.9622)),
                        IntermediateStop(stopSequence=2, name="Făurei", coords=GeoPoint(latitude=45.0862, longitude=27.2718)),
                        IntermediateStop(stopSequence=3, name="Buzău", coords=GeoPoint(latitude=45.1432, longitude=26.8306)),
                        IntermediateStop(stopSequence=4, name="Ploiești Sud", coords=GeoPoint(latitude=44.9275, longitude=26.0332))
                    ],
                    geometry=GeoJSONLineString(
                        type="LineString",
                        coordinates=[
                            (28.0583, 45.4418),
                            (27.9622, 45.2715),
                            (27.2718, 45.0862),
                            (26.8306, 45.1432),
                            (26.0332, 44.9275),
                            (26.0747, 44.4473)
                        ]
                    )
                ),
                timings=LegTimings(
                    scheduledDeparture="2026-10-21T07:35:00+03:00",
                    scheduledArrival="2026-10-21T10:45:00+03:00",
                    estimatedDeparture="2026-10-21T07:35:00+03:00",
                    estimatedArrival="2026-10-21T10:45:00+03:00",
                    durationMinutes=190,
                    delayMinutes=0,
                    isRealtime=True
                ),
                risk=LegRiskProfile(
                    legRiskScore=12.0,
                    historicalPunctualityPercent=91.0,
                    transferBufferAfterMinutes=20,
                    isShieldedBuffer=True,
                    disruptions=[]
                ),
                fare=LegFare(
                    amount=63.00,
                    currency="RON",
                    ticketCategory="RAIL_INTERREGIO",
                    bookingUrl="https://bilete.cfrcalatori.ro",
                    providerPaymentMethods=["CONTACTLESS_CARD", "CFR_TICKET_OFFICE"]
                ),
                amenities=LegAmenities(
                    items=["WIFI", "POWER_OUTLETS", "AIR_CONDITIONING", "RESTROOM"],
                    crowdingLevel="LOW",
                    stepFreeAccess=True
                ),
                instructions=LegInstructions(
                    leadText="Board CFR IR 1572 at Linia 2",
                    detailSteps=["Express journey via Buzău and Ploiești to București Nord"],
                    transferNotice="Descend stairs to Metrorex M1/M4 passage, transfer to M2 at Piața Victoriei."
                )
            ),
            TransitLeg(
                id="leg-metrorex-m2",
                legIndex=2,
                transportType=TransitMode.METRO,
                names=LegNames(
                    originName="Gara de Nord",
                    originCity="București",
                    destinationName="Piața Unirii",
                    destinationCity="București",
                    lineCode="M2",
                    lineName="Pipera ⇄ Berceni",
                    operatorName="Metrorex S.A.",
                    operatorShortName="Metrorex",
                    headsign="Berceni",
                    vehicleIdentifier="CAF / Alstom Metropolis"
                ),
                coords=LegCoordinates(
                    originCoords=GeoPoint(latitude=44.4473, longitude=26.0747, city="București", platform="M1/M2 Connection"),
                    destinationCoords=GeoPoint(latitude=44.4276, longitude=26.1026, city="București", platform="Piața Unirii 1/2"),
                    intermediateStops=[
                        IntermediateStop(stopSequence=1, name="Piața Victoriei", coords=GeoPoint(latitude=44.4523, longitude=26.0863)),
                        IntermediateStop(stopSequence=2, name="Piața Romană", coords=GeoPoint(latitude=44.4447, longitude=26.0975)),
                        IntermediateStop(stopSequence=3, name="Universitate", coords=GeoPoint(latitude=44.4355, longitude=26.1022))
                    ],
                    geometry=GeoJSONLineString(
                        type="LineString",
                        coordinates=[
                            (26.0747, 44.4473),
                            (26.0863, 44.4523),
                            (26.0975, 44.4447),
                            (26.1022, 44.4355),
                            (26.1026, 44.4276)
                        ]
                    )
                ),
                timings=LegTimings(
                    scheduledDeparture="2026-10-21T11:05:00+03:00",
                    scheduledArrival="2026-10-21T11:15:00+03:00",
                    estimatedDeparture="2026-10-21T11:05:00+03:00",
                    estimatedArrival="2026-10-21T11:15:00+03:00",
                    durationMinutes=10,
                    delayMinutes=0,
                    isRealtime=True
                ),
                risk=LegRiskProfile(
                    legRiskScore=4.0,
                    historicalPunctualityPercent=98.0,
                    transferBufferAfterMinutes=None,
                    isShieldedBuffer=True,
                    disruptions=[]
                ),
                fare=LegFare(
                    amount=3.00,
                    currency="RON",
                    ticketCategory="METRO_SINGLE",
                    providerPaymentMethods=["CONTACTLESS_CARD", "SMS_VALIDATION"]
                ),
                amenities=LegAmenities(
                    items=["AIR_CONDITIONING", "LOW_FLOOR_ACCESSIBLE"],
                    crowdingLevel="MEDIUM",
                    stepFreeAccess=True
                ),
                instructions=LegInstructions(
                    leadText="Board Metrorex M2 towards Berceni",
                    detailSteps=["Ride 3 stops to Piața Unirii"],
                    transferNotice="Arrive at Piața Unirii central station."
                )
            )
        ]

        risk_analysis = compute_risk_analysis(legs, query.minimumBufferMinutes or 25)

        return TransitRoutePlan(
            id="itinerary-gl-micro19-buc-piata-unirii-001",
            query=query,
            summary="Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2",
            departureTime=dep_time,
            arrivalTime="2026-10-21T11:15:00+03:00",
            totalDurationMinutes=275,
            totalWalkMinutes=12,
            totalWalkDistanceMeters=680,
            transfersCount=2,
            curatedPillar=CuratedPillar.MOST_RELIABLE,
            mascotRecommendation=MascotRecommendation(
                persona="bumble",
                badgeLabel="HONEY SHIELD PROTECTED",
                advice="Solid 28-min buffer at Gara Galați and 20-min buffer at Gara de Nord guarantee connection success."
            ),
            riskAnalysis=risk_analysis,
            fare=RouteFareSummary(
                totalAmountLei=69.00,
                totalAmountEur=13.80,
                isIntegratedTicketAvailable=False,
                legFares=[
                    LegFareItem(legId="leg-gl-bus-102", operator="Transurb S.A. Galați", amountLei=3.00, amountEur=0.60),
                    LegFareItem(legId="leg-cfr-ir-1572", operator="CFR Călători", amountLei=63.00, amountEur=12.60),
                    LegFareItem(legId="leg-metrorex-m2", operator="Metrorex S.A.", amountLei=3.00, amountEur=0.60)
                ]
            ),
            eco=EcoBenchmark(
                routeEmissionsKgCO2=8.4,
                carEmissionsKgCO2=42.1,
                savedKgCO2=33.7,
                percentageSaved=80.0,
                treeDaysEquivalent=5.6
            ),
            legs=legs,
            createdAt=now_iso,
            validUntil=(datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        )

    @staticmethod
    def generate_bucharest_to_brasov_plan(query: TransitRouteQuery) -> TransitRoutePlan:
        now_iso = datetime.now(timezone.utc).isoformat()
        dep_time = query.departureTime or "2026-10-21T09:10:00+03:00"

        legs: List[TransitLeg] = [
            TransitLeg(
                id="leg-cfr-ir-1631",
                legIndex=0,
                transportType=TransitMode.TRAIN,
                names=LegNames(
                    originName="București Nord",
                    originCity="București",
                    destinationName="Gara Brașov",
                    destinationCity="Brașov",
                    lineCode="IR 1631",
                    lineName="București Nord ⇄ Brașov",
                    operatorName="CFR Călători",
                    operatorShortName="CFR",
                    headsign="Brașov",
                    vehicleIdentifier="Softronic Hyperion EMU"
                ),
                coords=LegCoordinates(
                    originCoords=GeoPoint(latitude=44.4473, longitude=26.0747, city="București", platform="Linia 3"),
                    destinationCoords=GeoPoint(latitude=45.6622, longitude=25.6172, city="Brașov", platform="Linia 1"),
                    intermediateStops=[
                        IntermediateStop(stopSequence=1, name="Ploiești Vest", coords=GeoPoint(latitude=44.9312, longitude=25.9984)),
                        IntermediateStop(stopSequence=2, name="Sinaia", coords=GeoPoint(latitude=45.3533, longitude=25.5524)),
                        IntermediateStop(stopSequence=3, name="Predeal", coords=GeoPoint(latitude=45.5056, longitude=25.5786))
                    ],
                    geometry=GeoJSONLineString(
                        type="LineString",
                        coordinates=[
                            (26.0747, 44.4473),
                            (25.9984, 44.9312),
                            (25.5524, 45.3533),
                            (25.5786, 45.5056),
                            (25.6172, 45.6622)
                        ]
                    )
                ),
                timings=LegTimings(
                    scheduledDeparture="2026-10-21T09:10:00+03:00",
                    scheduledArrival="2026-10-21T11:28:00+03:00",
                    estimatedDeparture="2026-10-21T09:10:00+03:00",
                    estimatedArrival="2026-10-21T11:28:00+03:00",
                    durationMinutes=138,
                    delayMinutes=0,
                    isRealtime=True
                ),
                risk=LegRiskProfile(
                    legRiskScore=6.0,
                    historicalPunctualityPercent=96.0,
                    transferBufferAfterMinutes=None,
                    isShieldedBuffer=True,
                    disruptions=[]
                ),
                fare=LegFare(
                    amount=48.00,
                    currency="RON",
                    ticketCategory="RAIL_INTERREGIO",
                    bookingUrl="https://bilete.cfrcalatori.ro",
                    providerPaymentMethods=["CONTACTLESS_CARD", "CFR_TICKET_OFFICE"]
                ),
                amenities=LegAmenities(
                    items=["WIFI", "POWER_OUTLETS", "AIR_CONDITIONING", "RESTROOM", "BICYCLE_RACK"],
                    crowdingLevel="LOW",
                    stepFreeAccess=True
                ),
                instructions=LegInstructions(
                    leadText="Board CFR IR 1631 at București Nord Linia 3",
                    detailSteps=["Scenic journey across Prahova Valley through Sinaia and Predeal to Brașov"],
                    transferNotice="Arrive directly at Brașov Central Station."
                )
            )
        ]

        risk_analysis = compute_risk_analysis(legs, query.minimumBufferMinutes or 25)

        return TransitRoutePlan(
            id="itinerary-buc-nord-brasov-001",
            query=query,
            summary="CFR IR 1631 Direct Express",
            departureTime=dep_time,
            arrivalTime="2026-10-21T11:28:00+03:00",
            totalDurationMinutes=138,
            totalWalkMinutes=4,
            totalWalkDistanceMeters=150,
            transfersCount=0,
            curatedPillar=CuratedPillar.FASTEST,
            mascotRecommendation=MascotRecommendation(
                persona="barnaby",
                badgeLabel="FASTEST DIRECT FLIGHT",
                advice="Direct high-speed mountain corridor with 0 transfers. Clean and swift."
            ),
            riskAnalysis=risk_analysis,
            fare=RouteFareSummary(
                totalAmountLei=48.00,
                totalAmountEur=9.60,
                isIntegratedTicketAvailable=True,
                legFares=[
                    LegFareItem(legId="leg-cfr-ir-1631", operator="CFR Călători", amountLei=48.00, amountEur=9.60)
                ]
            ),
            eco=EcoBenchmark(
                routeEmissionsKgCO2=4.8,
                carEmissionsKgCO2=28.5,
                savedKgCO2=23.7,
                percentageSaved=83.0,
                treeDaysEquivalent=4.1
            ),
            legs=legs,
            createdAt=now_iso,
            validUntil=(datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        )

    @staticmethod
    def generate_generic_plan(query: TransitRouteQuery) -> TransitRoutePlan:
        now_iso = datetime.now(timezone.utc).isoformat()
        orig_name = query.origin.name
        dest_name = query.destination.name
        orig_city = query.origin.city or "București"
        dest_city = query.destination.city or "Cluj-Napoca"

        legs: List[TransitLeg] = [
            TransitLeg(
                id=f"leg-gen-{uuid.uuid4().hex[:6]}",
                legIndex=0,
                transportType=TransitMode.TRAIN,
                names=LegNames(
                    originName=orig_name,
                    originCity=orig_city,
                    destinationName=dest_name,
                    destinationCity=dest_city,
                    lineCode="IR 1741",
                    lineName=f"{orig_name} ⇄ {dest_name}",
                    operatorName="CFR Călători",
                    operatorShortName="CFR",
                    headsign=dest_name,
                    vehicleIdentifier="Alstom Coradia Stream"
                ),
                coords=LegCoordinates(
                    originCoords=query.origin.coords or GeoPoint(latitude=44.4473, longitude=26.0747, city=orig_city),
                    destinationCoords=query.destination.coords or GeoPoint(latitude=46.7712, longitude=23.6236, city=dest_city),
                    intermediateStops=[],
                    geometry=GeoJSONLineString(
                        type="LineString",
                        coordinates=[
                            (query.origin.coords.longitude if query.origin.coords else 26.0747, query.origin.coords.latitude if query.origin.coords else 44.4473),
                            (query.destination.coords.longitude if query.destination.coords else 23.6236, query.destination.coords.latitude if query.destination.coords else 46.7712),
                        ]
                    )
                ),
                timings=LegTimings(
                    scheduledDeparture="2026-10-21T08:00:00+03:00",
                    scheduledArrival="2026-10-21T11:45:00+03:00",
                    estimatedDeparture="2026-10-21T08:00:00+03:00",
                    estimatedArrival="2026-10-21T11:45:00+03:00",
                    durationMinutes=225,
                    delayMinutes=0,
                    isRealtime=True
                ),
                risk=LegRiskProfile(
                    legRiskScore=10.0,
                    historicalPunctualityPercent=93.0,
                    transferBufferAfterMinutes=None,
                    isShieldedBuffer=True,
                    disruptions=[]
                ),
                fare=LegFare(
                    amount=75.00,
                    currency="RON",
                    ticketCategory="RAIL_INTERREGIO",
                    providerPaymentMethods=["CONTACTLESS_CARD", "CFR_TICKET_OFFICE"]
                ),
                amenities=LegAmenities(
                    items=["WIFI", "AIR_CONDITIONING", "POWER_OUTLETS"],
                    crowdingLevel="LOW",
                    stepFreeAccess=True
                ),
                instructions=LegInstructions(
                    leadText=f"Board CFR Rail connection from {orig_name} directly to {dest_name}",
                    detailSteps=[f"Direct inter-city journey towards {dest_name}"],
                    transferNotice=f"Arrive at destination {dest_name}."
                )
            )
        ]

        risk_analysis = compute_risk_analysis(legs, query.minimumBufferMinutes or 25)

        return TransitRoutePlan(
            id=f"itinerary-{uuid.uuid4().hex[:8]}",
            query=query,
            summary=f"CFR InterRegio direct ({orig_name} ➔ {dest_name})",
            departureTime=query.departureTime or "2026-10-21T08:00:00+03:00",
            arrivalTime="2026-10-21T11:45:00+03:00",
            totalDurationMinutes=225,
            totalWalkMinutes=5,
            totalWalkDistanceMeters=200,
            transfersCount=0,
            curatedPillar=CuratedPillar.BEST_VALUE,
            mascotRecommendation=MascotRecommendation(
                persona="honey",
                badgeLabel="SMART VALUE FLYER",
                advice="Direct Romanian rail connection saving €25 vs regional road car travel."
            ),
            riskAnalysis=risk_analysis,
            fare=RouteFareSummary(
                totalAmountLei=75.00,
                totalAmountEur=15.00,
                isIntegratedTicketAvailable=True,
                legFares=[
                    LegFareItem(legId=legs[0].id, operator="CFR Călători", amountLei=75.00, amountEur=15.00)
                ]
            ),
            eco=EcoBenchmark(
                routeEmissionsKgCO2=7.2,
                carEmissionsKgCO2=36.0,
                savedKgCO2=28.8,
                percentageSaved=80.0,
                treeDaysEquivalent=4.8
            ),
            legs=legs,
            createdAt=now_iso,
            validUntil=(datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        )

    @classmethod
    def plan_routes(cls, query: TransitRouteQuery) -> List[TransitRoutePlan]:
        orig = query.origin.name.lower()
        dest = query.destination.name.lower()
        orig_city = (query.origin.city or "").lower()
        dest_city = (query.destination.city or "").lower()

        # Check for Galați Micro 19 -> București Piața Unirii
        if ("micro 19" in orig or "micro19" in orig or "gala" in orig_city) and ("uniri" in dest or "bucur" in dest_city):
            primary = cls.generate_micro19_to_unirii_plan(query)
            return [primary]

        # Check for București -> Brașov
        if ("bucur" in orig or "gara de nord" in orig) and ("bra" in dest or "bra" in dest_city):
            primary = cls.generate_bucharest_to_brasov_plan(query)
            return [primary]

        # Generic generator
        return [cls.generate_generic_plan(query)]


routing_service = RoutingService()
