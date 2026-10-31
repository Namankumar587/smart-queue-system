# Architectural Decision Records & Policy Specifications

> **Project:** Smart Queue & Token System for Local Clinics  
> **Academic Context:** GL Bajaj Institute of Technology & Management, Greater Noida  
> **Department:** Computer Science & Engineering (Data Science)  
> **Document Purpose:** Centralized tracking of architectural decisions, operational clinic policies, and blocking configuration choices.  
> **Status Taxonomy:** `CONFIRMED`, `REQUIRED`, `RECOMMENDED`, `TO BE DEFINED`, `OPTIONAL`, `FUTURE`

---

## 1. Executive Summary & Scope Boundaries

To prevent implementation drift and guarantee deterministic behavior, all architectural decisions are categorized into three distinct operational scopes:

1. **MVP Scope (Core Functionality):** Deterministic server-side token state engine, patient booking, zero-PII live tracking, role-based staff consoles (Doctor, Receptionist, Admin), and isolated notification fallbacks.
2. **Advanced Scope (Post-MVP Enhancements):** Audited analytics export, scannable physical token receipt printing, customizable clinic operating breaks, and animated receptionist overview boards.
3. **Future Scope (Explicitly Out of Current Scope):** Native mobile applications, multi-clinic federation, ML-driven nonlinear wait prediction models, and WhatsApp Business API gateways.

---

## 2. Decision Log & Policy Registry

### [DEC-01] Demo Clinic and Doctor Capacity Count
* **Scope:** MVP
* **Status:** `TO BE DEFINED (PROPOSAL AVAILABLE)`
* **Decision Owner:** Academic Evaluator & Project Lead
* **Options:**
  * **Option A (Minimal Demo):** 1 Model Clinic, 3 Doctors (1 General Medicine, 1 Pediatrics, 1 Dermatology).
  * **Option B (Single Department Focus):** 1 Model Clinic, 2 General Practitioners with shared queue pool.
  * **Option C (Multi-Doctor Scaled):** 1 Model Clinic, 5+ Doctors across 4 departments with full room allocations.
* **Recommendation:** **Option A**. 1 Model Clinic (*GL Bajaj Community Health Center*) with 3 specialist doctors. Provides immediate visual department variety during project defense without excessive UI scrolling or data crowding.
* **Impact:** Controls seed data, dropdown complexity on the booking portal, and receptionist monitoring views.

---

### [DEC-02] Clinic Operating Hours and Timezone Standardization
* **Scope:** MVP
* **Status:** `TO BE DEFINED`
* **Decision Owner:** Clinic Operations / Project Lead
* **Options:**
  * **Option A:** Strict Indian Standard Time (`Asia/Kolkata`, UTC+05:30), 08:30 to 17:30 daily. Online token generation disabled outside clinic hours.
  * **Option B:** Flexible 24/7 demo mode where booking is always open regardless of host system clock.
  * **Option C:** Configurable per clinic via Admin Dashboard with a timezone selector and daily booking cutoff threshold (e.g., 30 mins before closing).
* **Recommendation:** **Option C** with a default fallback to `Asia/Kolkata` (08:30 - 17:30 IST) for GL Bajaj clinic demonstration, paired with an emergency demo bypass flag (`DEMO_MODE=true`) for late-night project evaluations.
* **Impact:** Prevents sequence counter resets midway through consultations and standardizes server UTC timestamp conversions.

---

### [DEC-03] Consultation Duration Benchmark & Deterministic Wait Estimator
* **Scope:** MVP
* **Status:** `CONFIRMED: DETERMINISTIC HYBRID (ROLLING MEAN / EMA + CLINIC FALLBACK)`
* **Decision Owner:** Technical Architect & Project Lead
* **Deterministic Wait Formula:**
  $$\text{Estimated Wait Minutes} = \text{Patients Ahead} \times \text{Effective Consultation Minutes}$$
  Where $\text{Patients Ahead} = \text{In Service (CALLED/IN\_CONSULTATION)} + \text{Waiting Ahead with Higher Priority/Earlier Booking}$.
* **Configurable Estimation Strategies:**
  * **Strategy A (Default: `ROLLING_MEAN`):** Arithmetic mean of the last 20 completed consultations with positive recorded duration.
    $$\text{Effective Minutes} = \text{round}\left(\frac{1}{N} \sum_{i=1}^{N} \text{duration}_i\right)$$
  * **Strategy B (`EMA`):** Exponential Moving Average with smoothing parameter $\alpha = 0.2$ across chronological completed visits, giving greater weight to recent visits.
    $$\text{EMA}_t = \alpha \cdot \text{duration}_t + (1 - \alpha) \cdot \text{EMA}_{t-1}$$
* **Cold-Start & Early Operation Fallback:**
  * When completed sample count $< 3$ visits, dynamic calculation is bypassed in favor of deterministic fallback hierarchy:
    1. `Doctor.avgConsultMinutes` (doctor configured duration, default: 10 min)
    2. `Clinic.defaultConsultationMinutes` (clinic operating setting, default: 10 min)
    3. Global system fallback: 10 min.
  * Physical boundary clamping: All calculated durations are strictly clamped to $[2, 60]$ minutes.
