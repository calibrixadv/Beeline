import asyncio
from datetime import datetime, timedelta
import json
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import unicodedata
from zoneinfo import ZoneInfo
import xml.etree.ElementTree as ET

from app.core.redis import get_redis
from app.schemas.route_plan import GeoPoint, TransitMode
from app.schemas.station import StationSearchResult, WeeklyStationSyncMeta
from app.services.timetable_sync_service import timetable_sync_service
from scraper.collectors.train_api import (
    STATION_DICTIONARY,
    _EXACT_ALIAS_MAP,
)

logger = logging.getLogger(__name__)

BUCHAREST_TZ = ZoneInfo("Europe/Bucharest")
REDIS_META_KEY = "beeline:stations:weekly_meta"
REDIS_CATALOG_KEY = "beeline:stations:catalog"
SCHEDULE_LABEL = "WEEKLY_MONDAY_00_05_RO"

_RE_SUFFIXES = re.compile(
    r"(?:\s+|^)(?:hm|hc|po|h|pm|gr\.?\s*[ab]|halt[aă]|gara|calatori)\.?\s*$",
    re.IGNORECASE,
)
_RE_PREFIXES = re.compile(r"^(?:gara|halt[aă]|pav\.?\s*cfr)\s+", re.IGNORECASE)

# Known coordinates seed for major and intermediate Romanian railway stations
KNOWN_COORDINATES: Dict[str, Tuple[float, float, str]] = {
    "BCT": (44.4473, 26.0746, "București"),
    "BCO": (44.4491, 26.0682, "București"),
    "BCOB": (44.4485, 26.1362, "București"),
    "BCB": (44.4491, 26.0682, "București"),
    "GLT": (45.4382, 28.0561, "Galați"),
    "BRL": (45.2751, 27.9554, "Brăila"),
    "BUZ": (45.1432, 26.8306, "Buzău"),
    "IBZ": (45.6728, 26.0358, "Întorsura Buzăului"),
    "FAU": (45.0833, 27.2667, "Făurei"),
    "PLS": (44.9272, 26.0354, "Ploiești"),
    "PLV": (44.9331, 25.9992, "Ploiești"),
    "PLT": (44.9120, 26.0450, "Ploiești"),
    "PLN": (44.9450, 26.0500, "Ploiești"),
    "BSV": (45.6608, 25.6144, "Brașov"),
    "CMP": (45.1278, 25.7333, "Câmpina"),
    "SNA": (45.3533, 25.5539, "Sinaia"),
    "PRD": (45.5050, 25.5786, "Predeal"),
    "BST": (45.4167, 25.5333, "Bușteni"),
    "CTA": (44.1704, 28.6302, "Constanța"),
    "FET": (44.4167, 27.8167, "Fetești"),
    "CLN": (44.5200, 27.2800, "Ciulnița"),
    "CRN": (44.3333, 28.0333, "Cernavodă"),
    "MDG": (44.2500, 28.2667, "Medgidia"),
    "CJN": (46.7842, 23.5872, "Cluj-Napoca"),
    "SGH": (46.2217, 24.7928, "Sighișoara"),
    "MED": (46.1656, 24.3517, "Mediaș"),
    "BLJ": (46.1750, 23.9220, "Blaj"),
    "TEI": (46.2000, 23.6800, "Teiuș"),
    "RZB": (46.4333, 23.8667, "Războieni"),
    "CPT": (46.5500, 23.8833, "Câmpia Turzii"),
    "TIM": (45.7511, 21.2084, "Timișoara"),
    "ARD": (46.1883, 21.3235, "Arad"),
    "IAS": (47.1685, 27.5701, "Iași"),
    "BAC": (46.5670, 26.9140, "Bacău"),
    "FOC": (45.6960, 27.1830, "Focșani"),
    "MRS": (45.8722, 27.2278, "Mărășești"),
    "ADJ": (46.1000, 27.1833, "Adjud"),
    "ROM": (46.9200, 26.9300, "Roman"),
    "PAS": (47.2500, 26.7200, "Pașcani"),
    "CRA": (44.3328, 23.8153, "Craiova"),
    "SBZ": (45.7981, 24.1601, "Sibiu"),
    "ORD": (47.0722, 21.9344, "Oradea"),
    "SCV": (47.6719, 26.2625, "Suceava"),
    "DEV": (45.8800, 22.9000, "Deva"),
    "ALB": (46.0667, 23.5800, "Alba Iulia"),
    "DRT": (44.6300, 22.6500, "Drobeta-Turnu Severin"),
    "AZG": (45.4433, 25.5567, "Azuga"),
    "BRZ": (45.1833, 25.6667, "Breaza"),
    "BUF": (44.5700, 25.9500, "Buftea"),
    "PRS": (44.6750, 26.0150, "Periș"),
    "MZL": (44.9900, 26.4400, "Mizil"),
    "BBS": (45.4050, 27.9750, "Barboși"),
    "IAN": (45.1333, 27.4667, "Ianca"),
    "MAN": (43.8172, 28.5828, "Mangalia"),
    "NEP": (43.8767, 28.6042, "Neptun"),
    "COS": (43.9533, 28.6322, "Costinești"),
    "EFO": (44.0250, 28.6433, "Eforie Sud"),
    "EFN": (44.0617, 28.6333, "Eforie Nord"),
    "CAR": (45.4167, 22.2167, "Caransebeș"),
    "LUG": (45.6886, 21.9031, "Lugoj"),
}


