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
| **REQ-05: Live Hospital Resources** | Telemetry sync (Beds, ICU, Vents, O2) | `GET / PUT /api/hospital/:id/resources` | `hospitals.resources` | `HospitalDashboard.jsx` | `HOSPITAL`, `ADMIN`, `SYSTEM_DOCTOR` | `test/api.test.js`: Test 5 |
| **REQ-06: Blood Bank Management** | Live cold storage stock update | `PUT /api/hospital/:id/bloodbank` | `hospitals.bloodBank` | `HospitalDashboard.jsx` | `HOSPITAL`, `ADMIN` | `test/api.test.js`: Test 5 |
| **REQ-07: Smart Blood Search** | Query Group + Units + Urgency | `POST /api/requests/search-blood` | `hospitals.bloodBank` | `PatientDashboard.jsx`, `EmergencyModal.jsx` | All Authenticated / Public | `test/api.test.js`: Test 7 |
| **REQ-08: Appointment Booking** | Administrative OPD scheduling | `POST /api/appointments` | `appointments` | `PatientDashboard.jsx` (Booking Modal) | `PATIENT`, `HOSPITAL`, `ADMIN` | `test/appointments.test.js`: Test 2 |
| **REQ-09: Appointment Status Lifecycle** | `SCHEDULED` → `CONFIRMED` / `FOLLOW_UP` / `COMPLETED` / `NO_SHOW` | `PUT /api/appointments/:id/status` | `appointments.status` | `PatientDashboard.jsx`, `HospitalDashboard.jsx` | `PATIENT` (Cancel), `HOSPITAL`, `ADMIN` | `test/appointments.test.js`: Test 6, 7, 8 |
| **REQ-10: Duplicate & Past Date Guard** | Prevent duplicate slots & past date bookings | `POST /api/appointments` | `appointments` | `PatientDashboard.jsx` | All Booking Roles | `test/appointments.test.js`: Test 3, 4 |
| **REQ-11: Patient Directory Search** | Administrative search by Name, ID, Phone | `GET /api/patients/search` | `users` | `HospitalDashboard.jsx` (Patient Directory) | `HOSPITAL`, `ADMIN`, `SYSTEM_DOCTOR` | `test/appointments.test.js`: Test 11 |
| **REQ-12: Emergency Mode Command Center** | One-touch 1-click dispatch & search | `POST /api/requests` (Priority: `EMERGENCY`) | `requests` | `EmergencyModal.jsx` | All Authenticated | `test/api.test.js`: Test 8 |
| **REQ-11: Multi-Step Ambulance Tracking** | Lifecycle progression & simulated GPS | `PUT /api/requests/:id/status`, `PUT /api/ambulance/:id/location` | `requests`, `ambulances` | `AmbulanceDashboard.jsx`, `LiveMap.jsx` | `AMBULANCE` (Assigned), `ADMIN` | `test/api.test.js`: Test 8 |
| **REQ-12: Mandatory Rejection Reason** | Reject request with `responseNotes` | `PUT /api/requests/:id/status` (status: `REJECTED`) | `requests.responseNotes` | `HospitalDashboard.jsx` (Reject Modal) | `HOSPITAL`, `AMBULANCE`, `ADMIN` | `test/api.test.js`: Test 9 |
| **REQ-13: Admin Escalation Queue** | Triage rejected emergencies to Doctor | `POST /api/admin/requests/:requestId/assign` | `requests.assignedDoctorId` | `AdminDashboard.jsx` (Escalate Modal) | `ADMIN` | `test/api.test.js`: Test 10 |
| **REQ-14: System Doctor Conflict Resolution** | Re-route facility & mark `RESOLVED` | `PUT /api/doctor/requests/:requestId/resolve` | `requests.resolutionNotes`, `requests.status` | `DoctorDashboard.jsx` (Resolve Modal) | `SYSTEM_DOCTOR`, `ADMIN` | `test/api.test.js`: Test 10 |
| **REQ-15: Real-Time Event Sync** | WebSocket broadcasts across network | Socket.io (`resource_updated`, `request_updated`, etc.) | In-Memory Socket Server | `SocketContext.jsx`, `ToastContainer.jsx` | All connected clients | `test/api.test.js`: Test 8 |
| **REQ-16: Audit Trail Logging** | Immutable action logging | `GET /api/admin/audit-logs` | `auditLogs` | `AdminDashboard.jsx` (Audit Tab) | `ADMIN` | `test/api.test.js`: All actions |
| **REQ-17: Non-Diagnostic Safety Guard** | Block diagnosis/prescription terms | Express Middleware (`safety.js`) | Rejection (HTTP 400) | `SafetyBanner.jsx` | All incoming requests | `test/api.test.js`: Test 2 |

---

## 2. Request Lifecycle Status Verification

| State Transition | Permitted Actor | Validated By | Target Status |
| :--- | :--- | :--- | :--- |
| `PENDING` → `ASSIGNED` | System / Hospital / Admin | Backend `requests.js` | `ASSIGNED` |
| `PENDING` → `ACCEPTED` | Target Hospital | Backend `requests.js` (decrements bed) | `ACCEPTED` |
| `PENDING` → `REJECTED` | Target Hospital | Backend `requests.js` (enforces `responseNotes`) | `REJECTED` |
| `ASSIGNED` → `ACCEPTED` | Assigned Ambulance Driver | Backend `requests.js` | `ACCEPTED` |
| `ASSIGNED` → `REJECTED` | Assigned Ambulance Driver | Backend `requests.js` (enforces `responseNotes`) | `REJECTED` |
| `ACCEPTED` → `COMPLETED` | Assigned Ambulance / Hospital | Backend `requests.js` (Terminal state) | `COMPLETED` |
| `REJECTED` → `ASSIGNED` | Admin (Triage to Doctor) | Backend `admin.js` | `ASSIGNED` |
| `ASSIGNED` → `RESOLVED` | Assigned System Doctor | Backend `doctor.js` (Terminal state) | `RESOLVED` |
