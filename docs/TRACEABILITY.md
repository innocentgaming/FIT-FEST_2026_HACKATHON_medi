# MediLink CARE — Requirements & System Traceability Matrix

This document maps every requirement from the **Product Requirements Document (PRD)** and technical workflows to the corresponding API endpoint, Database collection, UI component, RBAC permissions, and automated test cases.

---

## 1. Traceability Matrix

| PRD Requirement | INF Workflow | API Endpoint | Database Entity | UI Screen / Component | RBAC Permissions | Automated Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01: Unified Authentication** | Login with email/phone & password | `POST /api/login` | `users` | `AuthView.jsx` | Public / All Roles | `test/api.test.js`: Test 3 |
| **REQ-02: Patient Registration** | Register patient profile | `POST /api/patient/register` | `users` | `AuthView.jsx` (Register Tab) | Public | `test/api.test.js`: Test 3 |
| **REQ-03: Ambulance Registration** | Register vehicle & driver | `POST /api/ambulance/register` | `users`, `ambulances` | `AuthView.jsx` | Public / Admin | `test/api.test.js`: Test 3 |
| **REQ-04: Hospital Registration** | Register hospital & admin | `POST /api/hospital/register` | `users`, `hospitals` | `AuthView.jsx` | Public / Admin | `test/api.test.js`: Test 3 |
| **REQ-05: Live Hospital Resources Management** | Telemetry sync (Total/Avail Beds, ICU, Ventilators, O2, Equipment, Specialists) | `GET / PUT /api/hospital/:id/resources` | `hospitals.resources`, `hospitals.equipment` | `HospitalDashboard.jsx` | `HOSPITAL` (Own facility), `ADMIN`, `SYSTEM_DOCTOR` | `test/hospital-resources-blood.test.js`: Test 4, 5, 6 |
| **REQ-06: Blood Bank Stock Matrix (8 Groups)** | Cold storage inventory update (A+, A-, B+, B-, AB+, AB-, O+, O-) | `PUT /api/hospital/:id/bloodbank` | `hospitals.bloodBank` | `HospitalDashboard.jsx` | `HOSPITAL` (Own facility), `ADMIN` | `test/hospital-resources-blood.test.js`: Test 7, 8 |
| **REQ-07: Smart Blood Requirement Matcher** | Match Group + Units Required + Location + Urgency (`NORMAL`, `URGENT`, `CRITICAL`) | `POST /api/requests/search-blood` | `hospitals.bloodBank` | `PatientDashboard.jsx`, `EmergencyModal.jsx` | Public / All Authenticated | `test/hospital-resources-blood.test.js`: Test 10 |
| **REQ-08: Hospital & Critical Care Search** | Search by location, bed type, ICU, ventilators, oxygen, blood, specialists | `GET /api/hospitals`, `GET /api/hospital/:id` | `hospitals` | `PatientDashboard.jsx` (Hospital Finder) | Public / All Authenticated | `test/hospital-resources-blood.test.js`: Test 1, 2, 11, 12 |
| **REQ-09: Hospital Operational Dashboard Summary** | Macro summary (Metrics, resources, blood, specialists, queue) | `GET /api/hospital/:id/dashboard-summary` | `hospitals`, `appointments`, `requests` | `HospitalDashboard.jsx` | `HOSPITAL` (Own facility), `ADMIN`, `SYSTEM_DOCTOR` | `test/hospital-resources-blood.test.js`: Test 13 |
| **REQ-10: Transactional Resource Decrement** | Atomic decrement on accepted admission & blood dispatch | `PUT /api/requests/:id/status` | `hospitals.resources`, `hospitals.bloodBank` | Backend `requests.js`, `store.js` | `HOSPITAL`, `ADMIN` | `test/hospital-resources-blood.test.js`: Test 14, 15 |
| **REQ-11: Negative Resource Safety Guard** | Strictly block/clamp `beds < 0`, `ICU < 0`, `blood units < 0` | Backend Clamp Guard | `hospitals.resources`, `hospitals.bloodBank` | Backend `store.js`, `hospitals.js` | All Modifying Roles | `test/hospital-resources-blood.test.js`: Test 9 |
| **REQ-12: Real-Time Telemetry Synchronization** | Instant broadcast on resource/blood bank update | Socket.io (`resource_updated`, `bloodbank_updated`) | In-Memory Socket Server | `SocketContext.jsx`, `HospitalDashboard.jsx`, `PatientDashboard.jsx` | All connected clients | `test/hospital-resources-blood.test.js`: Test 4, 7 |
| **REQ-13: Appointment Booking & Status** | Administrative OPD scheduling (`SCHEDULED` → `CONFIRMED` / `FOLLOW_UP` / `COMPLETED` / `NO_SHOW`) | `POST /api/appointments`, `PUT /api/appointments/:id/status` | `appointments` | `PatientDashboard.jsx`, `HospitalDashboard.jsx` | `PATIENT`, `HOSPITAL`, `ADMIN` | `test/appointments.test.js`: Tests 1-8 |
| **REQ-14: Patient Directory Search** | Administrative search by Name, ID, Phone | `GET /api/patients/search` | `users` | `HospitalDashboard.jsx` (Patient Directory) | `HOSPITAL`, `ADMIN`, `SYSTEM_DOCTOR` | `test/appointments.test.js`: Test 11 |
| **REQ-15: Multi-Step Ambulance Tracking** | Lifecycle progression & simulated GPS | `PUT /api/requests/:id/status`, `PUT /api/ambulance/:id/location` | `requests`, `ambulances` | `AmbulanceDashboard.jsx`, `LiveMap.jsx` | `AMBULANCE` (Assigned), `ADMIN` | `test/api.test.js`: Test 8 |
| **REQ-16: Admin Escalation & Doctor Resolution** | Triage rejected emergencies & resolve conflict | `POST /api/admin/requests/:requestId/assign`, `PUT /api/doctor/requests/:requestId/resolve` | `requests` | `AdminDashboard.jsx`, `DoctorDashboard.jsx` | `ADMIN`, `SYSTEM_DOCTOR` | `test/api.test.js`: Test 10 |
| **REQ-17: Audit Trail & Non-Diagnostic Guard** | Immutable action logs & clinical safety guard | `GET /api/admin/audit-logs`, Middleware | `auditLogs` | `AdminDashboard.jsx`, `SafetyBanner.jsx` | Express Middleware / `ADMIN` | `test/api.test.js`: Test 2, 11 |

