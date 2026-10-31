# Test Plan & Quality Assurance Matrix
**Project:** Smart Queue & Token System for Local Clinics  
**Institution:** GL Bajaj Institute of Technology & Management, Greater Noida  
**Department:** Computer Science & Engineering (Data Science)  
**Document Version:** 1.0.0 — Comprehensive Verification Matrix

---

## 1. Executive Summary & Verification Philosophy

This test plan defines the testing strategy, execution methodology, and quality assurance gates for the Smart Queue System. Every requirement is backed by automated tests executing against real server routes, isolated MongoDB collections, and verified frontend CSS/DOM rules. 

### Core Testing Directives
1. **Empirical Verification Only:** A test is never marked as passed without active execution and a verified exit code `0`.
2. **Fake Data & Isolated Sandboxes:** All automated tests utilize programmatic fake patient data, ephemeral HTTP servers, and dedicated clinic/doctor test codes to preserve zero side-effects.
3. **Non-Blocking Resilience:** Third-party integrations (Twilio, SMS gateways, external carriers) are tested for graceful degradation. Carrier downtime or webhook latency must never rollback a database transaction, fail a booking, or interrupt staff queue controls.
4. **Deterministic Core:** Queue sorting, sequence generation, wait time estimation, and alert thresholds are strictly mathematical and deterministic—never delegated to an LLM.

---

## 2. Requirements Traceability Matrix

| Requirement / Scenario | Test Suite | Test File | Status |
| :--- | :--- | :--- | :---: |
| **1. Health Endpoint & Uniform Error Envelope** | Health Check & Middleware Suite | `server/tests/health.test.js` | `PASS` |
| **2. Booking Validation, Doctor Unavailable & Rate Limit** | Booking Validation & Lifecycle Suite | `server/tests/booking_validation.test.js` | `PASS` |
| **3. 50 Parallel Booking Attempts (Concurrency Test)** | Concurrency & Uniqueness Suite | `server/tests/concurrency.test.js` | `PASS` |
| **4. Priority Ordering & bookedAt Tie-Break** | Deterministic Queue Engine Suite | `server/tests/queue.test.js` | `PASS` |
| **5. Wait Estimator: 4 ahead × 8 min = 32 min & Fallback** | Wait Estimator & Load Balancing | `server/tests/estimator.test.js` | `PASS` |
| **6. State Transitions: Call, Start, Complete, Skip, No-Show, Check-In** | Queue Engine & Staff Reception Suites | `server/tests/queue.test.js`<br>`server/tests/reception_staff.test.js` | `PASS` |
| **7. Auth: Wrong Password, Expired JWT, Role Escalation, Doctor Ownership** | Staff Auth & RBAC Security Suite | `server/tests/auth.test.js`<br>`server/tests/doctor_admin.test.js` | `PASS` |
| **8. Public Tracking Privacy & Invalid IDs** | Live Tracking & Confirmation Suites | `server/tests/tracking.test.js`<br>`server/tests/confirmation.test.js` | `PASS` |
| **9. Twilio Signature, Duplicate Webhook & Provider Failure** | Webhook & SMS Failure Tolerance | `server/tests/webhook_failure.test.js`<br>`server/tests/sms_notification.test.js` | `PASS` |
| **10. Deterministic Non-LLM Architecture** | Architectural Verification | Documented in `DECISIONS.md` & `queue.service.js` | `PASS` |
| **11. Frontend: 360px Viewport, Keyboard Navigation, Reduced Motion** | Frontend Mobile & a11y Suite | `client/tests/viewport_a11y.test.js` | `PASS` |

---

## 3. Test Suites & Verification Details

### Suite 1: Health Endpoint & Error Envelopes (`server/tests/health.test.js`)
* **Endpoint:** `GET /api/v1/health`
* **Assertions:**
  * Returns HTTP 200 with `{ success: true, data: { status: "ok", uptimeSeconds: ..., database: "connected" } }`.
  * Verifies `X-Request-Id` header is propagated in all responses for distributed log tracing.
  * Verifies unknown endpoints (`/api/v1/unknown-endpoint`) return HTTP 404 with standard envelope: `{ success: false, error: "Endpoint not found ...", requestId: "...", timestamp: "..." }`.
  * PII logger utility automatically masks passwords, tokens, and patient identifiers.

