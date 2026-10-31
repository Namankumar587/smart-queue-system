# MongoDB & Mongoose Schema Architecture

> **Project:** Smart Queue & Token System for Local Clinics  
> **Academic Context:** GL Bajaj Institute of Technology & Management, Greater Noida  
> **Department:** Computer Science & Engineering (Data Science)  
> **Target Database:** MongoDB Atlas / Local MongoDB Engine  
> **ODM:** Mongoose v8.9.5  
> **Document Version:** 1.0.0

---

## 1. Data Architecture & Privacy Classifications

Data attributes are classified across four strict privacy tiers:

1. `PUBLIC`: Accessible on unauthenticated client views (e.g., public queue tracker, token code). Strictly devoid of patient personal data.
2. `RESTRICTED_STAFF`: Accessible only by authenticated staff (Doctors, Receptionists, Admins) via signed JWT with Role-Based Access Control.
3. `CONFIDENTIAL_PII`: Patient Personally Identifiable Information (Name, Mobile Phone, Clinical Notes). Masked in logs and prohibited from public payloads.
4. `INTERNAL_SYSTEM`: Security credentials, password hashes, and database locks. Never exposed over any HTTP route.

---

## 2. Collection Schemas & Data Dictionaries

### 2.1. `clinics` Collection
Represents physical healthcare clinics or primary health center (PHC) facilities.

| Field Name | BSON / Mongoose Type | Required | Validation & Defaults | Privacy Level | Relationships | Indexing | Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto-generated UUID | `PUBLIC` | Primary Key | Clustered Index | Permanent |
| `name` | `String` | Yes | Trimmed, 3–150 chars | `PUBLIC` | None | None | Permanent |
| `code` | `String` | Yes | Uppercase, trimmed, unique | `PUBLIC` | None | Unique Index (`code: 1`) | Permanent |
| `address` | `String` | No | Default: `""` | `PUBLIC` | None | None | Permanent |
| `phone` | `String` | No | Default: `""` | `PUBLIC` | None | None | Permanent |
| `operatingHours` | `Object` | Yes | `{ open: "08:30", close: "17:30" }` | `PUBLIC` | None | None | Permanent |
| `timezone` | `String` | Yes | Default: `"Asia/Kolkata"` | `PUBLIC` | None | None | Permanent |
| `isActive` | `Boolean` | Yes | Default: `true` | `RESTRICTED_STAFF` | None | None | Permanent |
| `createdAt` | `Date` | Yes | Auto timestamp | `INTERNAL_SYSTEM` | None | None | Permanent |
| `updatedAt` | `Date` | Yes | Auto timestamp | `INTERNAL_SYSTEM` | None | None | Permanent |

---

### 2.2. `users` Collection
Internal clinic staff accounts (Administrators, Doctors, Receptionists).

| Field Name | BSON / Mongoose Type | Required | Validation & Defaults | Privacy Level | Relationships | Indexing | Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto-generated | `INTERNAL_SYSTEM` | Primary Key | Clustered Index | Permanent |
| `name` | `String` | Yes | Trimmed, non-empty | `RESTRICTED_STAFF` | None | None | Permanent |
| `email` | `String` | Yes | Lowercase, valid email format | `RESTRICTED_STAFF` | None | Unique Index (`email: 1`) | Permanent |
| `passwordHash` | `String` | Yes | Bcrypt hash (rounds $\ge 10$). Never plaintext. | `INTERNAL_SYSTEM` | None | None | Permanent |
| `role` | `String` | Yes | Enum: `['ADMIN', 'DOCTOR', 'RECEPTIONIST']` | `RESTRICTED_STAFF` | None | Index (`role: 1`) | Permanent |
| `doctorProfileId`| `ObjectId` | No | Null for Admin/Receptionist | `RESTRICTED_STAFF` | Ref: `doctors._id` | Index (`doctorProfileId: 1`) | Permanent |
| `isActive` | `Boolean` | Yes | Default: `true` | `INTERNAL_SYSTEM` | None | None | Permanent |
| `createdAt` | `Date` | Yes | Auto timestamp | `INTERNAL_SYSTEM` | None | None | Permanent |
| `updatedAt` | `Date` | Yes | Auto timestamp | `INTERNAL_SYSTEM` | None | None | Permanent |

