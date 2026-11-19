from datetime import datetime, timezone
from typing import Optional, Tuple
from ..models import CalendarFeatures


class CalendarGenerator:
    """
    Deterministic calendar and temporal feature generator conforming to
    freeze_contract.md (Sursa 3: Calendar / Temporal Generator).
    """

    # Romanian statutory holidays (month, day)
    ROMANIAN_HOLIDAYS: Tuple[Tuple[int, int], ...] = (
        (1, 1),   # Anul Nou
        (1, 2),   # Anul Nou zi 2
        (1, 6),   # Boboteaza
        (1, 7),   # Sf. Ioan
        (1, 24),  # Ziua Unirii Principatelor
        (5, 1),   # Ziua Muncii
        (6, 1),   # Ziua Copilului
        (8, 15),  # Adormirea Maicii Domnului
        (11, 30), # Sfântul Andrei
        (12, 1),  # Ziua Națională a României
        (12, 25), # Crăciunul zi 1
        (12, 26), # Crăciunul zi 2
    )

    @staticmethod
    def get_season(month: int) -> int:
        """
        0: SPRING (Mar, Apr, May)
        1: SUMMER (Jun, Jul, Aug)
        2: AUTUMN (Sep, Oct, Nov)
        3: WINTER (Dec, Jan, Feb)
        """
        if month in (3, 4, 5):
            return 0
        elif month in (6, 7, 8):
            return 1
        elif month in (9, 10, 11):
            return 2
        else:
            return 3

    @classmethod
    def is_holiday_window(cls, dt: datetime) -> int:
        """Returns 1 if date falls within ±2 days of a Romanian statutory holiday."""
        m, d = dt.month, dt.day
        for hm, hd in cls.ROMANIAN_HOLIDAYS:
            if hm == m and abs(hd - d) <= 2:
                return 1
        return 0

    @classmethod
    def is_peak_hour(cls, dt: datetime) -> int:
        """
        Returns 1 if departure falls into commuter peak windows:
        Morning: 06:30 - 09:00
        Evening: 16:00 - 19:30
        """
        hour = dt.hour
        minute = dt.minute
        time_dec = hour + (minute / 60.0)

        if (6.5 <= time_dec <= 9.0) or (16.0 <= time_dec <= 19.5):
            return 1
        return 0

    @classmethod
    def generate_from_datetime(cls, dt: Optional[datetime] = None) -> CalendarFeatures:
        """Generates the full frozen calendar feature suite for a given timestamp."""
        if dt is None:
            dt = datetime.now(timezone.utc)

        season = cls.get_season(dt.month)
        hour = dt.hour
        peak = cls.is_peak_hour(dt)
        dow = dt.weekday()  # 0: Mon, ..., 6: Sun
        weekend = 1 if dow in (5, 6) else 0
        holiday = cls.is_holiday_window(dt)

        return CalendarFeatures(
            season=season,
            departure_hour=hour,
            is_peak_hour=peak,
            day_of_week=dow,
            is_weekend=weekend,
            is_holiday_window=holiday,
        )