### Suite 2: Booking Validation & Doctor Availability (`server/tests/booking_validation.test.js`)
* **Endpoint:** `POST /api/v1/tokens/book`
* **Assertions:**
  * Rejects missing or whitespace-only patient name with HTTP 400.
  * Rejects invalid contact phone formats (< 8 or > 15 digits) with HTTP 400.
  * Rejects malformed doctor ObjectIds with HTTP 400.
  * Rejects invalid priority enumerations with HTTP 400.
  * Rejects booking when doctor has `isAvailable: false` with HTTP 400.
  * Check-in endpoint (`POST /api/v1/reception/check-in`) marks `isCheckedIn: true`, records `checkedInAt`, and handles repeated scans idempotently without duplicate transitions.
  * Doctor `no_show` action marks token as `SKIPPED` with `isNoShow: true`.

### Suite 3: Concurrency & Sequence Monotonicity (`server/tests/concurrency.test.js`)
* **Execution:** 50 simultaneous `createToken` promises fired via `Promise.all`.
* **Assertions:**
  * All 50 parallel requests resolve successfully with zero HTTP 500 errors.
  * Sequence numbers are strictly monotonic and unique from 1 to 50 (`new Set(sequences).size === 50`).
  * Token display codes are 100% unique (`new Set(tokenCodes).size === 50`).
  * Active booking key locks prevent the same patient phone from booking multiple active tokens for the same doctor on the same day (HTTP 409 Conflict).

### Suite 4: Priority Queue Sorting & Tie-Breakers (`server/tests/queue.test.js`)
* **Sorting Policy:** Ordered by `priorityRank ASC`, then `bookedAt ASC`.
* **Assertions:**
  * `EMERGENCY_WALKIN` (Rank 1) preempts `ELDERLY` (Rank 2) and `STANDARD` (Rank 3).
  * Equal priority tokens order strictly by `bookedAt` timestamp (earlier booking served first).
  * Atomic counter increments ensure sequence continuity.

### Suite 5: Deterministic Wait Estimator (`server/tests/estimator.test.js`)
* **Formula:** $\text{Estimated Wait} = \text{Patients Ahead} \times \text{Doctor Effective Consult Minutes}$.
* **Assertions:**
  * **Zero-history fallback:** When doctor has $< 3$ completed consultations, system falls back to `doctor.avgConsultMinutes` (e.g. 8 minutes).
  * **Exact Specification Test:** Target patient with 4 patients ahead with an 8-minute doctor produces:
    $$4 \times 8\text{ min} = 32\text{ minutes}$$
    Display: `"~32 mins"`, with explicit non-promissory disclaimer: `"Estimated wait is dynamic based on consultation pace and is an estimate, not a guarantee."`
  * Clamping: Output clamped between physical lower bound (2 min) and upper bound (60 min).
  * Rolling average activates dynamically once $\ge 3$ consultations complete.

### Suite 6: State Machine Transitions (`server/tests/reception_staff.test.js` & `server/tests/queue.test.js`)
* **Matrix:**
  * `WAITING` $\rightarrow$ `CALLED`, `CANCELLED`
  * `CALLED` $\rightarrow$ `IN_CONSULTATION`, `SKIPPED` (or `no_show`), `CANCELLED`
  * `IN_CONSULTATION` $\rightarrow$ `COMPLETED`, `SKIPPED`
  * `SKIPPED` $\rightarrow$ `WAITING` (Recall), `CANCELLED`
  * `COMPLETED`, `CANCELLED` $\rightarrow$ Terminal
* **Assertions:**
  * Disallowed transitions (e.g. `WAITING` $\rightarrow$ `COMPLETED`) are rejected with HTTP 400.
  * Walk-in creation via receptionist marks `source: 'WALKIN'`.
  * Recalling a skipped token re-acquires the active booking lock.

