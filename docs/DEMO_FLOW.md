# 🎬 MediLink CARE — Judge Demonstration Flow (3–5 Minutes)
> Step-by-step interactive walk-through for hackathon evaluators and judges.

---

## ⏱️ Demonstration Timeline & Sequence

| Step | Time | Action & Screen | What the Judge Sees |
| :---: | :---: | :--- | :--- |
| **1** | `0:00` | **Open MediLink CARE** | Clean, trustworthy healthcare SaaS landing dashboard with 10-second hero clarity displaying the 5 Core Operational Pillars. |
| **2** | `0:15` | **Patient Login** | Click **"Patient"** in the top Quick Role Switcher (or enter `9876543210` / `patient123`). Aarav Sharma's dashboard loads. |
| **3** | `0:30` | **Show Appointment Dashboard** | Navigate to the **Appointments** tab. View past OPD consultation history, upcoming slots, and doctor specialties. |
| **4** | `0:50` | **Book Appointment** | Click **"Book Appointment"**. Select Ruby Hall Clinic, Dr. Anand Joshi (Cardiology), choose a future slot, and confirm. Real-time confirmation badge appears. |
| **5** | `1:10` | **Switch to Hospital Dashboard** | Click **"Hospital"** in top switcher. Ruby Hall Clinic dashboard opens with live operational capacity (Total Beds, ICU, Ventilators, Oxygen). |
| **6** | `1:30` | **Update Resource Telemetry** | Go to **Resources** tab. Increase Available ICU beds from `12` $\rightarrow$ `15`. Socket.io instantly synchronizes across all connected browser clients. |
| **7** | `1:45` | **Smart Blood Bank Search** | Switch to **Blood Bank** tab. Show the 8-group stock matrix (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`). Switch back to Patient and query `B+` blood $\rightarrow$ matching facility appears. |
| **8** | `2:05` | **Activate 🚨 EMERGENCY MODE** | Click the prominent **[ 🚨 EMERGENCY MODE ]** button in the header. High-contrast Emergency Command Center loads with 4 major actions. |
| **9** | `2:20` | **Request Ambulance** | Click **"Request Ambulance"**. System computes nearest available fleet unit (`amb_pune_101` at Ruby Hall) and creates a `CRITICAL` priority request. |
| **10** | `2:40` | **Hospital Assigns Ambulance** | In Hospital Portal under **Requests**, hospital assigns `MH-12-CR-1011` to the emergency. Request transitions to `ASSIGNED`. |
| **11** | `2:55` | **Ambulance Driver Accepts** | Switch to **Ambulance Driver** (`Santosh Shinde`). Driver sees dispatch banner with pickup address, clicks **"Accept Dispatch"** (`ON_DUTY`). |
| **12** | `3:15` | **Show Live Tracking & GPS** | Driver clicks **"Start Location Sharing"** and advances trip state to `On the Way`. On Patient's screen, the 7-step visual stepper and Leaflet GPS radar advance in real-time. |
| **13** | `3:35` | **Complete Emergency Request** | Driver advances trip to `Arrived`, then marks `COMPLETED`. Unit automatically resets to `AVAILABLE`. Request enters immutable terminal state. |
| **14** | `3:55` | **Demonstrate Rejected Request** | Patient submits a surge admission request to KEM Hospital. KEM rejects citing ICU surge capacity with mandatory reason notes (`REJECTED`). |
| **15** | `4:15` | **Admin Escalation Triage** | Switch to **Admin** (`State Health Command`). Admin filters network triage table by `REJECTED`, reviews case, and clicks **"Assign to System Doctor"** (`ASSIGNED`). |
| **16** | `4:35` | **Doctor Conflict Resolution** | Switch to **Doctor** (`Dr. Anand Joshi`). Doctor views isolated queue, re-routes patient to Ruby Hall ICU, adds comprehensive clinical transport notes, and marks `RESOLVED`. |
| **17** | `4:50` | **Realtime Notification Delivery** | Switch back to Patient. The Notification Bell rings with a badge count, showing the instant conflict resolution notification with transport clearance details. |

---

## 🔑 Demo Credentials Cheat-Sheet

| Role | 1-Click Navbar Button | Manual Identifier | Password |
| :--- | :--- | :--- | :--- |
| **Patient** | `👤 Patient` | `9876543210` | `patient123` |
| **Hospital** | `🏥 Hospital` | `rubyhall@medilink.org` | `hospital123` |
| **Ambulance** | `🚑 Ambulance` | `9822012345` | `ambulance123` |
| **Admin** | `⚖️ Admin` | `admin@medilink.gov.in` | `admin123` |
| **Doctor** | `🩺 Doctor` | `dr.joshi@medilink.gov.in` | `doctor123` |