* **Non-Promissory Display Standard:**
  * To prevent patient conflict, exact promised wait times are strictly forbidden in UI and public responses.
  * Formatted output includes:
    * Integer base minutes: `estimatedWaitMinutes`
    * Dynamic window: `minWaitMinutes` (approx. $-20\%$) to `maxWaitMinutes` (approx. $+20\%$)
    * Approximate string: `~X mins` or `Next in line (< 5 mins)`
    * Explicit disclaimer: *"Estimated wait is dynamic based on consultation pace and not a guaranteed appointment time."*
* **Machine Learning & LLM Boundary:**
  * LLMs are strictly forbidden from performing queue arithmetic, sequencing, or state transitions.
  * Non-linear ML wait time prediction (e.g. gradient-boosted regression on patient arrival distributions) is classified as **Future Scope (CSE Data Science research addendum)**, not MVP runtime logic.

---

### [DEC-04] Near-Turn Alert Notification Threshold
* **Scope:** MVP
* **Status:** `TO BE DEFINED (PROPOSAL: 3 TOKENS AHEAD)`
* **Decision Owner:** Patient Experience / Technical Architect
* **Options:**
  * **Option A:** Fixed alert at 1 token ahead ("You are next in line").
  * **Option B (Proposed):** Alert dispatched when 3 tokens remain ahead ($\approx 20\text{--}30\text{ minutes}$ estimated wait).
  * **Option C:** Alert dispatched when estimated wait drops below 15 minutes, irrespective of token count.
* **Recommendation:** **Option B (3 tokens ahead)**. In local outpatient clinics, 3 tokens afford patients sufficient travel buffer to reach the waiting area without delaying the doctor.
* **Impact:** Controls automated notification trigger conditions in `queue.service.js` and prevents unnecessary notification spam.

---

### [DEC-05] SMS Gateway Demo Mode & Carrier Execution
* **Scope:** MVP
* **Status:** `TO BE DEFINED`
* **Decision Owner:** Technical Architect
* **Options:**
  * **Option A:** Simulated console logger only (`SMS_ENABLED=false`). Zero external API dependence, zero billing cost, 100% reliable during grading.
  * **Option B:** Live Twilio trial account with pre-verified evaluator phone numbers (`SMS_ENABLED=true`).
  * **Option C:** Dual-mode toggle: live Twilio when valid credentials and verified numbers are detected; automated graceful fallback to terminal logging otherwise.
* **Recommendation:** **Option C**. Architecture defaults to `SMS_ENABLED=false` with rich terminal logging for evaluation safety, but allows instant activation of Twilio by adding credentials to `.env`.
* **Impact:** Eliminates hard stops or crashes during evaluation due to Twilio trial limitations or unverified carrier numbers.

---

### [DEC-06] Priority Queue Policy (Operational vs Medical)
* **Scope:** MVP
* **Status:** `REQUIRED / CONFIRMED: OPERATIONAL ONLY`
* **Decision Owner:** Medical / Ethical Compliance (GL Bajaj CSE Guidelines)
* **Policy Rule:** **Strictly zero automated medical triage, diagnostic algorithms, or emergency health decision-making.**
* **Allowed Operational Categories:**
  * `EMERGENCY_WALKIN` (Rank 10) — Designated strictly by human receptionists for walk-in crisis cases.
  * `ELDERLY` (Rank 5) — Designated for senior citizens (age 65+) and individuals requiring mobility assistance.
  * `STANDARD` (Rank 1) — General public appointments (default).
* **Impact:** Queue ordering uses deterministic multi-key sorting:
  $$\text{Order} = (\text{Priority Rank DESC}, \text{Booked Timestamp ASC})$$
  Ensures compliance with non-negotiable Rule #8.

---

### [DEC-07] No-Show Grace Period & Recall Policy
* **Scope:** MVP
* **Status:** `TO BE DEFINED`
* **Decision Owner:** Clinic Operations Lead
* **Options:**
  * **Option A (Manual Doctor Action):** When a called patient does not arrive, doctor clicks "Skip". Token moves to `SKIPPED`. Doctor or receptionist can manually "Recall" to put them next in `WAITING`.
  * **Option B (Timed Auto-Skip):** Server automatically marks a `CALLED` token as `SKIPPED` after 5 minutes of inactivity.
  * **Option C (Permanent Cancel):** Skipped tokens are permanently canceled and cannot be reinstated.
* **Recommendation:** **Option A (Manual Doctor Action)**. Automated timeouts cause severe friction in local clinics where doctors step out or patients step into restrooms. Manual Recall provides complete operational flexibility.
* **Impact:** State machine allows `SKIPPED -> WAITING` transition exclusively via authorized staff actions.

---

