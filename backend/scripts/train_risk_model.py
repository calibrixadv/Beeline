#!/usr/bin/env python3
"""
Beeline VoyageRail - Transit Delay & Connection-Risk ML Pipeline Upgrade
Offline Training & ONNX Model Export Script (Phase 2, Tasks 7-10)

This script:
1. Bootstraps a high-fidelity synthetic Romanian transit dataset (N >= 50,000 samples)
   modeled on seed journeys (seed.sql, usr-seed-guest-003), romanianTransitTemplates.ts,
   corridor_service.py, and CFR/urban transit operational punctuality distributions.
2. Extracts and normalizes the canonical 18-element numerical feature vector.
3. Trains dual LightGBM estimators:
   - Expected Delay Regressor (Huber loss, MAE < 4.5 minutes)
   - Missed Connection Classifier (Binary logloss, ROC-AUC > 0.90, Brier < 0.10)
4. Fuses dual sub-graphs into a unified compiled ONNX model artifact:
   - backend/app/ml_models/risk_model.onnx (input: float_input [None, 18],
     outputs: expected_delay [None, 1], missed_connection_prob [None, 2])
   - backend/app/ml_models/risk_model_metadata.json
5. Verifies prediction parity (|LightGBM - ONNX| < 1e-5) and benchmarks CPU inference latency (< 1.0ms for batch of 5).
"""

import argparse
import hashlib
import json
import logging
import math
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
import lightgbm as lgb
import onnx
from onnx import helper
from onnx.compose import add_prefix
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType
import onnxruntime as ort

# Resolve backend directory and import core modules
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.services.feature_store_service import corridor_hash, slugify_corridor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ml_trainer")

# =====================================================================
# Constants & Romanian Transit Topology
# =====================================================================

FEATURE_NAMES = [
    "train_category",                 # 0: Ordinal (0: BUS .. 6: IC)
    "corridor_id_hash",               # 1: int16 hash % 1000
    "scheduled_duration_minutes",     # 2: float32
    "stop_count",                     # 3: int16
    "distance_km_est",                # 4: float32 Haversine
    "departure_hour",                 # 5: int8 (0..23)
    "is_peak_hour",                   # 6: int8 (0/1)
    "day_of_week",                    # 7: int8 (0..6)
    "is_weekend",                     # 8: int8 (0/1)
    "has_transfer",                   # 9: int8 (0/1)
    "transfer_buffer_minutes",        # 10: float32 (999.0 for direct)
    "transfer_station_reliability",   # 11: float32 (0.0..1.0)
    "transfer_station_congestion",    # 12: float32 (0.0..1.0)
    "active_corridor_disruptions",    # 13: int16
    "corridor_severity_max",          # 14: int8 (0..3)
    "rolling_avg_delay_3h",           # 15: float32
    "rolling_avg_delay_24h",          # 16: float32
    "carrier_baseline_punctuality",   # 17: float32 (0.0..1.0)
]

MODE_ENCODING = {
    "BUS": 0,
    "METRO": 1,
    "TRAM": 2,
    "R": 3,
    "RE": 4,
    "IR": 5,
    "IC": 6,
}

# Romanian Transit Stations with geographic coordinates (lat, lon)
STATION_COORDINATES: Dict[str, Tuple[float, float]] = {
    "BCT": (44.4473, 26.0753),  # București Nord
    "BSV": (45.6607, 25.6144),  # Brașov
    "GLT": (45.4431, 28.0556),  # Galați CFR
    "PLV": (44.9272, 25.9989),  # Ploiești Vest
    "PLS": (44.9298, 26.0357),  # Ploiești Sud
    "CTA": (44.1706, 28.6322),  # Constanța
    "CJN": (46.7844, 23.5878),  # Cluj-Napoca
    "ORD": (47.0719, 21.9328),  # Oradea
    "TIM": (45.7508, 21.2081),  # Timișoara Nord
    "ARD": (46.1917, 21.3208),  # Arad
    "CRA": (44.3328, 23.8153),  # Craiova
    "IAS": (47.1642, 27.5703),  # Iași
    "SNA": (45.3528, 25.5514),  # Sinaia
    "PST": (45.4189, 25.5342),  # Poiana Țapului / Bușteni
    "CMP": (45.1278, 25.7333),  # Câmpina
    "FAU": (45.0847, 27.2722),  # Făurei
    "BUZ": (45.1436, 26.8286),  # Buzău
    "BAR": (45.3972, 27.9736),  # Barboși
    # Urban hubs & Metrorex / Transurb / STB stops
    "GL_MICRO19": (45.4167, 27.9981), # Galați Micro 19
    "BUC_UNIRII": (44.4273, 26.1028), # București Piața Unirii
    "BUC_VICTORIEI": (44.4528, 26.0858), # București Piața Victoriei
    "BUC_PIPERA": (44.4811, 26.1128), # București Pipera
    "BUC_OTOPENI": (44.5711, 26.0850), # Aeroport Otopeni
    "BUC_DRISTOR": (44.4194, 26.1408), # București Dristor
    "BUC_GHENCEA": (44.4111, 26.0250), # București Ghencea
    "BUC_PRESEI": (44.4789, 26.0711), # București Piața Presei
    "CLUJ_MANASTUR": (46.7583, 23.5500), # Cluj Mănăștur
    "CLUJ_IULIUS": (46.7725, 23.6267), # Cluj Iulius Mall
    "TIM_VICTORIEI": (45.7539, 21.2257), # Timișoara Piața Victoriei
    "TIM_SHOPPING": (45.7278, 21.2056), # Timișoara Shopping City
}

