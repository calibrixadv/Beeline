# Task Backlog: Transit Delay & Connection-Risk ML Pipeline Upgrade

> **Roadmap:** Machine Learning Migration (LightGBM Training ➔ ONNX Runtime Serving + Redis Online Feature Store)  
> **Status:** READY FOR IMPLEMENTATION  
> **Target Subsystems:** `backend/`, `frontend/`, `mobile/`  

---

## Phase 1: Redis & Online Feature Store Infrastructure

### Task 1: Add Redis Service to Docker Compose & Configuration
**Description:** Add a lightweight Redis 7 container to `backend/docker-compose.yml`, configure Redis connection settings in `backend/app/core/config.py`, and update `backend/.env.example`.
**Acceptance criteria:**
- [x] `backend/docker-compose.yml` includes `redis` service (`redis:7-alpine`, container name `beeline_redis`, port `6379:6379`, persistent volume `beeline_redis_data`, healthcheck `redis-cli ping`).
- [x] `backend/.env.example` includes `REDIS_URL="redis://localhost:6379/0"`, `REDIS_FEATURE_PREFIX="feature:"`, and `REDIS_FEATURE_TTL_SECONDS=86400`.
- [x] `backend/app/core/config.py` defines typed Settings properties: `REDIS_URL: str`, `REDIS_FEATURE_PREFIX: str`, `REDIS_FEATURE_TTL_SECONDS: int`, `FEATURE_SYNC_INTERVAL_SECONDS: int = 60`, and `ENABLE_ML_INFERENCE: bool = True`.
**Verification:**
- [x] `docker compose -f backend/docker-compose.yml config` validates syntax with 0 errors.
- [x] Python import and settings validation: `python3 -c "from app.core.config import settings; assert settings.REDIS_URL"`
**Dependencies:** None
**Files likely touched:**
- `backend/docker-compose.yml`
- `backend/.env.example`
- `backend/app/core/config.py`
**Estimated scope:** S (3 files)

---

### Task 2: Build Async Redis Client Manager with Graceful Degradation
**Description:** Implement `backend/app/core/redis.py` providing an asynchronous Redis connection pool, health check ping, and a safe wrapper that catches connection errors and degrades gracefully if Redis is offline.
**Acceptance criteria:**
- [x] `backend/requirements.txt` includes `redis[asyncio]>=5.0.0`.
- [x] `backend/app/core/redis.py` initializes an `AsyncConnectionPool` and exposes an async `get_redis_client()` dependency.
- [x] Provides `redis_health_check()` returning `True` when reachable and `False` when unreachable without raising unhandled exceptions.
- [x] Exposes a `close_redis_pool()` lifecycle hook to cleanly terminate connections on shutdown.
**Verification:**
- [x] Unit tests pass: `pytest backend/tests/test_feature_store.py::test_redis_connection_pool`
**Dependencies:** Task 1
**Files likely touched:**
- `backend/requirements.txt`
- `backend/app/core/redis.py`
**Estimated scope:** S (2 files)

---