---

### 2.3. `doctors` Collection
Doctor profiles, departmental allocations, consulting duration benchmarks, and schedules.

| Field Name | BSON / Mongoose Type | Required | Validation & Defaults | Privacy Level | Relationships | Indexing | Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto-generated | `PUBLIC` | Primary Key | Clustered Index | Permanent |
| `clinicId` | `ObjectId` | Yes | Must reference valid Clinic | `PUBLIC` | Ref: `clinics._id` | Index (`clinicId: 1`) | Permanent |
| `doctorCode` | `String` | Yes | Uppercase, unique (e.g. `DOC-GEN-101`) | `PUBLIC` | None | Unique Index (`doctorCode: 1`) | Permanent |
| `name` | `String` | Yes | Trimmed, non-empty | `PUBLIC` | None | None | Permanent |
| `department` | `String` | Yes | Trimmed (e.g. "Pediatrics") | `PUBLIC` | None | Index (`department: 1`) | Permanent |
| `roomNumber` | `String` | Yes | Trimmed (e.g. "Room 102") | `PUBLIC` | None | None | Permanent |
| `avgConsultMinutes`| `Number`| Yes | Min: 2, Max: 60. Default: 10 | `PUBLIC` | None | None | Permanent |
| `isAvailable` | `Boolean` | Yes | Default: `true` | `PUBLIC` | None | None | Permanent |
| `schedule` | `Object` | Yes | `{ days: [String], startTime, endTime }` | `PUBLIC` | None | None | Permanent |
| `consultationStats`| `Object`| Yes | `{ totalConsultations, avgWaitMinutes }` | `RESTRICTED_STAFF` | None | None | Permanent |
| `createdAt` | `Date` | Yes | Auto timestamp | `INTERNAL_SYSTEM` | None | None | Permanent |
| `updatedAt` | `Date` | Yes | Auto timestamp | `INTERNAL_SYSTEM` | None | None | Permanent |

*Compound Index:* `{ clinicId: 1, department: 1, isAvailable: 1 }` for high-speed doctor discovery during booking.

---

### 2.4. `patients` Collection
Persistent master records for unique patients across recurring clinic visits.

| Field Name | BSON / Mongoose Type | Required | Validation & Defaults | Privacy Level | Relationships | Indexing | Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto-generated | `INTERNAL_SYSTEM` | Primary Key | Clustered Index | Permanent / 365 Days |
| `name` | `String` | Yes | Trimmed, 2–100 chars | `CONFIDENTIAL_PII` | None | None | Anonymize post-retention |
| `phone` | `String` | Yes | Trimmed user input | `CONFIDENTIAL_PII` | None | None | Anonymize post-retention |
| `normalizedPhone`| `String` | Yes | Standardized E.164 (`+919876543210`) | `CONFIDENTIAL_PII` | None | Index (`normalizedPhone: 1`) | Permanent lookup key |
| `gender` | `String` | No | Enum: `['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']` | `CONFIDENTIAL_PII` | None | None | Permanent |
| `age` | `Number` | No | 0–130 | `CONFIDENTIAL_PII` | None | None | Permanent |
| `lastVisitAt` | `Date` | No | Default: `null` | `RESTRICTED_STAFF` | None | Index (`lastVisitAt: -1`) | Auto-updated on visit |

---

### 2.5. `tokens` Collection
Central operational collection governing queue positions, state transitions, and live public tracking.