# Operator profiles with benchmark punctuality and baseline chronic delay (minutes)
CARRIER_PROFILES: Dict[str, Dict[str, Any]] = {
    "metrorex": {"name": "Metrorex", "punctuality": 0.98, "chronic_delay": 1.5, "mode": "METRO"},
    "transurb": {"name": "Transurb Galați", "punctuality": 0.93, "chronic_delay": 3.5, "mode": "BUS"},
    "ctp-cluj": {"name": "CTP Cluj-Napoca", "punctuality": 0.92, "chronic_delay": 4.0, "mode": "BUS"},
    "softrans": {"name": "Softrans Hyperion", "punctuality": 0.91, "chronic_delay": 6.0, "mode": "RE"},
    "stpt": {"name": "STPT Timișoara", "punctuality": 0.90, "chronic_delay": 5.0, "mode": "TRAM"},
    "stb": {"name": "STB București", "punctuality": 0.89, "chronic_delay": 7.0, "mode": "BUS"},
    "astra-trans-carpatic": {"name": "Astra Trans Carpatic", "punctuality": 0.88, "chronic_delay": 8.0, "mode": "IR"},
    "transferoviar-calatori": {"name": "Transferoviar Călători", "punctuality": 0.87, "chronic_delay": 9.0, "mode": "R"},
    "regio-calatori": {"name": "Regio Călători", "punctuality": 0.86, "chronic_delay": 10.0, "mode": "R"},
    "cfr-calatori": {"name": "CFR Călători", "punctuality": 0.82, "chronic_delay": 14.5, "mode": "IR"},
}

# Transfer hubs with station congestion benchmarks
TRANSFER_HUBS: Dict[str, Dict[str, float]] = {
    "BCT": {"reliability": 0.85, "congestion": 0.65}, # București Nord
    "BSV": {"reliability": 0.89, "congestion": 0.45}, # Brașov
    "CJN": {"reliability": 0.91, "congestion": 0.40}, # Cluj-Napoca
    "TIM": {"reliability": 0.90, "congestion": 0.35}, # Timișoara Nord
    "GLT": {"reliability": 0.92, "congestion": 0.25}, # Galați CFR
    "PLV": {"reliability": 0.86, "congestion": 0.35}, # Ploiești Vest
    "CTA": {"reliability": 0.90, "congestion": 0.35}, # Constanța
    "ORD": {"reliability": 0.89, "congestion": 0.30}, # Oradea
    "CRA": {"reliability": 0.87, "congestion": 0.35}, # Craiova
}

# Romanian Station Code to Canonical City/Station Name
STATION_NAMES: Dict[str, str] = {
    "BCT": "București Nord",
    "BSV": "Brașov",
    "GLT": "Galați",
    "PLV": "Ploiești Vest",
    "PLS": "Ploiești Sud",
    "CTA": "Constanța",
    "CJN": "Cluj-Napoca",
    "ORD": "Oradea",
    "TIM": "Timișoara Nord",
    "ARD": "Arad",
    "CRA": "Craiova",
    "IAS": "Iași",
    "SNA": "Sinaia",
    "PST": "Bușteni",
    "CMP": "Câmpina",
    "FAU": "Făurei",
    "BUZ": "Buzău",
    "BAR": "Barboși",
    "GL_MICRO19": "Galați Micro 19",
    "BUC_UNIRII": "București Piața Unirii",
    "BUC_VICTORIEI": "București Piața Victoriei",
    "BUC_PIPERA": "București Pipera",
    "BUC_OTOPENI": "Aeroport Otopeni",
    "BUC_DRISTOR": "București Dristor",
    "BUC_GHENCEA": "București Ghencea",
    "BUC_PRESEI": "București Piața Presei",
    "CLUJ_MANASTUR": "Cluj Mănăștur",
    "CLUJ_IULIUS": "Cluj Iulius Mall",
    "TIM_VICTORIEI": "Timișoara Piața Victoriei",
    "TIM_SHOPPING": "Timișoara Shopping City",
}

# Single-track railway sections with recurring delay bottlenecks
SINGLE_TRACK_CORRIDORS = {
    "galati-faurei",
    "faurei-galati",
    "ploiesti_vest-campina",
    "campina-ploiesti_vest",
    "cluj_napoca-oradea",
    "oradea-cluj_napoca",
    "galati-bucuresti_nord",
    "bucuresti_nord-galati",
    "ploiesti_vest-brasov",
    "brasov-ploiesti_vest",
    # Station code slugs for robust fallback matching
    "glt-bct",
    "bct-glt",
    "cjn-ord",
    "ord-cjn",
    "plv-cmp",
    "cmp-plv",
    "plv-bsv",
    "bsv-plv",
}

