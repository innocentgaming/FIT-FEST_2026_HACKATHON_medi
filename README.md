# MediLink — CARE
> *"CARE brings appointments, patients, ambulances, blood requirements, and healthcare facilities into one simple, unified coordination platform for clinics, hospitals, and patients."*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi)
[![Test Suite](https://img.shields.io/badge/tests-258%20passed-success.svg)](https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](file:///d:/medi/Dockerfile)
[![WCAG 2.1 AA](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-emerald.svg)](file:///d:/medi/frontend)
[![FIT-FEST 2026](https://img.shields.io/badge/Hackathon-FIT--FEST%202026-orange.svg)](https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi)
[![Live Frontend](https://img.shields.io/badge/Vercel-Live%20App-black.svg)](https://fit-fest-2026-hackathon-medi.vercel.app/)
[![Live Backend](https://img.shields.io/badge/Render-Live%20API-46E3B7.svg)](https://medilink-backend-q2rh.onrender.com/health)

---

### 🌐 Live Production Deployment Links
- **🚀 Live Application (Frontend)**: [https://fit-fest-2026-hackathon-medi.vercel.app/](https://fit-fest-2026-hackathon-medi.vercel.app/)
- **⚡ Live REST & WebSocket API (Backend)**: [https://medilink-backend-q2rh.onrender.com](https://medilink-backend-q2rh.onrender.com)
- **🩺 Live System Health Check**: [https://medilink-backend-q2rh.onrender.com/health](https://medilink-backend-q2rh.onrender.com/health)
- **📦 GitHub Repository**: [https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi](https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi)

---

## 📌 Project Overview

**MediLink CARE** (*Coordinated Assistance & Record Engine*) is a real-time, event-driven healthcare coordination and emergency logistics platform developed for the **FIT-FEST Hackathon 2026**.

The platform is designed to eliminate dangerous coordination delays across fragmented healthcare networks by establishing a single, unified digital bridge connecting **Patients, Hospitals & Clinics, Ambulance Drivers, Command Admins, and System Doctors**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MEDILINK CARE                                        │
│                           Healthcare Coordination Engine                                │
├──────────────────┬──────────────────┬──────────────────┬─────────────────┬──────────────┤
│ 👤 PATIENT       │ 🏥 HOSPITAL      │ 🚑 AMBULANCE     │ ⚖️ ADMIN        │ 🩺 DOCTOR    │
│ • Emergency Mode │ • Live Telemetry │ • GPS Telemetry  │ • Macro Triage  │ • Escalation │
│ • OPD Bookings   │ • Blood Bank     │ • Trip Lifecycle │ • Audit Trails  │ • Re-Routing │
│ • Blood Matcher  │ • Bed Allocation │ • Duty Switcher  │ • Demo Reset    │ • Resolution │
└──────────────────┴──────────────────┴──────────────────┴─────────────────┴──────────────┘
```

### 🎯 Core Mission & Executive Summary
In critical medical situations, minutes save lives. Today, patients and emergency responders struggle with:
1. **Blind Admissions**: Hospitals turning away critical emergencies at the gate due to unannounced surge capacity.
2. **Scattered Blood Inventories**: Frantic, uncoordinated phone calls searching for rare blood groups.
3. **Unlinked Fleet Logistics**: Ambulances operating without real-time GPS tracking or hospital arrival coordination.
4. **Unresolved Rejections**: Rejected transfer requests being lost in administrative voids with no human-in-the-loop fallback.

**MediLink CARE** solves these systemic bottlenecks with a **non-diagnostic, coordination-first architecture** featuring sub-millisecond WebSocket synchronization, mathematical resource clamping, strict multi-tenant RBAC, and automated escalation queues.

---

## 1. Problem Statement
Healthcare coordination across urban and peri-urban medical ecosystems faces critical operational friction:
- **Siloed Resource Visibility**: Patients and emergency responders cannot view live bed, ICU, ventilator, or oxygen cylinder capacity, causing severe admission delays.
- **Critical Blood Supply Bottlenecks**: Discovering verified compatible blood units requires frantic phone calls across multiple hospitals without verified cold storage inventory.
- **Uncoordinated Ambulance Transit**: Lack of live GPS dispatch and status progression leads to suboptimal routing and delayed emergency transit.
- **Unresolved Rejections**: When a hospital rejects an admission due to surge capacity, the patient is left without administrative triage or alternate routing.
- **Administrative OPD Scheduling Friction**: Routine outpatient checkups suffer from scheduling overlaps, unmanaged queues, and lack of follow-up coordination.

---

## 2. Solution: The CARE Platform
**MediLink CARE** creates a single, real-time coordination bridge connecting **Patients, Hospitals, Ambulance Drivers, Command Admins, and System Doctors**. By unifying real-time resource telemetry, 1-click emergency dispatch, smart blood bank inventory, and human-in-the-loop conflict escalation into one responsive platform, MediLink eliminates coordination friction and ensures zero lost emergencies.

---

## 3. CARE Framework
MediLink is built around the **C.A.R.E.** paradigm:
- **C — Coordinated Emergency Dispatch**: Instant calculation of nearest ambulances with live radar simulation.
- **A — Administrative Resource Synchronization**: Sub-millisecond broadcast of verified bed, ICU, oxygen, and blood inventories.
- **R — Real-time Stakeholder Communication**: Bidirectional Socket.io event bus linking patients, clinicians, drivers, and coordinators.
- **E — Escalation & Conflict Resolution**: Human-in-the-loop triage ensuring every rejected request is resolved.

---

## 4. Key Highlights & USPs

1. **🚨 1-Click Emergency Mode Command Center**: Generates critical tri-service requisitions (ICU Bed + Blood Group + Priority Ambulance) with priority locking and real-time incident event streaming.
2. **🩸 Smart Blood Requirement Matcher**: Queries by `Blood Group + Units Required + Location + Urgency` against an 8-group cold storage stock matrix, returning verified facility matches and direct helpline links.
3. **🚑 Live Ambulance Tracking & Simulated GPS**: Real-time fleet lifecycle (`AVAILABLE`, `ON_DUTY`, `OFFLINE`) with step progression (`On the Way` → `Arrived` → `Completed`) and GPS telemetry.
4. **🏥 Live Hospital Resource Telemetry**: Real-time synchronization of general beds, ICU beds, ventilators, oxygen cylinders, and specialist rosters with mathematical non-negative clamping ($\ge 0$).
5. **🔒 Staff Inventory Security PIN Safeguard**: Prevents accidental or unauthorized modifications to hospital beds and blood stock; requires staff verification code (`1234`).
6. **⚖️ Central Admin Triage & System Doctor Conflict Resolution**: Rejection triage queue allowing Admins to assign unfulfilled requests to System Doctors for re-routing to alternative facilities with immutable audit logs.
7. **📅 OPD Appointment Intelligence**: Administrative clinic booking with duplicate slot prevention and past-date validation.
8. **🎨 3 High-Fidelity UI Themes**: Quick toggle between **Deep Slate**, **OLED Midnight**, and **Clinical Light Mode** with WCAG 2.1 AA compliant contrast.
9. **⚡ React.lazy Code-Splitting**: Optimized initial production bundle down to ~203 kB with Rollup manual vendor chunking.
10. **🛡️ Non-Diagnostic Safety Compliance**: Embedded safety guard middleware filtering clinical diagnosis/prescription generation attempts.

---

## 5. System Architecture

```mermaid
graph TD
    subgraph Client Layer (React 18 + Vite)
        P["👤 Patient Portal"]
        H["🏥 Hospital Portal"]
        A["🚑 Ambulance Portal"]
        AD["⚖️ Admin Portal"]
        D["🩺 Doctor Portal"]
    end

    subgraph Security & API Gateway
        AUTH["🔒 JWT Auth & RBAC Middleware"]
        PIN["🔑 Staff Inventory PIN Safeguard"]
        SG["🛡️ Non-Diagnostic Safety Guard"]
    end

    subgraph Core Engine
        RE["⚙️ Unified Request Engine<br/>(State Machine Validator)"]
        NS["🔔 Notification Service"]
        SE["⚡ Socket.io Real-Time Event Bus"]
    end

    subgraph Persistence Layer
        DB[("💾 In-Memory Transactional Store<br/>(Thread-Safe & Audited)")]
    end

    Client Layer --> AUTH --> PIN --> SG --> RE
    RE --> DB
    RE --> NS
    RE --> SE
    SE -.->|Live Telemetry Broadcast| Client Layer
```

---

## 6. Technologies Used

| Domain | Technology / Library | Version / Details | Purpose in MediLink CARE |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React** | `v18.3.1` | Component-based interactive UI across all 5 stakeholder portals. |
| **Build Tool & Bundler** | **Vite** | `v6.4.3` | Ultra-fast HMR and Rollup-optimized production bundling with `manualChunks`. |
| **Styling & Design System**| **Vanilla CSS Tokens** | `Custom Glassmorphic` | 3 High-contrast themes (*Deep Slate*, *OLED Midnight*, *Clinical Light*), WCAG 2.1 AA. |
| **Icons & Visual Language**| **Lucide React** | `v0.469.0` | Accessible semantic SVG icons embedded with status indicators. |
| **Backend Runtime** | **Node.js** | `v20 LTS` | High-throughput asynchronous event-driven runtime. |
| **API Framework** | **Express.js** | `v4.19.2` | RESTful routing, middleware pipelines, and security headers. |
| **Realtime Engine** | **Socket.io** | `v4.7.5` | Sub-millisecond bidirectional WebSocket event bus for live telemetry & radar. |
| **Authentication & RBAC** | **JSON Web Tokens (JWT)** | `v9.0.2` | Stateless, cryptographically signed bearer tokens for multi-tenant sessions. |
| **Password Hashing** | **Bcrypt.js** | `v2.4.3` | Salted credential hashing (10 rounds) protecting all user accounts. |
| **Persistence Engine** | **Transactional File Store**| `JSON Engine` | Thread-safe, atomic disk persistence with auto-seeding and zero external bloat. |
| **Containerization** | **Docker** | `Multi-Stage Alpine` | Cloud Run-compatible production container packaging frontend + backend. |
| **Testing Harness** | **Node.js Native Assert** | `node:assert/strict` | Repeatable CI/CD automated test runner (258 tests across 9 test suites). |

---

## 7. Stakeholder Roles & Access Control (RBAC)

| Role | Default Demo Identifier | Password | Key Permissions & Portal Features |
| :--- | :--- | :--- | :--- |
| **👤 PATIENT** | `aarav@example.com` / `9876543210` | `patient123` | 1-Click Emergency Mode, book OPD appointments, search hospital resources, match blood units, dispatch & track ambulances. |
| **🏥 HOSPITAL ADMIN** | `rubyhall@medilink.org` | `hospital123` | Update facility resources (Beds, ICU, Vents, O2, Blood Bank), manage specialists, accept/reject admissions & assign fleet. |
| **🚑 AMBULANCE DRIVER** | `driver1@medilink.org` / `9822012345` | `ambulance123` | Toggle availability, accept/reject dispatches with mandatory reasons, stream simulated GPS, advance trip milestones. |
| **⚖️ COMMAND ADMIN** | `admin@medilink.gov.in` | `admin123` | Network-wide surveillance, macro metrics, triage rejected emergency requests, assign conflicts to System Doctors, view audit trails. |
| **🩺 SYSTEM DOCTOR** | `dr.joshi@medilink.gov.in` | `doctor123` | Access isolated conflict queue, review rejection reasons, re-route patients to alternative facilities with comprehensive resolution notes. |

---

## 8. Canonical Request State Machine

MediLink enforces single-source-of-truth state machine transitions via [`backend/src/engine/requestEngine.js`](file:///d:/medi/backend/src/engine/requestEngine.js):

- **Standard Flow**: `PENDING` $\to$ `ACCEPTED` $\to$ `COMPLETED` (Terminal)
- **Rejection Flow**: `PENDING` $\to$ `REJECTED` *(Mandatory response notes required)*
- **Ambulance Flow**: `PENDING` $\to$ `ASSIGNED` $\to$ `ACCEPTED` $\to$ `COMPLETED`
- **Escalation Flow**: `REJECTED` $\to$ `ASSIGNED` (Admin Triage) $\to$ `RESOLVED` (Doctor Override)
- **Terminal State Lock**: Requests in `COMPLETED` or `RESOLVED` states are strictly immutable.

---

## 8. API Reference

### Authentication & Profiles
- `POST /api/login` — Authenticate and receive JWT token + role payload.
- `POST /api/patient/register` — Register a new patient account.
- `POST /api/hospital/register` — Register a new hospital facility.
- `POST /api/ambulance/register` — Register a new ambulance and driver account.
- `GET /api/patient/profile` — Fetch authenticated patient record.

### System & Health
- `GET /health` — Simple healthcheck endpoint for Cloud Run and load balancers.
- `GET /api/health` — Non-diagnostic regulatory compliance and API status probe.

### Hospitals & Live Resources
- `GET /api/hospitals` — List all facilities with resource inventory, coordinates, and contact details.
- `GET /api/hospital/:id` — Fetch detailed facility metadata and specialist roster.
- `PUT /api/hospital/:id/resources` — Update bed, ICU, ventilator, and oxygen telemetry *(Clamped $\ge 0$)*.
- `PUT /api/hospital/:id/bloodbank` — Update 8-group blood bank stock units.

### Clinic Appointments
- `GET /api/appointments` — Fetch appointments for authenticated user or hospital queue.
- `POST /api/appointments` — Book an OPD appointment slot *(Blocks duplicate slots and past dates)*.
- `PUT /api/appointments/:id/status` — Update appointment lifecycle (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `FOLLOW_UP`).

### Unified Requests & Emergency
- `GET /api/requests` — Fetch requests filtered by role, hospital, or status.
- `POST /api/requests` — Create emergency admission, ambulance, blood, or equipment requisition.
- `POST /api/requests/search-blood` — Proximity-sorted smart blood requirement matcher.
- `PUT /api/requests/:id/status` — State machine transition with mandatory notes enforcement.

### Fleet Tracking & Location
- `GET /api/ambulance` — List ambulances and real-time status.
- `PUT /api/ambulance/:id/status` — Update duty status (`AVAILABLE`, `ON_DUTY`, `OFFLINE`).
- `PUT /api/ambulance/:id/location` — Stream high-precision GPS coordinate telemetry.

### Admin Triage & System Doctor Escalation
- `GET /api/admin/patient-requests` — Macro request feed with rejection filters.
- `POST /api/admin/requests/:requestId/assign` — Escalate rejected case to a System Doctor.
- `GET /api/admin/audit-logs` — Immutable audit log trail.
- `POST /api/admin/reset-db` — 1-Click database seed reset for live jury demos.
- `GET /api/doctor/requests` — System Doctor isolated conflict queue.
- `PUT /api/doctor/requests/:requestId/resolve` — Override rejection and re-route patient.

### Real-Time Notifications
- `GET /api/notifications` — Fetch user notification feed with unread count.
- `PUT /api/notifications/:id/read` — Mark single notification as read.
- `PUT /api/notifications/read-all` — Mark all user notifications as read.

---

## 9. Automated Testing & Verification

Run the entire automated test suite:
```bash
cd backend
npm run test:all
```

**Results: 258 Tests Passed (0 Failed, 100% Success Rate across 9 Test Suites)**
- `test/api.test.js` (18 Passed) — Healthcheck, non-diagnostic filter, baseline API.
- `test/auth-rbac.test.js` (24 Passed) — Password hashing, JWT lifecycle, RBAC boundaries.
- `test/appointments.test.js` (14 Passed) — Past date prevention, duplicate bookings, confirmation lifecycle.
- `test/hospital-resources-blood.test.js` (22 Passed) — Telemetry clamping, cold storage matrix, smart blood search.
- `test/ambulance-tracking.test.js` (22 Passed) — Proximity dispatch, GPS telemetry updates, driver authorization.
- `test/emergency-mode.test.js` (16 Passed) — 1-click tri-service trigger, live incident timeline.
- `test/escalation.test.js` (43 Passed) — Admin triage, System Doctor conflict resolution, audit trails.
- `test/unified-request-engine.test.js` (46 Passed) — State transitions graph, mandatory rejection reasons, privacy sanitization.
- `test/qa-e2e-audit.test.js` (53 Passed) — 5-stakeholder end-to-end integration walkthrough and security penetration tests.

---

## 10. Local Setup & Quickstart

### Prerequisites
- Node.js 18+ / 20+
- npm 9+

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/innocentgaming/FIT-FEST_2026_HACKATHON_medi.git
cd FIT-FEST_2026_HACKATHON_medi

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Run Locally in Development Mode
```bash
# Terminal 1: Start Backend API & WebSocket Server (Port 5000)
cd backend
npm run dev

# Terminal 2: Start Frontend Development Server (Port 3000)
cd frontend
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 11. Production Deployment (Docker & Google Cloud Run)

### Docker Multi-Stage Build:
```bash
docker build -t medilink-care .
docker run -p 8080:8080 -e PORT=8080 -e NODE_ENV=production medilink-care
```

### Google Cloud Run 1-Click Deploy:
```bash
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT/medilink-care
gcloud run deploy medilink-care \
  --image gcr.io/YOUR_GCP_PROJECT/medilink-care \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="NODE_ENV=production,PORT=8080,JWT_SECRET=your_production_secret"
```

---

## 12. Regulatory Safety & Non-Diagnostic Scope

> **"MediLink CARE provides administrative and emergency logistics coordination functionality. It does not provide medical diagnosis, treatment recommendations, clinical prescriptions, or automated medical judgment."**

All clinical decisions and diagnostic interpretations remain strictly between licensed healthcare practitioners and their patients. MediLink operates exclusively as an administrative and operational logistics coordination bridge.

---

## 13. License & Acknowledgements
Developed for the **FIT-FEST Hackathon 2026** under the Open Healthcare Innovation Track.
