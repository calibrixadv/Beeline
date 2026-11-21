# Contract de Înghețare a Feature-urilor ML (freeze_contract.md)

> **Status:** FROZEN (Înghețat)  
> **Destinație:** Modelul de Predicție a Întârzierilor și Riscului de Conexiune Feroviară Beeline VoyageRail (`risk_model.onnx` / LightGBM)  
> **Subsystem backend:** `backend/scraper/`  
> **Data înghețării:** Noiembrie 2026  

---

## 1. Principiul de Selecție a Feature-urilor

Pentru a asigura o învățare eficientă și a preveni zgomotul statistic (*noise overfitting*), au fost reținute **exclusiv feature-urile care au o legătură de cauzalitate directă (fizică, operațională sau infrastructurală)** cu acumularea întârzierilor și pierderea conexiunilor în rețeaua feroviară din România.

Toate variabilele sunt clasificate strict în funcție de **Sursă**, facilitând colectarea și maparea manuală sau automată.

---

## 2. Tabelul Feature-urilor Înghețate Grupat pe Surse

### Sursa 1: `Train APIs` (CFR Călători, InfoFer, Operatori Privați / Extracție Manuală)
> **Notă pentru extragere manuală:** Aceste feature-uri descriu garnitura, orarul programat și structura călătoriei. Pot fi preluate direct din API-urile de mers al trenurilor, tabelele de plecări/sosiri InfoFer sau fișierele de orar CFR/TFC/Astra.

| Feature (Cod) | Tip de Date | Unitate / Format | Descriere & Justificare Cauzală pentru Model | Valoare Implicită (Fallback) |
| :--- | :--- | :--- | :--- | :--- |
| `train_number` | `string` | ex. `"IR 1572"` | Identificatorul cursei feroviare. Permite maparea pe tipul de serviciu și rută. | Necesar |
| `operator` | `string` | `CFR`, `ASTRA`, `TFC`, `SOFTRANS`, `REGIO` | Operatorul de transport. Fiecare operator are un parc de material rulant diferit și rate istorice distincte de fiabilitate. | `"CFR"` |
| `train_category` | `int` (Ordinal) | `0: R`, `1: RE`, `2: IR`, `3: IC` | Rangul trenului. În caz de conflict pe traseu, dispeceratul CFR acordă prioritate trenurilor de rang superior (IC/IR), trenurile Regio (R) fiind trase pe linie secundară și acumulând întârzieri mari. | `2` (`IR`) |
| `origin_station_code` | `string` | Cod telegrafic (ex. `GLT`, `BCT`) | Nodul de plecare. | Necesar |
| `destination_station_code` | `string` | Cod telegrafic (ex. `BCT`, `BSV`) | Nodul de destinație. | Necesar |
| `scheduled_duration_minutes` | `float` | Minute ($> 0$) | Durata programată a călătoriei. Călătoriile lungi au o varianță cumulativă a întârzierii mult mai mare decât cele scurte. | `120.0` |
| `distance_km` | `float` | Kilometri | Lungimea distanței de parcurs pe calea ferată. | `150.0` |
| `stop_count` | `int` | Număr stații | Numărul de opriri intermediare. Fiecare oprire reprezintă un risc de întârziere la peron (urcare/coborâre călători, defectare uși vagon). | `4` |
| `delay_at_origin_minutes` | `int` | Minute ($\ge 0$) | Întârzierea la plecare din stația de formare. Pe secțiile aglomerate din România, un tren care pleacă cu întârziere își pierde slotul orar și acumulează întârzieri suplimentare. | `0` |
| `traction_type` | `int` (Ordinal) | `0: DIESEL`, `1: ELECTRIC` | Tipul de tracțiune. Locomotivele diesel au o rată mai mare de defecțiuni mecanice decât ramele electrice moderne. | `1` (`ELECTRIC`) |
| `has_transfer` | `int` | `0` (direct) sau `1` (cu legătură) | Indică dacă ruta călătorului conține un transfer într-o gară intermediară. | `0` |
| `transfer_buffer_minutes` | `float` | Minute | Fereastra de timp disponibilă între sosirea primului tren și plecarea următorului tren. **Critic pentru clasificatorul de conexiuni pierdute.** | `999.0` (direct) |

---

### Sursa 2: `Weather APIs` (ANM - Administrația Națională de Meteorologie / Open-Meteo)
> **Notă:** Aceste feature-uri cuantifică condițiile atmosferice locale de-a lungul coridorului feroviar la momentul deplasării trenului.

