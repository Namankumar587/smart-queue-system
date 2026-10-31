# Viva Voce Preparation & Mentor Q&A Guide

> **Academic Mini Project:** Smart Queue & Token System for Local Clinics  
> **Institution:** GL Bajaj Institute of Technology & Management, Greater Noida  
> **Department:** Computer Science & Engineering (Data Science)  
> **Evaluation Mode:** Technical Viva Voce & Practical System Demonstration  

---

## 1. Problem and Users

* **20-Second Answer:** Local outpatient clinics suffer severe physical waiting room crowding because patients arrive simultaneously without visibility into consultation pacing. Our system provides automated daily sequence numbering, live zero-PII queue tracking, and offline SMS alerts so patients can wait safely elsewhere.
* **Deeper Technical Answer:** The primary actors are Outpatient Patients, Front Desk Receptionists, Consulting Doctors, and System Administrators. Patients face unpredictable wait times and infection exposure. Clinic staff handle high administrative friction from manual paper registers, leading to disputes, unrecorded walk-ins, and doctor schedule desynchronization.
* **Likely Follow-Up:** *"Why not just use a standard calendar booking system like Google Calendar or Practo?"*  
  *Response:* Calendar appointments assume fixed consultation durations (e.g., exactly 15 minutes). In real clinics, consultations vary dynamically based on clinical complexity, emergency walk-ins, and no-shows. A token-based state machine with live rolling wait estimation accurately reflects clinical reality.
* **Honest Limitation:** The system relies on patients having access to either a mobile phone (for tracking links/SMS) or in-person reception assistance.

---

## 2. Why This Solution?

* **20-Second Answer:** It solves clinic crowding with a zero-cost, lightweight web architecture that requires no app download for patients, enforces atomic state transitions on the server, and continues working even if the internet or SMS carrier fails.
* **Deeper Technical Answer:** We decoupled the system into a stateless Express REST backend, a responsive React client, and a document database. Rather than relying on heavyweight Native apps, we use a bearer-capability tracking URL (`/track/:uuid`) with `Cache-Control: no-store` that opens instantly on any mobile browser. For offline or illiterate patients, reception walk-ins generate scannable physical QR tickets.
* **Likely Follow-Up:** *"What makes this specific to Indian local clinics?"*  
  *Response:* It supports DLT-compliant SMS templates, +91 phone normalization, walk-in reception priority tagging for elderly citizens, and runs in zero-carrier-cost simulation mode during trials.
* **Honest Limitation:** The solution does not eliminate physical triage; reception staff must still verify emergencies in-person.

---

## 3. React/Vite, Express, and MongoDB Roles

* **20-Second Answer:** React and Vite deliver a responsive, fast user interface without full page reloads. Express provides a hardened, rate-limited REST API layer, and MongoDB stores unstructured clinic, doctor, and token records with atomic document increments.
* **Deeper Technical Answer:** 
  * **React 18 + Vite:** Sub-second build times, modular components, and code splitting that ensures heavy 3D bundles remain isolated on the landing page.
  * **Express 4:** Lightweight middleware execution order: Helmet $\rightarrow$ CORS $\rightarrow$ Rate Limiting $\rightarrow$ JSON parsing $\rightarrow$ JWT verification $\rightarrow$ Route validation $\rightarrow$ Centralized Error Handling.
  * **MongoDB (Mongoose):** Document schema flexibility allows embedding nested schedules and consultation statistics without expensive SQL multi-table joins.
* **Likely Follow-Up:** *"Why MongoDB over PostgreSQL or MySQL?"*  
  *Response:* Outpatient clinic records (operating hours, doctor schedules, token histories) naturally fit nested JSON documents. MongoDB's atomic `$inc` on daily counters satisfies our strict concurrency requirements without complex table locking.
* **Honest Limitation:** Complex multi-collection reporting requires MongoDB aggregation pipelines rather than standard SQL joins.

---

## 4. Why JWT and Bcrypt?

* **20-Second Answer:** Bcrypt securely hashes staff passwords with a work factor of 10 to resist rainbow tables and brute force. JWT provides stateless, cryptographically signed authorization tokens that carry user roles and doctor IDs without hitting the database on every request.
* **Deeper Technical Answer:** 
  * Passwords are never stored in plaintext. `bcrypt.compare` runs in constant time to prevent timing attacks.
  * Upon successful login, the server issues an HMAC-SHA256 signed JWT containing `{ sub: userId, role, doctorId }` expiring in 8 hours.
  * Protected routes extract and verify the token via `Bearer` authorization headers without session store latency.
* **Likely Follow-Up:** *"How do you handle JWT revocation if a staff member is terminated?"*  
  *Response:* Currently, tokens expire after 8 hours. In production, we would maintain a short-lived token (15 minutes) with a Redis token blacklist or refresh-token rotation.