| Field Name | BSON / Mongoose Type | Required | Validation & Defaults | Privacy Level | Relationships | Indexing | Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto-generated | `INTERNAL_SYSTEM` | Primary Key | Clustered Index | 90 Days / Term |
| `clinicId` | `ObjectId` | Yes | References Clinic | `PUBLIC` | Ref: `clinics._id` | Index (`clinicId: 1`) | 90 Days |
| `doctorId` | `ObjectId` | Yes | References Doctor | `PUBLIC` | Ref: `doctors._id` | Compound Queue Index | 90 Days |
| `patientId` | `ObjectId` | Yes | References Patient | `RESTRICTED_STAFF` | Ref: `patients._id` | Index (`patientId: 1`) | 90 Days |
| `patientName` | `String` | Yes | Denormalized display name | `CONFIDENTIAL_PII` | None | None | Mask after 30 days |
| `patientPhone` | `String` | Yes | Denormalized contact | `CONFIDENTIAL_PII` | None | None | Mask after 30 days |
| `normalizedPhone`| `String` | Yes | Standardized phone string | `CONFIDENTIAL_PII` | None | Index (`normalizedPhone: 1`)| Mask after 30 days |
| `date` | `String` | Yes | Format: `YYYY-MM-DD` | `PUBLIC` | None | Compound Queue Index | 90 Days |
| `sequenceNumber` | `Number` | Yes | Sequential per-doctor daily integer (1, 2, ...) | `PUBLIC` | None | Unique Daily Index | 90 Days |
| `tokenNumber` | `String` | Yes | E.g. `T-001`, `T-002` | `PUBLIC` | None | None | 90 Days |
| `displayCode` | `String` | Yes | E.g. `DOC-GEN-101-001` | `PUBLIC` | None | None | 90 Days |
| `trackingUuid` | `String` | Yes | RFC4122 v4 UUID (Unguessable) | `PUBLIC` | None | Unique Index (`trackingUuid: 1`)| 90 Days |
| `activeBookingKey`| `String` | No | `${doctorId}_${date}_${normalizedPhone}` | `INTERNAL_SYSTEM` | None | Partial Unique Index | Cleared on terminal state |
| `priority` | `String` | Yes | Enum: `['STANDARD', 'ELDERLY', 'EMERGENCY_WALKIN']` | `PUBLIC` | None | Compound Queue Index | 90 Days |
| `priorityRank` | `Number` | Yes | 10 (Urgent), 5 (Elderly), 1 (Standard) | `PUBLIC` | None | Compound Queue Index | 90 Days |
| `source` | `String` | Yes | Enum: `['ONLINE', 'WALKIN']` | `RESTRICTED_STAFF` | None | None | 90 Days |
| `status` | `String` | Yes | Enum: `['WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'CANCELLED']` | `PUBLIC` | None | Compound Queue Index | 90 Days |
| `bookedAt` | `Date` | Yes | Default: `Date.now` | `PUBLIC` | None | None | 90 Days |
| `calledAt` | `Date` | No | Timestamp when token marked CALLED | `PUBLIC` | None | None | 90 Days |
| `startedConsultationAt`|`Date`| No | Timestamp when marked IN_CONSULTATION | `PUBLIC` | None | None | 90 Days |
| `completedAt` | `Date` | No | Timestamp when marked COMPLETED | `PUBLIC` | None | None | 90 Days |
| `skippedAt` | `Date` | No | Timestamp when marked SKIPPED | `RESTRICTED_STAFF` | None | None | 90 Days |
| `cancelledAt` | `Date` | No | Timestamp when marked CANCELLED | `RESTRICTED_STAFF` | None | None | 90 Days |
| `estimatedWaitMinutes`|`Number`| Yes | Calculated dynamic wait time | `PUBLIC` | None | None | 90 Days |
| `notes` | `String` | No | Patient reason / receptionist notes | `CONFIDENTIAL_PII` | None | None | Mask after 30 days |

#### Token Indexes
1. **Compound Low-Latency Queue Ordering Index:**
   ```javascript
   { doctorId: 1, date: 1, status: 1, priorityRank: -1, createdAt: 1 }
   ```
   *Rationale:* Directly satisfies the doctor dashboard queue sort query without in-memory sorting.
2. **Unique Daily Sequence Index:**
   ```javascript
   { doctorId: 1, date: 1, sequenceNumber: 1 }, { unique: true }
   ```
   *Rationale:* Enforces that no two tokens can ever share the same sequence integer under parallel bookings.
3. **Unique Public Opaque Tracking Index:**
   ```javascript
   { trackingUuid: 1 }, { unique: true }
   ```
   *Rationale:* Enables sub-millisecond lookup on public tracking links with zero PII exposure.

---

### 2.6. `counters` Collection
Atomic daily sequence generation per doctor.