| Feature (Cod) | Tip de Date | Unitate / Format | Descriere & Justificare Cauzală pentru Model | Valoare Implicită (Fallback) |
| :--- | :--- | :--- | :--- | :--- |
| `temp_celsius` | `float` | Grade Celsius (°C) | Temperatura aerului la nivelul terasamentului.<br>• **Temperaturi extreme pozitive (>35°C):** Provoacă dilatarea șinelor de oțel (*deformări de șină*), impunând restricții de viteză de 30–50 km/h.<br>• **Ger extrem (<-10°C):** Provoacă fisuri de șină și înghețarea condensului pe conductele instalației de frână cu aer. | `18.0` |
| `precipitation_rate_mm_h` | `float` | mm/oră | Intensitatea ploii. Reduce aderența roată-șină (patinare la demaraj, frânare prelungită), mărește timpii de mers. | `0.0` |
| `is_thunderstorm` | `int` | `0` sau `1` | Furtuni cu descărcări electrice severe. Trăsnetele scot frecvent din funcțiune instalațiile de semnalizare Bloc de Linie Automat (BLA) și substațiile de tracțiune 25 kV. | `0` |
| `wind_speed_kmh` | `float` | km/h | Viteza susținută a vântului. | `10.0` |
| `wind_gust_kmh` | `float` | km/h | Viteza maximă a rafalelor. Rafalele puternice (>70 km/h) doboară arbori peste linia de contact și impun restricții pe poduri și viaducte. | `15.0` |
| `snow_depth_cm` | `float` | Centimetri (cm) | Stratul de zăpadă depus. Viscolul blochează macazurile din stații (*macazuri înghețate*) și acumularea de suluri de zăpadă în Bărăgan reduce drastic viteza. | `0.0` |
| `freezing_rain_risk` | `int` | `0` sau `1` | Ploaie înghețată / chiciură. Formează un strat de gheață izolatoare pe firul de contact al catenarei, provocând arc electric intens și ruperea pantografelor locomotivelor. | `0` |
| `visibility_meters` | `float` | Metri | Vizibilitatea atmosferică. În caz de ceață densă (<150 m), mecanicii de locomotivă reduc viteza de rulare în secțiile fără autostop/ERTMS. | `10000.0` |

---

### Sursa 3: `Calendar / Temporal Generator` (Generat Deterministic din Timestamp)
> **Notă:** Aceste feature-uri sunt calculate matematic direct din timestamp-ul plecării (`departure_time`), fără a depinde de API-uri externe.

| Feature (Cod) | Tip de Date | Unitate / Format | Descriere & Justificare Cauzală pentru Model | Valoare Implicită (Fallback) |
| :--- | :--- | :--- | :--- | :--- |
| `season` | `int` (Ordinal) | `0: SPRING`, `1: SUMMER`, `2: AUTUMN`, `3: WINTER` | Anotimpul călătoriei. Corelează fenomene climatice ample (frunze umede toamna care produc patinare, zăpezi iarna, călduri caniculare vara). | Calculat din lună |
| `departure_hour` | `int` | `0 .. 23` | Ora plecării. | `12` |
| `is_peak_hour` | `int` | `0` sau `1` | Interval de vârf de navetă (06:30–09:00 și 16:00–19:30). În aceste ferestre liniile de acces în marile gări sunt supraaglomerate. | `0` |
| `day_of_week` | `int` | `0: Luni .. 6: Duminică` | Ziua săptămânii. Vineri după-amiaza și duminică seara traficul de călători și întârzierile la îmbarcare cresc cu peste 40%. | `2` (Miercuri) |
| `is_weekend` | `int` | `0` (Luni–Vineri) sau `1` (Sâmbătă–Duminică) | Indicator de sfârșit de săptămână. | `0` |
| `is_holiday_window` | `int` | `0` sau `1` | Sărbători legale din România (1 Ian, Paște, 1 Mai, Rusalii, 15 Aug, 30 Nov, 1 Dec, Crăciun) și minivacanțe. Supraaglomerarea călătorilor prelungește staționările în gări. | `0` |

---

### Sursa 4: `Infrastructure & Topology Registry` (Registrul CFR SA / Traseu Coridor)
> **Notă:** Caracteristicile geometrice și fizice ale magistralei feroviare.

