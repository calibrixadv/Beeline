# Jurnalul Utilizării Asistenților AI și Erori Identificate (AI_LOG.md)

**Disciplina:** Baze de Date Avansate (BD2)  
**Titular curs:** Asist. univ. dr. Cristian Sandu, Universitatea „Dunărea de Jos” din Galați  
**Proiect:** Beeline VoyageRail — Sistem Tranzacțional și Analitic de Transport Feroviar și Multimodal  
**Student:** Andrei Iordache  
**Data:** Semestrul I, An universitar 2026–2027  

---

## 1. Contextul și Obiectivul Utilizării Asistenților AI în Proiect

În acord cu principiile enunțate la cursul introductiv al disciplinei (*„Asistenții bazați pe modele de limbaj sunt utilizați în mod curent în dezvoltarea software. Utilizarea lor este permisă la laborator și la proiect, cu condiția ca soluțiile obținute să poată fi explicate și justificate”*), modelele generative (Gemini 1.5 Pro, Claude 3.5 Sonnet) au fost utilizate ca acceleratoare de productivitate pentru sarcini repetitive și scheletare de cod (*scaffolding*).

### Domeniile în care AI a fost utilizat:
1. **Generarea inițială de schelet DDL:** Generarea primei versiuni brute a tabelelor relaționale și schemelor Pydantic.
2. **Generarea datelor sintetice de test (Fixtures):** Crearea orarelor urbane și feroviare românești (stații CFR, trasee Transurb Galați, Metrorex M2, linii STB) cu coordonate GPS reale.
3. **Fuziunea grafului ONNX:** Generarea scriptului de merge între arborele de regresie LightGBM (pentru predicția întârzierilor) și clasificatorul logistic (pentru probabilitatea conexiunilor pierdute).
4. **Scrierea testelor boilerplate:** Generarea structurii inițiale pentru aserțiunile Pytest din `backend/tests/`.

---

## 2. Erori ale Asistenților AI Identificate și Corectate Manual de Student

Asistenții AI prezintă limitări structurale recunoscute: nu au acces la datele din producție, nu rulează planuri reale de execuție (`EXPLAIN ANALYZE`), tratează superficial concurența și propun adesea cod ce funcționează exclusiv în scenarii izolate de tip *happy-path*. 

În cadrul acestui proiect, am identificat și remediat manual **5 erori critice** de proiectare a bazei de date și a logicii backend:

---

### Cazul 1: Condiții de Cursă (Race Conditions) și Absența Idempotenței Atomice
* **Propunerea inițială a asistentului AI:**  
  La implementarea rezervării de bilete și a cheilor de idempotență, asistentul a propus un mecanism naiv în doi pași independenți: mai întâi un `SELECT` pentru a verifica dacă cheia există, urmat de un `INSERT` dacă nu a fost găsită:
  ```python
  # Cod greșit propus inițial de AI:
  existing = await db.execute(select(IdempotencyRecord).where(IdempotencyRecord.key == key))
  if not existing.scalar_one_or_none():
      # Fereastră de cursă (Race Window) critică!
      new_record = IdempotencyRecord(key=key, status="PENDING")
      db.add(new_record)
      await db.commit()
  ```
* **Problema identificată de student:**  
  Între momentul executării interogării `SELECT` și momentul `INSERT`-ului există o fereastră critică de timp (*Time-of-Check to Time-of-Use — TOCTOU*). În cazul a două cereri concurente primite la interval de câteva milisecunde (de exemplu, dublu-click rapid al utilizatorului pe butonul de plată), ambele tranzacții vor citi că înregistrarea nu există și vor încerca simultan să insereze, provocând fie dublă rezervare (double-booking), fie coliziune necontrolată cu eroare de server HTTP 500.
* **Corecția manuală aplicată:**  
  Am înlocuit logica cu o constrângere de unicitate strictă în catalogul relațional `CONSTRAINT uq_user_idempotency_key UNIQUE (user_id, idempotency_key)` combinată cu:
  1. O încercare atomică de lock distribuit în Redis (`SET key payload NX EX 120`);
  2. Execuția tranzacțională atomică cu clauză de tratare a conflictelor `ON CONFLICT` și capturarea excepției `IntegrityError` la nivel de sesiune SQL, întorcând `HTTP 409 Conflict` deterministic fără afectarea stării tabelei.

---

### Cazul 2: Indecși Nejustificați Fără Analiza Planului de Execuție (`EXPLAIN ANALYZE`)
* **Propunerea inițială a asistentului AI:**  
  Asistentul a sugerat crearea de indecși B-Tree independenți pe aproape toate coloanele tabelei `users` și `trains`, inclusiv pe câmpuri booleene sau cu cardinalitate extrem de scăzută:
  ```sql
  -- Sugestie nejustificată a AI:
  CREATE INDEX idx_users_is_guest ON users(is_guest);
  CREATE INDEX idx_trains_status ON trains(status);
  ```
* **Problema identificată de student:**  
  Coloana `is_guest` are o selectivitate extrem de redusă (doar două valori: 0 sau 1, cu o distribuție de ~85% călători înregistrați și ~15% oaspeți). Conform teoriei optimizării interogărilor, planificatorul PostgreSQL refuză să utilizeze un index dacă predicatul returnează mai mult de 5–10% din totalul paginilor de disc, optând pentru o scanare secvențială (`Seq Scan`). Indexul propus de AI nu doar că nu era utilizat niciodată, dar degrada performanța la fiecare operație de `INSERT` sau `UPDATE` din cauza costului de mentenanță a arborelui B-Tree pe disc și a generării de intrări suplimentare în WAL (Write-Ahead Log).