| Field Name | BSON / Mongoose Type | Required | Validation & Defaults | Privacy Level | Relationships | Indexing | Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto-generated | `INTERNAL_SYSTEM` | Primary Key | Clustered Index | 90 Days |
| `key` | `String` | Yes | `doc_${doctorId}_${YYYY-MM-DD}` | `INTERNAL_SYSTEM` | None | Unique Index (`key: 1`) | 90 Days |
| `sequenceDate` | `String` | Yes | `YYYY-MM-DD` | `INTERNAL_SYSTEM` | None | None | 90 Days |
| `currentSeq` | `Number` | Yes | Incremented atomically via `$inc` | `INTERNAL_SYSTEM` | None | None | 90 Days |

---

### 2.7. `notifications` Collection
Audit log of all SMS messages, turn alerts, and confirmation notifications.

| Field Name | BSON / Mongoose Type | Required | Validation & Defaults | Privacy Level | Relationships | Indexing | Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto-generated | `INTERNAL_SYSTEM` | Primary Key | Clustered Index | 60 Days |
| `tokenId` | `ObjectId` | No | Associated token | `RESTRICTED_STAFF` | Ref: `tokens._id` | Index (`tokenId: 1`) | 60 Days |
| `recipientPhone` | `String` | Yes | Normalized phone number | `CONFIDENTIAL_PII` | None | Compound Index | 60 Days |
| `channel` | `String` | Yes | Enum: `['SMS', 'IN_APP', 'WHATSAPP_FUTURE']` | `RESTRICTED_STAFF` | None | None | 60 Days |
| `type` | `String` | Yes | Enum: `['BOOKING_CONFIRMATION', 'TURN_ALERT', 'NOW_CALLING', 'RECALLED', 'CANCELLED']` | `RESTRICTED_STAFF` | None | None | 60 Days |
| `message` | `String` | Yes | Text content of notification | `RESTRICTED_STAFF` | None | None | 60 Days |
| `status` | `String` | Yes | Enum: `['SIMULATED', 'SENT', 'FAILED', 'DELIVERED']` | `RESTRICTED_STAFF` | None | None | 60 Days |
| `providerMessageId`|`String` | No | Twilio SID | `INTERNAL_SYSTEM` | None | None | 60 Days |
| `sentAt` | `Date` | Yes | Default: `Date.now` | `RESTRICTED_STAFF` | None | Compound Index | 60 Days |
| `error` | `String` | No | Provider failure message | `INTERNAL_SYSTEM` | None | None | 60 Days |

*Compound Index:* `{ recipientPhone: 1, sentAt: -1 }` for customer support delivery lookups.

---

### 2.8. `auditLogs` Collection
Immutable append-only operational and administrative event ledger.

| Field Name | BSON / Mongoose Type | Required | Validation & Defaults | Privacy Level | Relationships | Indexing | Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto-generated | `INTERNAL_SYSTEM` | Primary Key | Clustered Index | 180 Days |
| `action` | `String` | Yes | E.g. `TOKEN_CALLED`, `TOKEN_COMPLETED`, `DOCTOR_UPDATED` | `RESTRICTED_STAFF` | None | Index (`action: 1`) | 180 Days |
| `performedBy` | `ObjectId` | No | Null for public patient actions | `RESTRICTED_STAFF` | Ref: `users._id` | None | 180 Days |
| `performedByRole`| `String` | Yes | Enum: `['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT_PUBLIC', 'SYSTEM']` | `RESTRICTED_STAFF` | None | None | 180 Days |
| `targetType` | `String` | Yes | Enum: `['TOKEN', 'DOCTOR', 'CLINIC', 'USER', 'SYSTEM']` | `RESTRICTED_STAFF` | None | Compound Index | 180 Days |
| `targetId` | `ObjectId` | No | ID of affected entity | `RESTRICTED_STAFF` | None | Compound Index | 180 Days |
| `details` | `Mixed` | Yes | JSON payload of changes | `RESTRICTED_STAFF` | None | None | 180 Days |
| `ipAddress` | `String` | No | Client IP address | `INTERNAL_SYSTEM` | None | None | 180 Days |
| `userAgent` | `String` | No | Browser/device string | `INTERNAL_SYSTEM` | None | None | 180 Days |
| `timestamp` | `Date` | Yes | Default: `Date.now` | `RESTRICTED_STAFF` | None | Compound Index | 180 Days |

