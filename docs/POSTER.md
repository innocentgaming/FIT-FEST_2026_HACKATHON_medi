# 🖼️ MediLink — CARE | Hackathon Presentation Poster
**FIT-FEST 2026 Hackathon** | Organized by **Flora Institute of Technology**

---

```
====================================================================================================
 🏥  M E D I L I N K  —  C A R E
 Coordinated Assistance & Record Engine for Regional Healthcare Logistics & Emergency Dispatch
====================================================================================================
```

### 1. 🛑 Problem
- **Fragmented Resource Telemetry**: Patients and emergency teams cannot see live bed, ICU, and oxygen availability in real-time.
- **Critical Blood Search Inefficiencies**: Finding rare blood units requires manual, frantic phone calls without verified inventory data.
- **Uncoordinated Ambulance Response**: Lack of automated nearest-vehicle matching and live GPS tracking causes critical transit delays.
- **Lost Hospital Rejections**: When a hospital reaches surge capacity, patients are left stranded without escalation or alternative routing.

### 2. 💡 Solution
**MediLink CARE** connects Patients, Hospitals, Ambulance Drivers, Command Admins, and System Doctors into a single real-time administrative and emergency dispatch engine.

### 3. 🌟 The CARE Framework
- **C — Coordinated Emergency Dispatch**: 1-click nearest ambulance matching with simulated GPS radar.
- **A — Administrative Resource Synchronization**: Real-time bed, ICU, oxygen, and blood bank stock telemetry.
- **R — Real-time Multi-Stakeholder Bus**: Instant WebSocket event distribution across all 5 user portals.
- **E — Escalation & Conflict Resolution**: Human-in-the-loop triage re-routing rejected admissions to alternative hospitals.

### 4. ⚡ Key Features
- **🚨 Emergency Mode Command Center**: High-contrast command UI for 1-click ambulance requests, blood search, and facility finders.
- **🩸 Smart Blood Matching**: Query by `Blood Group + Units Required + Location + Urgency` against an 8-group cold storage stock matrix.
- **🚑 Ambulance Fleet Tracking**: Full lifecycle management (`AVAILABLE`, `ON_DUTY`, `OFFLINE`) with 7-step visual trip stepper.
- **📅 OPD Appointment Intelligence**: Conflict-free clinic appointment booking with duplicate slot guards.
- **⚖️ Admin Triage & System Doctor Re-Routing**: Unfulfilled emergency requests are escalated to doctors for terminal resolution.

### 5. 🏗️ Architecture & Technology Stack
- **Frontend**: React 18, Vite, Lucide Icons, Leaflet GPS Radar, TailwindCSS design system.
- **Backend**: Node.js, Express, Socket.io Realtime Bus, JWT Auth, RBAC Middleware.
- **Database**: In-memory transactional datastore with atomic file persistence and audit logging.
- **Testing**: 258 automated tests across 9 comprehensive suites (100% pass rate).
- **Deployment**: Docker Multi-Stage Container ready for Google Cloud Run (0.0.0.0:8080).

### 6. 🛡️ Security & Non-Diagnostic Scope
- **Strict Server-Side RBAC**: Multi-tenant isolation for hospitals, drivers, and doctors.
- **Safety Scope Guard**: MediLink is strictly an administrative logistics coordination engine (no medical diagnosis or clinical prescriptions).

---

### 🏛️ Institution & Hackathon Attribution
- **Institution**: Flora Institute of Technology
- **Instagram / Social**: `@GDG.FIT.PUNE` | `@THE_FLORA_INSTITUTES`
- **Official Hashtags**:
  `#FITFEST2026` `#FITFESTHACKATHON` `#GDGFITPUNE` `#GDGPUNE` `#FLORAINSTITUTES` `#FLORAINSTITUTEOFTECHNOLOGY` `#HACKATHON2026` `#PUNEHACKATHON` `#STUDENTHACKATHON` `#SOLOHACKATHON` `#TECHHACKATHON`