* **Corecția manuală aplicată:**  
  Am verificat comportamentul prin `EXPLAIN ANALYZE` pe seturi de date de test și am eliminat indecșii redundanți cu selectivitate scăzută, înlocuindu-i cu indecși compuși sau parțiali justificați matematic (ex: `CREATE INDEX idx_user_sessions_lookup ON user_sessions(user_id, is_revoked) WHERE is_revoked = 0`).

---

### Cazul 3: Capcana Filtrării `WHERE` pe Relații `LEFT JOIN`
* **Propunerea inițială a asistentului AI:**  
  La generarea interogării analitice pentru panoul de plecări din gări, menită să returneze toate gările active și întârzierile asociate (inclusiv gările care nu aveau niciun incident raportat în acel moment), AI a generat următorul cod SQL:
  ```sql
  -- Cod greșit propus de AI:
  SELECT s.code, s.name, d.delay_minutes, d.severity
  FROM stations s
  LEFT JOIN disruptions d ON d.affected_line = s.code
  WHERE d.status = 'ACTIVE';  -- EROARE: anulează proprietatea de LEFT JOIN!
  ```
* **Problema identificată de student:**  
  Așa cum s-a evidențiat în materialul de curs (*„În cazul LEFT JOIN, o condiție pe tabela din dreapta plasată în WHERE elimină rândurile completate cu NULL și transformă, în practică, interogarea într-un INNER JOIN”*), clauza `WHERE d.status = 'ACTIVE'` a eliminat toate gările care nu aveau nicio întârziere (unde `d.status` rezulta ca `NULL`), ascunzând gările perfect funcționale din interfața utilizatorului!
* **Corecția manuală aplicată:**  
  Am mutat predicatul de filtrare a tabelei din dreapta direct în clauza de joncțiune `ON`:
  ```sql
  -- Corecție aplicată de student:
  SELECT s.code, s.name, COALESCE(d.delay_minutes, 0) AS delay_minutes, d.severity
  FROM stations s
  LEFT JOIN disruptions d ON d.affected_line = s.code AND d.status = 'ACTIVE';
  ```
  Interogarea returnează corect toate gările din rețea, completând cu valori implicite unde nu există incidente active.

---

### Cazul 4: Tratatrea Valorilor `NULL` în Agregările Aritmetice SQL
* **Propunerea inițială a asistentului AI:**  
  Pentru calculul întârzierii medii cumulate pe un coridor multimodal de tranzit feroviar, asistentul AI a propus o interogare de tipul:
  ```sql
  -- Cod greșit propus de AI:
  SELECT t.operator_name, AVG(t.delay_minutes + d.delay_minutes) AS total_avg_delay
  FROM trains t
  LEFT JOIN disruptions d ON d.affected_line = t.train_number
  GROUP BY t.operator_name;
  ```
* **Problema identificată de student:**  
  În logica tri-valentă SQL (3VL: True, False, Unknown), orice operație aritmetică care implică `NULL` are ca rezultat `NULL` (`x + NULL = NULL`). Dacă un tren nu era afectat de niciun incident în tabela `disruptions`, valoarea `d.delay_minutes` era `NULL`. Prin urmare, `t.delay_minutes + NULL` devenea `NULL`, iar funcția de agregare `AVG()` a ignorat complet respectivele trenuri, alterând sever statisticile de punctualitate ale operatorilor feroviari.
* **Corecția manuală aplicată:**  
  Am introdus funcția standard `COALESCE` pentru garantarea unui operand numeric neutru:
  ```sql
  -- Corecție aplicată de student:
  SELECT t.operator_name, AVG(COALESCE(t.delay_minutes, 0) + COALESCE(d.delay_minutes, 0)) AS total_avg_delay
  FROM trains t
  LEFT JOIN disruptions d ON d.affected_line = t.train_number AND d.status = 'ACTIVE'
  GROUP BY t.operator_name;
  ```

---

### Cazul 5: Confuzia Între Semantica `ON DELETE CASCADE` și `ON DELETE RESTRICT`
* **Propunerea inițială a asistentului AI:**  
  În varianta inițială de `schema.sql`, AI a setat orbește `ON DELETE CASCADE` pe toate cheile străine, inclusiv pe relația dintre tabela `stations` și tabela `trains`:
  ```sql
  -- Propunere periculoasă a AI:
  CREATE TABLE trains (
      ...
      origin_code VARCHAR(16) REFERENCES stations(code) ON DELETE CASCADE,
      destination_code VARCHAR(16) REFERENCES stations(code) ON DELETE CASCADE
  );
  ```
* **Problema identificată de student:**  
  Dacă un operator ar fi șters din greșeală o gară centrală (ex: `BCT` - București Nord), sistemul ar fi șters automat și silențios în cascadă zeci de trenuri programate, sute de orare și mii de rezervări ale călătorilor care tranzitau Bucureștiul! Aceasta constituie o anomalie gravă de ștergere (*deletion anomaly*).
* **Corecția manuală aplicată:**  
  Am separat riguros semantica relațiilor:
  1. Pentru entități părinte de infrastructură fixă am impus `ON DELETE RESTRICT`:
     ```sql
     FOREIGN KEY (origin_code) REFERENCES stations(code) ON DELETE RESTRICT,
     FOREIGN KEY (destination_code) REFERENCES stations(code) ON DELETE RESTRICT
     ```
  2. În endpoint-ul `DELETE /api/v1/stations/{station_code}`, am adăugat verificarea dependențelor active, blocând ștergerea nodurilor nodale cu codul HTTP `409 Conflict` dacă acestea sunt referite în călătorii active.
  3. Am păstrat `ON DELETE CASCADE` exclusiv pe entitățile de proprietate strictă a utilizatorului (`users` -> `bookings` -> `tickets`).