# Pre-defined journey route archetypes
JOURNEY_TEMPLATES = [
    # 1. The Reference Seed Route: Galați Micro 19 -> București Piața Unirii (usr-seed-guest-003)
    {
        "id": "gl_micro19_to_buc_unirii",
        "has_transfer": 1,
        "legs": [
            {"carrier": "transurb", "mode": "BUS", "origin": "GL_MICRO19", "dest": "GLT", "duration": 22, "stops": 8},
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "GLT", "dest": "BCT", "duration": 215, "stops": 6},
            {"carrier": "metrorex", "mode": "METRO", "origin": "BCT", "dest": "BUC_UNIRII", "duration": 18, "stops": 4},
        ],
        "transfer_stations": ["GLT", "BCT"],
    },
    # 2. București Nord -> Brașov (Direct Rail IR / IC / RE)
    {
        "id": "buc_to_brasov_direct",
        "has_transfer": 0,
        "legs": [
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "BCT", "dest": "BSV", "duration": 150, "stops": 4},
        ],
        "transfer_stations": [],
    },
    # 3. București Nord -> Brașov (Astra Trans Carpatic Direct)
    {
        "id": "buc_to_brasov_astra",
        "has_transfer": 0,
        "legs": [
            {"carrier": "astra-trans-carpatic", "mode": "IR", "origin": "BCT", "dest": "BSV", "duration": 140, "stops": 3},
        ],
        "transfer_stations": [],
    },
    # 4. București Nord -> Constanța (Direct Rail Modernized Line)
    {
        "id": "buc_to_constanta_direct",
        "has_transfer": 0,
        "legs": [
            {"carrier": "cfr-calatori", "mode": "IC", "origin": "BCT", "dest": "CTA", "duration": 120, "stops": 1},
        ],
        "transfer_stations": [],
    },
    # 5. Brașov -> București Nord -> Constanța (Mountain to Sea Connecting Journey)
    {
        "id": "brasov_to_constanta_via_buc",
        "has_transfer": 1,
        "legs": [
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "BSV", "dest": "BCT", "duration": 148, "stops": 4},
            {"carrier": "cfr-calatori", "mode": "IC", "origin": "BCT", "dest": "CTA", "duration": 125, "stops": 1},
        ],
        "transfer_stations": ["BCT"],
    },
    # 6. Cluj-Napoca -> Oradea (Regional Rail Connecting / Direct)
    {
        "id": "cluj_to_oradea_direct",
        "has_transfer": 0,
        "legs": [
            {"carrier": "transferoviar-calatori", "mode": "R", "origin": "CJN", "dest": "ORD", "duration": 165, "stops": 12},
        ],
        "transfer_stations": [],
    },
    # 7. Cluj Mănăștur -> Gara Cluj -> Oradea (Urban + Regional Connecting)
    {
        "id": "cluj_manastur_to_oradea",
        "has_transfer": 1,
        "legs": [
            {"carrier": "ctp-cluj", "mode": "BUS", "origin": "CLUJ_MANASTUR", "dest": "CJN", "duration": 20, "stops": 7},
            {"carrier": "transferoviar-calatori", "mode": "R", "origin": "CJN", "dest": "ORD", "duration": 165, "stops": 12},
        ],
        "transfer_stations": ["CJN"],
    },
    # 8. Timișoara Nord -> Arad (Commuter Regional Rail)
    {
        "id": "timisoara_to_arad_regio",
        "has_transfer": 0,
        "legs": [
            {"carrier": "regio-calatori", "mode": "R", "origin": "TIM", "dest": "ARD", "duration": 52, "stops": 7},
        ],
        "transfer_stations": [],
    },
    # 9. Timișoara Piața Victoriei -> Gara de Nord -> Arad (Urban Tram + Regional Rail)
    {
        "id": "timisoara_tram_to_arad",
        "has_transfer": 1,
        "legs": [
            {"carrier": "stpt", "mode": "TRAM", "origin": "TIM_VICTORIEI", "dest": "TIM", "duration": 16, "stops": 5},
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "TIM", "dest": "ARD", "duration": 45, "stops": 2},
        ],
        "transfer_stations": ["TIM"],
    },
    # 10. Craiova -> București Nord (Direct InterRegio)
    {
        "id": "craiova_to_buc_direct",
        "has_transfer": 0,
        "legs": [
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "CRA", "dest": "BCT", "duration": 195, "stops": 5},
        ],
        "transfer_stations": [],
    },
    # 11. Craiova -> București Nord -> Piața Victoriei (Intercity + Metrorex)
    {
        "id": "craiova_to_buc_victoriei",
        "has_transfer": 1,
        "legs": [
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "CRA", "dest": "BCT", "duration": 195, "stops": 5},
            {"carrier": "metrorex", "mode": "METRO", "origin": "BCT", "dest": "BUC_VICTORIEI", "duration": 8, "stops": 1},
        ],
        "transfer_stations": ["BCT"],
    },
    # 12. Iași -> București Nord (Long Distance InterRegio)
    {
        "id": "iasi_to_buc_direct",
        "has_transfer": 0,
        "legs": [
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "IAS", "dest": "BCT", "duration": 345, "stops": 9},
        ],
        "transfer_stations": [],
    },
    # 13. Ploiești Vest -> Brașov (Prahova Valley Regional Transit)
    {
        "id": "ploiesti_to_brasov_softrans",
        "has_transfer": 0,
        "legs": [
            {"carrier": "softrans", "mode": "RE", "origin": "PLV", "dest": "BSV", "duration": 105, "stops": 3},
        ],
        "transfer_stations": [],
    },
    # 14. București Pipera -> Gara de Nord -> Ploiești Vest (Metrorex + CFR Rail)
    {
        "id": "pipera_to_ploiesti",
        "has_transfer": 1,
        "legs": [
            {"carrier": "metrorex", "mode": "METRO", "origin": "BUC_PIPERA", "dest": "BCT", "duration": 22, "stops": 5},
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "BCT", "dest": "PLV", "duration": 38, "stops": 1},
        ],
        "transfer_stations": ["BCT"],
    },
    # 15. Aeroport Otopeni -> București Nord -> Brașov (Airport Express + Rail)
    {
        "id": "otopeni_to_brasov",
        "has_transfer": 1,
        "legs": [
            {"carrier": "cfr-calatori", "mode": "RE", "origin": "BUC_OTOPENI", "dest": "BCT", "duration": 25, "stops": 1},
            {"carrier": "cfr-calatori", "mode": "IR", "origin": "BCT", "dest": "BSV", "duration": 145, "stops": 4},
        ],
        "transfer_stations": ["BCT"],
    },
    # 16. București Metrorex M2 Direct: Pipera -> Piața Unirii
    {
        "id": "buc_metrorex_m2_direct",
        "has_transfer": 0,
        "legs": [
            {"carrier": "metrorex", "mode": "METRO", "origin": "BUC_PIPERA", "dest": "BUC_UNIRII", "duration": 18, "stops": 8},
        ],
        "transfer_stations": [],
    },
    # 17. București Metrorex M1/M2 Connecting: Dristor -> Piața Victoriei -> Pipera
    {
        "id": "buc_metrorex_m1_m2_connecting",
        "has_transfer": 1,
        "legs": [
            {"carrier": "metrorex", "mode": "METRO", "origin": "BUC_DRISTOR", "dest": "BUC_VICTORIEI", "duration": 15, "stops": 6},
            {"carrier": "metrorex", "mode": "METRO", "origin": "BUC_VICTORIEI", "dest": "BUC_PIPERA", "duration": 11, "stops": 3},
        ],
        "transfer_stations": ["BUC_VICTORIEI"],
    },
    # 18. STB București Bus 100 Express: Aeroport Otopeni -> Piața Unirii
    {
        "id": "buc_stb_bus_100_express",
        "has_transfer": 0,
        "legs": [
            {"carrier": "stb", "mode": "BUS", "origin": "BUC_OTOPENI", "dest": "BUC_UNIRII", "duration": 45, "stops": 7},
        ],
        "transfer_stations": [],
    },
    # 19. STB București Tram 41 Rapid: Ghencea -> Piața Presei
    {
        "id": "buc_stb_tram_41_rapid",
        "has_transfer": 0,
        "legs": [
            {"carrier": "stb", "mode": "TRAM", "origin": "BUC_GHENCEA", "dest": "BUC_PRESEI", "duration": 32, "stops": 14},
        ],
        "transfer_stations": [],
    },
    # 20. Galați Transurb Bus 102 Direct: Micro 19 -> Gara CFR
    {
        "id": "gl_transurb_bus_102",
        "has_transfer": 0,
        "legs": [
            {"carrier": "transurb", "mode": "BUS", "origin": "GL_MICRO19", "dest": "GLT", "duration": 24, "stops": 10},
        ],
        "transfer_stations": [],
    },
    # 21. CTP Cluj-Napoca Bus 24B: Mănăștur -> Iulius Mall
    {
        "id": "cluj_ctp_bus_24b",
        "has_transfer": 0,
        "legs": [
            {"carrier": "ctp-cluj", "mode": "BUS", "origin": "CLUJ_MANASTUR", "dest": "CLUJ_IULIUS", "duration": 25, "stops": 11},
        ],
        "transfer_stations": [],
    },
    # 22. STPT Timișoara Tram 2: Shopping City -> Piața Victoriei
    {
        "id": "tim_stpt_tram_2",
        "has_transfer": 0,
        "legs": [
            {"carrier": "stpt", "mode": "TRAM", "origin": "TIM_SHOPPING", "dest": "TIM_VICTORIEI", "duration": 22, "stops": 9},
        ],
        "transfer_stations": [],
    },
]


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two geographic coordinates in km."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def deterministic_corridor_hash(corridor_slug: str) -> int:
    """Computes a stable int16 hash % 1000 independent of Python runtime process random seed."""
    return corridor_hash(corridor_slug)


