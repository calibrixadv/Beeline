from typing import List, Optional
from app.schemas.route_plan import TransitMode
from app.schemas.schedule import DepartureTime, TransitLineSchedule, TransitProvider

ROMANIAN_PROVIDERS = {
    "metrorex": TransitProvider(
        id="metrorex",
        name="Metrorex S.A.",
        shortName="Metrorex",
        city="București",
        modes=[TransitMode.METRO],
        badgeColor="#0284C7"
    ),
    "transurb": TransitProvider(
        id="transurb",
        name="Transurb S.A. Galați",
        shortName="Transurb Galați",
        city="Galați",
        modes=[TransitMode.TRAM, TransitMode.BUS],
        badgeColor="#059669"
    ),
    "stb": TransitProvider(
        id="stb",
        name="Societatea de Transport București",
        shortName="STB",
        city="București",
        modes=[TransitMode.TRAM, TransitMode.BUS],
        badgeColor="#2563EB"
    ),
    "ctp_cluj": TransitProvider(
        id="ctp-cluj",
        name="Compania de Transport Public Cluj-Napoca",
        shortName="CTP Cluj",
        city="Cluj-Napoca",
        modes=[TransitMode.TRAM, TransitMode.BUS],
        badgeColor="#7C3AED"
    ),
    "cfr": TransitProvider(
        id="cfr",
        name="CFR Călători",
        shortName="CFR Călători",
        city="National",
        modes=[TransitMode.TRAIN],
        badgeColor="#B91C1C",
        isNationalRail=True
    ),
    "astra": TransitProvider(
        id="astra",
        name="Astra Trans Carpatic",
        shortName="Astra Trans Carpatic",
        city="National",
        modes=[TransitMode.TRAIN],
        badgeColor="#1E3A8A",
        isNationalRail=True
    ),
    "tfc": TransitProvider(
        id="tfc",
        name="Transferoviar Călători",
        shortName="TFC",
        city="National",
        modes=[TransitMode.TRAIN],
        badgeColor="#D97706",
        isNationalRail=True
    )
}