### [DEC-08] Patient PII Data Retention and Privacy Purge Period
* **Scope:** MVP
* **Status:** `TO BE DEFINED`
* **Decision Owner:** Data Privacy & Security Officer
* **Options:**
  * **Option A (Daily Reset & Immediate Anonymization):** Tokens reset daily. Patient name and phone are masked 24 hours after consultation completion.
  * **Option B (30-Day Retention):** Tokens and analytics are retained in full for 30 calendar days for clinic auditing, then purged.
  * **Option C (Academic Retain):** Full demonstration data preserved in MongoDB for the duration of the semester evaluation.
* **Recommendation:** **Option C** for local evaluation, combined with automated sanitization on all public tracking APIs.
* **Impact:** Public `/api/v1/tokens/track/:uuid` endpoint never returns PII regardless of data age.

---

### [DEC-09] Department Auto-Assignment & Queue Load Balancing
* **Scope:** MVP
* **Status:** `CONFIRMED: DETERMINISTIC LOAD BALANCING (HYBRID OPTION C)`
* **Decision Owner:** Functional Architect & Project Lead
* **Operational Policy:**
  * Patients may directly select an available doctor OR select a department (e.g., General Medicine) for automated load-balanced assignment.
* **Deterministic Load Balancing Algorithm:**
  1. Filter all available doctors in the department for the clinic (`isAvailable: true`).
  2. For each candidate doctor, calculate active queue load on the current date:
     $$\text{Queue Wait} = \text{Active Tokens (IN\_CONSULTATION, CALLED, WAITING)} \times \text{Doctor Effective Consult Minutes}$$
  3. Deterministic Ranking Priority:
     - **Primary:** Lowest estimated queue wait minutes ascending.
     - **Secondary (Tie-break):** Fewest active tokens ascending.
     - **Tertiary (Tie-break):** Alphabetical `doctorCode` ascending.
  4. Records immutable assignment rationale (`token.assignmentRationale`), e.g., `"AUTO_LOAD_BALANCED: Assigned to Dr. Priya Sharma (DOC-GEN-101) with lowest queue wait (0 mins across 2 available doctors in General Medicine)"`.
* **Strict No-Silent-Reassignment Rule:**
  * Once booked, a token is **strictly immutable with respect to its assigned doctor during regular queue operations**.
  * The queue engine will NEVER automatically shift or reassign booked tokens in the background.
  * Reassignment is only permissible via explicit, authorized manual action by staff (`reassignTokenDoctor`), which updates `assignmentRationale`, issues an `AuditLog` entry, and validates target doctor availability.

---

### [DEC-10] Token Confirmation Card & Public Tracking Presentation
* **Scope:** MVP
* **Status:** `CONFIRMED: STRICT ZERO-PII PUBLIC TRACKING WITH AUDITED QR & SMS HONESTY`
* **Decision Owner:** Security & Frontend Architect
* **Operational Policies:**
  1. **Zero-PII Public Contract:** The confirmation endpoint (`GET /api/v1/tokens/track/:trackingUuid`) and UI (`ConfirmationPage`, `TokenCard`) strictly never return or display patient names, phone numbers, or clinical notes.
  2. **Non-Promissory Wait Display:** Estimates must explicitly state: *"Estimated wait is dynamic based on consultation pace and is an estimate, not a guarantee."* Range format: `~X mins (min - max mins)`.
  3. **Scannable QR Code Security:** QR codes strictly encode the approved tracking URL (`${CLIENT_URL}/track/${trackingUuid}`), never JWT credentials, internal database IDs, or patient data.
  4. **Honest Notification Delivery Reporting:** SMS status is displayed only when reported by the backend (`SIMULATED`, `SENT`, `DELIVERED`, `FAILED`). Never invent or fabricate successful delivery when unconfirmed.
  5. **Private Tracking Security:** Display clear warnings instructing patients not to share their private tracking link with strangers.
  6. **Graceful Expiration & Missing Handling:** 404 or expired tokens render empathetic error states with direct recovery pathways: "Book a New Token" (`/book`) and "Track by ID" (`/track/search`).

---

### [DEC-11] Patient Live Tracking & Polling Lifecycle Policy
* **Scope:** MVP
* **Status:** `CONFIRMED: TAB-AWARE 10-SECOND POLLING WITH ARIA-LIVE STATE ACCESSIBILITY`
* **Decision Owner:** Frontend Architect & Accessibility Lead
* **Operational Policies:**
  1. **Polling Frequency & Execution Plan:** Public tracking (`/track/:trackingUuid`, `/track/:id`) polls `GET /api/v1/tokens/track/:id` every 10 seconds.
  2. **Tab Visibility Lifecycle:** Polling is automatically suspended when `document.visibilityState === 'hidden'` to preserve client device battery and clinic network capacity. Upon returning to `visible`, the page immediately triggers an update and resets the 10s interval.
  3. **Terminal State Termination:** Once a token reaches `COMPLETED` or `CANCELLED`, background polling automatically halts to prevent redundant requests.
  4. **Accessible Change Announcements (`aria-live`):** Changes in queue position, turn alerts (`CALLED`), and doctor counter updates trigger focused polite screen reader announcements without repeatedly reading the entire page on every 10-second polling cycle.
  5. **Network Resilience & Rate Limit Backoff:** Temporary background network glitches do not wipe out active token views; HTTP 429 rate limits enforce an automated 30-second backoff with informative user messaging.
  6. **3D Route Isolation:** Three.js and WebGL libraries are strictly banned from `/track/:id` to ensure ultra-fast, lightweight mobile loading down to 360px viewport widths.