# =====================================================================
# Task 7: Synthetic Romanian Transit Dataset Generator
# =====================================================================

def generate_synthetic_dataset(
    n_samples: int = 60000,
    seed: int = 42
) -> pd.DataFrame:
    """
    Generates realistic Romanian transit journeys with simulated delays
    and missed-connection ground truth labels.
    """
    logger.info(f"Generating N={n_samples:,} synthetic Romanian transit journeys...")
    rng = np.random.default_rng(seed)

    rows: List[Dict[str, Any]] = []

    # Distribution weights for journey templates (intercity rail + urban transit modes)
    template_weights = [
        0.10,  # Galați Micro 19 -> București Unirii (Seed guest route)
        0.08,  # București -> Brașov CFR
        0.04,  # București -> Brașov Astra
        0.06,  # București -> Constanța IC
        0.06,  # Brașov -> Constanța via București
        0.05,  # Cluj -> Oradea Direct
        0.05,  # Cluj Mănăștur -> Oradea
        0.05,  # Timișoara -> Arad Regio
        0.05,  # Timișoara Tram -> Arad
        0.04,  # Craiova -> București Direct
        0.04,  # Craiova -> București Victoriei
        0.04,  # Iași -> București Direct
        0.04,  # Ploiești -> Brașov Softrans
        0.03,  # Pipera -> Ploiești
        0.03,  # Otopeni -> Brașov
        # Urban transit modes (BUS, METRO, TRAM)
        0.06,  # Metrorex M2 Direct (METRO)
        0.04,  # Metrorex M1/M2 Connecting (METRO)
        0.04,  # STB Bus 100 Express (BUS)
        0.04,  # STB Tram 41 Rapid (TRAM)
        0.04,  # Transurb Bus 102 Direct (BUS)
        0.04,  # CTP Cluj Bus 24B Direct (BUS)
        0.03,  # STPT Timișoara Tram 2 (TRAM)
    ]
    template_probs = np.array(template_weights) / sum(template_weights)

    hour_weights = np.array([
        0.01, 0.01, 0.01, 0.02, 0.03, 0.04,  # 00-05
        0.07, 0.09, 0.09, 0.07, 0.05, 0.04,  # 06-11 (Morning peak)
        0.04, 0.04, 0.04, 0.05, 0.08, 0.08,  # 12-17 (Afternoon/Evening peak)
        0.07, 0.05, 0.03, 0.02, 0.01, 0.01,  # 18-23
    ], dtype=np.float64)
    hour_probs = hour_weights / hour_weights.sum()

    for i in range(n_samples):
        # Pick template
        tmpl = rng.choice(JOURNEY_TEMPLATES, p=template_probs)
        legs = tmpl["legs"]
        has_transfer = tmpl["has_transfer"]

        # Primary leg (main intercity or longest transit leg)
        primary_leg = max(legs, key=lambda l: l.get("duration", 0))
        feeder_leg = legs[0] if has_transfer else None

        carrier_id = primary_leg["carrier"]
        carrier_info = CARRIER_PROFILES.get(carrier_id, CARRIER_PROFILES["cfr-calatori"])
        base_punctuality = carrier_info["punctuality"]
        mode_str = primary_leg["mode"]
        train_cat = MODE_ENCODING.get(mode_str, 5)

        origin_code = legs[0]["origin"]
        dest_code = legs[-1]["dest"]
        orig_coords = STATION_COORDINATES.get(origin_code, (44.4473, 26.0753))
        dest_coords = STATION_COORDINATES.get(dest_code, (45.6607, 25.6144))
        distance_km = haversine_distance_km(orig_coords[0], orig_coords[1], dest_coords[0], dest_coords[1])

        total_scheduled_duration = sum(l["duration"] for l in legs)
        total_stops = sum(l["stops"] for l in legs)

        # Canonical primary corridor slug and hash matching Redis feature store
        orig_name = STATION_NAMES.get(primary_leg["origin"], primary_leg["origin"])
        dest_name = STATION_NAMES.get(primary_leg["dest"], primary_leg["dest"])
        corridor_slug = slugify_corridor(orig_name, dest_name)
        corridor_hash = deterministic_corridor_hash(corridor_slug)
        code_slug = f"{primary_leg['origin']}-{primary_leg['dest']}".lower()
        is_single_track = 1 if (corridor_slug in SINGLE_TRACK_CORRIDORS or code_slug in SINGLE_TRACK_CORRIDORS) else 0

        # Temporal sampling
        # Peak hours: 7, 8, 9, 16, 17, 18, 19
        dep_hour = int(rng.choice(24, p=hour_probs))

        is_peak = 1 if dep_hour in [7, 8, 9, 16, 17, 18, 19] else 0
        day_of_week = int(rng.integers(0, 7))
        is_weekend = 1 if day_of_week in [5, 6] else 0

        # Active disruptions and weather
        has_disruption = rng.random() < 0.22
        disruptions_count = int(rng.integers(1, 4)) if has_disruption else 0
        sev_max = int(rng.integers(1, 4)) if has_disruption else 0

        # Weather: CLEAR (70%), RAIN (15%), FOG (10%), SNOW (5%)
        weather_draw = rng.random()
        if weather_draw < 0.70:
            weather = "CLEAR"
            w_mult = 1.0
        elif weather_draw < 0.85:
            weather = "RAIN"
            w_mult = 1.3
        elif weather_draw < 0.95:
            weather = "FOG"
            w_mult = 1.45
        else:
            weather = "SNOW"
            w_mult = 1.75

        # Rolling delays on corridor
        if has_disruption:
            rolling_3h = float(np.round(rng.uniform(8.0, 35.0) * (sev_max / 2.0), 1))
            rolling_24h = float(np.round(rolling_3h * rng.uniform(0.6, 0.9), 1))
        else:
            rolling_3h = float(np.round(rng.exponential(2.5), 1))
            rolling_24h = float(np.round(rng.exponential(3.0), 1))

        # Transfer station parameters
        if has_transfer and tmpl["transfer_stations"]:
            t_station = tmpl["transfer_stations"][0]
            st_profile = TRANSFER_HUBS.get(t_station, {"reliability": 0.88, "congestion": 0.30})
            transfer_station_reliability = float(st_profile["reliability"])
            transfer_station_congestion = float(np.clip(st_profile["congestion"] + rng.normal(0.0, 0.05), 0.1, 0.95))
            # Buffer: Romanian Transfer Shield standard recommends >= 25 min
            # Sample buffers from tight (5-15), moderate (16-25), generous (26-55)
            buffer_type = rng.choice(["tight", "moderate", "generous"], p=[0.25, 0.45, 0.30])
            if buffer_type == "tight":
                transfer_buffer_minutes = float(rng.integers(5, 16))
            elif buffer_type == "moderate":
                transfer_buffer_minutes = float(rng.integers(16, 26))
            else:
                transfer_buffer_minutes = float(rng.integers(26, 56))
        else:
            transfer_station_reliability = 0.88
            transfer_station_congestion = 0.30
            transfer_buffer_minutes = 999.0

        # -------------------------------------------------------------
        # Physics-based Delay Simulation (Corridor Dynamics + Residual)
        # -------------------------------------------------------------
        duration_factor = min(1.0, max(0.20, total_scheduled_duration / 90.0))
        carrier_expected_delay = (1.0 - base_punctuality) * 35.0 * duration_factor

        expected_delay_baseline = (
            rolling_3h * 0.50 +
            sev_max * 4.0 +
            carrier_expected_delay +
            (3.0 * duration_factor if is_peak else 0.0) +
            (4.5 if is_single_track else 0.0) +
            (max(0.0, transfer_station_congestion - 0.3) * 6.0 if has_transfer else 0.0)
        )

        sigma_noise = max(0.5, (1.0 - base_punctuality) * 6.0 * duration_factor)
        stochastic_noise = float(rng.exponential(scale=sigma_noise))

        simulated_delay = max(0.0, (expected_delay_baseline * rng.uniform(0.85, 1.15) + stochastic_noise - 1.0) * w_mult)
        actual_delay_minutes = float(np.round(simulated_delay, 1))

        # Ground-truth Missed Connection target
        # For multi-leg connecting journeys, connection is missed if feeder leg delay
        # exceeds available buffer minus necessary platform walk time (default 5-8 min)
        missed_connection = 0
        if has_transfer and feeder_leg is not None:
            f_carrier = feeder_leg["carrier"]
            f_info = CARRIER_PROFILES.get(f_carrier, CARRIER_PROFILES["cfr-calatori"])
            f_punct = f_info["punctuality"]
            f_expected = (1.0 - f_punct) * 22.0 + (rolling_3h * 0.35) + (2.5 if is_peak else 0.0)
            feeder_delay = max(0.0, f_expected * rng.uniform(0.75, 1.25) + rng.exponential(scale=max(0.5, (1.0 - f_punct) * 5.0)))

            walk_time_minutes = 5.0 if transfer_station_congestion < 0.5 else 8.0
            absorbing_capacity = transfer_buffer_minutes - walk_time_minutes

            if feeder_delay > absorbing_capacity:
                missed_connection = 1
            else:
                if transfer_station_congestion > 0.65 and absorbing_capacity < 6.0 and rng.random() < 0.10:
                    missed_connection = 1


        rows.append({
            "train_category": train_cat,
            "corridor_id_hash": corridor_hash,
            "scheduled_duration_minutes": float(total_scheduled_duration),
            "stop_count": int(total_stops),
            "distance_km_est": float(distance_km),
            "departure_hour": dep_hour,
            "is_peak_hour": is_peak,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "has_transfer": has_transfer,
            "transfer_buffer_minutes": float(transfer_buffer_minutes),
            "transfer_station_reliability": float(transfer_station_reliability),
            "transfer_station_congestion": float(transfer_station_congestion),
            "active_corridor_disruptions": int(disruptions_count),
            "corridor_severity_max": int(sev_max),
            "rolling_avg_delay_3h": float(rolling_3h),
            "rolling_avg_delay_24h": float(rolling_24h),
            "carrier_baseline_punctuality": float(base_punctuality),
            # Targets
            "actual_delay_minutes": actual_delay_minutes,
            "missed_connection": missed_connection,
        })

    df = pd.DataFrame(rows)
    logger.info(f"Dataset generated successfully. Shape: {df.shape}")
    return df


