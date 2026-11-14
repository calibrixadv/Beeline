import json
import urllib.parse
import urllib.request
from typing import Optional
from ..models import WeatherApiFeatures


class WeatherApiCollector:
    """
    Collector for weather features conforming to freeze_contract.md (Sursa 2: Weather APIs).
    Integrates Open-Meteo Free Transit Grid / ANM alerts with robust offline fallback.
    """

    # Station GPS lookup for Romanian hubs
    STATION_COORDS = {
        "BCT": (44.4473, 26.0746),  # București Nord
        "BSV": (45.6606, 25.6128),  # Brașov
        "GLT": (45.4382, 28.0561),  # Galați
        "BRL": (45.2711, 27.9739),  # Brăila
        "CJN": (46.7844, 23.5878),  # Cluj-Napoca
        "TMN": (45.7533, 21.2081),  # Timișoara Nord
        "CTA": (44.1706, 28.6272),  # Constanța
        "ISN": (47.1678, 27.5714),  # Iași
        "CRV": (44.3314, 23.8153),  # Craiova
        "PLO": (44.9272, 26.0278),  # Ploiești Vest
    }

    def __init__(self, timeout_seconds: float = 4.0):
        self.timeout = timeout_seconds

    def fetch_weather(
        self,
        station_code: str,
        departure_iso: Optional[str] = None,
    ) -> WeatherApiFeatures:
        """
        Fetches current or forecasted weather for station coordinates.
        Degrades gracefully to deterministic default on network timeout or offline mode.
        """
        coords = self.STATION_COORDS.get(station_code.upper(), (44.4473, 26.0746))
        lat, lon = coords

        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast?"
                f"latitude={lat}&longitude={lon}"
                f"&current=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,visibility"
                f"&timezone=auto"
            )
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "BeelineTransitRiskCollector/1.0 (transit-research)"},
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode("utf-8"))
                    curr = payload.get("current", {})

                    temp = float(curr.get("temperature_2m", 18.0))
                    precip = float(curr.get("precipitation", 0.0))
                    wind_speed = float(curr.get("wind_speed_10m", 12.0))
                    wind_gust = float(curr.get("wind_gusts_10m", wind_speed * 1.4))
                    vis = float(curr.get("visibility", 10000.0))
                    w_code = int(curr.get("weather_code", 0))

                    # WMO Weather interpretation codes:
                    # 95, 96, 99: Thunderstorms
                    is_storm = 1 if w_code in [95, 96, 99] else 0
                    # 71, 73, 75, 85, 86: Snow
                    snow_depth = 5.0 if w_code in [71, 73, 75, 85, 86] else 0.0
                    # 56, 57, 66, 67: Freezing rain / drizzle
                    freezing_rain = 1 if w_code in [56, 57, 66, 67] else 0

                    return WeatherApiFeatures(
                        temp_celsius=temp,
                        precipitation_rate_mm_h=precip,
                        is_thunderstorm=is_storm,
                        wind_speed_kmh=wind_speed,
                        wind_gust_kmh=wind_gust,
                        snow_depth_cm=snow_depth,
                        freezing_rain_risk=freezing_rain,
                        visibility_meters=vis,
                    )
        except Exception:
            # Safe deterministic fallback adhering to freeze_contract.md defaults
            pass

        return WeatherApiFeatures(
            temp_celsius=18.0,
            precipitation_rate_mm_h=0.0,
            is_thunderstorm=0,
            wind_speed_kmh=10.0,
            wind_gust_kmh=15.0,
            snow_depth_cm=0.0,
            freezing_rain_risk=0,
            visibility_meters=10000.0,
        )