| Feature (Cod) | Tip de Date | Unitate / Format | Descriere & Justificare Cauzală pentru Model | Valoare Implicită (Fallback) |
| :--- | :--- | :--- | :--- | :--- |
| `is_single_track` | `int` | `0` (linie dublă) sau `1` (linie simplă) | **Factor critic în România:** Pe liniile cu cale simplă (ex: Galați–Făurei, Dej–Baia Mare), trenurile din sens opus trebuie să se aștepte în stații de cruce. O întârziere de 10 min a unui tren provoacă automat întârzieri în lanț pentru 3–4 alte trenuri. | `0` |
| `mountain_pass_flag` | `int` | `0` (câmpie/deal) sau `1` (trecătoare montană) | Traversează pas montan (ex: Valea Prahovei / Predeal altitudine 1054m, Defileul Jiului). Declinivitățile mari reduc capacitatea de recuperare a întârzierilor. | `0` |
| `active_speed_restrictions_count` | `int` | Număr restricții active | Numărul de restricții temporare de viteză (BAR - *Buletin de Avizare a Restricțiilor*) cauzate de lucrări de reabilitare a căii ferate. | `0` |
| `corridor_slug` | `string` | ex. `"galati-bucuresti_nord"` | Identificatorul canonic al coridorului feroviar. | `""` |

---

### Sursa 5: `Ground Truth Target Labels` (Etichete Țintă pentru Antrenare Supervizată)
> **Notă:** Acestea sunt valorile pe care modelul LightGBM / ONNX le învață să le prezică. Sunt calculate comparând orarul programat cu sosirea reală din `Train APIs`.

| Target Label (Cod) | Tip de Date | Unitate | Tip Problemă ML | Descriere |
| :--- | :--- | :--- | :--- | :--- |
| `actual_delay_minutes` | `float` | Minute ($\ge 0$) | **Regresie (Huber Loss)** | Numărul real de minute de întârziere la sosirea la destinație (`max(0, actual_arrival - scheduled_arrival)`). |
| `missed_connection` | `int` | `0` sau `1` | **Clasificare Binară (BCE)** | `1` dacă `actual_delay_minutes > (transfer_buffer_minutes - 5 minute transfer minim la pas)`, altfel `0`. |

---

## 3. Maparea Structurii de Date pentru Inspecție Manuală

Când datele de tren sunt introduse sau verificate manual de către dezvoltator, un eșantion JSON complet respectă următoarea structură standardizată:

```json
{
  "source_train_api": {
    "train_number": "IR 1572",
    "operator": "CFR",
    "train_category": 2,
    "origin_station_code": "GLT",
    "destination_station_code": "BCT",
    "scheduled_duration_minutes": 195.0,
    "distance_km": 230.0,
    "stop_count": 5,
    "delay_at_origin_minutes": 3,
    "traction_type": 1,
    "has_transfer": 1,
    "transfer_buffer_minutes": 20.0
  },
  "source_weather_api": {
    "temp_celsius": 36.5,
    "precipitation_rate_mm_h": 0.0,
    "is_thunderstorm": 0,
    "wind_speed_kmh": 14.0,
    "wind_gust_kmh": 22.0,
    "snow_depth_cm": 0.0,
    "freezing_rain_risk": 0,
    "visibility_meters": 10000.0
  },
  "source_calendar_generator": {
    "season": 1,
    "departure_hour": 7,
    "is_peak_hour": 1,
    "day_of_week": 4,
    "is_weekend": 0,
    "is_holiday_window": 0
  },
  "source_infrastructure_registry": {
    "is_single_track": 1,
    "mountain_pass_flag": 0,
    "active_speed_restrictions_count": 2,
    "corridor_slug": "galati-bucuresti_nord"
  },
  "target_labels": {
    "actual_delay_minutes": 18.0,
    "missed_connection": 0
  }
}
```

---

## 4. Garanția de Stabilitate (Freeze Policy)
1. **Nicio coloană adăugată fără validare prealabilă:** Orice modificare la lista de feature-uri de mai sus necesită actualizarea simultană a fișierului `freeze_contract.md`, a claselor din `backend/scraper/models.py` și a metadatelor `backend/app/ml_models/risk_model_metadata.json`.
2. **Compatibilitate cu modelul actual:** Dimensiunile vectorului numeric de 18 elemente utilizat de `backend/app/ml_models/risk_model.onnx` sunt o submulțime strictă a acestui contract, garantând că modelul curent poate fi reantrenat și extins direct pe baza noilor date colectate.