---

## 2. Request Lifecycle Status Verification

| State Transition | Permitted Actor | Validated By | Target Status | Resource Effect |
| :--- | :--- | :--- | :--- | :--- |
| `PENDING` → `ASSIGNED` | System / Hospital / Admin | Backend `requests.js` | `ASSIGNED` | None |
| `PENDING` → `ACCEPTED` | Target Hospital | Backend `requests.js` | `ACCEPTED` | Transactional decrement of General Bed / ICU / Ventilator / Blood units (Never `< 0`) |
| `PENDING` → `REJECTED` | Target Hospital | Backend `requests.js` | `REJECTED` | Enforces mandatory `responseNotes` |
| `ASSIGNED` → `ACCEPTED` | Assigned Ambulance Driver | Backend `requests.js` | `ACCEPTED` | Driver trip state transitions to `ON_THE_WAY` |
| `ASSIGNED` → `REJECTED` | Assigned Ambulance Driver | Backend `requests.js` | `REJECTED` | Enforces mandatory `responseNotes` |
| `ACCEPTED` → `COMPLETED` | Assigned Ambulance / Hospital | Backend `requests.js` | `COMPLETED` | Immutable terminal state |
| `REJECTED` → `ASSIGNED` | Admin (Triage to Doctor) | Backend `admin.js` | `ASSIGNED` | Escalated to System Doctor for alternative routing |
| `ASSIGNED` → `RESOLVED` | Assigned System Doctor | Backend `doctor.js` | `RESOLVED` | Immutable terminal resolution with doctor override notes |
