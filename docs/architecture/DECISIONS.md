# Justificarea Deciziilor de Proiectare (DECISIONS.md)

**Disciplina:** Baze de Date Avansate (BD2)  
**Titular curs:** Asist. univ. dr. Cristian Sandu, Universitatea „Dunărea de Jos” din Galați  
**Proiect:** Beeline VoyageRail — Sistem Tranzacțional și Analitic de Transport Feroviar și Multimodal  
**Autor:** Andrei Iordache  
**Data:** Semestrul I, An universitar 2026–2027  

---

## 1. SGBD Relațional Unic și Rolul Tehnologiilor Conexe

### 1.1 PostgreSQL 16 — SGBD Relațional Unic de Persistență
Conform cerințelor disciplinei (*Proiectul se realizează individual, utilizând un singur SGBD relațional, ales de student*), **PostgreSQL 16** constituie sistemul de gestiune a bazelor de date relațional unic al arhitecturii Beeline.

Toate entitățile persistente din domeniul de afaceri, constrângerile relaționale de integritate (chei primare, chei străine, unicitate, constrângeri de domeniu), istoricul călătoriilor și al biletelor, precum și tranzacțiile financiare sunt găzduite exclusiv în PostgreSQL. Pentru mediul de dezvoltare rapidă locală și testare automată unitară, se utilizează SQLite 3.35+ prin dialectul asincron `aiosqlite`, menținând o compatibilitate strictă la nivel de DDL/DML cu specificația ANSI SQL și PostgreSQL 16 (inclusiv clauze UPSERT `ON CONFLICT DO NOTHING`).

### 1.2 Delimitarea Rolului Redis 7 (In-Memory Feature Store & Ephemeral Cache)
În conformitate cu tema modulară a proiectului, **Redis 7** este utilizat exclusiv ca spațiu de stocare volatil în memorie (*ephemeral in-memory key-value store*):
1. **Online Feature Store pentru Modelul ML:** Păstrarea agregărilor în fereastră glisantă (întârzieri pe ultimele 3h/24h pe coridoare feroviare, nivel de aglomerație în gări, coeficienți meteo ANM) pentru inferența sub-milisecundă ($< 1.5\text{ms}$) a riscului de pierdere a legăturilor prin ONNX Runtime.
2. **Lock Distribuit de Idempotență:** Prevenirea apelurilor concurente rapide prin comanda atomică `SET NX EX 120`.
3. **Mecanism de Circuit Breaker (Zero-Downtime Fallback):** Redis nu conține date unice de persistență. În situația în care instanța Redis este oprită sau indisponibilă, backend-ul FastAPI degradează instantaneu și transparent la interogări directe în PostgreSQL 16 și aplică euristica deterministă *Romanian Transfer Shield*, garantând disponibilitate 100% fără erori de tip HTTP 500.

---

## 2. Justificarea Modelului de Date (ER) și a Constrângerilor de Integritate

Schema bazei de date relaționale (`backend/schema.sql`) este compusă din **12 tabele relaționale**, structurate în a 3-a Formă Normală (3NF), asigurând absența anomaliilor de inserare, actualizare și ștergere.

### 2.1 Strategia de Chei Primare (PK)
- **Identificatori UUID v4 (`VARCHAR(36)`):** Utilizați pentru tabelele tranzacționale (`users`, `user_sessions`, `mfa_credentials`, `password_reset_tokens`, `saved_routes`, `bookings`, `tickets`, `idempotency_records`). UUID-urile elimină posibilitatea coliziunilor în medii distribuite, împiedică enumerarea secvențială malițioasă a comenzilor de către utilizatori neautorizați (IDOR) și permit generarea ID-urilor direct de către client sau serviciu înainte de faza de `COMMIT`.
- **Chei Naturale Codificate:** Pentru entitățile de infrastructură fizică unde există standarde feroviare internaționale și naționale:
  - Tabela `stations`: utilizează codul telegrafic CFR / IATA / UIC (ex: `BCT` pentru București Nord, `GLT` pentru Galați, `BSV` pentru Brașov) ca cheie primară `VARCHAR(16)`. Aceasta oferă lizibilitate optimă în tabelele de legătură și evită join-uri suplimentare doar pentru afișarea codului gării.
  - Tabela `trains`: utilizează identificatori compuși canonici (ex: `trn-cfr-ir-1572`), având în plus o constrângere de unicitate strictă pe `train_number` (`VARCHAR(32) UNIQUE`).

### 2.2 Semantica Cheilor Străine (Foreign Keys): `CASCADE` vs. `RESTRICT`
Politica de integritate referențială este proiectată distinct, în funcție de caracterul relației:

