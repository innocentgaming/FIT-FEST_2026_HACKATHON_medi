# MediLink – CARE (Coordinated Assistance & Record Engine)
**FIT FEST 2026 Hackathon MVP** | Platform Pitch:
> *"CARE brings appointments, patients, ambulances, blood requirements, and healthcare facilities into one simple coordination platform for clinics and patients."*

---

## 🛡️ Critical Safety & Non-Diagnostic Scope
MediLink CARE is strictly a **healthcare coordination, logistics, and administrative management engine**.
- **Explicitly Excluded**: Medical diagnosis, clinical decision-making, disease prediction, treatment recommendations, prescription generation, clinical triage algorithms.
- **Explicitly Included**: Administrative appointments, live bed/ICU/ventilator/oxygen telemetry, blood bank inventory matching, emergency ambulance dispatch & GPS tracking, and human escalation triage (Admin & System Doctor).

---

## 👥 Five User Roles & RBAC Matrix

| Role | Authentication / Credentials | Primary Capabilities |
| :--- | :--- | :--- |
| **PATIENT** | `9876543210` / `patient123` | Emergency Mode, book administrative appointments, find hospital beds/ICU/O2, smart blood search, dispatch & track ambulances. |
| **HOSPITAL / CLINIC** | `rubyhall@medilink.org` / `hospital123` | Manage live resources (Beds, ICU, Vents, O2), update blood bank matrix, manage specialists, accept/reject admissions & transfers. |
| **AMBULANCE DRIVER** | `9822012345` / `ambulance123` | Toggle status (`Available`, `On Duty`, `Offline`), accept dispatch, stream simulated GPS, progress trip steps (`On the Way` → `Arrived` → `Completed`). |
| **COMMAND ADMIN** | `admin@medilink.gov.in` / `admin123` | Macro surveillance, monitor rejected emergency queue, triage & assign escalated cases to System Doctors, audit log stream. |
| **SYSTEM DOCTOR** | `dr.joshi@medilink.gov.in` / `doctor123` | Review rejected emergencies, select alternative facilities/resources, enter resolution notes, mark cases `RESOLVED` (terminal). |

---

## 🔄 Request Status State Machine (Source of Truth)
All requests share a strictly validated state machine:
```
[PENDING] ---> [ASSIGNED] ---> [ACCEPTED] ---> [COMPLETED] (Terminal)
    |              |
    v              v
[REJECTED] <-------+
    |
    v (Admin escalates)
[ASSIGNED (to System Doctor)] ---> [RESOLVED] (Terminal)
```

### Business Rules Enforced:
1. **Rule 1**: Transitioning to `REJECTED` **must** include a mandatory explanation (`responseNotes`).
2. **Rule 2**: Only the assigned ambulance driver or admin can transition an ambulance request to `ACCEPTED`.
3. **Rule 3**: `ACCEPTED` on hospital admission triggers transactional bed/resource decrements and real-time Socket broadcast.
4. **Rule 4**: Only an authorized `System Doctor` can mark an escalated request as `RESOLVED`.
5. **Rule 5**: `COMPLETED` and `RESOLVED` are immutable terminal states.

---

## ⚡ Strategic Differentiators & High-Impact Features (USPs)

1. **🚨 Emergency Mode Command Center**: One-touch high-visibility emergency center surfacing 1-click ambulance dispatch, live blood stock search, critical facilities, and live radar tracking.
2. **🩸 Smart Blood Requirement Matcher**: Query by `Blood Group + Units + Location + Urgency` with instant verified hospital stock lookup.
3. **🚑 Multi-Step Ambulance Tracking & Simulated GPS**: Full dispatch lifecycle (`Requested` → `Pending` → `Assigned` → `On the Way` → `Arrived` → `Completed`) with interactive Leaflet map and live GPS simulation.
4. **🏥 Live Resource Synchronization**: Socket.io real-time broadcast of general beds, ICU beds, ventilators, oxygen cylinders, and blood inventory.
5. **⚖️ Admin & System Doctor Conflict Resolution Engine**: Unfulfilled emergency requests never get lost — Admin triages rejections to System Doctors for re-routing and terminal closure.
6. **📅 Clinic Appointment Intelligence**: Administrative appointment booking with status management (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Start Backend Server
```bash
cd backend
npm install
npm start
# Runs on http://localhost:5000 with Socket.io server
```

### 2. Run Automated Test Suite
```bash
cd backend
npm test
# Executes 18 automated end-to-end and RBAC tests
```

### 3. Start Frontend App
```bash
cd frontend
npm install
npm run dev
# Accessible at http://localhost:3000
```

---

## 🔑 1-Click Instant Demo Credentials
The navbar contains instant 1-click role switcher buttons for testing:
- **Patient**: `9876543210` / `patient123`
- **Hospital Admin**: `rubyhall@medilink.org` / `hospital123`
- **Ambulance Driver**: `9822012345` / `ambulance123`
- **Command Admin**: `admin@medilink.gov.in` / `admin123`
- **System Doctor**: `dr.joshi@medilink.gov.in` / `doctor123`