*Compound Index:* `{ targetType: 1, targetId: 1, timestamp: -1 }` for entity audit history reconstruction.

---

## 3. Concurrency Strategy: Duplicate Active-Booking Prevention

### The Technical Limitation of MongoDB Partial Indexes
A common naive design is to attempt a partial unique index on `{ doctorId: 1, date: 1, normalizedPhone: 1 }` with an expression such as:
```javascript
// ILLEGAL IN MONGODB - THROWS MongoServerError
partialFilterExpression: { status: { $in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] } }
```
> **Critical Truth:** MongoDB's `partialFilterExpression` **strictly forbids** `$in`, `$or`, and non-equality multi-value expressions. Claiming that a partial filter index can check `{ status: { $in: [...] } }` is false and will fail in production.

### The Adopted Deterministic Solution: Atomic `activeBookingKey` Pattern
To guarantee 100% concurrency safety without heavy distributed locks or cross-collection multi-document transactions, the architecture implements the **`activeBookingKey` string lock pattern**:

1. **Schema Definition:**
   ```javascript
   tokenSchema.index(
     { activeBookingKey: 1 },
     {
       unique: true,
       partialFilterExpression: {
         activeBookingKey: { $type: 'string' }
       }
     }
   );
   ```
2. **Active State Representation:**
   When a token is created in an active state (`WAITING`, `CALLED`, or `IN_CONSULTATION`), `activeBookingKey` is populated with a composite string:
   $$\text{activeBookingKey} = \text{doctorId} + \text{"\_"} + \text{YYYY-MM-DD} + \text{"\_"} + \text{normalizedPhone}$$
3. **Storage Engine Uniqueness Guarantee:**
   Because `activeBookingKey` is a string, the partial filter `{ activeBookingKey: { $type: "string" } }` indexes the document. Any concurrent booking request for the exact same patient phone with the same doctor on the same day triggers an immediate MongoDB `E11000 duplicate key error` at the wiredTiger storage engine level.
4. **Transition to Inactive/Terminal State:**
   When the token reaches `COMPLETED`, `CANCELLED`, or `SKIPPED`, the state transition atomically sets:
   $$\text{activeBookingKey} \leftarrow \text{null}$$
   Because `null` is not of BSON type `"string"`, the document is excluded from the unique index. This allows the patient to legitimately book a subsequent consultation on the same day if their previous visit is completed, while preventing dual-queue hogging while active.

---

## 4. Fake Demonstration Seed Data Inventory

All seed records use explicitly fake demographic names and dummy numbers to prevent PII exposure:

* **Demo Clinic:** `GL Bajaj Community Health Center (Model Demo)` (`GLB-CLINIC-DEMO`)
* **Fake Specialist Doctors:**
  * `DOC-GEN-101`: Dr. Priya Sharma (Demo) — General Medicine, Room 101 (Avg: 10 min)
  * `DOC-PED-102`: Dr. Amit Verma (Demo) — Pediatrics, Room 102 (Avg: 12 min)
  * `DOC-DERM-103`: Dr. Sneha Patel (Demo) — Dermatology, Room 103 (Avg: 15 min)
* **Fake Demo Patients:**
  * `+919999900001`: Aarav Patel (Fake Demo Patient), Age 28, Male
  * `+919999900002`: Sunita Rao (Fake Demo Senior Citizen), Age 68, Female
  * `+919999900003`: Kabir Mehta (Fake Demo Emergency Walkin), Age 34, Male
* **Staff Password (Bcrypt Hash, Salt Rounds = 10):**
  * Safe academic password: `DemoStaff@2026!` (Configurable via `SEED_DEFAULT_PASSWORD`)
  * Accounts: `admin@glbitm.ac.in`, `reception@glbitm.ac.in`, and linked doctor emails.
* **Seeded Active Tokens:**
  * `T-001` (`DOC-GEN-101-001`): Senior Citizen Walk-in (`11111111-1111-4111-8111-111111111111`)
  * `T-002` (`DOC-GEN-101-002`): Standard Online Booking (`22222222-2222-4222-8222-222222222222`)