1. **`ON DELETE CASCADE` (Entități Dependente de Ciclu de Viață):**
   - Când un cont din `users` este șters (operația `DELETE /api/v1/users/me`), se propagă automat ștergerea tuturor înregistrărilor dependente: `user_sessions`, `mfa_credentials`, `password_reset_tokens`, `saved_routes`, `bookings` și `idempotency_records`.
   - Când o rezervare din `bookings` este ștearsă, biletele asociate din `tickets` sunt eliminate automat în cascadă. Se evită astfel acumularea de înregistrări orfane în sistem.
2. **`ON DELETE RESTRICT` (Entități de Infrastructură Comună):**
   - În tabela `trains`, coloanele `origin_code` și `destination_code` referă `stations(code)` cu regula explicită `ON DELETE RESTRICT`.
   - **Justificare:** O gară (nod feroviar) nu poate fi ștearsă arbitrar din sistem dacă există trenuri sau rute programate care pleacă sau sosesc în acea stație. În caz contrar, călătorii ar deține bilete către destinații inexistente fizic. Tentativa de ștergere a unei gări active generează o eroare `HTTP 409 Conflict`, obligând administratorul să reprogrameze mai întâi trenurile afectate.

### 2.3 Constrângeri de Domeniu (`CHECK` Constraints)
Sistemul aplică validări directe la nivel de catalog al bazei de date, împiedicând stocarea unor date invalide chiar dacă ar fi ocolită validarea din API (Defense in Depth):
- **Coordonate Geografice Reale:**
  - `stations.latitude CHECK (latitude BETWEEN -90.0 AND 90.0)`
  - `stations.longitude CHECK (longitude BETWEEN -180.0 AND 180.0)`
- **Integritate Financiară:**
  - `trains.base_price_lei CHECK (base_price_lei >= 0)`
  - `schedules.fare_lei CHECK (fare_lei >= 0)`
  - `bookings.total_amount_lei CHECK (total_amount_lei >= 0)` (interzice prețuri negative sau anomalii de tranzacționare).
- **Valabilitate Temporală și Operațională:**
  - `trains.duration_minutes CHECK (duration_minutes > 0)` (durata unei călătorii este strict pozitivă).
  - `trains.delay_minutes CHECK (delay_minutes >= 0)`
  - `disruptions.delay_minutes CHECK (delay_minutes >= 0)`
  - `schedules.frequency_minutes CHECK (frequency_minutes > 0)`
  - `bookings.passenger_count CHECK (passenger_count >= 1)`
- **Validare Enumerări (Domain Enums):**
  - Roluri utilizator: `users.role CHECK (role IN ('TRAVELER', 'OPERATOR', 'ADMIN'))`
  - Starea trenurilor: `trains.status CHECK (status IN ('ON_TIME', 'DELAYED', 'CANCELLED', 'BOARDING'))`
  - Severitatea incidentelor: `disruptions.severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL'))`
  - Clasa biletului: `tickets.class_type CHECK (class_type IN ('STANDARD', 'FIRST', 'BUSINESS', 'SLEEPER'))`
  - Starea cererilor de idempotență: `idempotency_records.status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'))`

### 2.4 Alegerea Tipurilor de Date
- `TIMESTAMPTZ` / `TIMESTAMP`: Toate marcajele temporale de plecare, sosire, creare și expirare sunt stocate în timp universal coordonat (UTC).
- `NUMERIC(10,2)` / `REAL`: Sumele bănești în LEI sunt reprezentate cu 2 zecimale, garantând precizie contabilă exactă fără erori de rotunjire specifice tipurilor flotante IEEE 754.
- `JSONB` / `TEXT`: Atributele semistructurate (dotări tren `amenities`, coduri de urgență MFA `backup_codes_hash`, payload itinerariu complex `plan_data`) sunt serializate JSON, oferind extensibilitate fără a impune modificări repetate de schemă DDL.

---

## 3. Controlul Concurenței, MVCC și Prevenirea Double-Booking-ului

### 3.1 Mecanismul MVCC (Multi-Version Concurrency Control) în PostgreSQL
PostgreSQL implementează izolarea tranzacțiilor prin MVCC, unde scrierile nu blochează citirile, iar citirile nu blochează scrierile:
- Fiecare tuplu conține antete ascunse: `xmin` (identificatorul tranzacției care a inserat rândul) și `xmax` (identificatorul tranzacției care a șters sau a actualizat rândul).
- Când o tranzacție de rezervare actualizează locurile libere dintr-un vagon, se creează o nouă versiune a rândului, iar vechiul rând este marcat pentru colectare ulterioară de către procesul `VACUUM`.
- Nivelul implicit de izolare, **Read Committed**, garantează că o tranzacție vede doar modificările comise înainte de debutul fiecărei instrucțiuni SQL.