def print_dataset_summary(df: pd.DataFrame) -> None:
    """Prints comprehensive summary statistics for the generated dataset."""
    print("\n" + "=" * 70)
    print(" ROMANIAN TRANSIT SYNTHETIC DATASET SUMMARY (N = {:,})".format(len(df)))
    print("=" * 70)
    print(f"Total Journey Records: {len(df):,}")
    print(f"Direct Journeys: {(df['has_transfer'] == 0).sum():,} ({(df['has_transfer'] == 0).mean()*100:.1f}%)")
    print(f"Connecting Journeys: {(df['has_transfer'] == 1).sum():,} ({(df['has_transfer'] == 1).mean()*100:.1f}%)")
    print(f"Missed Connections: {(df['missed_connection'] == 1).sum():,} ({(df['missed_connection'] == 1).mean()*100:.2f}%)")

    delays = df["actual_delay_minutes"]
    print("\n--- Actual Delay Minutes Distribution ---")
    print(f"  Mean:       {delays.mean():.2f} min")
    print(f"  Median:     {delays.median():.2f} min")
    print(f"  Std:        {delays.std():.2f} min")
    print(f"  75th %ile:  {delays.quantile(0.75):.2f} min")
    print(f"  90th %ile:  {delays.quantile(0.90):.2f} min")
    print(f"  Max:        {delays.max():.2f} min")

    print("\n--- Feature Matrix Statistics (18 Features) ---")
    print(f"  Zero NaN values: {df[FEATURE_NAMES].isna().sum().sum() == 0}")
    print(f"  Zero Inf values: {np.isinf(df[FEATURE_NAMES].to_numpy()).sum() == 0}")
    print("=" * 70 + "\n")