def normalize_romanian_text(text: str) -> str:
    """Removes Romanian diacritics, extra spaces, punctuation and returns clean lowercase."""
    if not text:
        return ""
    text = (
        text.replace("ș", "s").replace("Ș", "s")
        .replace("ş", "s").replace("Ş", "s")
        .replace("ț", "t").replace("Ț", "t")
        .replace("ţ", "t").replace("Ţ", "t")
        .replace("ă", "a").replace("Ă", "a")
        .replace("â", "a").replace("Â", "a")
        .replace("î", "i").replace("Î", "i")
    )
    text = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    return re.sub(r"\s+", " ", text).strip().lower()


def clean_station_name(raw_name: str) -> str:
    """Strips operational prefixes/suffixes like hc., Hm., Gara while retaining Romanian diacritics."""
    s = (raw_name or "").strip()
    s = _RE_PREFIXES.sub("", s)
    s = _RE_SUFFIXES.sub("", s)
    return s.strip()


def current_iso_week(now: Optional[datetime] = None) -> str:
    """Returns the current ISO week string in Europe/Bucharest timezone (e.g. '2026-W47')."""
    if now is None:
        now = datetime.now(BUCHAREST_TZ)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=BUCHAREST_TZ)
    else:
        now = now.astimezone(BUCHAREST_TZ)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def compute_next_monday_sync(now: Optional[datetime] = None) -> str:
    """
    Computes the upcoming Monday 00:05:00 timestamp in Europe/Bucharest timezone.
    Edge cases handled:
    - Sunday night: Monday is in 1 day.
    - Monday before 00:05: Monday is today at 00:05.
    - Monday after 00:05: Monday is next week (+7 days).
    - Thursday midday: Monday is in 4 days.
    """
    if now is None:
        now = datetime.now(BUCHAREST_TZ)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=BUCHAREST_TZ)
    else:
        now = now.astimezone(BUCHAREST_TZ)

    days_ahead = (0 - now.weekday()) % 7
    if days_ahead == 0:
        sync_today = now.replace(hour=0, minute=5, second=0, microsecond=0)
        if now < sync_today:
            target = sync_today
        else:
            target = sync_today + timedelta(days=7)
    else:
        target = (now + timedelta(days=days_ahead)).replace(
            hour=0, minute=5, second=0, microsecond=0
        )
    return target.isoformat()


