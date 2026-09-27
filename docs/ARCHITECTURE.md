# MediLink CARE — Technical Architecture Document

## 1. System Overview
MediLink CARE (Coordinated Assistance & Record Engine) is an administrative and healthcare coordination platform engineered for the FIT FEST 2026 Hackathon. It provides a real-time event-driven infrastructure connecting Patients, Hospitals/Clinics, Ambulance Drivers, Command Admins, and System Doctors.

```mermaid
graph TD
    Client[React + Vite Frontend\nPort 3000] -->|REST API / HTTP| Server[Node.js + Express API\nPort 5000]
    Client <-->|WebSocket Events| SocketIO[Socket.io Engine\nRoom-based Pub/Sub]
    Server -->|Transactional Operations| Store[JSON-Backed Memory Store\nData Persistence]
    Server -->|Audit Trail| AuditLog[Centralized Audit Logger]
    Server -->|Safety Filter| SafetyGuard[Administrative Scope Guard]
```

---

## 2. Technology Stack
- **Backend**: Node.js, Express, Socket.io, JSON/File-persisted transactional store, JWT, Bcrypt.js, UUID, CORS, Dotenv.
- **Frontend**: React 18, Vite 6, Leaflet (interactive maps & GPS telemetry), Lucide React (accessible icons), Custom Vanilla CSS Glassmorphism Design System (WCAG 2.2 AA compliant).
- **Testing**: Node.js native test runner with end-to-end integration and RBAC test suite.
- **Real-Time Communication**: Socket.io bidirectional rooms (`role_ADMIN`, `hospital_{id}`, `ambulance_{id}`, `user_{id}`).

---

## 3. Five User Roles & RBAC Matrix

| Capability / Resource | Patient | Hospital | Ambulance | Admin | System Doctor |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Authenticate / Register | ✅ | ✅ | ✅ | ✅ (Seeded) | ✅ (Seeded) |
| Emergency Mode Dispatch | ✅ | ✅ | ❌ | ✅ | ❌ |
| Book / Cancel Appointments | ✅ | ✅ | ❌ | ✅ | ❌ |
| Confirm / Mark No-Show Appointments | ❌ | ✅ | ❌ | ✅ | ❌ |
| Update Hospital Live Resources | ❌ | ✅ (Own) | ❌ | ✅ | ✅ |
| Update Blood Bank Stock | ❌ | ✅ (Own) | ❌ | ✅ | ❌ |
| Query Smart Blood Stock | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progress Ambulance Dispatch Trip | ❌ | ❌ | ✅ (Assigned) | ✅ | ❌ |
| Stream Simulated GPS Telemetry | ❌ | ❌ | ✅ (Assigned) | ✅ | ❌ |
| Reject Request (with Notes) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Escalate Rejected Request to Doctor | ❌ | ❌ | ❌ | ✅ | ❌ |
| Resolve Conflict & Re-Route Facility | ❌ | ❌ | ❌ | ✅ | ✅ |
| View System-Wide Audit Logs | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 4. Request Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Patient / Hospital Initiates
    PENDING --> ASSIGNED: Ambulance / Doctor Designated
    PENDING --> ACCEPTED: Hospital Direct Accept (Bed allocated)
    PENDING --> REJECTED: Hospital Rejects (Mandatory Notes)
    ASSIGNED --> ACCEPTED: Driver Accepts Dispatch
    ASSIGNED --> REJECTED: Driver / Facility Rejects (Mandatory Notes)
    ACCEPTED --> COMPLETED: Trip / Service Completed (Terminal)
    REJECTED --> ASSIGNED: Admin Triages to System Doctor
    ASSIGNED --> RESOLVED: System Doctor Resolves & Re-routes (Terminal)
    COMPLETED --> [*]
    RESOLVED --> [*]
```

### Business Rules Enforced:
1. **Mandatory Rejection Notes**: Any transition to `REJECTED` strictly requires `responseNotes`.
2. **Driver Assignment Lock**: Only the assigned ambulance driver or admin can transition an ambulance request to `ACCEPTED`.
3. **Doctor Resolution Lock**: Only the designated `System Doctor` or admin can transition an escalated conflict to `RESOLVED`.
4. **Transactional Bed Decrement**: Transitioning an admission request to `ACCEPTED` automatically decrements available beds in hospital resources.
5. **Immutable Terminal States**: `COMPLETED` and `RESOLVED` cannot be transitioned to any other state.

---

## 5. Implementation Dependency Graph

```mermaid
graph TD
    Auth[1. Authentication & JWT] --> DB[2. Database & Data Model Store]
    DB --> RBAC[3. RBAC & Safety Middleware]
    RBAC --> Resources[4. Hospital Resources & Telemetry]
    Resources --> Patient[5. Patient Management & Profile]
    Patient --> Appointments[6. Appointments & OPD Scheduling]
    Appointments --> Requests[7. Unified Requests Lifecycle]
    Requests --> Ambulance[8. Ambulance Logistics & GPS Stream]
    Ambulance --> Blood[9. Smart Blood Requirement Matcher]
    Blood --> Emergency[10. Emergency Mode Command Center]
    Emergency --> Admin[11. Admin Escalation & Triage Queue]
    Admin --> Doctor[12. System Doctor Conflict Resolution]
    Doctor --> Realtime[13. Socket.io Real-time Broadcasts]
    Realtime --> Testing[14. Automated E2E & RBAC Tests]
    Testing --> Deployment[15. Docker & Cloud Run Deployment]
```

---

## 6. Safety & Administrative Scope Guardrails
MediLink CARE is strictly non-diagnostic. The following architecture guarantees compliance:
- **Middleware Guard** (`backend/src/middleware/safety.js`): Intercepts all write requests and rejects any clinical terms (`prescription`, `diagnosis`, `dosage`, `cure`) with HTTP 400.
- **UI Safety Banner** (`frontend/src/components/SafetyBanner.jsx`): Persistent notice that MediLink is an administrative coordination tool.
- **Appointment Scoping**: Purpose field is limited to administrative text (e.g. "Routine OPD Consultation Desk").
