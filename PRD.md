# MediLink (CARE) – Product Requirements Document (PRD)
**FIT FEST 2026 Hackathon** | Date: Sep 27, 2026 | Author: @Kiran

---

## 1. Executive Summary & Problem Statement
MediLink is a real-time healthcare logistics & emergency coordination platform connecting **Patients, Hospitals/Clinics, Ambulance Services, Admins, and System Doctors**.
- **Problem**: Small clinics and patients rely on fragmented, ad-hoc methods (phone calls, paper notebooks, WhatsApp, spreadsheets). Patients struggle during emergencies to verify real-time ambulance availability, ICU/oxygen beds, and blood-bank stock.
- **Solution**: Role-based dashboards with live resource counts, real-time Socket.io updates, multi-step ambulance dispatch & GPS tracking, blood-bank lookup, and a human escalation engine (Admin & System Doctor override) ensuring every emergency reaches a terminal state (`COMPLETED` or `RESOLVED`).
- **Explicitly Out of Scope**: Medical diagnosis, clinical decisions, treatment recommendations, insurance/billing, EHR.

---

## 2. User Roles & RBAC Matrix

| Role | Authentication / Registration | Primary Capabilities |
| :--- | :--- | :--- |
| **Patient** | Name, Phone, Password | Search hospitals/blood banks, book appointments, request admission, request ambulance, track status, "Emergency Mode". |
| **Hospital / Clinic** | Hospital Name, Email, Password, Location, Contact | Manage live beds/ICU/ventilators/oxygen/blood stock, specialists roster, manage ambulances, accept/reject admissions & H2H transfers. |
| **Ambulance** | Driver Name, Phone, Vehicle No., Linked Hospital | Toggle status (`Available`, `On Duty`, `Offline`), stream GPS, accept/reject pickup requests, progress trip states. |
| **Admin** | Seeded system account | Network-wide macro dashboard, monitor unresolved/rejected requests, triage & assign to System Doctors. |
| **System Doctor** | Seeded system account | Resolve escalated cases/conflicts with notes, override constraints, re-route to alternative resources. |

---

## 3. Core System Workflows & Request Lifecycle

### Request Status State Machine
All requests (Admissions, H2H Transfers, Blood/Equipment, Ambulance) share a unified lifecycle:
```
[PENDING] ---> [ASSIGNED] ---> [ACCEPTED] ---> [COMPLETED] (Terminal)
    |              |
    v              v
[REJECTED] <-------+
    |
    v (Admin escalates)
[ASSIGNED (to System Doctor)] ---> [RESOLVED] (Terminal)
```

### Business Rules
1. Any transition to `REJECTED` **must** include a mandatory reason (`responseNotes`).
2. An `ACCEPTED` transition on admission/transfer triggers resource adjustments (e.g. decrementing available beds).
3. `COMPLETED` and `RESOLVED` are immutable terminal states.
4. Only the assigned driver can mark an ambulance request `ACCEPTED` / `COMPLETED`.
5. Only the assigned `System Doctor` can transition an escalated request to `RESOLVED`.

---

## 4. Strategic Differentiators & High-Impact Features (USPs)
1. **🚨 Emergency Mode Toggle**: One-touch view surfacing ambulance request, emergency blood match, nearest critical facilities, and live request status.
2. **🩸 Smart Blood Requirement Matching**: Query by `Blood Group + Units Required + Location + Urgency` with instant stock match.
3. **🚑 Multi-Step Ambulance Tracking**: Lifecycle progression (`Requested` → `Pending` → `Assigned` → `On the Way` → `Arrived` → `Completed`) with live simulated GPS mapping.
4. **🏥 Live Resource Synchronization**: Socket.io real-time broadcast of bed/ICU/ventilator/oxygen/blood updates across all active dashboards.
5. **⚖️ Admin & System Doctor Escalation Engine**: Guaranteed closure for unfulfilled emergency requests.
6. **📅 Clinic Appointment Intelligence**: Smart breakdown (Today's, Upcoming, Completed, Cancelled, No-Show).
7. **🔒 Privacy-First Administrative Records**: Patient administrative profiling without clinical diagnosis liability.

---

## 5. API Specification Summary

Base URL: `/api` | Headers: `Authorization: Bearer <JWT_TOKEN>`

### Authentication
- `POST /api/login` (Unified login for all 5 roles)
- `POST /api/patient/register`
- `POST /api/ambulance/register`

### Hospital & Resources
- `GET /api/hospitals` & `POST /api/hospital`
- `GET /api/hospital/:id` & `PUT /api/hospital/:id`
- `GET /api/hospital/:id/resources` & `PUT /api/hospital/:id/resources`
- `PUT /api/hospital/:id/bloodbank`
- `GET /api/hospital/:id/dashboard-summary`
- `POST|PUT|DELETE /api/hospital/:id/specialists(/:specialistId)`

### Patients & Ambulance
- `GET /api/patient/:id`
- `GET /api/ambulance` & `GET /api/ambulance/:id`

### Requests & Emergency Operations
- `POST /api/requests` (Admission, Transfer, Blood, Equipment, Ambulance)
- `GET /api/requests` (Auto-filtered by role and permissions)
- `PUT /api/requests/:id/status` (State transitions with validation & notes)

### Admin & Doctor Escalations
- `GET /api/admin/hospitals`, `/api/admin/system-doctors`, `/api/admin/patient-requests`
- `POST /api/admin/requests/:requestId/assign`
- `GET /api/doctor/assigned-requests`
- `PUT /api/doctor/requests/:requestId/resolve`

---

## 6. MVP Build Priority (FIT FEST Hackathon)
- **Must Have**: Patient registration, Appointment booking & status, Clinic dashboard, Ambulance request, Blood requirement search.
- **Strong USP**: Emergency Mode toggle, Multi-step ambulance tracking with map, Location-based facility/blood search.
- **Support / Admin**: Real-time Socket.io updates, RBAC enforcement, Admin/Doctor escalation workflow.
- **Optional Polish**: Follow-up reminders, Statistics, Visit history.