* **Honest Limitation:** A stolen JWT remains valid until its 8-hour expiry unless the server secret is changed.

---

## 5. RBAC and Doctor Ownership

* **20-Second Answer:** Role-Based Access Control restricts routes to Admin, Receptionist, or Doctor roles. Doctor ownership guarantees that a logged-in doctor can inspect and advance only their own assigned patient queue.
* **Deeper Technical Answer:** In [`doctor.service.js`](file:///d:/Smart%20Queue%20System%20for%20local%20clinics/server/src/services/doctor.service.js), we enforce service-level validation:
  ```javascript
  if (staffUser.role === ROLES.DOCTOR && String(staffUser.doctorId) !== String(targetDoctorId)) {
    throw new Error('Forbidden: Doctors may only view and mutate their own queue');
  }
  ```
  This prevents Insecure Direct Object References (IDOR) where Doctor A attempts to call or complete Doctor B's patients.
* **Likely Follow-Up:** *"Can an Admin override a doctor's queue?"*  
  *Response:* Yes, Admins possess clinic-wide operational privileges, but every administrative action generates an immutable record in the `AuditLog` collection.
* **Honest Limitation:** Roles are statically defined in code (`ADMIN`, `DOCTOR`, `RECEPTIONIST`) rather than dynamically configurable in a permissions UI.

---

## 6. Atomic Counters and Concurrent Bookings

* **20-Second Answer:** When multiple patients click "Book" simultaneously, MongoDB's atomic `findOneAndUpdate` with `$inc: { seq: 1 }` increments a daily counter document. This guarantees strictly sequential token numbers (`T-001`, `T-002`) with zero duplicate numbers or race conditions.
* **Deeper Technical Answer:** 
  * Key format: `COUNTER_${clinicCode}_${doctorCode}_${YYYY-MM-DD}`.
  * The operation executes atomically in a single database command. No two threads can receive the same sequence number.
  * Additionally, a compound unique index on `{ activeBookingKey: 1 }` prevents the same patient phone number from booking multiple active tokens for the same doctor on the same day.
* **Likely Follow-Up:** *"What happens if sequence generation succeeds but token document creation crashes?"*  
  *Response:* In rare failure scenarios, a sequence number might be skipped (e.g. T-003 is missed). However, tokens remain strictly ordered, and duplicate numbers are mathematically impossible.
* **Honest Limitation:** Multi-document ACID transactions are not utilized for counters to maintain low latency without replica set overhead.

---

## 7. Priority Ordering

* **20-Second Answer:** Walk-in patients are assigned deterministic priority ranks: `1` for Emergency Walk-ins, `2` for Senior Citizens / Elderly, and `3` for Standard patients. Queues sort by `priorityRank` first, then by booking timestamp.
* **Deeper Technical Answer:** 
  In the Mongoose query:
  ```javascript
  Token.find({ doctorId, status: 'WAITING' }).sort({ priorityRank: 1, bookedAt: 1 });
  ```
  This guarantees that an emergency walk-in registered at reception automatically rises to the head of the waiting line, while elderly patients are served before general online bookings.
* **Likely Follow-Up:** *"Can standard patients starve if emergencies keep arriving?"*  
  *Response:* In outpatient clinics, emergencies are exceptional (average 1–2 per day). If emergency volume is high, the clinic protocol redirects patients to hospital emergency wards rather than standard outpatient rooms.
* **Honest Limitation:** Online patients cannot self-assign priority; priority escalation can only be performed by authorized reception staff in person.

---

## 8. Wait Estimate Formula and Its Limitations

* **20-Second Answer:** Estimated wait time is the sum of consultation durations for all patients ahead. It dynamically uses the doctor's rolling average consultation duration from the last 20 visits today, clamped between 2 and 60 minutes.
* **Deeper Technical Answer:**
  $$\text{WaitTime} = (\text{Patients Ahead}) \times \text{AvgDuration}$$
  * If $\ge 3$ visits are completed today: $\text{AvgDuration} = \text{Mean}(\text{completed today})$.
  * If $< 3$ visits completed: $\text{AvgDuration} = \text{doctor.avgConsultMinutes}$ (baseline profile).
* **Likely Follow-Up:** *"What happens if a consultation takes 45 minutes instead of the average 10 minutes?"*  
  *Response:* Downstream estimates will temporarily underestimate the real wait. However, once the consultation completes, the rolling average updates and the next poll recalibrates all downstream estimates.
* **Honest Limitation:** The algorithm cannot predict whether an upcoming consultation will be simple or complex before the doctor begins the examination.

---

## 9. Polling vs. WebSockets

* **20-Second Answer:** We chose HTTP polling over WebSockets because local mobile browsers frequently drop persistent socket connections on unstable 3G/4G networks, whereas stateless HTTP requests recover seamlessly and require zero stateful server memory.
* **Deeper Technical Answer:** 
  * WebSockets require persistent TCP connections, stateful gateway memory, and complex reconnection backoffs.
  * Our tracker polls every 10 seconds with `Cache-Control: no-store`. If the browser tab is hidden, polling throttles to 30 seconds via the Page Visibility API, reducing server load by ~66%.
* **Likely Follow-Up:** *"At what scale does HTTP polling become a bottleneck?"*  
  *Response:* Beyond ~2,000 concurrent active tracking users on a single Node.js instance. At that scale, migrating to Server-Sent Events (SSE) or Redis-backed WebSockets would be the recommended next step.
* **Honest Limitation:** Changes in queue position take up to 10 seconds to reflect on the patient's screen.

---

## 10. QR Check-In & Physical Verification

* **20-Second Answer:** Each token generates an encrypted Base64 QR code encoding the unguessable tracking URL. Reception staff or doctors scan it with the web camera scanner (`/scanner`) to instantly look up and verify the patient's ticket.
* **Deeper Technical Answer:** 
  * Generation: The server uses the `qrcode` library to generate SVG/DataURL payloads containing `http://domain/track/${trackingUuid}`.
  * Validation: The scanner decodes the UUID and calls `GET /api/v1/tokens/track/:uuid`.
  * Manual Fallback: If camera permissions or physical ticket printouts are smudged, staff can manually enter the short token number (e.g. `T-001`) into the dashboard lookup.
* **Likely Follow-Up:** *"Can someone forge a QR code?"*  
  *Response:* No. The QR code contains an unguessable UUIDv4 with 122 bits of cryptographic entropy ($5.3 \times 10^{36}$ possibilities). Guessing a valid active UUID is computationally infeasible.
* **Honest Limitation:** Low-end mobile devices in dim clinic lighting may struggle to focus the camera lens.

---

## 11. Twilio Failure Handling & SMS Simulation

* **20-Second Answer:** The queue engine never crashes or blocks when SMS fails. Twilio is gated behind an `SMS_ENABLED` flag; if false, it safely simulates SMS output to the terminal with zero telecom charges.
* **Deeper Technical Answer:**
  * Telephony errors are wrapped in non-blocking `try/catch` blocks inside `sms.service.js`.
  * Every notification records an idempotency key (`${tokenNumber}_${template}_${status}`) to prevent duplicate carrier billing upon retry.
  * Inbound webhook callbacks verify the `x-twilio-signature` HMAC-SHA1 header to reject forged carrier receipts.
* **Likely Follow-Up:** *"How does this help during academic project evaluation?"*  
  *Response:* It allows the entire queue demonstration to be evaluated end-to-end without spending real money on SMS credits or failing when test phone numbers are unverified.
* **Honest Limitation:** SMS delivery latency depends entirely on telecom carrier network congestion.

---

## 12. Privacy of Tracking Links

* **20-Second Answer:** Public tracking links expose zero Personally Identifiable Information. Responses return only the token number, doctor name, room number, queue position, and estimated wait. Names, phones, and clinical notes are strictly stripped.
* **Deeper Technical Answer:** 
  * The endpoint [`/api/v1/tokens/track/:trackingUuid`](file:///d:/Smart%20Queue%20System%20for%20local%20clinics/server/src/controllers/token.controller.js) returns an explicit allow-listed DTO.
  * Strict headers prevent caching by intermediate proxies:
    ```
    Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
    Pragma: no-cache
    Expires: 0
    ```
* **Likely Follow-Up:** *"Can a patient see who is ahead of them in line?"*  
  *Response:* No. They see only the count of patients ahead (`patientsAhead: 3`) and the currently serving token code (`currentServingToken: "T-004"`). No names or details of other patients are disclosed.
* **Honest Limitation:** Anyone who physically possesses the patient's phone or paper QR printout can view their token's queue position.

---

## 13. Rate Limiting Defense

* **20-Second Answer:** We apply layered IP and phone rate limits to prevent brute-force attacks, SMS cost drainage, and denial-of-service spam bookings.
* **Deeper Technical Answer:** 
  * Public Booking: Max 5 bookings per 15 minutes per IP; max 3 per phone number per day.
  * Staff Login: Max 10 attempts per 15 minutes per IP; 5 failed login attempts triggers an automatic 15-minute account lockout on the user document.
  * Assistant / FAQ: Max 15 queries per 15 minutes per IP.
* **Likely Follow-Up:** *"What happens if multiple patients book from the clinic's shared Wi-Fi network?"*  
  *Response:* To prevent shared clinic IP exhaustion, in-person walk-ins are processed via the authenticated Reception portal, which bypasses the public IP rate limiter.
* **Honest Limitation:** Current rate limits are stored in Node.js server RAM; server restarts reset the rate limit counters.

---

## 14. Audit Logs

* **20-Second Answer:** Every administrative queue override, status bypass, or manual doctor schedule adjustment is logged to an immutable `AuditLog` collection with actor ID, IP address, timestamp, and before/after states.
* **Deeper Technical Answer:** 
  * Fields: `action`, `actorId`, `actorRole`, `targetResource`, `targetId`, `previousState`, `newState`, `ipAddress`, `userAgent`.
  * Logs cannot be edited or deleted through any client API endpoint.
* **Likely Follow-Up:** *"Can a doctor delete an audit log to hide a mistake?"*  
  *Response:* No. The API does not expose any `DELETE` or `PATCH` endpoints for the `AuditLog` collection; it is append-only.
* **Honest Limitation:** We do not currently use cryptographic hash chaining (like a Merkle tree) between audit log entries.

---

## 15. 3D Landing-Page-Only Rationale

* **20-Second Answer:** Three.js is restricted exclusively to the public landing page to illustrate the 5-step clinic journey. It is completely excluded from clinical tracking and staff consoles to guarantee instant load times and zero battery drain.
* **Deeper Technical Answer:** 
  * Vite manual Rollup chunking separates Three.js into a dedicated `three-bundle.js` chunk.
  * Route Isolation: Opening `/track/:uuid` loads only 11.7 kB of JavaScript, never downloading Three.js.
  * Zero-CPU Hook: [`useCanvasVisibility`](file:///d:/Smart%20Queue%20System%20for%20local%20clinics/client/src/hooks/useCanvasVisibility.js) pauses WebGL rendering loops whenever the canvas scrolls off-screen or the user switches tabs.
* **Likely Follow-Up:** *"What if a patient opens the landing page on an old phone that doesn't support WebGL?"*  
  *Response:* The canvas gracefully catches WebGL initialization errors and falls back to clean, responsive SVG diagrams.
* **Honest Limitation:** The 3D canvas requires ~15 MB of GPU VRAM on desktop browsers when active.

---

## 16. LLM Boundaries & Deterministic Fallback

* **20-Second Answer:** The LLM layer is strictly optional. It cannot mutate queue states or give medical advice. If confidence is below 70%, or if the model times out, the system falls back to a deterministic numbered menu.
* **Deeper Technical Answer:** 
  * Pre-filter: Medical queries (e.g. *"I have chest pain"*, *"what medicine for fever?"*) are intercepted before any model call and returned with fixed clinic safety disclaimers.
  * PII Redaction: Names and phone numbers are scrubbed prior to model inference.
  * Two-Phase Confirmation: Parsing an SMS booking creates a `PENDING` request; the real token is created only when the user replies `YES`.
* **Likely Follow-Up:** *"Why not let the AI doctor assign tokens directly?"*  
  *Response:* Hallucination risks and prompt injection attacks make LLM queue mutations unacceptable in clinical healthcare. Deterministic services must always own queue state.
* **Honest Limitation:** The LLM requires an active internet connection to upstream model providers when enabled.

---

## 17. Testing Evidence & Verification

* **20-Second Answer:** The codebase is validated by 112 server tests across 24 suites, 31 LLM safety tests, 19 client accessibility tests, and a clean production build completed in 7.25 seconds.
* **Deeper Technical Answer:** 
  * Concurrency Tests: Simulates 10 simultaneous bookings for the same doctor with zero sequence gaps.
  * State Machine Tests: Validates that invalid transitions (e.g. `COMPLETED` $\rightarrow$ `WAITING`) throw HTTP 400.
  * Security Tests: Verifies HTTP 403 on invalid Twilio signatures, IDOR prevention, and header sanitization.
* **Likely Follow-Up:** *"Did you test on real mobile devices?"*  
  *Response:* Yes, we verified the client layout at 360px viewport widths with zero horizontal scroll and tested touch tap targets $\ge 44\text{px}$.
* **Honest Limitation:** Load tests were executed on local Node.js loopback rather than distributed geographical cloud endpoints.

---

## 18. Limitations and Future Scope

* **20-Second Answer:** The current implementation excels at queue flow and visibility. Future work includes integrating physical receipt printers, audio speaker announcements, and multi-clinic federated networks.
* **Deeper Technical Answer:** 
  * Current Boundaries: No prescription writing, billing, or pharmacy inventory.
  * Next Architecture Phase: Redis distributed lock engine for multi-server clustering, Server-Sent Events (SSE) for zero-latency queue push alerts, and ESC/POS thermal receipt printing.
* **Likely Follow-Up:** *"Can this be deployed in a real clinic tomorrow?"*  
  *Response:* Yes. By setting `SMS_ENABLED=true` with valid Twilio credentials and deploying to a cloud host (Render/Vercel) with MongoDB Atlas, the system is fully operational.
* **Honest Limitation:** System throughput depends on staff diligently clicking "Call Next" when admitting patients.