### Task 3: Build Online Feature Store Service (`feature_store_service.py`)
**Description:** Implement `backend/app/services/feature_store_service.py` managing real-time corridor, station, and weather features in Redis with sub-millisecond pipelined reads (`HGETALL` / `MGET`) and deterministic default fallbacks when cache misses occur.
**Acceptance criteria:**
- [x] Implements canonical key formatting using `slugify_corridor(origin, destination)` for `feature:corridor:{corridor_id}` and `feature:station:{station_code}`.
- [x] Provides `get_corridor_features(corridor_id: str)` returning active disruption count, maximum severity score, rolling 3h/24h delay minutes, historical punctuality, weather condition, and external factors score.
- [x] Provides `get_station_features(station_code: str)` returning congestion index, transfer delay buffer variance, platform reassignment risk, and local weather alerts.
- [x] Provides `batch_get_corridor_features(corridor_ids: List[str])` using Redis pipelining for $< 1\text{ms}$ retrieval.
- [x] Returns safe, realistic fallback defaults if keys are missing or Redis is unavailable (e.g. 0 active disruptions, 0 delay, 0.88 baseline punctuality, CLEAR weather).
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_feature_store.py::test_feature_store_batch_reads`
**Dependencies:** Task 2
**Files likely touched:**
- `backend/app/services/feature_store_service.py`
- `backend/tests/test_feature_store.py`
**Estimated scope:** M (2 files)

---

### Task 4: Background Feature Synchronization Worker in FastAPI Lifespan
**Description:** Create an asynchronous background worker (`corridor_feature_sync_worker`) in `backend/app/main.py` that periodically aggregates live metrics from `disruption_service`, `train_service`, and ANM weather alerts, writing pre-computed feature hashes to Redis with sliding TTLs without blocking SQL queries.
**Acceptance criteria:**
- [x] Background task runs on a non-blocking loop every `FEATURE_SYNC_INTERVAL_SECONDS` (default 60s).
- [x] Aggregates active disruptions and weather severity per Romanian transit corridor (`București-Brașov`, `Galați-București`, `Cluj-Oradea`, etc.) and sets Redis hashes via atomic pipeline.
- [x] Task starts cleanly during FastAPI `lifespan` startup and cancels gracefully during shutdown without dangling event loop warnings.
- [x] SQL database queries in `database.py` remain completely untouched and unblocked.
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_feature_store.py::test_sync_worker_execution`
**Dependencies:** Task 3
**Files likely touched:**
- `backend/app/main.py`
- `backend/app/services/feature_store_service.py`
**Estimated scope:** M (2 files)

---