---

### [DEC-12] Front-Desk Queue Controls & Staff RBAC Policy
* **Scope:** MVP
* **Status:** `CONFIRMED: FRONT-DESK QUEUE CONTROLS & STAFF RBAC SYNCHRONIZATION`
* **Decision Owner:** Security, Operations & Frontend Architect
* **Operational Policies:**
  1. **Front-Desk Receptionist & Admin Authority:** Front-desk receptionists (`RECEPTIONIST`) and administrators (`ADMIN`) possess supervisory permissions across all clinic doctor queues to handle triage, in-person walk-ins, patient arrivals, no-shows, and calls when doctors do not operate digital hardware. In contrast, `DOCTOR` users are strictly restricted to their own assigned queue (`doctorId` match required by server RBAC).
  2. **Tab-Aware 5-Second Polling:** The staff dashboard automatically polls the active doctor's queue every 5 seconds. To prevent unnecessary server traffic and conserve resources, polling is immediately suspended when `document.visibilityState === 'hidden'` and resumes with an instant refresh upon becoming `visible`.
  3. **Strict Server-Authoritative State Synchronization:** Every queue-changing action (`call_next`, `start_consultation`, `complete`, `skip`, `recall`, `cancel`, walk-in booking) dispatches an immediate API request to the backend. The UI never reorders or mutates the queue locally in React state without full reconciliation from the server response.
  4. **Explicit Confirmation for Destructive / Irreversible Actions:** Actions that irreversibly cancel a patient's place in line (`cancel`) or remove them as a no-show (`skip`) require an interactive confirmation modal explaining the operational consequences before the API request is issued.
  5. **Minimum Necessary Operational PII:** In compliance with data privacy guidelines, staff queue views display only the operational minimum of patient data: patient full name, masked phone number (`******4321`), source (`ONLINE` vs `WALKIN`), priority label, and operational notes. Full contact numbers are never exposed in queue inspection tables.
  6. **Visual Multi-Signal Status & Priority:** Priority and token states are never communicated by color alone. Every status and priority level pairs a distinctive text label with an icon and standard color token (e.g., Urgent Walk-in 🚨 Amber/Red, Senior Citizen 👴 Amber, Standard 👤 Slate; Waiting ⏳ Cyan, In Consultation 🩺 Blue, Called 📢 Warning).
  7. **Stale Data & Offline Awareness:** A live ticker displays the elapsed seconds since the last successful server synchronization (`Updated X seconds ago`). If updates are delayed or network requests fail, a warning state alerts the staff that displayed numbers may be stale.

---

### [DEC-13] Doctor Console Queue Isolation & Admin Governance Policy
* **Scope:** MVP
* **Status:** `CONFIRMED: STRICT DOCTOR OWNERSHIP ISOLATION & ADMIN RBAC GOVERNANCE`
* **Decision Owner:** Security Architect & Clinical Governance
* **Operational Policies:**
  1. **Strict Doctor Queue Isolation:** Doctor accounts (`role: 'DOCTOR'`) are mathematically bound to their configured `doctorProfileId`. The server strictly forbids doctors from querying another doctor's queue or executing state actions on another doctor's tokens (returning `HTTP 403 Forbidden`). Front-desk receptionists and administrators retain supervisory clinic-wide queue authority.
  2. **Dedicated Room Console UX:** The doctor console (`/doctor`, `/doctor/queue`) focuses on the immediate room state: single active patient (`CALLED` or `IN_CONSULTATION`), live elapsed consultation stopwatch, large one-click "Complete Consultation", and "Call Next Patient" gated strictly by room availability.
  3. **Zero Synthetic / Mock Analytics:** All admin analytics (`/admin`, `/api/v1/admin/analytics`) derive strictly from real database aggregations across completed visits, wait durations, and department volume. No fabricated or simulated numbers are presented as live operational telemetry.
  4. **Native SVG / CSS Visualization:** In compliance with stack constraints (Recharts not pre-installed in `client/package.json`), analytics visual breakdowns utilize accessible, responsive CSS bar meters and tabular numerical indicators.
  5. **Admin Credential Lifecycle & Safety:** Administrators can provision staff accounts, toggle account status (`isActive: true/false`), and perform password resets hashed server-side with bcrypt (10 rounds). Self-deactivation of the active administrator account is prohibited.
  6. **Immutable Audit Trail:** All administrative operations (staff provisioning, account deactivation, password reset, clinic policy adjustments) automatically generate structured entries in MongoDB's `AuditLog` collection, queryable via the admin audit viewer with target-type filtering and pagination.

---