### 3.2 Prevenirea Double-Booking-ului (Idempotență și Tranzacții Atomice)
Rezervarea unui bilet de tren reprezintă o operație critică supusă condițiilor de cursă (*race conditions*):
1. **Idempotență pe Două Nivele (Two-Tier Idempotency):**
   - Clientul transmite antetul HTTP `Idempotency-Key` (ex: `book:v1:usr-001:order-98234`).
   - Nivelul 1 (Redis): Se încearcă comanda atomică `SET key hash NX EX 120`. Dacă cheia există deja, se identifică un apel duplicat concurrent și se refuză executarea multiplă.
   - Nivelul 2 (PostgreSQL 16): Tabela `idempotency_records` conține o constrângere unică compusă `CONSTRAINT uq_user_idempotency_key UNIQUE (user_id, idempotency_key)`.
2. **Semantica Atomică SQL:**
   - La plasarea comenzii, inserarea se realizează într-un bloc tranzacțional asincron (`AsyncSession.begin()`). Dacă doi călători încearcă simultan să emită o rezervare identică, constrângerea de unicitate din PostgreSQL forțează un eșec tranzacțional (`IntegrityError`), generând `HTTP 409 Conflict`, fără modificarea stării bazei de date și fără emiterea unor bilete duplicate.
   - Tranzacția scrie simultan înregistrarea rezervării în `bookings` și biletul fizic în `tickets`, comițându-se atomic (`all-or-nothing`).

---

## 4. Arhitectura de Autentificare, Roluri și Securitate

### 4.1 Hashing-ul Criptografic al Parolelor (Bcrypt)
Parolele călătorilor nu sunt stocate niciodată în clar. Se utilizează algoritmul `bcrypt` (biblioteca `passlib.context.CryptContext` cu scheme `["bcrypt"]`), configurat cu un factor de cost (*work factor*) de 12. Bcrypt generează automat un salt criptografic de 128 de biți pentru fiecare parolă, prevenind atacurile prin tabele curcubeu (*rainbow tables*) și atacurile de tip dicționar.

### 4.2 Ciclul de Viață al Tokenurilor și Gestiunea Sesiunilor
Sistemul combină avantajele tokenurilor JWT stateless cu controlul centralizat de revocare:
1. **Access Token (JWT):** Valabilitate redusă (15 minute), semnat criptografic cu algoritmul HMAC-SHA256 (`HS256`). Conține `sub` (identificatorul utilizatorului), `session_id`, `role` și marcajul de expirare `exp`. Permite autorizarea ultra-rapidă a cererilor API fără interogarea bazei de date la fiecare hit.
2. **Refresh Token Rotativ & Tabela `user_sessions`:** Valabilitate de 7 zile. Pentru a preveni furtul tokenurilor de reîmprospătare, hash-ul SHA-256 al fiecărui token este persistat în tabela relațională `user_sessions`, alături de metadate de securitate (`device_info`, `ip_address`, `last_active_at`, `is_revoked`). La fiecare reîmprospătare (`POST /api/v1/auth/refresh`), vechiul token este invalidat atomic, iar o nouă pereche este emisă (*Token Rotation*).
3. **Revocare Imediată:** Călătorul poate vizualiza toate sesiunile active din dispozitivele sale și poate revoca de la distanță o sesiune compromisă (`DELETE /api/v1/users/me/sessions/{id}`).

### 4.3 Autentificare cu Doi Factori (RFC 6238 TOTP)
Pentru conturile de administratori și călătorii care activează securitatea extinsă:
- Se utilizează protocolul standardizat Time-Based One-Time Password (TOTP) pe ferestre de 30 de secunde, cu algoritmul SHA-1.
- Secretul Base32 de 160 de biți este stocat în tabela `mfa_credentials`, fiind confirmat printr-un prim cod valid înainte de activare.
- În plus, sistemul generează 8 coduri de recuperare de urgență (*emergency backup codes*), stocate sub formă de hash-uri SHA-256 de unică folosință.

### 4.4 Modelul de Roluri (RBAC)
Sistemul implementează 3 roluri definite strict prin constrângerea `CHECK`:
1. `TRAVELER`: Călător standard sau oaspete (*guest*), cu permisiuni de căutare a rutelor, rezervare de bilete și gestiune a propriului portofel de călătorie.
2. `OPERATOR`: Dispecer feroviar sau urban (CFR, STB, Transurb, Metrorex), cu drepturi de actualizare a întârzierilor în timp real, declarare de incidente/disruptions și ajustare a orarelor de plecare.
3. `ADMIN`: Administrator general al sistemului, cu acces complet la crearea/ștergerea gărilor, administrarea parcului de trenuri, gestionarea utilizatorilor și auditul de securitate.
