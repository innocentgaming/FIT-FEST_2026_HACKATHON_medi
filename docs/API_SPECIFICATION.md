# MediLink CARE — Comprehensive API & Realtime Specification

**Base URL**: `https://medilink-backend-q2rh.onrender.com` (Production) / `http://localhost:5000` (Local)  
**API Prefix**: `/api`  
**Authentication**: JSON Web Token (`Authorization: Bearer <token>`)  
**Scope**: Healthcare Administrative & Resource Logistics Coordination (Non-Diagnostic)

---

## 1. Authentication & Identity Endpoints

### 1.1. Login
- **Endpoint**: `POST /api/login`
- **Access**: Public
- **Request Body**:
```json
{
  "identifier": "aarav@example.com", // or phone number "9876543210"
  "password": "patient123"
}
```
- **Success Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_patient_1",
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "phone": "9876543210",
    "role": "PATIENT",
    "bloodGroup": "B+",
    "emergencyContact": "Pooja Sharma (9876543211)",
    "address": "Kothrud, Pune, Maharashtra 411038"
  }
}
```

### 1.2. Patient Registration
- **Endpoint**: `POST /api/patient/register`
- **Access**: Public
- **Request Body**:
```json
{
  "name": "Rohan Gupta",
  "email": "rohan@example.com",
  "phone": "9822114455",
  "password": "password123",
  "bloodGroup": "O+",
  "emergencyContact": "Anita Gupta (9822114456)",
  "address": "Baner, Pune"
}
```
- **Success Response (201 Created)**: Returns created user payload and JWT token.

### 1.3. Patient Profile
- **Endpoint**: `GET /api/patient/profile`
- **Access**: `PATIENT`, `ADMIN`, `HOSPITAL`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (200 OK)**: Returns authenticated patient profile details.

---

## 2. Health & Regulatory Scope Probes

### 2.1. Root Health Check
- **Endpoint**: `GET /health`
- **Access**: Public
- **Response (200 OK)**:
```json
{
  "status": "HEALTHY",
  "service": "MediLink CARE",
  "timestamp": "2026-09-27T17:10:00.000Z"
}
```

### 2.2. Scope & Compliance Verification
- **Endpoint**: `GET /api/health`
- **Access**: Public
- **Response (200 OK)**:
```json
{
  "status": "HEALTHY",
  "service": "MediLink CARE Backend",
  "version": "1.0.0",
  "scope": "Healthcare Coordination & Administrative Management Only (No Diagnosis / No Treatment)",
  "timestamp": "2026-09-27T17:10:00.000Z"
}
```

---

## 3. Hospitals & Live Resource Telemetry

### 3.1. List All Hospitals
- **Endpoint**: `GET /api/hospitals`
- **Access**: Authenticated users
- **Query Parameters**:
  - `query`: Text search by hospital name or area
  - `bedType`: `icu`, `general`, `ventilator`, `oxygen`
  - `bloodGroup`: Filter by available stock (`A+`, `B+`, `O+`, etc.)
  - `specialist`: Filter by medical specialty (e.g., `Cardiology`)
- **Success Response (200 OK)**:
```json
{
  "total": 3,
  "hospitals": [
    {
      "id": "hosp_ruby_hall",
      "name": "Ruby Hall Clinic (Multi-Speciality)",
      "type": "Multi-Speciality Tertiary Care",
      "address": "40 Sassoon Road, Sangamvadi, Pune 411001",
      "city": "Pune",
      "area": "Sangamvadi / Station",
      "lat": 18.5314,
      "lng": 73.8765,
      "mapUrl": "https://www.google.com/maps/search/?api=1&query=18.5314,73.8765",
      "phone": "020-66455100",
      "emergencyHelpline": "1066 / 020-66455666",
      "resources": {
        "generalBedsTotal": 350,
        "generalBedsAvailable": 42,
        "icuBedsTotal": 60,
        "icuBedsAvailable": 8,
        "ventilatorsTotal": 30,
        "ventilatorsAvailable": 5,
        "oxygenCylindersTotal": 120,
        "oxygenCylindersAvailable": 34
      },
      "bloodBank": {
        "A+": 18, "A-": 5, "B+": 24, "B-": 6,
        "AB+": 9, "AB-": 3, "O+": 32, "O-": 8
      },
      "specialists": [
        { "id": "spec_1", "name": "Dr. A. Deshmukh", "specialty": "Cardiology", "timing": "10:00 AM - 02:00 PM", "status": "Available" }
      ]
    }
  ]
}
```

### 3.2. Update Live Resources
- **Endpoint**: `PUT /api/hospital/:id/resources`
- **Access**: `HOSPITAL` (Own facility), `ADMIN`
- **Request Body**:
```json
{
  "generalBedsAvailable": 45,
  "icuBedsAvailable": 10,
  "ventilatorsAvailable": 6,
  "oxygenCylindersAvailable": 35
}
```
- **Success Response (200 OK)**: Returns updated resource telemetry and broadcasts `resource:update` WebSocket event.

### 3.3. Update Blood Bank Stock
- **Endpoint**: `PUT /api/hospital/:id/bloodbank`
- **Access**: `HOSPITAL` (Own facility), `ADMIN`
- **Request Body**:
```json
{
  "B+": 26,
  "O-": 10
}
```
- **Success Response (200 OK)**: Returns updated blood bank inventory and broadcasts `blood:update` event.

---

## 4. Clinic Appointments

### 4.1. Book OPD Appointment
- **Endpoint**: `POST /api/appointments`
- **Access**: `PATIENT`, `HOSPITAL`, `ADMIN`
- **Request Body**:
```json
{
  "hospitalId": "hosp_ruby_hall",
  "date": "2026-10-15",
  "time": "11:30 AM",
  "purpose": "Routine Health OPD Checkup",
  "specialistName": "Dr. A. Deshmukh",
  "notes": "Patient scheduled consultation."
}
```
- **Validation Rules**: Past dates blocked (`HTTP 400`); Duplicate slot bookings blocked (`HTTP 400`).
- **Success Response (201 Created)**: Returns appointment in `SCHEDULED` status.

### 4.2. Update Appointment Status
- **Endpoint**: `PUT /api/appointments/:id/status`
- **Access**: `HOSPITAL`, `ADMIN`, `PATIENT` (cancel only)
- **Request Body**:
```json
{
  "status": "CONFIRMED", // SCHEDULED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW, FOLLOW_UP
  "note": "Slot confirmed by reception desk."
}
```

---

## 5. Unified Requests Engine & Emergency Mode

### 5.1. Create Emergency Requisition
- **Endpoint**: `POST /api/requests`
- **Access**: `PATIENT`, `HOSPITAL`, `ADMIN`
- **Request Body**:
```json
{
  "type": "AMBULANCE_REQUEST", // PATIENT_ADMISSION, HOSPITAL_TRANSFER, BLOOD_REQUEST, EQUIPMENT_REQUEST, AMBULANCE_REQUEST
  "priority": "CRITICAL",      // NORMAL, URGENT, CRITICAL
  "targetHospitalId": "hosp_ruby_hall",
  "pickupLocation": "Kothrud, Pune",
  "notes": "Severe emergency assistance required."
}
```
- **Success Response (201 Created)**: Automatically assigns nearest ambulance if available and transitions state to `ASSIGNED`.

### 5.2. Smart Blood Search
- **Endpoint**: `POST /api/requests/search-blood`
- **Access**: Authenticated users
- **Request Body**:
```json
{
  "bloodGroup": "B+",
  "units": 2,
  "location": "Pune",
  "urgency": "URGENT"
}
```
- **Success Response (200 OK)**: Returns facilities with verified stock $\ge$ requested units, sorted by proximity, with direct helpline and map link.

### 5.3. Update Request Status (State Machine)
- **Endpoint**: `PUT /api/requests/:id/status`
- **Access**: Authorized roles per state machine
- **Request Body**:
```json
{
  "status": "ACCEPTED", // PENDING -> ACCEPTED -> COMPLETED | PENDING -> REJECTED
  "responseNotes": "ICU Bed #4 allocated and confirmed."
}
```
- **Validation**: Rejections require mandatory `responseNotes` (`HTTP 400` if missing). `COMPLETED` and `RESOLVED` are terminal and immutable.

---

## 6. Ambulance Fleet & GPS Telemetry

### 6.1. Update Duty Status
- **Endpoint**: `PUT /api/ambulance/:id/status`
- **Access**: `AMBULANCE` (Own unit), `ADMIN`
- **Request Body**:
```json
{
  "status": "AVAILABLE" // AVAILABLE, ON_DUTY, OFFLINE
}
```

### 6.2. Stream GPS Telemetry
- **Endpoint**: `PUT /api/ambulance/:id/location`
- **Access**: `AMBULANCE` (Own unit)
- **Request Body**:
```json
{
  "lat": 18.5255,
  "lng": 73.8640,
  "speedKmph": 45,
  "heading": 90,
  "address": "Pune Emergency Corridor"
}
```
- **Success Response (200 OK)**: Broadcasts `ambulance:location` to connected patient and hospital radar.

---

## 7. Admin Triage & System Doctor Conflict Resolution

### 7.1. Admin Escalate Rejection
- **Endpoint**: `POST /api/admin/requests/:requestId/assign`
- **Access**: `ADMIN`
- **Request Body**:
```json
{
  "doctorId": "usr_doc_1"
}
```
- **Success Response (200 OK)**: Status advances from `REJECTED` $\to$ `ASSIGNED`.

### 7.2. System Doctor Resolve Conflict
- **Endpoint**: `PUT /api/doctor/requests/:requestId/resolve`
- **Access**: `SYSTEM_DOCTOR` (Assigned), `ADMIN`
- **Request Body**:
```json
{
  "alternativeHospitalId": "hosp_ruby_hall",
  "resolutionNotes": "Re-routed to Ruby Hall Clinic. Bed reserved."
}
```
- **Success Response (200 OK)**: Case reaches terminal `RESOLVED` status and dispatches instant push notification to the patient.

---

## 8. Realtime WebSocket Events Reference

| Event Name | Direction | Payload Description |
| :--- | :---: | :--- |
| `resource:update` | Server $\to$ Client | `{ hospitalId, resources: { generalBedsAvailable, icuBedsAvailable, ... } }` |
| `blood:update` | Server $\to$ Client | `{ hospitalId, bloodBank: { "A+": 18, "B+": 24, ... } }` |
| `ambulance:status` | Server $\to$ Client | `{ ambulanceId, status, vehicleNo }` |
| `ambulance:location` | Server $\to$ Client | `{ ambulanceId, lat, lng, speedKmph, address }` |
| `request:status_changed`| Server $\to$ Client | Sanitized request state update (PII stripped from global broadcasts) |
| `notification:new` | Server $\to$ Client | User-scoped instant toast notification alert |
