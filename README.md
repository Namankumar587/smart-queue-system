# Smart Queue & Token System for Local Clinics

> **Academic Mini Project**  
> **Institution:** GL Bajaj Institute of Technology and Management, Greater Noida  
> **Department:** Computer Science & Engineering (Data Science)  
> **Architecture:** Decoupled Full-Stack Monorepo (Node.js/Express + React/Vite + MongoDB)

---

## 1. Project Overview & Features

The **Smart Queue & Token System** is engineered to eliminate crowded physical waiting rooms in local outpatient clinics. It provides deterministic, server-enforced queue state management, real-time wait estimation, scannable QR ticket verification, and SMS alerts under safe fallback gating.

* **Patient Booking & Scannable QR:** Patients book tokens online or at reception, receiving a scannable QR code and an unguessable tracking link.
* **Live Zero-PII Tracking:** Real-time queue tracker (`/track/:trackingUuid`) with strict `Cache-Control: no-store` headers. Strictly zero Personal Identifiable Information (name, phone, medical notes) is exposed in public payloads.
* **Deterministic Server Queue Logic:** Daily atomic sequence numbering (`T-001`, `T-002`) and dynamic wait estimations computed directly from doctor-specific consultation benchmarks.
* **Multi-Role Staff Access:** Role-Based Access Control (RBAC) with bcrypt password hashing and JWT authentication for **Doctors**, **Receptionists**, and **Administrators**.
* **SMS Gateway Isolation:** Twilio SMS dispatcher gated behind an `SMS_ENABLED` flag. The system runs seamlessly without failures when SMS is disabled (simulating notifications to stdout).

---

## 2. Monorepo Directory Tree

```
Smart Queue System for local clinics/
├── .gitignore
├── .env.example                     # Root environment variable template
├── package.json                     # Monorepo workspace configuration
├── README.md                        # Documentation and run instructions
├── client/                          # React + Vite Frontend
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css                # Custom responsive design system
│       ├── api/
│       │   └── client.js            # REST API client
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── StatusBadge.jsx
│       └── pages/
│           ├── HomePage.jsx
│           ├── BookPage.jsx
│           ├── TrackPage.jsx
│           └── LoginPage.jsx
└── server/                          # Node.js + Express Backend
    ├── .env.example
    ├── package.json
    ├── src/
    │   ├── app.js                   # Express application setup & middleware
    │   ├── server.js                # Server entrypoint & DB connection
    │   ├── config/
    │   │   ├── env.js               # Environment variables loader
    │   │   ├── db.js                # Mongoose connection & health checks
    │   │   └── constants.js         # Roles, token statuses & transitions
    │   ├── models/
    │   │   ├── User.js              # Staff accounts & bcrypt methods
    │   │   ├── Clinic.js            # Clinic information & operating hours
    │   │   ├── Doctor.js            # Doctor profiles & consult durations
    │   │   ├── Token.js             # Token entries & queue indexes
    │   │   └── Counter.js           # Daily atomic counter for sequences
    │   ├── routes/
    │   │   ├── index.js             # Versioned mount point (/api/v1)
    │   │   ├── health.routes.js     # Health check (/api/v1/health)
    │   │   ├── auth.routes.js       # Staff login (/api/v1/auth/login)
    │   │   ├── token.routes.js      # Public booking & tracking
    │   │   ├── doctor.routes.js     # Doctor queue & action routes
    │   │   ├── reception.routes.js  # Walk-in & overview routes
    │   │   └── admin.routes.js      # Clinic analytics & doctor config
    │   ├── controllers/
    │   │   ├── health.controller.js
    │   │   ├── auth.controller.js
    │   │   ├── token.controller.js
    │   │   ├── doctor.controller.js
    │   │   ├── reception.controller.js
    │   │   └── admin.controller.js
    │   ├── services/
    │   │   ├── queue.service.js     # Deterministic queue & state machine
    │   │   ├── auth.service.js      # JWT signing & validation
    │   │   ├── sms.service.js       # SMS dispatcher with flag gating
    │   │   └── qr.service.js        # Base64 QR code generator
    │   ├── middleware/
    │   │   ├── auth.middleware.js   # JWT verification & RBAC guards
    │   │   ├── error.middleware.js  # Error & 404 handlers
    │   │   └── rateLimiter.middleware.js # Express rate limiters
    │   ├── validators/
    │   │   ├── auth.validator.js    # Login payload validation
    │   │   └── token.validator.js   # Booking & action validation
    │   └── scripts/
    │       └── seed.js              # Safe academic demo seed engine
    └── tests/
        ├── health.test.js           # Endpoint integration tests
        └── queue.test.js            # Queue state transition tests
```

---

## 3. Quick Start & Execution Guide

### Prerequisites
* **Node.js:** v18+ (verified on v24.21.0)
* **MongoDB:** Local instance running on port 27017 or a remote MongoDB Atlas URI.

### Step 1: Install Dependencies
Run from the root directory:
```bash
# Install server dependencies
npm.cmd install --prefix server

# Install client dependencies
npm.cmd install --prefix client
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in the server directory (or edit values as needed):
```bash
# On Windows PowerShell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

### Step 3: Run Database Seed (Safe Demo Data)
Seeds a demo model clinic, 3 specialist doctors, and safe demonstration staff accounts:
```bash
npm.cmd run seed --workspace=server
```

### Step 4: Run Automated Tests
Execute the unit and integration test suite:
```bash
npm.cmd run test --workspace=server
```

### Step 5: Start Backend and Frontend
In separate terminal windows:
```bash
# Terminal 1 - Start Server (Port 5000)
npm.cmd run dev --workspace=server

# Terminal 2 - Start Client (Port 5173)
npm.cmd run dev --workspace=client
```

---

## 4. Academic Demo Credentials