### Task 5: Enhance IdempotencyService with Redis Distributed Atomic Locking
**Description:** Enhance `backend/app/services/idempotency_service.py` with a Redis distributed lock (`SET NX EX`) for high-concurrency multi-worker deployments, retaining the existing SQL transaction table as a seamless fallback.
**Acceptance criteria:**
- [x] Claims idempotency key via `redis.set(f"idemp:{user_id}:{key}", hash, nx=True, ex=120)` before SQL insertion.
- [x] Releases distributed lock cleanly on error.
- [x] Seamlessly falls back to SQL `idempotency_records` table if Redis is disabled or offline.
- [x] Preserves 100% of existing idempotency test contracts.
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_idempotency_concurrency.py`
- [x] Tests pass: `pytest backend/tests/test_saved_routes_idempotency.py`
**Dependencies:** Task 2
**Files likely touched:**
- `backend/app/services/idempotency_service.py`
**Estimated scope:** S (1 file)

---

### Checkpoint 1: Redis & Feature Store Infrastructure Verification
- [x] Redis container spins up cleanly and passes health checks.
- [x] `FeatureStoreService` reads and writes pipelined hashes with sub-millisecond roundtrips.
- [x] All 61 existing backend tests continue to pass with 0 regressions.

---

## Phase 2: ML Training Pipeline & ONNX Model Export

### Task 6: Establish ML Training vs Serving Dependency Segregation
**Description:** Create `backend/requirements-ml-train.txt` containing full training dependencies (`lightgbm`, `scikit-learn`, `onnxmltools`, `skl2onnx`, `pandas`, `numpy`, `scipy`) while keeping production `backend/requirements.txt` minimal (`onnxruntime>=1.18.0`, `numpy>=1.26.0`, `redis>=5.0.0`).
**Acceptance criteria:**
- [x] `backend/requirements-ml-train.txt` created with pinned ML training libraries.
- [x] `backend/requirements.txt` updated with only lightweight serving dependencies (`onnxruntime`, `numpy`, `redis`).
- [x] Container build for production backend remains small and avoids heavy C++ compilers or scikit-learn in production.
**Verification:**
- [x] Verify package specs resolve without conflicting versions: `pip check` in virtualenv.
**Dependencies:** None
**Files likely touched:**
- `backend/requirements-ml-train.txt`
- `backend/requirements.txt`
**Estimated scope:** XS (2 files)

---

### Task 7: Synthetic Romanian Transit Dataset Generator
**Description:** Implement dataset generation inside `backend/scripts/train_risk_model.py` bootstrapping realistic training journeys from `seed.sql` (`usr-seed-guest-003`), `romanianTransitTemplates.ts` (14 providers, 20+ line schedules, Romanian transfer hubs), `corridor_service.py`, and CFR operator punctuality distributions.
**Acceptance criteria:**
- [x] Generates $N \ge 50,000$ synthetic multi-leg journeys combining urban transit (Transurb, Metrorex, STB) and intercity rail (CFR, TFC, Astra Trans Carpatic).
- [x] Simulates realistic delay distributions using log-normal random variables conditioned on carrier baseline punctuality, single-track sections (Galați-Făurei, Ploiești-Câmpina), rush hour congestion, and active disruptions.
- [x] Calculates ground-truth `actual_delay_minutes` and binary `missed_connection` target labels.
- [x] Splits dataset into 80% train and 20% validation sets with stratified connection risk classes.
**Verification:**
- [x] Script runs: `python3 backend/scripts/train_risk_model.py --generate-data-only` generates valid dataset summary stats.
**Dependencies:** Task 6
**Files likely touched:**
- `backend/scripts/train_risk_model.py`
**Estimated scope:** M (1 file)

---

### Task 8: Build Feature Engineering & Preprocessing Pipeline
**Description:** Implement feature transformation in `train_risk_model.py` converting raw journey dictionaries into the standardized 18-element numerical feature vector mapped to SQL tables and Redis keys.
**Acceptance criteria:**
- [x] Implements ordinal encoding for transit modes (`BUS`=0, `METRO`=1, `TRAM`=2, `R`=3, `RE`=4, `IR`=5, `IC`=6).
- [x] Implements cyclic/temporal encoding for hour of day, peak hour flags, and day of week.
- [x] Computes Haversine distance from coordinates and stop count.
- [x] Integrates simulated corridor disruption counts, rolling delays, and transfer station congestion indices.
- [x] Exports feature schema and column index mapping to `backend/app/ml_models/risk_model_metadata.json`.
**Verification:**
- [x] Feature vector matrix shape validated: `(N, 18)` with zero `NaN` or infinite values.
**Dependencies:** Task 7
**Files likely touched:**
- `backend/scripts/train_risk_model.py`
- `backend/app/ml_models/risk_model_metadata.json`
**Estimated scope:** M (2 files)

---

### Task 9: Train LightGBM Dual Regressor/Classifier Models
**Description:** Train high-performance gradient-boosted trees for Expected Delay regression (Huber loss) and Missed Connection probability classification (binary cross-entropy) with hyperparameter tuning.
**Acceptance criteria:**
- [x] Model 1 (Expected Delay Regressor): LightGBM with Huber loss achieving Mean Absolute Error (MAE) $< 4.5$ minutes on test set.
- [x] Model 2 (Missed Connection Classifier): LightGBM binary classifier achieving ROC-AUC $> 0.90$ and Brier score $< 0.10$.
- [x] Logs evaluation metrics, feature importance rankings, and confusion matrices to stdout during training.
**Verification:**
- [x] Script runs to completion and asserts target validation metrics are satisfied.
**Dependencies:** Task 8
**Files likely touched:**
- `backend/scripts/train_risk_model.py`
**Estimated scope:** M (1 file)

---

### Task 10: Fuse Dual Models & Export to Single ONNX Artifact
**Description:** Convert trained LightGBM models into intermediate ONNX graphs and fuse them into the single compiled binary artifact `backend/app/ml_models/risk_model.onnx` using `onnx.compose.merge_models`, verifying that ONNX Runtime predictions match native Python outputs within numerical tolerance ($1e-5$).
**Acceptance criteria:**
- [x] Outputs unified compiled artifact `backend/app/ml_models/risk_model.onnx` with input tensor `float_input` `[None, 18]` and output tensors `expected_delay` and `missed_connection_prob` (file size $< 1\text{MB}$).
- [x] Outputs comprehensive schema metadata to `backend/app/ml_models/risk_model_metadata.json`.
- [x] Implements parity test asserting: $\max |\hat{y}_{\text{LightGBM}} - \hat{y}_{\text{ONNX}}| < 10^{-5}$.
- [x] Benchmarks standalone ONNX Runtime inference latency on CPU ($< 1.0\text{ms}$ for batch size 5).
**Verification:**
- [x] Script executes: `python3 backend/scripts/train_risk_model.py --export-onnx`
- [x] ONNX model file exists and passes dual-output verification check.
**Dependencies:** Task 9
**Files likely touched:**
- `backend/scripts/train_risk_model.py`
- `backend/app/ml_models/risk_model.onnx`
- `backend/app/ml_models/risk_model_metadata.json`
**Estimated scope:** M (3 files)

---

### Checkpoint 2: ML Training & ONNX Export Verification
- [x] `backend/app/ml_models/risk_model.onnx` and `risk_model_metadata.json` generated.
- [x] Prediction parity between LightGBM and ONNX verified.
- [x] Batch inference latency benchmark on CPU confirmed $< 1.0\text{ms}$.


---

## Phase 3: FastAPI ONNX Inference & Routing Integration

### Task 11: Create ML Risk Schemas & Update Route Plan Models with Aliases
**Description:** Create `backend/app/schemas/risk.py` and update `backend/app/schemas/route_plan.py` with backward-compatible additive fields (`expectedDelayMinutes`, `missedConnectionProbability`, `isMlComputed`, `riskFactors`) and bidirectional snake_case/camelCase aliases (`risk_score`, `risk_level`, `expected_delay_minutes`, `missed_connection_probability`, `risk_factors`).
**Acceptance criteria:**
- [x] `backend/app/schemas/risk.py` defines `RiskPrediction`, `RiskFeatureVector`, and `RiskFactorExplanation` schemas.
- [x] `RouteRiskAnalysis` in `backend/app/schemas/route_plan.py` updated to include:
  - `expectedDelayMinutes: int = 0` (alias `expected_delay_minutes`)
  - `missedConnectionProbability: float = 0.0` (alias `missed_connection_probability`)
  - `riskFactors: List[str] = Field(default_factory=list)` (aliases `risk_factors`, `delayRiskFactors`)
  - `isMlComputed: bool = False` (alias `is_ml_computed`)
  - `overallRiskScore` supports aliases `risk_score` and `riskScore`.
  - `riskLevel` supports alias `risk_level`.
- [x] Configures Pydantic `model_config = ConfigDict(populate_by_name=True)`.
- [x] Retains 100% backward compatibility with all existing fields (`overallRiskScore`, `riskLevel`, `historicalPunctualityRate`, `tightestBufferMinutes`, `bufferAdequacy`, `riskSummaryText`, `factors`).
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_routes.py`
**Dependencies:** None
**Files likely touched:**
- `backend/app/schemas/risk.py`
- `backend/app/schemas/route_plan.py`
**Estimated scope:** S (2 files)

