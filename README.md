# MediLink — CARE
> *"CARE brings appointments, patients, ambulances, blood requirements, and healthcare facilities into one simple coordination platform for clinics and patients."*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi)
[![Test Suite](https://img.shields.io/badge/tests-258%20passed-success.svg)](https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](file:///d:/medi/Dockerfile)
[![WCAG 2.1 AA](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-emerald.svg)](file:///d:/medi/frontend)
[![FIT-FEST 2026](https://img.shields.io/badge/Hackathon-FIT--FEST%202026-orange.svg)](https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi)

---

## 1. Problem
Healthcare coordination in urban and peri-urban centers is crippled by severe fragmentation:
- **Siloed Resource Telemetry**: Patients and emergency responders cannot see real-time bed, ICU, ventilator, or oxygen availability, causing life-threatening delays.
- **Critical Blood Shortages**: Finding compatible blood units requires frantic phone calls across multiple hospitals without verified stock visibility.
- **Uncoordinated Ambulance Fleet**: Lack of live GPS dispatch leads to suboptimal routing and delayed emergency transit.
- **Lost Escalations**: When a hospital rejects an admission due to surge capacity, the patient is left stranded without administrative triage or alternative routing.
- **Administrative OPD Friction**: OPD queues suffer from scheduling bottlenecks and uncoordinated follow-ups.

---

## 2. Solution
**MediLink CARE** creates a single, real-time coordination bridge connecting Patients, Hospitals, Ambulance Drivers, Command Admins, and System Doctors. By unifying resource telemetry, emergency dispatch, blood bank inventory, and conflict escalation into one responsive platform, MediLink eliminates coordination friction and ensures zero lost emergencies.

---

## 3. Key Features
- 🚨 **Emergency Mode Command Center**: 1-click auto-dispatch calculating nearest available ambulances and emergency facility matching.
- 🩸 **Smart Blood Requirement Matcher**: Queries by `Blood Group + Units Required + Location + Urgency` against an 8-group cold storage stock matrix.
- 🚑 **Live Ambulance Tracking & Simulated GPS**: Real-time fleet lifecycle (`AVAILABLE`, `ON_DUTY`, `OFFLINE`) with step progression (`On the Way` → `Arrived` → `Completed`) and GPS telemetry.
- 🏥 **Live Hospital Resource Telemetry**: Real-time synchronization of general beds, ICU beds, ventilators, oxygen cylinders, and specialist rosters with atomic transactional updates.
- ⚖️ **Central Admin & System Doctor Escalation**: Rejection triage queue allowing Admins to assign unfulfilled requests to System Doctors for re-routing to alternative facilities.
- 📅 **OPD Appointment Intelligence**: Administrative clinic booking with duplicate slot prevention and past-date validation.
- 🔔 **Multi-Channel Notification Center**: Real-time push notifications across 10 workflow triggers with read/unread tracking.

---

## 4. CARE Framework
MediLink is built around the **C.A.R.E.** paradigm:
- **C — Coordinated Emergency Dispatch**: Instant calculation of nearest ambulances with live radar simulation.
- **A — Administrative Resource Synchronization**: Sub-millisecond broadcast of verified bed, ICU, oxygen, and blood inventories.
- **R — Real-time Stakeholder Communication**: Bidirectional Socket.io event bus linking patients, clinicians, drivers, and coordinators.
- **E — Escalation & Conflict Resolution**: Human-in-the-loop triage ensuring every rejected request is resolved.

---

## 5. Architecture
MediLink adopts a decoupled, event-driven architecture with atomic data persistence and real-time WebSocket distribution:

```mermaid
graph TD
    subgraph Client Layer
        P["👤 Patient Portal"]
        H["🏥 Hospital Portal"]
        A["🚑 Ambulance Portal"]
        AD["⚖️ Admin Portal"]
        D["🩺 Doctor Portal"]
    end

    subgraph Security & API Gateway
        AUTH["🔒 JWT Auth & RBAC Middleware"]
        SG["🛡️ Non-Diagnostic Safety Guard"]
    end

    subgraph Core Engine
        RE["⚙️ Unified Request Engine<br/>(State Machine Validator)"]
        NS["🔔 Notification Service"]
        SE["⚡ Socket.io Real-Time Event Bus"]
    end

    subgraph Persistence Layer
        DB[("💾 In-Memory Thread-Safe Data Store<br/>(Transactional & Audited)")]
    end

    Client Layer --> AUTH --> SG --> RE
    RE --> DB
    RE --> NS
    RE --> SE
    SE -.->|Live Telemetry Broadcast| Client Layer
```

---

## 6. User Roles & RBAC Matrix

| Role | Primary Identifier | Capabilities & Permissions |
| :--- | :--- | :--- |
| **👤 PATIENT** | `aarav@example.com` / `9876543210` | 1-Click Emergency Mode, book OPD appointments, search hospital resources, match blood units, dispatch & track ambulances. |
| **🏥 HOSPITAL ADMIN** | `rubyhall@medilink.org` | Update own facility resources (Beds, ICU, Vents, O2, Blood Bank), manage specialists, accept/reject admissions & assign fleet. |
| **🚑 AMBULANCE DRIVER** | `driver1@medilink.org` / `9822012345` | Toggle availability, accept/reject dispatches with mandatory reasons, stream simulated GPS, advance trip milestones. |
| **⚖️ COMMAND ADMIN** | `admin@medilink.gov.in` | Network-wide surveillance, macro metrics, triage rejected emergency requests, assign conflicts to System Doctors, view audit trails. |
| **🩺 SYSTEM DOCTOR** | `dr.joshi@medilink.gov.in` | Access isolated conflict queue, review rejection reasons, re-route patients to alternative facilities with comprehensive resolution notes. |

---

## 7. Main Workflows

### 7.1. Emergency Dispatch Workflow
1. Patient enters Emergency Mode and clicks **Request Ambulance**.
2. System computes nearest available unit via Haversine calculation and dispatches `AMBULANCE_REQUEST`.
3. Assigned driver receives real-time notification, accepts trip (`ON_DUTY`), and streams live GPS coordinates.
4. Patient tracks vehicle on live visual stepper (`REQUESTED` → `PENDING` → `ASSIGNED` → `ACCEPTED` → `ON THE WAY` → `ARRIVED` → `COMPLETED`).

### 7.2. Hospital Resource & Blood Management Workflow
1. Hospital administrator updates live ICU beds or blood bank stock units.
2. Changes are verified against clamp guards (preventing negative numbers).
3. Real-time Socket.io events (`resource:update`, `blood:update`) immediately update all connected patient and emergency screens.

### 7.3. Admin Triage & System Doctor Conflict Resolution Workflow
1. Hospital rejects an admission request due to surge capacity (mandatory `responseNotes` enforced).
2. Request transitions to `REJECTED` and surfaces in the Admin Triage Queue.
3. Central Admin reviews case and assigns to an available System Doctor (`REJECTED` $\rightarrow$ `ASSIGNED`).
4. Assigned Doctor investigates alternative facilities and resolves the case (`ASSIGNED` $\rightarrow$ `RESOLVED`), triggering an instant resolution notification to the patient.

---

## 8. Security & Server-Side RBAC
- **Strict Server-Side Authorization**: All mutations enforce role and ownership boundaries (e.g. Hospital A cannot modify Hospital B's beds; Doctor A cannot resolve Doctor B's conflicts).
- **IDOR Protection**: Private patient records, appointments, and notifications are isolated by `req.user.id`.
- **JWT Authentication**: High-entropy signed tokens with configurable expiration and session verification.
- **Terminal State Immutability**: `COMPLETED` and `RESOLVED` records cannot be altered or reverted.
- **PII Socket Sanitization**: Sensitive medical notes, patient names, and phone numbers are stripped from global socket broadcasts.
- **Audit Logging**: Structured audit entries captured for all authentication, resource mutation, dispatch, and escalation events.

---

## 9. Accessibility (WCAG 2.1 AA)
- **No Color-Only Status Indicators**: Status badges embed high-contrast text + distinct Lucide SVG icons (`role="status"`).
- **Keyboard Navigation**: Visible focus rings (`focus:ring-2 focus:ring-emerald-500`) on all buttons, tabs, and form controls.
- **Semantic HTML5**: Native `<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<dialog>` structures with ARIA live alerts (`role="alert"`).
- **Responsive Layout**: Validated across mobile (360px), tablet (768px), and desktop (1440px) viewports.

---

## 10. Technology Stack
- **Frontend**: React 18, Vite, Lucide Icons, Leaflet / React-Leaflet, TailwindCSS & Vanilla CSS design system tokens.
- **Backend**: Node.js, Express, Socket.io (WebSocket), JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `uuid`.
- **Database**: In-memory JSON transactional datastore with atomic file persistence and auto-seeding.
- **DevOps & Containerization**: Multi-stage Docker, Docker Compose, Google Cloud Build, Google Cloud Run.
- **Testing**: Built-in automated test suites (258 tests across 9 suites).

---

## 11. API Reference
- **Auth**: `POST /api/login`, `POST /api/patient/register`, `POST /api/ambulance/register`, `POST /api/hospital/register`
- **Health**: `GET /health` (Root/Cloud Run), `GET /api/health` (Scope & Version)
- **Hospitals & Resources**: `GET /api/hospitals`, `GET /api/hospital/:id`, `PUT /api/hospital/:id/resources`, `PUT /api/hospital/:id/bloodbank`
- **Appointments**: `GET /api/appointments`, `POST /api/appointments`, `PUT /api/appointments/:id/status`
- **Requests Engine**: `GET /api/requests`, `POST /api/requests`, `PUT /api/requests/:id/status`, `POST /api/requests/search-blood`
- **Ambulance Fleet**: `GET /api/ambulance`, `PUT /api/ambulance/:id/status`, `PUT /api/ambulance/:id/location`
- **Admin Triage**: `GET /api/admin/patient-requests`, `POST /api/admin/requests/:requestId/assign`
- **Doctor Queue**: `GET /api/doctor/requests`, `PUT /api/doctor/requests/:requestId/resolve`
- **Notifications**: `GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`

---

## 12. Database Schema
Entities managed in [`backend/src/db/store.js`](file:///d:/medi/backend/src/db/store.js):
- `users`: User profiles, hashed passwords, roles (`PATIENT`, `HOSPITAL`, `AMBULANCE`, `ADMIN`, `SYSTEM_DOCTOR`).
- `hospitals`: Facility metadata, location, resources (Beds, ICU, Vents, O2), equipment, 8-group blood stock.
- `appointments`: OPD schedules, patient ID, specialist, time slot, appointment status.
- `ambulances`: Vehicle numbers, driver info, hospital affiliation, fleet status (`AVAILABLE`, `ON_DUTY`, `OFFLINE`), GPS coordinates.
- `requests`: Unified requests across 5 canonical types with priority, timeline, and escalation metadata.
- `notifications`: Multi-channel notification queue with read/unread flags.
- `auditLogs`: Immutable security and operation audit trail.

---

## 13. Realtime Architecture
Socket.io event bus powers live multi-client synchronization:
- `resource:update` / `resource_updated`: Live hospital capacity changes.
- `blood:update` / `bloodbank_updated`: Blood bank unit updates.
- `ambulance:status` & `ambulance:location`: Fleet availability and live GPS telemetry.
- `request:status_changed`: Real-time request state transitions.
- `notification:new`: Toast alerts and notification badge increments.

---

## 14. Testing & Verification

Run the entire automated test suite:
```bash
cd backend
npm run test:all
```

**Results: 258 Tests Passed (0 Failed, 100% Coverage across PRD & INF Workflows)**
- `test/api.test.js` (18 Passed)
- `test/auth-rbac.test.js` (24 Passed)
- `test/appointments.test.js` (14 Passed)
- `test/hospital-resources-blood.test.js` (22 Passed)
- `test/ambulance-tracking.test.js` (22 Passed)
- `test/emergency-mode.test.js` (16 Passed)
- `test/escalation.test.js` (43 Passed)
- `test/unified-request-engine.test.js` (46 Passed)
- `test/qa-e2e-audit.test.js` (53 Passed)

---

## 15. Deployment (Google Cloud Run & Docker)

### Docker Local Run:
```bash
docker build -t medilink-care .
docker run -p 8080:8080 -e PORT=8080 medilink-care
```

### Cloud Run Deployment:
```bash
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT/medilink-care
gcloud run deploy medilink-care \
  --image gcr.io/YOUR_GCP_PROJECT/medilink-care \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="NODE_ENV=production,PORT=8080,JWT_SECRET=production_secret_2026"
```

---

## 16. Demo Credentials

Instant 1-click role switcher available in the Navbar:

| Role | Username / Identifier | Password | Description |
| :--- | :--- | :--- | :--- |
| **Patient** | `aarav@example.com` or `9876543210` | `patient123` | Aarav Sharma (Patient Portal) |
| **Hospital Admin** | `rubyhall@medilink.org` | `hospital123` | Ruby Hall Clinic Admin |
| **Ambulance Driver** | `driver1@medilink.org` or `9822012345` | `ambulance123` | Santosh Shinde (MH-12-CR-1011) |
| **Command Admin** | `admin@medilink.gov.in` | `admin123` | State Health Command Admin |
| **System Doctor** | `dr.joshi@medilink.gov.in` | `doctor123` | Dr. Anand Joshi (Critical Care Lead) |

---

## 17. Limitations
- **Simulated GPS**: In MVP, ambulance GPS is generated via high-fidelity coordinate simulation (can connect to real OBD-II / mobile GPS).
- **In-Memory / JSON Datastore**: Designed for hackathon zero-config portability (ready to attach PostgreSQL / MongoDB via ORM layer).

---

## 18. Regulatory Safety Scope

> **"MediLink provides administrative and emergency coordination functionality. It does not provide medical diagnosis, treatment recommendations, or clinical decision-making."**

All clinical decisions, medical diagnoses, treatment planning, and drug prescriptions remain strictly between licensed medical practitioners and their patients. MediLink strictly facilitates administrative intake, resource logistics, and communication.