All demonstration accounts are provisioned with the safe academic password:  
**`DemoStaff@2026!`**

| Role | Name | Email | Access |
| :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@glbitm.ac.in` | Clinic Analytics, Doctor Management |
| **Receptionist** | Front Desk Staff | `reception@glbitm.ac.in` | Walk-in Registration, Queue Monitor |
| **Doctor 1** | Dr. Priya Sharma | `priya.sharma@glbitm.ac.in` | General Medicine Console (Room 101) |
| **Doctor 2** | Dr. Amit Verma | `amit.verma@glbitm.ac.in` | Pediatrics Console (Room 102) |
| **Doctor 3** | Dr. Sneha Patel | `sneha.patel@glbitm.ac.in` | Dermatology Console (Room 103) |

---

## 5. API Reference Summary (`/api/v1`)

| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | Service, database, and SMS health check |
| `POST` | `/api/v1/auth/login` | Public | Staff login and JWT issuance |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Inspect active session profile |
| `POST` | `/api/v1/tokens/book` | Public (Rate-limited) | Patient token booking |
| `GET` | `/api/v1/tokens/track/:uuid` | Public (Zero-PII) | Live queue position & wait time |
| `GET` | `/api/v1/doctor/queue` | Doctor / Admin | Active queue for consulting doctor |
| `PATCH` | `/api/v1/doctor/tokens/:id/action` | Doctor / Admin | Advance token state (Call, Complete, Skip) |
| `POST` | `/api/v1/reception/walkin` | Receptionist / Admin | Register walk-in patient with priority |
| `GET` | `/api/v1/admin/analytics` | Admin | Aggregate throughput & wait statistics |
| `POST` | `/api/v1/assistant/patient-faq` | Public (Rate-limited) | `[OPTIONAL/FUTURE]` Grounded FAQ & read-only token lookup |
| `GET` | `/api/v1/assistant/staff-copilot` | Staff Auth (Clinic-scoped) | `[OPTIONAL/FUTURE]` Allow-listed aggregate telemetry & briefing |

---

## 6. Optional & Future Phases: Patient FAQ & Staff Copilot (PROMPT 27)

To preserve clinical focus and ensure compliance during viva examination, **Patient FAQ** and **Staff Copilot** are treated as **Optional / Future Phases** (`[FUTURE / OPTIONAL PHASE]`):

1. **Grounded Patient FAQ (`POST /api/v1/assistant/patient-faq`):**
   * **Approved Knowledge Base Only:** Answers questions exclusively from clinic-approved data (operating hours, clinic address, active specialists).
   * **Caller Token Resolution:** Reads live token wait/position *only* if the caller provides their high-entropy `trackingUuid`. Zero cross-patient enumeration.
   * **Clinical Safety Handoffs:** Queries mentioning symptoms, diagnosis, medications, medical advice, or requests for emergency priority are immediately intercepted with fixed clinic-approved instructions (e.g. *Triage Desk 101* or emergency hotline `112`), bypassing model inference completely.

2. **Staff Copilot Briefing (`GET /api/v1/assistant/staff-copilot`):**
   * **Allow-Listed Read-Only Aggregates:** Restricted strictly to `getSummary`, `getNoShowCounts`, and `getAverageServiceTime`. Zero raw patient documents, names, or phone numbers are accessed or returned.
   * **Strict Clinic Scoping:** Scoped to `req.user.clinicId` derived from the verified staff JWT. Staff cannot view other clinics' metrics.
   * **Side-by-Side Verification:** In the Staff Dashboard modal, the exact mathematical source figures (`waitingCount`, `calledCount`, `completedCount`, `noShowCount`, `avgServiceMinutes`) are rendered side-by-side with the generated narrative so staff can instantly verify accuracy.

3. **Academic Viva & Examination Defense:**
   * See [docs/VIVA_AND_OPTIONAL_PHASES.md](file:///d:/Smart%20Queue%20System%20for%20local%20clinics/docs/VIVA_AND_OPTIONAL_PHASES.md) for full viva defense strategies, architecture diagrams, and boundary definitions.

---

## 7. Academic Evaluation & Release Documentation

The repository includes comprehensive, audit-verified documentation prepared for project submission and technical viva examination:

* 📄 **Final Implementation Report:** [docs/FINAL_IMPLEMENTATION_REPORT.md](file:///d:/Smart%20Queue%20System%20for%20local%20clinics/docs/FINAL_IMPLEMENTATION_REPORT.md) — Comprehensive technical report detailing architecture, database schemas, API contracts, deterministic algorithms, security/privacy controls, and verified test metrics.
* 🎓 **Viva Preparation & Mentor Q&A Guide:** [docs/VIVA_PREPARATION_AND_MENTOR_QA.md](file:///d:/Smart%20Queue%20System%20for%20local%20clinics/docs/VIVA_PREPARATION_AND_MENTOR_QA.md) — 18 core evaluation topics structured with 20-second answers, deep technical explanations, likely follow-ups, and honest limitations.
* 👥 **Team Task Breakdown (4-Person Team):** [docs/TEAM_TASK_BREAKDOWN.md](file:///d:/Smart%20Queue%20System%20for%20local%20clinics/docs/TEAM_TASK_BREAKDOWN.md) — Parallel engineering roadmap across 4 workstreams with defined owners, deliverables, acceptance criteria, and daily smoke test protocols.
* 🚀 **Release-Readiness & Demo Rehearsal Script:** [docs/RELEASE_READINESS_AND_DEMO_SCRIPT.md](file:///d:/Smart%20Queue%20System%20for%20local%20clinics/docs/RELEASE_READINESS_AND_DEMO_SCRIPT.md) — 17-point audit checklist (All PASS), 5-minute timed demo script, and resilient offline/hardware failure contingencies.