# =====================================================================
# Task 8 & 9: Model Training (LightGBM Regressor & Classifier)
# =====================================================================

def train_risk_models(
    df: pd.DataFrame,
    random_state: int = 42
) -> Tuple[lgb.LGBMRegressor, lgb.LGBMClassifier, Dict[str, Any]]:
    """
    Trains dual LightGBM estimators on the Romanian transit feature matrix:
    1. Expected Delay Regressor (Huber loss, target MAE < 4.5 min)
    2. Missed Connection Classifier (Binary logloss, target ROC-AUC > 0.90, Brier < 0.10)
    """
    logger.info("Splitting dataset into 80% train and 20% validation sets (stratified)...")
    X = df[FEATURE_NAMES].to_numpy(dtype=np.float32)
    y_delay = df["actual_delay_minutes"].to_numpy(dtype=np.float32)
    y_missed = df["missed_connection"].to_numpy(dtype=np.int32)

    X_train, X_test, y_del_train, y_del_test, y_mis_train, y_mis_test = train_test_split(
        X, y_delay, y_missed,
        test_size=0.20,
        random_state=random_state,
        stratify=y_missed
    )

    logger.info(f"Train split: {X_train.shape[0]:,} samples | Test split: {X_test.shape[0]:,} samples")

    # 1. Expected Delay Regressor
    logger.info("Training Model 1: Expected Delay Regressor (Huber loss)...")
    regressor = lgb.LGBMRegressor(
        objective="huber",
        huber_alpha=0.9,
        n_estimators=150,
        learning_rate=0.06,
        max_depth=6,
        num_leaves=31,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=random_state,
        verbose=-1
    )
    regressor.fit(X_train, y_del_train)

    y_del_pred = regressor.predict(X_test)
    mae = mean_absolute_error(y_del_test, y_del_pred)
    rmse = math.sqrt(mean_squared_error(y_del_test, y_del_pred))
    r2 = r2_score(y_del_test, y_del_pred)

    logger.info(f"[Regressor Test] MAE: {mae:.3f} min (Acceptance criteria < 4.5 min)")
    logger.info(f"[Regressor Test] RMSE: {rmse:.3f} min | R²: {r2:.4f}")
    assert mae < 4.5, f"Regression MAE failure: {mae:.3f} >= 4.5"

    # 2. Missed Connection Classifier
    logger.info("Training Model 2: Missed Connection Classifier (Binary logloss)...")
    classifier = lgb.LGBMClassifier(
        objective="binary",
        n_estimators=150,
        learning_rate=0.06,
        max_depth=6,
        num_leaves=31,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=1.5,
        random_state=random_state,
        verbose=-1
    )

    classifier.fit(X_train, y_mis_train)

    y_mis_proba = classifier.predict_proba(X_test)[:, 1]
    y_mis_pred = (y_mis_proba >= 0.50).astype(int)

    roc_auc = roc_auc_score(y_mis_test, y_mis_proba)
    brier = brier_score_loss(y_mis_test, y_mis_proba)
    acc = accuracy_score(y_mis_test, y_mis_pred)
    prec = precision_score(y_mis_test, y_mis_pred, zero_division=0)
    rec = recall_score(y_mis_test, y_mis_pred, zero_division=0)
    f1 = f1_score(y_mis_test, y_mis_pred, zero_division=0)

    logger.info(f"[Classifier Test] ROC-AUC: {roc_auc:.4f} (Acceptance criteria > 0.90)")
    logger.info(f"[Classifier Test] Brier Score: {brier:.4f} (Acceptance criteria < 0.10)")
    logger.info(f"[Classifier Test] Accuracy: {acc*100:.2f}% | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")

    assert roc_auc > 0.90, f"Classifier ROC-AUC failure: {roc_auc:.4f} <= 0.90"
    assert brier < 0.10, f"Classifier Brier score failure: {brier:.4f} >= 0.10"

    cm = confusion_matrix(y_mis_test, y_mis_pred)
    print("\n--- Confusion Matrix (Missed Connection) ---")
    print(f"[[TN={cm[0,0]}, FP={cm[0,1]}],\n [FN={cm[1,0]}, TP={cm[1,1]}]]\n")

    # Feature Importance
    importance_df = pd.DataFrame({
        "feature": FEATURE_NAMES,
        "reg_importance": regressor.feature_importances_,
        "cls_importance": classifier.feature_importances_,
    }).sort_values(by="cls_importance", ascending=False)

    print("--- Top 10 Feature Importances ---")
    print(importance_df.head(10).to_string(index=False))
    print("-" * 50 + "\n")

    eval_stats = {
        "regressor": {"mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4)},
        "classifier": {
            "roc_auc": round(roc_auc, 4),
            "brier_score": round(brier, 4),
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
        },
        "sample_X_test": X_test[:500],
    }

    return regressor, classifier, eval_stats


# =====================================================================
# Task 10: Fuse Dual Models & Export to Single ONNX Artifact
# =====================================================================

def export_fused_onnx_model(
    regressor: lgb.LGBMRegressor,
    classifier: lgb.LGBMClassifier,
    eval_stats: Dict[str, Any],
    output_onnx_path: str = str(BACKEND_DIR / "app" / "ml_models" / "risk_model.onnx"),
    output_metadata_path: str = str(BACKEND_DIR / "app" / "ml_models" / "risk_model_metadata.json"),
) -> None:
    """
    Converts dual LightGBM estimators into intermediate ONNX subgraphs,
    fuses them into a single compiled artifact with multi-output heads
    ('expected_delay', 'missed_connection_prob'), verifies prediction parity,
    and runs a CPU batch latency benchmark.
    """
    logger.info("Converting LightGBM models to intermediate ONNX graphs...")
    initial_type = [("float_input", FloatTensorType([None, 18]))]

    onnx_delay = onnxmltools.convert_lightgbm(
        regressor,
        initial_types=initial_type,
        target_opset=15
    )
    onnx_missed = onnxmltools.convert_lightgbm(
        classifier,
        initial_types=initial_type,
        target_opset=15,
        zipmap=False
    )

    logger.info("Applying namespace prefixes and mapping outputs...")
    m1 = add_prefix(onnx_delay, prefix="del_")
    m2 = add_prefix(onnx_missed, prefix="cls_")

    # Map del_float_input -> float_input and output -> expected_delay
    old_del_out = m1.graph.output[0].name
    for node in m1.graph.node:
        for i, inp in enumerate(node.input):
            if inp == "del_float_input":
                node.input[i] = "float_input"
        for i, out in enumerate(node.output):
            if out == old_del_out:
                node.output[i] = "expected_delay"
    m1.graph.output[0].name = "expected_delay"

    # Map cls_float_input -> float_input and output -> missed_connection_prob
    old_cls_prob_out = m2.graph.output[1].name
    for node in m2.graph.node:
        for i, inp in enumerate(node.input):
            if inp == "cls_float_input":
                node.input[i] = "float_input"
        for i, out in enumerate(node.output):
            if out == old_cls_prob_out:
                node.output[i] = "missed_connection_prob"
    m2.graph.output[1].name = "missed_connection_prob"

    # Build combined fused ONNX graph
    combined_nodes = list(m1.graph.node) + list(m2.graph.node)
    for idx, n in enumerate(combined_nodes):
        if not n.name or n.name.strip() == "":
            n.name = f"node_{idx}"

    combined_inits = list(m1.graph.initializer) + list(m2.graph.initializer)
    combined_inputs = list(onnx_delay.graph.input)
    combined_outputs = [m1.graph.output[0], m2.graph.output[1]]

    combined_graph = helper.make_graph(
        nodes=combined_nodes,
        name="TransitRiskModel",
        inputs=combined_inputs,
        outputs=combined_outputs,
        initializer=combined_inits,
    )

    max_opsets = {}
    for op in list(m1.opset_import) + list(m2.opset_import):
        max_opsets[op.domain] = max(max_opsets.get(op.domain, 0), op.version)

    opset_imports = [helper.make_opsetid(dom, ver) for dom, ver in max_opsets.items()]

    combined_model = helper.make_model(
        combined_graph,
        producer_name="beeline-mlops",
        opset_imports=opset_imports,
        ir_version=onnx_delay.ir_version
    )

    # Validate ONNX schema
    onnx.checker.check_model(combined_model)
    logger.info("Fused ONNX model structure validated successfully with onnx.checker.")

    # Ensure output directories exist
    onnx_file = Path(output_onnx_path).resolve()
    onnx_file.parent.mkdir(parents=True, exist_ok=True)
    meta_file = Path(output_metadata_path).resolve()
    meta_file.parent.mkdir(parents=True, exist_ok=True)

    onnx.save(combined_model, str(onnx_file))
    file_size_kb = onnx_file.stat().st_size / 1024.0
    logger.info(f"Compiled ONNX model saved to: {onnx_file} (Size: {file_size_kb:.1f} KB)")
    assert file_size_kb < 1024.0, f"ONNX file size exceeded 1MB: {file_size_kb:.1f} KB"

    # -----------------------------------------------------------------
    # Prediction Parity Check
    # -----------------------------------------------------------------
    logger.info("Executing prediction parity test against native Python LightGBM...")
    sess = ort.InferenceSession(str(onnx_file), providers=["CPUExecutionProvider"])
    sample_X = eval_stats["sample_X_test"]

    ort_res = sess.run(None, {"float_input": sample_X})
    ort_delay = ort_res[0].flatten()
    ort_prob = ort_res[1]

    py_delay = regressor.predict(sample_X)
    py_prob = classifier.predict_proba(sample_X)

    delay_parity_err = float(np.max(np.abs(py_delay - ort_delay)))
    prob_parity_err = float(np.max(np.abs(py_prob - ort_prob)))

    logger.info(f"Parity Error [Expected Delay]: {delay_parity_err:.2e} (Threshold: 1e-5)")
    logger.info(f"Parity Error [Missed Conn Prob]: {prob_parity_err:.2e} (Threshold: 1e-5)")

    assert delay_parity_err < 1e-5, f"Delay prediction parity violated: {delay_parity_err}"
    assert prob_parity_err < 1e-5, f"Probability prediction parity violated: {prob_parity_err}"
    logger.info("Numerical parity confirmed: LightGBM predictions identically match ONNX Runtime.")

    # -----------------------------------------------------------------
    # CPU Inference Latency Benchmark (Batch size = 5)
    # -----------------------------------------------------------------
    logger.info("Benchmarking standalone ONNX Runtime inference latency on CPU (batch size 5)...")
    batch_5 = sample_X[:5]
    # Warm-up 100 runs
    for _ in range(100):
        _ = sess.run(None, {"float_input": batch_5})

    # Benchmark 200 runs
    runs = 200
    t0 = time.perf_counter()
    for _ in range(runs):
        _ = sess.run(None, {"float_input": batch_5})
    t1 = time.perf_counter()

    avg_ms = ((t1 - t0) / runs) * 1000.0
    logger.info(f"Average batch latency (batch size 5): {avg_ms:.4f} ms per batch (Target SLA: < 1.0 ms)")
    assert avg_ms < 1.0, f"Latency benchmark exceeded SLA threshold: {avg_ms:.4f} ms"

    # -----------------------------------------------------------------
    # Export Model Metadata JSON
    # -----------------------------------------------------------------
    with open(onnx_file, "rb") as f:
        model_sha256 = hashlib.sha256(f.read()).hexdigest()

    metadata = {
        "model_name": "RomanianTransitRiskModel",
        "version": "1.0.0",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_sha256": model_sha256,
        "file_size_kb": round(file_size_kb, 2),
        "input_tensor": {
            "name": "float_input",
            "shape": [None, 18],
            "dtype": "float32",
        },
        "output_tensors": [
            {
                "name": "expected_delay",
                "shape": [None, 1],
                "dtype": "float32",
                "unit": "minutes",
                "description": "Expected trip delay in minutes"
            },
            {
                "name": "missed_connection_prob",
                "shape": [None, 2],
                "dtype": "float32",
                "unit": "probability [0.0..1.0]",
                "positive_class_index": 1,
                "description": "Binary probabilities [P(connected), P(missed)]"
            },
        ],
        "feature_names": FEATURE_NAMES,
        "feature_count": len(FEATURE_NAMES),
        "mode_encodings": MODE_ENCODING,
        "evaluation_metrics": {
            "regressor_expected_delay": eval_stats["regressor"],
            "classifier_missed_connection": eval_stats["classifier"],
            "benchmark_batch5_latency_ms": round(avg_ms, 4),
            "parity_max_error": {
                "expected_delay": delay_parity_err,
                "missed_connection_prob": prob_parity_err,
            },
        },
    }

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Model metadata schema exported to: {meta_file}")
    logger.info("=== PHASE 2 CHECKPOINT REACHED: ALL TASKS 6-10 COMPLETED SUCCESSFULLY ===")


# =====================================================================
# Main Execution CLI Entrypoint
# =====================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Beeline VoyageRail Transit Delay & Risk Model Trainer & ONNX Exporter"
    )
    parser.add_argument(
        "--generate-data-only",
        action="store_true",
        help="Generate synthetic Romanian transit dataset and display summary statistics without training",
    )
    parser.add_argument(
        "--export-onnx",
        action="store_true",
        help="Train models, fuse graphs, export ONNX artifact, and verify parity and latency benchmark",
    )
    parser.add_argument(
        "--train-only",
        action="store_true",
        help="Train dual LightGBM models and evaluate metrics without writing ONNX model or metadata to disk",
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=60000,
        help="Number of synthetic journeys to generate (default: 60,000, min: 50,000)",
    )
    parser.add_argument(
        "--output-onnx",
        type=str,
        default=str(BACKEND_DIR / "app" / "ml_models" / "risk_model.onnx"),
        help="Path where the compiled ONNX model artifact will be saved",
    )
    parser.add_argument(
        "--output-metadata",
        type=str,
        default=str(BACKEND_DIR / "app" / "ml_models" / "risk_model_metadata.json"),
        help="Path where the model metadata JSON will be saved",
    )

    args = parser.parse_args()

    # Step 1: Generate synthetic dataset
    df = generate_synthetic_dataset(n_samples=max(50000, args.samples))

    if args.generate_data_only:
        print_dataset_summary(df)
        logger.info("--generate-data-only specified: exiting after dataset generation.")
        sys.exit(0)

    # Step 2: Train dual LightGBM models
    regressor, classifier, eval_stats = train_risk_models(df)

    if args.train_only:
        logger.info("--train-only specified: training completed without modifying disk artifacts.")
        sys.exit(0)

    # Step 3: Fuse & Export ONNX artifact
    export_fused_onnx_model(
        regressor=regressor,
        classifier=classifier,
        eval_stats=eval_stats,
        output_onnx_path=args.output_onnx,
        output_metadata_path=args.output_metadata,
    )


if __name__ == "__main__":
    main()