### Suite 7: Authentication & RBAC Isolation (`server/tests/auth.test.js` & `server/tests/doctor_admin.test.js`)
* **Boundaries:**
  * Wrong password returns generic 401 without user enumeration.
  * Disabled staff account (`isActive: false`) cannot log in even with correct credentials (HTTP 403).
  * Expired or malformed JWT returns HTTP 401.
  * Role escalation: Receptionist cannot access `/api/v1/admin/*` endpoints (HTTP 403 Forbidden).
  * Doctor ownership isolation: Doctor A cannot query `/api/v1/doctor/queue?doctorId=DoctorB` or perform actions on Doctor B's tokens (HTTP 403 Forbidden).

### Suite 8: Public Tracking Privacy (`server/tests/tracking.test.js` & `server/tests/confirmation.test.js`)
* **Endpoints:** `GET /api/v1/tokens/track/:trackingUuid`
* **Assertions:**
  * Strict cache headers: `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`.
  * Zero PII: Patient name, phone number, and internal notes are completely omitted from response payloads.
  * Invalid or guessed tracking UUIDs return HTTP 404 with uniform error envelope.
  * Scannable QR code contains only the approved tracking URL, never JWTs or raw patient data.

### Suite 9: Webhook Security & SMS Resilience (`server/tests/webhook_failure.test.js` & `server/tests/sms_notification.test.js`)
* **Endpoints:** `POST /api/v1/webhooks/twilio`
* **Assertions:**
  * Invalid Twilio HMAC-SHA1 signature rejected with HTTP 403 Forbidden.
  * Valid signature updates `Notification` delivery status to `DELIVERED`.
  * Duplicate status callback handled idempotently with `{ duplicate: true }`.
  * `SMS_ENABLED=false` runs in safe simulation mode with zero external carrier charges.
  * Carrier exceptions are non-blocking: failure is logged and recorded in `Notification.status = 'FAILED'` without aborting token booking or queue operations.

### Suite 10: Frontend Mobile 360px Viewport & a11y (`client/tests/viewport_a11y.test.js`)
* **Automated Audit Checks:**
  * `overflow-x: hidden` enforced on `html, body` to guarantee zero horizontal scroll on 360px screens.
  * Keyboard navigation: `:focus-visible` outline styles defined with high-contrast cyan ring (`#22D3EE`).
  * Reduced motion: `@media (prefers-reduced-motion: reduce)` collapses all animation and transition durations.
  * Fluid layout: Input fields and container widths are fluid (`width: 100%`) without fixed pixel widths exceeding 360px.

---

## 4. Test Execution Commands & Results Summary

### Execution Commands
```bash
# Run all server integration and unit test suites
npm.cmd test --workspace=server

# Run frontend viewport and accessibility test suite
npm.cmd test --workspace=client

# Run complete repository test suite
npm.cmd test
```

### Cumulative Results

```
========================================================================
             SMART QUEUE SYSTEM - AUTOMATED TEST MATRIX
========================================================================
 Suite File                           Pass   Fail   Status   Duration
------------------------------------------------------------------------
 server/tests/health.test.js            3      0     PASS     ~45ms
 server/tests/auth.test.js              6      0     PASS    ~310ms
 server/tests/booking_validation.js     6      0     PASS    ~360ms
 server/tests/concurrency.test.js       2      0     PASS   ~1300ms
 server/tests/queue.test.js             7      0     PASS    ~775ms
 server/tests/estimator.test.js         9      0     PASS   ~1180ms
 server/tests/confirmation.test.js      6      0     PASS    ~535ms
 server/tests/tracking.test.js          5      0     PASS    ~480ms
 server/tests/reception_staff.test.js   5      0     PASS    ~535ms
 server/tests/doctor_admin.test.js      5      0     PASS   ~1030ms
 server/tests/sms_notification.test.js  5      0     PASS    ~530ms
 server/tests/webhook_failure.test.js   5      0     PASS    ~215ms
 client/tests/viewport_a11y.test.js     5      0     PASS     ~20ms
------------------------------------------------------------------------
 TOTAL                                 69      0     PASS    ~7.3s
========================================================================
```

All 69 automated test cases across 13 suites executed with **100% pass rate (0 failures)**.
