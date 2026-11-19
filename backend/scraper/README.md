# Beeline Transit Delay & Reliability Scraper (`backend/scraper/`)

Acest modul implementează colectarea, maparea și asamblarea seturilor de date pentru modelul Machine Learning de predicție a întârzierilor și riscurilor de transfer feroviar în România (`risk_model.onnx` / LightGBM), respectând strict specificația din [`freeze_contract.md`](../../freeze_contract.md).

---

## 1. Structura Modulului

```
backend/scraper/
├── __init__.py                  # Exportă modelele de date principale
├── models.py                    # Modele Pydantic stricte (Train, Weather, Calendar, Infra, Targets)
├── pipeline.py                  # Pipeline-ul de orchestrat îmbinarea tuturor celor 5 surse
├── collectors/
│   ├── __init__.py
│   ├── train_api.py             # Sursa 1: Parsare din Train APIs / introducere manuală
│   ├── weather_api.py           # Sursa 2: Open-Meteo & ANM live/historical weather
│   ├── calendar_generator.py    # Sursa 3: Generare anotimpuri, ore de vârf, sărbători legale
│   └── infrastructure_registry.py # Sursa 4: Topologie feroviară (linii simple, trecători montane)
└── README.md                    # Acest ghid
```

---

## 2. Utilizare Rapidă (Python)

### Exemplu: Inserarea unei curse de tren găsite manual

Dacă extragi manual date dintr-un API feroviar (ex: CFR Călători, InfoFer sau Mersul Trenurilor):

```python
from datetime import datetime, timezone
from scraper.pipeline import TransitScraperPipeline

pipeline = TransitScraperPipeline()

# 1. Datele preluate din Train API (manual sau automat)
raw_train = {
    "train_number": "IR 1572",
    "operator": "CFR",
    "train_category": 2,          # 0: R, 1: RE, 2: IR, 3: IC
    "origin_station_code": "GLT", # Galați
    "destination_station_code": "BCT", # București Nord
    "scheduled_duration_minutes": 195.0,
    "distance_km": 230.0,
    "stop_count": 5,
    "delay_at_origin_minutes": 2,
    "traction_type": "ELECTRIC",
    "has_transfer": 1,
    "transfer_buffer_minutes": 20.0
}

# 2. Procesarea și îmbogățirea cu meteo, calendar și infrastructură
sample = pipeline.process_sample(
    raw_train_data=raw_train,
    departure_dt=datetime(2026, 10, 21, 7, 30, tzinfo=timezone.utc),
    actual_delay_minutes=15.0  # Întârzierea reală măsurată la destinație
)

print(sample.model_dump_json(indent=2))

# 3. Conversia în vectorul numeric de 18 elemente pentru ONNX Runtime
vec18 = sample.to_18_feature_vector()
print("Vector ONNX:", vec18)
```

---

## 3. Exportul pentru Reantrenarea Modelului

Poți exporta serii de eșantioane direct în format tabular CSV sau JSON:

```python
samples = [sample1, sample2, ...]

pipeline.export_to_csv(samples, "training_dataset.csv")
pipeline.export_to_json(samples, "training_dataset.json")
```

---

## 4. Legătura cu `freeze_contract.md`

Fiecare câmp este validat prin Pydantic împotriva contractului înghețat:
- **`source_train_api`**: Toate variabilele din `Train APIs`.
- **`source_weather_api`**: Temperatură, precipitații, furtuni/trăsnete, vânt, zăpadă, chiciură, ceață.
- **`source_calendar_generator`**: Anotimp (0: Primăvară, 1: Vară, 2: Toamnă, 3: Iarnă), oră de vârf, zi de weekend, minivacanță.
- **`source_infrastructure_registry`**: Linie simplă vs. dublă, pas montan, restricții BAR.
- **`target_labels`**: Întârzierea reală în minute (regresie) și conexiune pierdută (clasificare binară).