### [DEC-14] SMS Template Architecture, DLT Compliance & Deterministic Alerting Policy
* **Scope:** MVP
* **Status:** `CONFIRMED: CLINIC-APPROVED TEMPLATES WITH DLT METADATA & IDEMPOTENT NEAR-TURN ALERTS`
* **Decision Owner:** Technical Architect & Regulatory Compliance
* **Operational Policies:**
  1. **Configurable Clinic-Approved Templates:** All outgoing communications strictly adhere to approved templates (`server/src/config/smsTemplates.js`) covering:
     - `BOOKING_CONFIRMATION`: Confirms token code, doctor name, department, estimated wait, and tracking URL.
     - `NEAR_TURN_ALERT`: Dispatched when $\le 3$ patients remain ahead, directing the patient to proceed to the consultation room.
     - `NOW_CALLING`: Notifies patient that their token is currently active and summons them to the room.
     - `CANCELLATION`: Informs patient that their token was cancelled and offers reception recovery.
     - `STATUS_HELP`: On-demand real-time status update with live wait and queue position.
     - `RECALLED`: Notifies skipped patient that their token has been reinstated in line.
  2. **TRAI DLT Compliance Mandate (India):** Live commercial SMS routing requires pre-registration under the Telecom Commercial Communications Customer Preference Regulations (TCCCPR, 2018):
     - Principal Entity (PE) registration with telecom operators.
     - Approved 6-character alphabetic Header / Sender ID (`GLBHLT`).
     - Pre-registered Content Template IDs (`DLT-GLB-001-BOOK`, `DLT-GLB-002-NEARTURN`, etc.) with variable placeholders `{#var#}`.
     - Evaluation/Student fallback (`SMS_ENABLED=false`): Runs in simulated console mode with masked phone numbers (`+91-******4321`), zero carrier fees, and zero DLT friction.
  3. **Strict PII Redaction in Logs:** Full phone numbers are strictly forbidden in server logs and dashboard interfaces. `maskPhoneNumber` masks all middle digits (`+91-******4321`) across simulation output, live dispatch logs, and error telemetry.
  4. **Deterministic Near-Turn Trigger & Deduplication:**
     - The near-turn alert triggers strictly from deterministic queue depth ($\le 3$ patients ahead), never from an LLM.
     - Persistent sent-event state (`nearTurnAlertSent: true` on `Token`) paired with an `idempotencyKey` on the `Notification` collection guarantees zero duplicate alerts even during concurrent status changes or re-evaluations.
  5. **Non-Blocking Fault Tolerance:** SMS carrier rejections, network timeouts, or invalid numbers are logged and stored as `status: 'FAILED'`, but never crash the server, abort booking transactions, or block queue state transitions.

---

### [DEC-15] Quality Assurance, Testing Architecture & Failure Recovery Policy
* **Scope:** MVP
* **Status:** `CONFIRMED: COMPREHENSIVE AUTOMATED VERIFICATION`
* **Decision Owner:** Lead QA Engineer & Academic Evaluator
* **Operational Rules & Implementation:**
  1. **Strict Empirical Verification:** Tests must execute in CI/CD and local environments with exit code 0. Test assertions must directly verify status codes, database documents, and error envelopes.
  2. **High-Concurrency Sequencing Integrity:**
     - 50 parallel booking attempts must be tested using `Promise.all` against an atomic sequence counter.
     - Sequences must be monotonic and non-colliding (1..50) with unique tracking UUIDs and tokens.
  3. **Wait Estimator Strict Arithmetic:**
     - Mathematical formula: $\text{Wait} = \text{Patients Ahead} \times \text{Effective Consultation Minutes}$.
     - Zero-history fallback tested: 4 patients ahead $\times$ 8 min $= 32$ min, with `"~32 mins"` display string and mandatory `"estimate, not a guarantee"` disclaimer.
  4. **State Machine & Lifecycle Extensions:**
     - Allowed transitions: `call_next`, `start_consultation`, `complete`, `skip`, `recall`, `cancel`, `no_show`.
     - Patient check-in (`/api/v1/reception/check-in`): marks `isCheckedIn: true` and is strictly idempotent to prevent repeated scans from altering queue positions.
  5. **Webhook Security & Carrier Resilience:**
     - Twilio HMAC-SHA1 signature verification enforced; invalid signatures rejected with HTTP 403 Forbidden.
     - Duplicate webhook delivery callbacks handled idempotently via `MessageSid` tracking.
     - Carrier failures or SMS simulation (`SMS_ENABLED=false`) are 100% non-blocking.
  6. **Frontend Mobile 360px & a11y Standards:**
     - All pages must strictly conform to 360px minimum viewport width with `overflow-x: hidden` preventing horizontal scroll.
     - High-contrast `:focus-visible` focus rings enforced for keyboard-only accessibility.
     - `@media (prefers-reduced-motion: reduce)` collapses animation and transition durations.
  7. **Strict Non-LLM Core:**
     - Queue sequencing, prioritization, wait estimates, and alerts are strictly mathematical algorithms. LLMs are never permitted in the core transactional queue path.