---

### Task 12: Implement In-Process ONNX Inference Service (`risk_service.py`)
**Description:** Implement `backend/app/services/risk_service.py` to load `risk_model.onnx` at FastAPI lifespan startup, vectorize candidate routes with Redis feature enrichment, execute batched inference, and calibrate composite scores.
**Acceptance criteria:**
- [x] Loads `onnxruntime.InferenceSession` during startup in `backend/app/main.py` and attaches to application state.
- [x] Converts `TransitRoutePlan` candidate objects into an 18-element NumPy vector, querying `FeatureStoreService` in a single batch.
- [x] Executes batched inference: `session.run()` for all candidate journeys in a single call ($< 1.0\text{ms}$).
- [x] Maps predictions into calibrated `overallRiskScore` ($0-100$), discrete `RiskLevel` (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`), expected delay minutes, and connection probability.
- [x] Generates explainable natural language risk factors highlighting tight buffers, single-track sections, and active corridor disruptions.
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_risk_service.py::test_onnx_inference_latency`
**Dependencies:** Tasks 3, 10, 11
**Files likely touched:**
- `backend/app/services/risk_service.py`
- `backend/app/main.py`
**Estimated scope:** L (2 files)

---

### Task 13: Build Deterministic Rule Fallback Engine
**Description:** Implement a robust deterministic fallback inside `risk_service.py` that catches any runtime exceptions, missing ONNX artifacts, or Redis outages and returns a valid Romanian Transfer Shield evaluation without 500 errors.
**Acceptance criteria:**
- [x] If `risk_model.onnx` is missing on disk, server starts cleanly and activates fallback mode with a warning log.
- [x] If ONNX runtime throws an unexpected exception during inference, request falls back to rule-based evaluation.
- [x] If Redis is down, feature store falls back to static defaults.
- [x] Fallback sets `isMlComputed = False` and populates expected delay from active disruptions heuristic.
- [x] Guaranteed zero 500 server errors for route searches.
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_risk_service.py::test_graceful_degradation_when_model_missing`
**Dependencies:** Task 12
**Files likely touched:**
- `backend/app/services/risk_service.py`
**Estimated scope:** S (1 file)

---

### Task 14: Integrate Batched Risk Inference in RoutingService
**Description:** Update `RoutingService.plan_routes()` in `backend/app/services/routing_service.py` to evaluate all candidate routes through the batched ML risk engine before returning the Curated Trifecta response.
**Acceptance criteria:**
- [x] Replaces client-side static heuristic calls with `risk_service.enrich_route_plans(candidate_plans)`.
- [x] Enriches Fastest, Best Value, and Most Reliable route plans with ML delay predictions, connection probabilities, and updated risk levels.
- [x] Preserves all existing itinerary fields, legs, stops, fares, and eco benchmarks.
- [x] Total route planning response time increases by $< 5\text{ms}$.
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_routes.py`
**Dependencies:** Tasks 12, 13
**Files likely touched:**
- `backend/app/services/routing_service.py`
**Estimated scope:** M (1 file)

---

### Checkpoint 3: In-Process Inference Verification
- [x] `POST /api/v1/routes/plan` returns valid plans enriched with `expectedDelayMinutes`, `missedConnectionProbability`, and `isMlComputed: true`.
- [x] Server starts cleanly and functions even when `risk_model.onnx` is intentionally moved or deleted (fallback mode).
- [x] Latency overhead of risk enrichment measured under 5ms.

---

## Phase 4: Frontend & Mobile Wiring

### Task 15: Update TypeScript Route Plan Contracts with ML Properties
**Description:** Update `RouteRiskAnalysis` in `frontend/src/types/routePlan.ts` and `mobile/src/types/routePlan.ts` with the new additive ML properties and human-readable explanation list.
**Acceptance criteria:**
- [x] Adds optional properties: `expectedDelayMinutes?: number`, `missedConnectionProbability?: number`, `riskFactors?: string[]`, and `isMlComputed?: boolean`.
- [x] Retains `overallRiskScore: number`, `riskLevel: RiskLevel`, and `factors: RouteRiskFactor[]` for backward compatibility.
- [x] Preserves strict TypeScript types (`strict: true`, zero `any`).
- [x] Both web and mobile type definitions remain 100% synchronized.
**Verification:**
- [x] `npm run type-check` in `frontend/` passes with 0 errors.
**Dependencies:** Task 11
**Files likely touched:**
- `frontend/src/types/routePlan.ts`
- `mobile/src/types/routePlan.ts`
**Estimated scope:** S (2 files)

---

### Task 16: Update API Clients for ML Risk Deserialization
**Description:** Update `ApiClient` in `frontend/src/services/apiClient.ts` and `mobile/src/services/apiClient.ts` to properly deserialize and expose the ML risk fields.
**Acceptance criteria:**
- [x] `planRoute()` parses the enriched `riskAnalysis` payload (`expectedDelayMinutes`, `missedConnectionProbability`, `riskFactors`, `isMlComputed`).
- [x] Tolerates responses where ML fields are absent (defaults safely).
- [x] Re-exports helper utilities to format expected delay (`+5m expected`) and connection reliability guarantee (`96% connection safety`).
**Verification:**
- [x] Tests pass: `npm test -- frontend/src/__tests__/riskScoreCalculator.test.ts`
**Dependencies:** Task 15
**Files likely touched:**
- `frontend/src/services/apiClient.ts`
- `mobile/src/services/apiClient.ts`
**Estimated scope:** S (2 files)

---

### Task 17: Reconcile Client-Side Risk Calculator as Offline Fallback
**Description:** Update `frontend/src/services/riskScoreCalculator.ts` and `mobile/src/services/riskScoreCalculator.ts` to clearly document and enforce their role as an offline fallback engine, reconciling output format with backend ML schema.
**Acceptance criteria:**
- [x] Added JSDoc marking `calculateRouteRisk()` as `@deprecated Use backend ML endpoint POST /api/v1/routes/plan. Retained strictly for offline/mock fallback.`
- [x] Populates default fallback values: `expectedDelayMinutes: 0`, `missedConnectionProbability: 0.05`, `isMlComputed: false`.
- [x] All existing Jest tests in `frontend/src/__tests__/riskScoreCalculator.test.ts` pass without modifications to expected values.
**Verification:**
- [x] `npm test` passes all 4 test suites.
**Dependencies:** Task 16
**Files likely touched:**
- `frontend/src/services/riskScoreCalculator.ts`
- `mobile/src/services/riskScoreCalculator.ts`
**Estimated scope:** S (2 files)

---

### Task 18: Enhance Route Results UI with ML Delay & Guarantee Indicators
**Description:** Enhance route preview cards in `frontend/src/components/RouteFinderCard.tsx` and `my-trip/page.tsx` to display ML-backed delay badges and connection guarantee percentages when available.
**Acceptance criteria:**
- [x] Displays expected delay pill (e.g. `⏱️ +4m expected delay` or `✅ On Time`).
- [x] Displays connection guarantee shield (e.g. `🛡️ 97% connection guarantee`).
- [x] Seamlessly hides indicators or shows rule-based summary when `isMlComputed` is false.
- [x] Strict Invariant 1 preserved: Zero map elements on HomePage.
**Verification:**
- [x] `npm run type-check` passes with 0 errors.
- [x] `npm run build` succeeds generating all static routes.
**Dependencies:** Tasks 16, 17
**Files likely touched:**
- `frontend/src/components/RouteFinderCard.tsx`
- `frontend/src/app/my-trip/page.tsx`
**Estimated scope:** M (2 files)

---

### Checkpoint 4: Frontend & Mobile Integration Verification
- [x] `npm run type-check`: 0 TypeScript compiler errors.
- [x] `npm test`: 100% of test suites pass (4/4 suites).
- [x] `npm run build`: Production Next.js build succeeds with 7/7 static routes generated.
- [x] Zero map elements on HomePage strictly preserved.

---

## Phase 5: Pytest & Jest Test Suites & Documentation Sync

### Task 19: Build Unit & Integration Tests for ML & Feature Store Services
**Description:** Create comprehensive test suites in `backend/tests/test_risk_service.py` and `backend/tests/test_feature_store.py` covering model loading, batch inference latency, Redis reads/writes, and fallback paths.
**Acceptance criteria:**
- [x] `test_risk_service.py` tests:
  - Model loading and session options.
  - Batch inference latency assertion ($< 5\text{ms}$ for batch of 5).
  - Score calibration and boundary checks ($0 \le \text{score} \le 100$, $0 \le P(\text{missed}) \le 1$).
  - Deterministic fallback when ONNX file is missing or invalid.
- [x] `test_feature_store.py` tests:
  - Corridor feature hash writes and pipeline batch reads.
  - Station congestion and transfer delay retrieval.
  - Cache miss behavior returning safe default fallbacks.
  - Background sync worker cycle.
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_risk_service.py backend/tests/test_feature_store.py -v`
**Dependencies:** Tasks 4, 13
**Files likely touched:**
- `backend/tests/test_risk_service.py`
- `backend/tests/test_feature_store.py`
**Estimated scope:** L (2 files)

---

### Task 20: Update Route Planning Integration Tests
**Description:** Update `backend/tests/test_routes.py` to assert on ML-enriched fields (`expectedDelayMinutes`, `missedConnectionProbability`, `isMlComputed`) and verify performance during end-to-end route queries.
**Acceptance criteria:**
- [x] `test_route_plan_micro19_to_unirii_contract` asserts on `expectedDelayMinutes` and `missedConnectionProbability`.
- [x] `test_route_plan_bucharest_to_brasov` asserts on direct corridor risk evaluation.
- [x] `test_generic_route_plan` verifies generic routing path with ML risk enrichment.
- [x] Verifies total HTTP request duration stays within production SLA.
**Verification:**
- [x] Tests pass: `pytest backend/tests/test_routes.py -v`
**Dependencies:** Tasks 14, 19
**Files likely touched:**
- `backend/tests/test_routes.py`
**Estimated scope:** S (1 file)

---

### Task 21: Add Frontend Client & Fallback Test Cases
**Description:** Expand frontend Jest tests to cover API client deserialization of ML risk properties and client-side fallback handling.
**Acceptance criteria:**
- [x] Tests in `frontend/src/__tests__/riskScoreCalculator.test.ts` verify offline calculation matches expected schema.
- [x] Tests verify that `apiClient.planRoute` correctly maps `expectedDelayMinutes` and `missedConnectionProbability`.
**Verification:**
- [x] Tests pass: `npm test`
**Dependencies:** Task 17
**Files likely touched:**
- `frontend/src/__tests__/riskScoreCalculator.test.ts`
**Estimated scope:** S (1 file)

---

### Task 22: Synchronize API Specifications & Implementation Status Docs
**Description:** Update `api.md`, `backend/api.md`, and `PLAN_AND_STATUS.md` with complete documentation for the ML risk pipeline, Redis online feature store, and updated JSON schemas.
**Acceptance criteria:**
- [x] `api.md` and `backend/api.md` Section 6 updated with new `RouteRiskAnalysis` fields and description.
- [x] Section 12 Status Matrix updated marking the ML risk pipeline and Redis feature store as active.
- [x] `PLAN_AND_STATUS.md` updated with architectural milestone completion notes.
- [x] `AI_LOG.md` remains strictly untouched.
**Verification:**
- [x] Markdown files properly formatted with 0 broken links.
- [x] `git status` verifies `AI_LOG.md` was never modified.
**Dependencies:** Tasks 18, 20, 21
**Files likely touched:**
- `api.md`
- `backend/api.md`
- `PLAN_AND_STATUS.md`
**Estimated scope:** S (3 files)

---

### Checkpoint 5: Master Quality Gates Pass
- [x] Backend test suite: all tests pass (expected 65+ passed tests, 0 failures; actual 100 passed).
- [x] Frontend test suite: 100% passed (5 suites, 49 passed tests).
- [x] TypeScript strict mode: 0 errors across frontend and mobile.
- [x] Next.js production build: static routes generated successfully.
- [x] Strict Invariant 1: Zero map elements on HomePage.
- [x] Strict Invariant 2: `AI_LOG.md` strictly untouched.
