# Viva Examination Guide: Optional Phases & Future Features

## Topic: Patient FAQ and Staff Copilot (PROMPT 27)

> **Feature Classification: `[OPTIONAL / FUTURE PHASE]`**  
> Both the **Patient FAQ** and **Staff Copilot** are designed as optional, read-only later-phase features. They demonstrate how generative capabilities can be safely integrated into clinical queue operations without compromising patient privacy, medical ethics, or system availability.

---

### 1. Patient FAQ Architecture & Safeguards

#### Grounding & Data Boundaries
* **Permitted Grounding Sources:**
  1. **Approved Clinic Knowledge Base (`CLINIC_KB`):** Clinic operating hours (Mon–Fri 08:30–17:30, Sat 09:00–14:00, Sun Closed), clinic address, active specialist rosters, and general appointment booking rules.
  2. **Caller's Own Read-Only Token Status (`CALLER_TOKEN_STATUS`):** If the patient provides their tracking UUID, the system resolves only their own token code, position ahead, and estimated wait minutes.
* **Strict Exclusion of Other Patients:**
  * No lookup by phone number or name is allowed through public chat.
  * Patients cannot enumerate or view other tokens.

#### Critical Medical Safety Invariants
1. **Zero Medical Advice or Diagnosis:**
   * Inquiries about drug dosage, prescriptions, symptoms, or home remedies immediately trigger the fixed clinic disclaimer:
     > *"This automated service is for queue status and appointment booking only. We cannot provide medical advice, diagnosis, or prescriptions over SMS/chat. Please book a consultation with our licensed doctors or visit the clinic in person."*
2. **Zero Emergency Triage over Chat:**
   * Any mention of emergency symptoms (chest pain, shortness of breath, heavy bleeding, sudden unconsciousness, seizures) halts any model invocation and returns the fixed emergency protocol directing the patient to emergency triage (dial 112/108 or proceed to 24/7 Triage Room 101).
3. **Rejection of Automated Emergency Prioritisation:**
   * Patients cannot request priority escalations or queue bypasses through automated chat. All clinical prioritisation is conducted in-person by staff at Triage Desk 101.

---

### 2. Staff Copilot Architecture & Safeguards

#### Data Scoping & Read-Only Invariant
* **Strict Authentication:** Only authenticated staff members (`RECEPTIONIST`, `DOCTOR`, `ADMIN`) can invoke the copilot.
* **Clinic-Level Scoping:** Queries are strictly bound to `req.user.clinicId`. A staff member from Clinic A cannot view data from Clinic B.
* **Allow-listed Read-Only Aggregate Functions Only:**
  1. `getSummary(clinicId, date)`: Counts of WAITING, CALLED, COMPLETED, CANCELLED, and SKIPPED tokens for today.
  2. `getNoShowCounts(clinicId, date)`: Aggregation of cancelled and skipped visits.
  3. `getAverageServiceTime(clinicId, date)`: Mean consultation duration computed exclusively across completed tokens.

#### Verifiable Source Numbers Beside Generated Narrative
* **The "Zero Guesswork" Display Rule:**
  * The copilot response returns the exact raw database aggregate metrics side-by-side with the natural language summary.
  * Staff can immediately cross-reference every sentence against the verified database numbers displayed on the left.
* **Zero Raw Patient Rows:**
  * Copilot pipelines execute MongoDB `$group` and `$count` pipelines.
  * Individual patient rows, patient names, phone numbers, and individual token records are never returned to the LLM or exposed in the response.

---

### 3. Key Viva / Examiner Q&A

**Q1: Why are Patient FAQ and Staff Copilot labeled as `[OPTIONAL / FUTURE PHASE]`?**  
*Answer:* In clinical and high-reliability queue management, deterministic core operations (booking, token state machine, physical displays) take absolute priority. Generative assistants are treated as optional auxiliary layers with strict isolation, so that any failure, hallucination, or outage of an LLM provider has zero impact on live patient flow or reception desks.

**Q2: How do you prevent the Staff Copilot from hallucinating operational statistics?**  
*Answer:* The LLM never calculates numbers or queries the database directly. All numbers are pre-computed deterministically by allow-listed aggregate functions (`getSummary`, `getNoShowCounts`, `getAverageServiceTime`). The UI renders the verified source numbers side-by-side with the narrative so staff can instantly verify accuracy.

**Q3: How do you ensure patients don't use the FAQ assistant for medical emergency triage?**  
*Answer:* A deterministic prefilter regex evaluates all inputs **before** any model call. If emergency keywords (e.g. chest pain, breathing difficulty, bleeding) or medical advice queries are detected, the system immediately returns a fixed clinic-approved instruction directing the patient to emergency services or in-person triage, consuming 0 LLM tokens and preventing automated triage liability.