SCHEDULE_DATA: List[TransitLineSchedule] = [
    # URBAN
    TransitLineSchedule(
        id="sch-gl-102",
        lineCode="102",
        lineName="Micro 19 ⇄ Gara CFR Galați",
        mode=TransitMode.BUS,
        provider=ROMANIAN_PROVIDERS["transurb"],
        city="Galați",
        origin="Micro 19",
        destination="Gara CFR Galați",
        nextDepartures=[
            DepartureTime(time="06:40", minutesUntil=5, crowdingLevel="LOW"),
            DepartureTime(time="06:52", minutesUntil=17, crowdingLevel="MEDIUM"),
            DepartureTime(time="07:05", minutesUntil=30, crowdingLevel="MEDIUM"),
        ],
        frequencyDescription="Every 10-12 min",
        status="ON_TIME",
        fareLei=3.00,
        viaStops=["Flora", "Spitalul Județean", "Țiglina 1", "Mazepa", "Potcoava de Aur"]
    ),
    TransitLineSchedule(
        id="sch-gl-tram-39",
        lineCode="39",
        lineName="Micro 19 ⇄ Cimitirul Israelit",
        mode=TransitMode.TRAM,
        provider=ROMANIAN_PROVIDERS["transurb"],
        city="Galați",
        origin="Micro 19",
        destination="Cimitirul Israelit",
        nextDepartures=[
            DepartureTime(time="06:45", minutesUntil=8, crowdingLevel="LOW"),
            DepartureTime(time="07:00", minutesUntil=23, crowdingLevel="LOW"),
        ],
        frequencyDescription="Every 15 min",
        status="ON_TIME",
        fareLei=3.00,
        viaStops=["Micro 20", "Cinema Dacia", "Piața Energiei", "IREG"]
    ),
    TransitLineSchedule(
        id="sch-buc-m2",
        lineCode="M2",
        lineName="Pipera ⇄ Berceni",
        mode=TransitMode.METRO,
        provider=ROMANIAN_PROVIDERS["metrorex"],
        city="București",
        origin="Pipera",
        destination="Berceni",
        nextDepartures=[
            DepartureTime(time="07:12", minutesUntil=2, crowdingLevel="MEDIUM"),
            DepartureTime(time="07:16", minutesUntil=6, crowdingLevel="HIGH"),
            DepartureTime(time="07:20", minutesUntil=10, crowdingLevel="HIGH"),
        ],
        frequencyDescription="Every 3-4 min",
        status="ON_TIME",
        fareLei=3.00,
        viaStops=["Aurel Vlaicu", "Piața Victoriei", "Piața Romană", "Universitate", "Piața Unirii"]
    ),
    TransitLineSchedule(
        id="sch-buc-tram-41",
        lineCode="41",
        lineName="Piața Presei ⇄ Ghencea",
        mode=TransitMode.TRAM,
        provider=ROMANIAN_PROVIDERS["stb"],
        city="București",
        origin="Piața Presei",
        destination="Ghencea",
        nextDepartures=[
            DepartureTime(time="07:15", minutesUntil=4, crowdingLevel="HIGH"),
            DepartureTime(time="07:20", minutesUntil=9, crowdingLevel="HIGH"),
        ],
        frequencyDescription="Every 4-5 min (Metrou Ușor)",
        status="ON_TIME",
        fareLei=3.00,
        viaStops=["Casin", "Pod Ciurel", "Crângași", "Pasaj Lujerului", "Brașov"]
    ),

    # TRAIN
    TransitLineSchedule(
        id="sch-train-ir-1572",
        lineCode="IR 1572",
        lineName="Galați ⇄ București Nord",
        mode=TransitMode.TRAIN,
        provider=ROMANIAN_PROVIDERS["cfr"],
        city="Galați",
        origin="Galați",
        destination="București Nord",
        nextDepartures=[
            DepartureTime(time="07:35", minutesUntil=48, platform="Linia 2", crowdingLevel="LOW"),
            DepartureTime(time="14:30", minutesUntil=463, platform="Linia 1", crowdingLevel="LOW"),
        ],
        frequencyDescription="2 express daily",
        status="ON_TIME",
        fareLei=63.00,
        viaStops=["Brăila", "Făurei", "Buzău", "Ploiești Sud"]
    ),
    TransitLineSchedule(
        id="sch-train-ir-1631",
        lineCode="IR 1631",
        lineName="București Nord ⇄ Brașov",
        mode=TransitMode.TRAIN,
        provider=ROMANIAN_PROVIDERS["cfr"],
        city="București",
        origin="București Nord",
        destination="Brașov",
        nextDepartures=[
            DepartureTime(time="09:10", minutesUntil=125, platform="Linia 3", crowdingLevel="LOW"),
            DepartureTime(time="11:35", minutesUntil=270, platform="Linia 4", crowdingLevel="LOW"),
        ],
        frequencyDescription="Hourly service",
        status="ON_TIME",
        fareLei=48.00,
        viaStops=["Ploiești Vest", "Câmpina", "Sinaia", "Bușteni", "Predeal"]
    ),
    TransitLineSchedule(
        id="sch-train-astra-15531",
        lineCode="IR 15531",
        lineName="București Nord ⇄ Arad",
        mode=TransitMode.TRAIN,
        provider=ROMANIAN_PROVIDERS["astra"],
        city="București",
        origin="București Nord",
        destination="Arad",
        nextDepartures=[
            DepartureTime(time="21:40", minutesUntil=875, platform="Linia 1", crowdingLevel="LOW"),
        ],
        frequencyDescription="Overnight Sleeper",
        status="ON_TIME",
        fareLei=115.00,
        viaStops=["Brașov", "Sighișoara", "Alba Iulia", "Deva"]
    ),
]


class ScheduleService:
    @staticmethod
    def get_schedules(
        section: Optional[str] = None,
        city: Optional[str] = None,
        mode: Optional[TransitMode] = None,
        search: Optional[str] = None
    ) -> List[TransitLineSchedule]:
        results = SCHEDULE_DATA

        if section:
            if section.upper() == "TRAIN":
                results = [s for s in results if s.mode == TransitMode.TRAIN]
            elif section.upper() == "URBAN":
                results = [s for s in results if s.mode != TransitMode.TRAIN]

        if city:
            c = city.lower().strip()
            results = [s for s in results if c in s.city.lower() or c in s.origin.lower() or c in s.destination.lower()]

        if mode:
            results = [s for s in results if s.mode == mode]

        if search:
            q = search.lower().strip()
            results = [
                s for s in results
                if q in s.lineCode.lower()
                or q in s.lineName.lower()
                or q in s.origin.lower()
                or q in s.destination.lower()
                or q in s.provider.name.lower()
                or any(q in v.lower() for v in (s.viaStops or []))
            ]

        return results


schedule_service = ScheduleService()