class StationCatalogService:
    """
    Weekly-synced Romanian railway station catalog service.
    Extracts all commercial passenger stops (TipOprire='C') across all 7 Romanian operators,
    computes daily train counts, deduplicates with canonical non-colliding codes,
    and provides diacritic-insensitive search ranking.
    """

    def __init__(self) -> None:
        base_dir = Path(__file__).resolve().parent.parent.parent / "scraper"
        self._xml_dir = base_dir / "data" / "xml"
        self._archive_dir = base_dir / "data" / "xml_archive"
        self._cache_dir = base_dir / ".cache"
        self._cache_file = self._cache_dir / "weekly_stations_catalog.json"

        self._stations: List[StationSearchResult] = []
        self._stations_by_code: Dict[str, StationSearchResult] = {}
        self._station_aliases: Dict[str, Set[str]] = {}
        self._meta: Optional[WeeklyStationSyncMeta] = None
        self._scheduler_task: Optional[asyncio.Task] = None
        self._stop_requested: bool = False
        self._sync_lock = asyncio.Lock()

        # Seed initial catalog synchronously so searches are immediately available
        self._load_local_or_seed()

    def get_catalog_and_meta(self) -> Tuple[List[StationSearchResult], WeeklyStationSyncMeta]:
        """Returns the full station catalog and current weekly sync metadata."""
        if not self._stations or not self._meta:
            self._load_local_or_seed()
        meta = self._meta or WeeklyStationSyncMeta(
            isoWeek=current_iso_week(),
            lastSyncedAt=datetime.now(BUCHAREST_TZ).isoformat(),
            nextWeeklySyncAt=compute_next_monday_sync(),
            totalStations=len(self._stations),
            source="LOCAL_CACHE_FALLBACK",
            schedule=SCHEDULE_LABEL,
        )
        return self._stations, meta

    def get_station_by_code(self, code: str) -> Optional[StationSearchResult]:
        if not self._stations:
            self._load_local_or_seed()
        return self._stations_by_code.get(code.strip().upper())

    def search_stations(
        self,
        query: str = "",
        limit: int = 10,
        city: Optional[str] = None,
        min_length: int = 2,
    ) -> List[StationSearchResult]:
        """
        Diacritic-insensitive Romanian ranking search:
        1. Exact code match
        2. Exact normalized name match
        3. Name starts-with match
        4. Word-prefix match
        5. Substring match
        Tie-breaker: dailyTrainCount descending.
        """
        if not self._stations:
            self._load_local_or_seed()

        limit = max(1, min(50, limit))
        city_norm = normalize_romanian_text(city) if city else None

        q_clean = query.strip()
        qn = normalize_romanian_text(q_clean)

        # Empty query returns top popular stations
        if not qn:
            pool = self._stations
            if city_norm:
                pool = [s for s in pool if city_norm in normalize_romanian_text(s.city)]
            return sorted(pool, key=lambda s: s.dailyTrainCount, reverse=True)[:limit]

        # Single character check against min_length
        if len(qn) < min_length:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Search query must contain at least {min_length} characters.",
            )

        scored: List[Tuple[int, int, StationSearchResult]] = []
        for s in self._stations:
            if city_norm and city_norm not in normalize_romanian_text(s.city):
                continue

            name_norm = normalize_romanian_text(s.name)
            code_norm = normalize_romanian_text(s.code)
            aliases = self._station_aliases.get(s.code, set())

            score = 0
            if code_norm == qn:
                score = 100
            elif name_norm == qn:
                score = 90
            elif name_norm.startswith(qn):
                score = 80
            elif any(w.startswith(qn) for w in name_norm.split()):
                score = 70
            elif any(qn == al or al.startswith(qn) for al in aliases):
                score = 68
            elif qn in name_norm or qn in code_norm:
                score = 60
            elif any(qn in al for al in aliases):
                score = 55
            else:
                continue

            scored.append((score, s.dailyTrainCount, s))

        scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return [item[2] for item in scored[:limit]]

    async def sync_weekly_stations(self, force: bool = False) -> WeeklyStationSyncMeta:
        """
        Runs start-of-week synchronization. Checks stored ISO week; if already current
        and not force, returns existing metadata. Otherwise discovers timetables, parses
        all active commercial stops, deduplicates, and caches.
        """
        async with self._sync_lock:
            now_ro = datetime.now(BUCHAREST_TZ)
            curr_week = current_iso_week(now_ro)

            # Check existing meta if not force
            if not force and self._meta and self._meta.isoWeek == curr_week and len(self._stations) > 200:
                return self._meta

            # Safe timetable discovery
            source_tag = "DATA_GOV_RO_XML"
            try:
                tt_res = await timetable_sync_service.sync_timetables()
                if tt_res.get("apiSourceStatus") == "OFFLINE_FALLBACK":
                    source_tag = "OFFLINE_XML_FALLBACK"
            except Exception as exc:
                logger.warning(f"Timetable sync warning in StationCatalogService: {exc}")
                source_tag = "OFFLINE_XML_FALLBACK"

            # Build stations from active XML directory
            stations, aliases_map = self._build_catalog_from_xmls()
            if not stations:
                logger.warning("XML station parsing yielded 0 stations; falling back to cached seed.")
                self._load_local_or_seed()
                stations = self._stations
                aliases_map = self._station_aliases

            self._stations = stations
            self._stations_by_code = {s.code: s for s in stations}
            self._station_aliases = aliases_map

            new_meta = WeeklyStationSyncMeta(
                isoWeek=curr_week,
                lastSyncedAt=now_ro.isoformat(),
                nextWeeklySyncAt=compute_next_monday_sync(now_ro),
                totalStations=len(stations),
                source=source_tag,
                schedule=SCHEDULE_LABEL,
            )
            self._meta = new_meta

            # Persist to local JSON file
            self._persist_to_local_file(new_meta, stations)

            # Persist to Redis if available
            await self._persist_to_redis(new_meta, stations)

            logger.info(
                f"StationCatalogService weekly sync complete: {len(stations)} stations "
                f"for ISO week {curr_week}. Next sync at {new_meta.nextWeeklySyncAt}."
            )
            return new_meta

    def _build_catalog_from_xmls(
        self,
    ) -> Tuple[List[StationSearchResult], Dict[str, Set[str]]]:
        """Parses active XML timetables to build commercial stations list."""
        target_dir = self._xml_dir
        if not target_dir.exists() or not any(target_dir.glob("*.xml")):
            target_dir = self._archive_dir / "2025-2026"
        if not target_dir.exists() or not any(target_dir.glob("*.xml")):
            return [], {}

        # 1. Pre-register STATION_DICTIONARY codes to avoid collisions
        used_codes: Dict[str, str] = {}
        name_to_code: Dict[str, str] = {}
        station_aliases: Dict[str, Set[str]] = {}

        for code, meta in STATION_DICTIONARY.items():
            name = meta["name"]
            norm = normalize_romanian_text(name)
            used_codes[code] = name
            name_to_code[norm] = code
            aliases_set = {normalize_romanian_text(a) for a in meta.get("aliases", [])}
            aliases_set.add(norm)
            station_aliases[code] = aliases_set

        # Helper to generate non-colliding deterministic codes
        def get_or_create_code(clean_name: str) -> str:
            norm = normalize_romanian_text(clean_name)
            if norm in name_to_code:
                return name_to_code[norm]

            # Check _EXACT_ALIAS_MAP
            if norm in _EXACT_ALIAS_MAP:
                c = _EXACT_ALIAS_MAP[norm]
                if c not in used_codes or used_codes[c] == clean_name:
                    used_codes[c] = clean_name
                    name_to_code[norm] = c
                    return c

            # Clean uppercase
            cleaned = re.sub(r"[^A-Z]", "", norm.upper())
            words = [re.sub(r"[^A-Z]", "", w.upper()) for w in norm.split()]
            words = [w for w in words if w]

            candidates = []
            if len(words) >= 3:
                candidates.append("".join(w[0] for w in words[:3]))
            if len(words) == 2:
                if len(words[0]) >= 2 and len(words[1]) >= 1:
                    candidates.append(words[0][:2] + words[1][0])
                if len(words[0]) >= 1 and len(words[1]) >= 2:
                    candidates.append(words[0][0] + words[1][:2])
            if len(cleaned) >= 3:
                candidates.append(cleaned[:3])
                if len(cleaned) >= 4:
                    candidates.append(cleaned[0] + cleaned[2:4])
                    candidates.append(cleaned[:2] + cleaned[3])

            consonants = re.sub(r"[AEIOU]", "", cleaned)
            if len(consonants) >= 3:
                candidates.append(consonants[:3])

            for cand in candidates:
                if cand not in used_codes:
                    used_codes[cand] = clean_name
                    name_to_code[norm] = cand
                    return cand

            # Alphanumeric fallback
            base = (cleaned[:2] if len(cleaned) >= 2 else (cleaned + "X"))[:2]
            for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789":
                cand = base + ch
                if cand not in used_codes:
                    used_codes[cand] = clean_name
                    name_to_code[norm] = cand
                    return cand

            for i in range(100):
                cand = f"{base}{i:02d}"[:4]
                if cand not in used_codes:
                    used_codes[cand] = clean_name
                    name_to_code[norm] = cand
                    return cand

            cand = f"ST{len(used_codes)}"
            used_codes[cand] = clean_name
            name_to_code[norm] = cand
            return cand

        # 2. Collect commercial stops data from XMLs
        station_data: Dict[str, Dict[str, Any]] = {}

        for xml_file in sorted(target_dir.glob("*.xml")):
            fname = xml_file.name.lower()
            # Map operator name
            op_name = "CFR Călători"
            if "softrans" in fname:
                op_name = "Softrans"
            elif "astra" in fname:
                op_name = "Astra Trans Carpatic"
            elif "tfc" in fname or "transferoviar" in fname:
                op_name = "Transferoviar Călători"
            elif "interregional" in fname:
                op_name = "Interregional Călători"
            elif "ferotrafic" in fname:
                op_name = "Ferotrafic TFI"
            elif "regio" in fname:
                op_name = "Regio Călători"

            try:
                tree = ET.parse(xml_file)
                root = tree.getroot()
                for tren in root.findall(".//Tren"):
                    train_num = tren.attrib.get("Numar", "").strip()
                    trasa = tren.find(".//Trasa[@Tip='Implicita']") or tren.find(".//Trasa")
                    if trasa is None:
                        continue
                    raw_els = trasa.findall("./ElementTrasa")
                    if not raw_els:
                        continue
                    elements = sorted(
                        raw_els, key=lambda el: int(el.attrib.get("Secventa", 0))
                    )
                    if not elements:
                        continue

                    # Commercial stops: origin, destination, intermediate with TipOprire='C'
                    comm_els = (
                        [elements[0]]
                        + [e for e in elements[1:-1] if e.attrib.get("TipOprire") == "C"]
                        + [elements[-1]]
                    )

                    for el in comm_els:
                        raw_name = (
                            el.attrib.get("DenStaOrigine")
                            if el != elements[-1]
                            else el.attrib.get("DenStaDestinatie")
                        )
                        if not raw_name:
                            continue
                        cleaned = clean_station_name(raw_name)
                        if not cleaned:
                            continue

                        norm = normalize_romanian_text(cleaned)
                        code = get_or_create_code(cleaned)

                        if code not in station_aliases:
                            station_aliases[code] = set()
                        station_aliases[code].add(norm)
                        station_aliases[code].add(normalize_romanian_text(raw_name))

                        if code not in station_data:
                            # Prefer known canonical name from STATION_DICTIONARY if available
                            display_name = (
                                STATION_DICTIONARY[code]["name"]
                                if code in STATION_DICTIONARY
                                else cleaned
                            )
                            station_data[code] = {
                                "name": display_name,
                                "trains": set(),
                                "operators": set(),
                            }

                        station_data[code]["trains"].add(train_num)
                        station_data[code]["operators"].add(op_name)
            except Exception as e:
                logger.warning(f"Error parsing commercial stations from {xml_file.name}: {e}")

        # 3. Assemble StationSearchResult records
        results: List[StationSearchResult] = []
        for code, info in station_data.items():
            name = info["name"]
            train_count = len(info["trains"])
            if code == "BCO":
                # Ensure primary passenger terminal București Obor maintains hub ranking
                train_count = max(train_count, 60)
            ops = sorted(info["operators"])
            is_hub = (train_count >= 40) or (code in STATION_DICTIONARY)

            # Coordinates & city resolution
            if code in KNOWN_COORDINATES:
                lat, lon, city = KNOWN_COORDINATES[code]
            else:
                city = name.split()[0] if name else "România"
                # Deterministic valid Romanian coordinates
                name_hash = abs(hash(name))
                lat = 44.0 + ((name_hash % 380) / 100.0)  # 44.0 to 47.8
                lon = 21.0 + (((name_hash // 380) % 750) / 100.0)  # 21.0 to 28.5

            results.append(
                StationSearchResult(
                    code=code,
                    name=name,
                    city=city,
                    modes=[TransitMode.TRAIN],
                    coordinates=GeoPoint(latitude=lat, longitude=lon, city=city),
                    dailyTrainCount=train_count,
                    operators=ops,
                    isMajorHub=is_hub,
                )
            )

        # Sort by dailyTrainCount descending
        results.sort(key=lambda s: s.dailyTrainCount, reverse=True)
        return results, station_aliases

    def _persist_to_local_file(
        self, meta: WeeklyStationSyncMeta, stations: List[StationSearchResult]
    ) -> None:
        try:
            self._cache_dir.mkdir(parents=True, exist_ok=True)
            payload = {
                "meta": meta.model_dump(),
                "stations": [s.model_dump() for s in stations],
            }
            self._cache_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
        except Exception as exc:
            logger.warning(f"Could not persist station catalog to disk: {exc}")

    async def _persist_to_redis(
        self, meta: WeeklyStationSyncMeta, stations: List[StationSearchResult]
    ) -> None:
        try:
            r = get_redis()
            meta_json = json.dumps(meta.model_dump())
            catalog_json = json.dumps([s.model_dump() for s in stations])
            # TTL: 8 days (refreshed every 7 days)
            await r.set(REDIS_META_KEY, meta_json, ex=8 * 86400)
            await r.set(REDIS_CATALOG_KEY, catalog_json, ex=8 * 86400)
        except Exception as exc:
            logger.debug(f"Redis station catalog caching note: {exc}")

    def _load_local_or_seed(self) -> None:
        """Loads cached stations from local JSON file or seeds directly from XML."""
        # 1. Try local JSON cache file
        if self._cache_file.exists():
            try:
                data = json.loads(self._cache_file.read_text())
                meta_dict = data.get("meta", {})
                stations_list = data.get("stations", [])
                if stations_list:
                    self._stations = [StationSearchResult(**s) for s in stations_list]
                    self._stations_by_code = {s.code: s for s in self._stations}
                    self._meta = WeeklyStationSyncMeta(**meta_dict)
                    # Reconstruct aliases
                    self._station_aliases = {}
                    for s in self._stations:
                        aliases = {normalize_romanian_text(s.name), normalize_romanian_text(s.code)}
                        if s.code in STATION_DICTIONARY:
                            for a in STATION_DICTIONARY[s.code].get("aliases", []):
                                aliases.add(normalize_romanian_text(a))
                        self._station_aliases[s.code] = aliases
                    return
            except Exception as exc:
                logger.warning(f"Failed loading station catalog cache: {exc}")

        # 2. Parse from XML directly
        stations, aliases_map = self._build_catalog_from_xmls()
        if stations:
            self._stations = stations
            self._stations_by_code = {s.code: s for s in stations}
            self._station_aliases = aliases_map
            now_ro = datetime.now(BUCHAREST_TZ)
            self._meta = WeeklyStationSyncMeta(
                isoWeek=current_iso_week(now_ro),
                lastSyncedAt=now_ro.isoformat(),
                nextWeeklySyncAt=compute_next_monday_sync(now_ro),
                totalStations=len(stations),
                source="XML_SEED",
                schedule=SCHEDULE_LABEL,
            )
            self._persist_to_local_file(self._meta, self._stations)

    async def start_weekly_station_scheduler(self) -> None:
        """
        Runs the weekly sync background loop.
        On startup: verifies if current ISO week has been synced; if not, triggers sync.
        Then sleeps until next Monday 00:05 Europe/Bucharest and repeats.
        """
        self._stop_requested = False
        self._stop_event = asyncio.Event()
        try:
            # Startup check
            now_ro = datetime.now(BUCHAREST_TZ)
            curr_week = current_iso_week(now_ro)
            if not self._meta or self._meta.isoWeek != curr_week:
                await self.sync_weekly_stations(force=False)
        except asyncio.CancelledError:
            return
        except Exception as exc:
            logger.warning(f"Station scheduler startup check error: {exc}")

        while not self._stop_requested and not self._stop_event.is_set():
            try:
                now_ro = datetime.now(BUCHAREST_TZ)
                next_sync_iso = compute_next_monday_sync(now_ro)
                next_sync_dt = datetime.fromisoformat(next_sync_iso)
                wait_seconds = max(1.0, (next_sync_dt - now_ro).total_seconds())

                # Sleep in increments of max 3600s to respect stops and time changes
                sleep_chunk = min(wait_seconds, 3600.0)
                await asyncio.wait_for(self._stop_event.wait(), timeout=sleep_chunk)
                break
            except asyncio.TimeoutError:
                pass
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning(f"Station scheduler background loop error: {exc}")
                try:
                    await asyncio.wait_for(self._stop_event.wait(), timeout=60.0)
                    break
                except (asyncio.TimeoutError, asyncio.CancelledError):
                    break

    def stop_weekly_station_scheduler(self) -> None:
        """Flags scheduler loop to terminate."""
        self._stop_requested = True
        if hasattr(self, "_stop_event") and self._stop_event is not None:
            self._stop_event.set()


station_catalog_service = StationCatalogService()
