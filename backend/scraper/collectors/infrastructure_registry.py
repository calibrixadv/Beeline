import re
import unicodedata
from typing import Dict, Tuple
from ..models import InfrastructureFeatures


class InfrastructureRegistry:
    """
    Romanian Railway Network Topology Registry conforming to
    freeze_contract.md (Sursa 4: Infrastructure & Topology Registry).
    """

    # Corridor metadata registry: (is_single_track, mountain_pass, default_slow_orders)
    KNOWN_CORRIDORS: Dict[Tuple[str, str], Tuple[int, int, int]] = {
        # Galați ⇄ București (Single track on Galați-Făurei branch)
        ("GLT", "BCT"): (1, 0, 2),
        ("BCT", "GLT"): (1, 0, 2),
        # București ⇄ Brașov (Mountain pass crossing Predeal 1054m)
        ("BCT", "BSV"): (0, 1, 1),
        ("BSV", "BCT"): (0, 1, 1),
        # București ⇄ Constanța (Modernized double-track 160km/h)
        ("BCT", "CTA"): (0, 0, 0),
        ("CTA", "BCT"): (0, 0, 0),
        # Cluj-Napoca ⇄ Oradea (Single-track regional sections)
        ("CJN", "ORD"): (1, 0, 3),
        ("ORD", "CJN"): (1, 0, 3),
        # Brașov ⇄ Sibiu (Single-track non-electrified)
        ("BSV", "SBZ"): (1, 0, 2),
        ("SBZ", "BSV"): (1, 0, 2),
        # Craiova ⇄ Timișoara (Mountain sections Defileul Jiului / Poarta Orientului)
        ("CRV", "TMN"): (1, 1, 4),
        ("TMN", "CRV"): (1, 1, 4),
        # Iași ⇄ București (Double-track M500 with Buzău slow orders)
        ("ISN", "BCT"): (0, 0, 2),
        ("BCT", "ISN"): (0, 0, 2),
    }

    @staticmethod
    def slugify(origin: str, destination: str) -> str:
        """Produces canonical slug for corridor identification."""
        def _clean(s: str) -> str:
            s = unicodedata.normalize("NFKD", s).encode("ASCII", "ignore").decode("utf-8")
            s = re.sub(r"[^\w\s-]", "", s).strip().lower()
            return re.sub(r"[-\s]+", "_", s)
        return f"{_clean(origin)}-{_clean(destination)}"

    @classmethod
    def get_infrastructure(
        cls,
        origin_code: str,
        destination_code: str,
        origin_city: str = "",
        destination_city: str = "",
    ) -> InfrastructureFeatures:
        """Retrieves topology features for the given station origin/destination pair."""
        orig = origin_code.upper().strip()
        dest = destination_code.upper().strip()

        meta = cls.KNOWN_CORRIDORS.get((orig, dest))
        if meta:
            single_track, mountain, slow_orders = meta
        else:
            # Sane topological defaults
            single_track = 1 if "GLT" in (orig, dest) or "ORD" in (orig, dest) else 0
            mountain = 1 if "BSV" in (orig, dest) else 0
            slow_orders = 1

        slug_orig = origin_city or orig
        slug_dest = destination_city or dest
        slug = cls.slugify(slug_orig, slug_dest)

        return InfrastructureFeatures(
            is_single_track=single_track,
            mountain_pass_flag=mountain,
            active_speed_restrictions_count=slow_orders,
            corridor_slug=slug,
        )