---

### [DEC-16] 3D Hero Scene, Landing Page Route Isolation & Resilient Fallbacks
* **Scope:** Advanced (Landing Page Only)
* **Status:** `CONFIRMED: LOCKED REACT 18 COMPATIBILITY & STRICT BUNDLE ISOLATION`
* **Decision Owner:** Lead Frontend Architect & Academic Evaluator
* **Operational Rules & Implementation:**
  1. **Prerequisite Gating:** The full operational queue lifecycle (`booking` $\rightarrow$ `tracking` $\rightarrow$ `staff Call Next` $\rightarrow$ `doctor completion`) must be tested and fully operational before enabling 3D visual enhancements.
  2. **Dependency Locking & Peer Compatibility:**
     - Client runs React `^18.3.1`. The latest `@react-three/fiber` v9 requires React 19 peer dependencies and is strictly incompatible.
     - Pinned locked compatible versions in `client/package.json`:
       * `@react-three/fiber`: `8.17.10`
       * `@react-three/drei`: `9.102.0`
       * `three`: `0.160.0`
  3. **Visual Concept & Aesthetics:**
     - Clinical, calm, premium dark palette (`#0B1220`, `#111A2E`, `#22D3EE`). Simple primitives (rounded mesh boxes, planes) with in-memory `CanvasTexture` text rendering.
     - Strictly zero external or downloaded GLTF/OBJ 3D models to guarantee 100% offline security and instantaneous load times.
     - Receding queue corridor towards a glowing doctor counter ($Z = -8.5$).
     - Translucent cyan patient card labelled **"YOU • T-004"** with pulse beacon, senior-priority card in amber **"SR • T-002"**, and active serving card **"T-001"**.
     - Subtle mouse parallax ($\pm 0.35$ rad via frame lerp) and scroll-linked camera translation along the queue corridor.
  4. **Device Adaptation & Mobile Clamping:**
     - Clamped Device Pixel Ratio (`dpr={[1, 1.5]}`) preventing GPU overheating and high retina power consumption.
     - Automatic mobile detection (`window.innerWidth < 768px`) reducing card count from 5 to 3 and disabling real-time shadow computation.
  5. **Resilient Multi-Tiered Fallbacks:**
     - High-fidelity isometric SVG fallback (`Hero2DFallback.jsx`) rendered immediately prior to WebGL canvas initialization, when WebGL context fails, on low-power devices (`navigator.hardwareConcurrency <= 4` or `navigator.connection.saveData === true`), and when `prefers-reduced-motion: reduce` is enabled.
     - `WebGLErrorBoundary` encapsulates the 3D scene to recover gracefully from context loss without breaking the landing page.
  6. **Strict Bundle Isolation:**
     - Three.js, R3F, and Drei are split into `three-bundle` via Vite `rollupOptions.output.manualChunks`.
     - React and React DOM are explicitly separated into `vendor-react` to eliminate Rollup chunk leakage into transactional pages.
     - `Hero3DCanvas` is lazy-loaded strictly on `/` using `React.lazy` and `<Suspense>`.
     - Zero Three.js or WebGL code is imported into `BookPage`, `TrackPage`, `ConfirmationPage`, `StaffDashboard`, `DoctorPage`, `AdminPage`, or `LoginPage` bundles.

---

### [DEC-17] Five-Station Scroll Journey (Scene B) & Interactive Wait-Time Simulator (Scene C)
* **Scope:** Advanced (Landing Page Extensions)
* **Status:** `CONFIRMED: DETERMINISTIC CLIENT-SIDE LOGIC & ACCESSIBLE SLIDERS`
* **Decision Owner:** Lead Frontend Architect & Academic Evaluator
* **Operational Rules & Implementation:**
  1. **Scene B: 5-Station Sequential Workflow:**
     - Mirrors the real, verified clinic workflow in sequential order:
       1. `Book`: Department and physician selection, patient identification, priority triage.
       2. `Confirm`: Atomic monotonic token sequence generation, scannable QR ticket, wait disclaimer.
       3. `Track`: High-entropy unguessable UUID tracker, polling with `Cache-Control: no-store`, zero PII.
       4. `Notify`: Deterministic near-turn SMS alerts ($\le 3$ ahead), DLT headers, carrier failure non-blocking.
       5. `Consult`: Doctor console, ownership guards, consultation timer, atomic completion.
     - Interactive step navigation with live 3D pedestal focusing (`Workflow3DCanvas.jsx`) and accessible 2D stepper fallback (`Workflow2DFallback.jsx`).
  2. **Scene C: Deterministic Frontend Wait-Time Simulator:**
     - Formula: $\text{Estimated Wait Minutes} = \text{patientsAhead} \times \text{averageMinutes}$
     - Example verified: $4 \text{ ahead} \times 8 \text{ min} = 32 \text{ min}$; $0 \text{ ahead} \times \text{any min} = 0 \text{ min}$.
     - Ownership Boundary: Result is strictly computed and owned by ordinary React state in `WaitTimeDemo.jsx`. The 3D canvas (`WaitTime3DCanvas.jsx`) receives calculated values as props and visualizes queue depth, but never computes or owns estimation math.
     - Mandatory Label: Must prominently display **"sample values, not real clinic data"** alongside the estimate disclaimer.
  3. **Accessibility & Controls:**
     - Keyboard-operable native range sliders (`<input type="range">`) with `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, and high-contrast `:focus-visible` focus rings.
     - Accessible discrete decrement (`-`) and increment (`+`) stepper buttons with `aria-label` for fine control.
  4. **Resilience & Fallback:**
     - Full 2D infographic fallback (`WaitTime2DFallback.jsx`) displays linear queue cards, room status, and formula breakdown without WebGL.
     - Auto-activates on `prefers-reduced-motion: reduce`, low-power devices, missing WebGL, or user manual toggle.
  5. **Scene D Deferral:**
     - Scene D (crowd-vs-home comparison) is explicitly deferred until all core requirements and end-to-end tests pass.

---

### [DEC-18] Motion & Performance Budget, Canvas Lifecycle & Measured Performance Auditing
* **Scope:** Advanced (Cross-Cutting Frontend Architecture)
* **Status:** `CONFIRMED: STRICT TIMING BUDGETS, REAL MEASURED LIGHTHOUSE METRICS & ZERO GUESSWORK`
* **Decision Owner:** Lead Frontend Architect & Academic Evaluator
* **Operational Rules & Implementation:**
  1. **Strict Micro-Interaction Timing Budget ($\le 250$ ms):**
     - Subtle motion is introduced **only** where it directly clarifies state changes, never as decorative distraction:
       1. `.motion-reveal`: 240 ms (`cubic-bezier(0.16, 1, 0.3, 1)`) fade & subtle 8px upward slide for section entrances.
       2. `.progress-bar-fill`: 240 ms (`cubic-bezier(0.4, 0, 0.2, 1)`) smooth width and color transition for queue progress bars.
       3. `.qr-success-tick`: 220 ms (`cubic-bezier(0.34, 1.56, 0.64, 1)`) checkmark pop for token generation and scanner check-in.
       4. `.queue-position-highlight`: 240 ms (`ease-out`) single-iteration cyan focus glow for position changes and near-turn alerts.
     - Never block reading: no continuous oscillation, flickering, or forced screen-lock delays.
  2. **Accessibility & Reduced Motion:**
     - Fully respects `@media (prefers-reduced-motion: reduce)`:
     - Animations, transitions, and transforms are instantly zeroed (`animation: none !important; transition: none !important; transform: none !important; opacity: 1 !important;`).
  3. **Canvas Off-Screen & Tab-Hidden Lifecycle Management:**
     - Implemented `useCanvasVisibility(containerRef)` combining `IntersectionObserver` (threshold: 0.05) and `document.visibilitychange`.
     - Controls R3F render loop dynamically: `<Canvas frameloop={isCanvasActive ? 'always' : 'never'}>`.
     - When canvas scrolls out of viewport or browser tab is hidden/backgrounded, `requestAnimationFrame` stops entirely, reducing GPU/CPU consumption to 0%.
     - Explicitly disposes all Three.js geometries, materials, CanvasTextures, and DOM event listeners (`resize`, `mousemove`, `scroll`, `visibilitychange`) on unmount.
  4. **Responsive Range (360 px to 1920 px):**
     - Minimum 360 px mobile viewport: zero horizontal overflow (`html, body { overflow-x: hidden }`), fluid input fields, touch-friendly tap targets ($\ge 44$ px), and reduced padding.
     - Maximum 1920 px ultrawide desktop: bounded container max-width (`1440px`) with centered clinical layout and no edge distortion.
  5. **Bundle Analyzer Verification (`dist/stats.html`):**
     - Configured `rollup-plugin-visualizer` generating treemap bundle breakdown (`dist/stats.html`, 713.7 kB).
     - Verified Three.js is exclusively isolated in `three-bundle` and lazy-loaded on `/`:
       * `three-bundle`: 794.32 kB (213.86 kB gzip)
       * `vendor-react`: 166.90 kB (54.52 kB gzip)
       * `HomePage`: 44.44 kB (10.64 kB gzip)
       * `AdminPage`: 30.44 kB (7.02 kB gzip)
       * `StaffDashboard`: 20.16 kB (5.45 kB gzip)
       * `DoctorPage`: 15.21 kB (4.02 kB gzip)
       * `BookPage`: 14.76 kB (4.75 kB gzip)
       * `TrackPage`: 8.41 kB (3.22 kB gzip)
       * `ConfirmationPage`: 3.69 kB (1.56 kB gzip)
       * `LoginPage`: 5.17 kB (2.00 kB gzip)
       * `index.css`: 5.91 kB (2.20 kB gzip)
     - Zero Three.js or WebGL dependencies are loaded on patient/staff routes (`BookPage`, `TrackPage`, `ConfirmationPage`, `StaffDashboard`, `DoctorPage`, `AdminPage`, `LoginPage`).
  6. **Real Measured Performance & Lighthouse Metrics (Honest, Unassumed):**
     - Audited on production build (`dist/`) using headless Chrome Lighthouse CLI (`npx lighthouse`):
       * **Desktop Landing Page (`/`):**
         - Performance: **74** | Accessibility: **96** | Best Practices: **96** | SEO: **91**
         - FCP: **0.5 s** | LCP: **0.5 s** | Speed Index: **0.6 s** | TBT: **540 ms** | CLS: **0.121**
       * **Mobile Landing Page (`/`, 4x CPU slowdown & slow 4G):**
         - Performance: **58** | Accessibility: **96** | Best Practices: **96** | SEO: **91**
         - FCP: **3.2 s** | LCP: **3.2 s** | Speed Index: **3.2 s** | TBT: **2,590 ms** | CLS: **0.000**
       * **Desktop Patient Route (`/book`, No Three.js):**
         - Performance: **100** | Accessibility: **93** | Best Practices: **96** | SEO: **91**
         - FCP: **0.5 s** | LCP: **0.8 s** | Speed Index: **0.5 s** | TBT: **0 ms** | CLS: **0.000**

---

## 3. Scope Classification Summary

| Feature / Architectural Component | Classification | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Monorepo Structure (`client/`, `server/`)** | MVP | `CONFIRMED` | Fully implemented & verified |
| **Versioned REST API (`/api/v1`)** | MVP | `CONFIRMED` | Mounted & verified |
| **Deterministic Sequence Engine (`T-001`)** | MVP | `CONFIRMED` | Atomic daily counter per doctor |
| **Zero-PII Public Tracker (`/track/:uuid`)** | MVP | `REQUIRED` | Verified with `Cache-Control: no-store` |
| **Staff RBAC (Admin, Doctor, Receptionist)** | MVP | `CONFIRMED` | JWT + bcrypt authentication |
| **QR Code Ticket Generation** | MVP | `CONFIRMED` | Base64 QR scannable data URLs |
| **SMS Notification Gating & DLT Templates** | MVP | `CONFIRMED` | Configurable templates, deterministic near-turn alert, masked logs |
| **Doctor Console Actions (Call, Skip, Complete)** | MVP | `CONFIRMED` | State transition matrix enforced |
| **Doctor Consultation Console** | MVP | `CONFIRMED` | Strict ownership, active timer, room console, call next |
| **Receptionist Walk-in Entry** | MVP | `CONFIRMED` | Direct walk-in token allocation |
| **Staff Dashboard & Queue Controls** | MVP | `CONFIRMED` | Multi-doctor tabs, 5s tab-aware polling, walk-in, RBAC |
| **Admin Clinic Analytics & Governance** | MVP | `CONFIRMED` | Live DB throughput, doctor CRUD, staff credentials, settings, audit logs |
| **Landing Page 3D Showcase (Scene A)** | Advanced | `CONFIRMED` | Strict landing isolation (lazy-loaded R3F, pinned React 18, 2D fallback) |
| **Workflow Journey 5-Station (Scene B)** | Advanced | `CONFIRMED` | Book, Confirm, Track, Notify, Consult with 3D & 2D fallback |
| **Wait-Time Simulator (Scene C)** | Advanced | `CONFIRMED` | Accessible sliders, deterministic math, 3D/2D visualizer |
| **Motion & Performance Budget (PROMPT 30)** | Advanced | `CONFIRMED` | <=250ms motion budget, canvas lifecycle cleanup, bundle analyzer, real Lighthouse audit |
| **Crowd-vs-Home Scene (Scene D)** | Advanced | `DEFERRED` | Explicitly skipped per PROMPT 29 until core testing complete |
| **Physical Receipt Printing (Thermal 80mm)** | Advanced | `OPTIONAL` | Print CSS layout for receptionist desk |
| **Department Auto-Load-Balancing** | Advanced | `TO BE DEFINED`| Shortest-queue auto assignment |
| **Native Mobile App (iOS / Android)** | Future | `FUTURE` | Out of scope for mini project |
| **Multi-Clinic Cloud Federation** | Future | `FUTURE` | Out of scope for current local clinic focus |
| **ML-Based Non-Linear Wait Prediction** | Future | `FUTURE` | CSE Data Science future research addendum |
| **WhatsApp Business API Gateway** | Future | `FUTURE` | Out of scope; requires Meta Business verification |
| **LLM Clinic Assistant Gateway** | Future | `FUTURE` | Proposed architecture addendum only |

---

## 4. Immediate Approvals Required to Unblock Milestone Execution

Before refining edge-case workflows, the following decisions must be ratified:

1. **Ratify DEC-01:** Confirm 3 specialist doctors for the model clinic demonstration.
2. **Ratify DEC-03:** Confirm 10 minutes as the default consultation benchmark.
3. **Ratify DEC-04:** Confirm 3 tokens ahead as the near-turn alert threshold.
4. **Ratify DEC-07:** Confirm manual doctor skip/recall policy over automated timeouts.
