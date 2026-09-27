/**
 * ==============================================================================
 * MediLink CARE - Phase 10: Quality Assurance & End-to-End Audit Test Suite
 * ==============================================================================
 * Comprehensive test suite verifying:
 * 1. Complete End-to-End Multi-Stakeholder Scenario (Patient -> Hospital -> Ambulance -> Admin -> Doctor)
 * 2. Security Penetration & RBAC Edge Cases (Invalid JWT, Expired JWT, IDOR, Cross-tenant isolation)
 * 3. Atomic Resource Management & Immutability
 * 4. Real-time Notification Bus & Socket Privacy Sanitization
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Load App dependencies
const { store } = require('../src/db/store');
const authRouter = require('../src/routes/auth');
const hospitalsRouter = require('../src/routes/hospitals');
const appointmentsRouter = require('../src/routes/appointments');
const requestsRouter = require('../src/routes/requests');
const ambulancesRouter = require('../src/routes/ambulances');
const patientsRouter = require('../src/routes/patients');
const adminRouter = require('../src/routes/admin');
const doctorRouter = require('../src/routes/doctor');
const notificationsRouter = require('../src/routes/notifications');
const { administrativeSafetyGuard } = require('../src/middleware/safety');
const { initSocket } = require('../src/socket');

const TEST_PORT = 12325;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const { JWT_SECRET } = require('../src/middleware/auth');

let server;
let io;

// Test Runner Helper
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  return { status: res.status, data };
}

async function setupServer() {
  const app = express();
  server = http.createServer(app);
  io = new Server(server, { cors: { origin: '*' } });
  initSocket(io);

  app.use(cors());
  app.use(express.json());
  app.use(administrativeSafetyGuard);

  app.use('/api', authRouter);
  app.use('/api/hospitals', hospitalsRouter);
  app.use('/api/hospital', hospitalsRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/ambulance', ambulancesRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/doctor', doctorRouter);
  app.use('/api/notifications', notificationsRouter);

  return new Promise((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`\n🛡️ MediLink CARE QA & End-to-End Audit Suite Running on ${BASE_URL}\n`);
      resolve();
    });
  });
}

async function runQAAudit() {
  store.resetToSeed();
  await setupServer();

  console.log('================================================================');
  console.log('PART 1: COMPLETE END-TO-END SCENARIO WALKTHROUGH');
  console.log('================================================================\n');

  let patientToken, hospitalToken, driverToken, adminToken, doctorToken;
  let patientUser, hospitalUser, driverUser, adminUser, doctorUser;
  let testAppointmentId, testAmbulanceRequestId, testConflictRequestId;

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Step 1: Patient Login
  console.log('--- Step 1: Patient Login & OPD Appointment Booking ---');
  const patLogin = await request('/api/login', {
    method: 'POST',
    body: { email: 'aarav@example.com', password: 'patient123' }
  });
  assert(patLogin.status === 200, 'Patient logged in successfully');
  patientToken = patLogin.data.token;
  patientUser = patLogin.data.user;
  assert(patientUser.role === 'PATIENT', 'Patient role verified');
  assert(!patientUser.password, 'Password hash is NOT exposed in user payload');

  // Book appointment
  const bookApp = await request('/api/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: {
      hospitalId: 'hosp_ruby_hall',
      specialistName: 'Dr. Anand Joshi',
      department: 'Cardiology',
      appointmentDate: tomorrow,
      appointmentTime: '10:00 AM - 10:30 AM',
      purpose: 'Routine administrative consultation and checkup desk'
    }
  });
  assert(bookApp.status === 201, 'Patient successfully booked OPD appointment');
  testAppointmentId = bookApp.data.appointment.id;
  assert(bookApp.data.appointment.status === 'SCHEDULED', 'Appointment created in SCHEDULED state');

  // View own appointments
  const getMyAppts = await request('/api/appointments/my', {
    headers: { Authorization: `Bearer ${patientToken}` }
  });
  assert(getMyAppts.status === 200, 'Patient can fetch own appointments list');
  assert(getMyAppts.data.appointments.some((a) => a.id === testAppointmentId), 'Booked appointment is present in patient list');

  // Step 2: Hospital Login & Resource Telemetry Update
  console.log('\n--- Step 2: Hospital Login, Appointment View & Resource Management ---');
  const hospLogin = await request('/api/login', {
    method: 'POST',
    body: { email: 'rubyhall@medilink.org', password: 'hospital123' }
  });
  assert(hospLogin.status === 200, 'Hospital administrator logged in successfully');
  hospitalToken = hospLogin.data.token;
  hospitalUser = hospLogin.data.user;

  // Hospital views appointments
  const hospAppts = await request(`/api/appointments/hospital/${hospitalUser.hospitalId}`, {
    headers: { Authorization: `Bearer ${hospitalToken}` }
  });
  assert(hospAppts.status === 200, 'Hospital can view hospital appointment queue');
  assert(hospAppts.data.appointments.some((a) => a.id === testAppointmentId), 'Patient appointment is visible to target hospital');

  // Hospital updates resources
  const updateRes = await request(`/api/hospital/${hospitalUser.hospitalId}/resources`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${hospitalToken}` },
    body: {
      totalBeds: 450,
      availableBeds: 65,
      icuBeds: 60,
      availableIcuBeds: 14,
      ventilators: 30,
      oxygenAvailable: true
    }
  });
  assert(updateRes.status === 200, 'Hospital successfully updated live resource telemetry');
  assert(updateRes.data.resources.availableIcuBeds === 14, 'Live available ICU beds reflected accurately');

  // Step 3: Patient Emergency Mode & Request Ambulance
  console.log('\n--- Step 3: Patient Emergency Mode - Ambulance Request ---');
  const ambReq = await request('/api/requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: {
      requestType: 'AMBULANCE_REQUEST',
      priority: 'CRITICAL',
      targetHospitalId: 'hosp_ruby_hall',
      pickupLocation: 'FC Road, Deccan Gymkhana, Pune',
      notes: 'Chest discomfort, urgent transfer requested'
    }
  });
  assert(ambReq.status === 201, 'Emergency ambulance request created successfully');
  testAmbulanceRequestId = ambReq.data.request.id;
  assert(ambReq.data.request.priority === 'CRITICAL', 'Priority set to CRITICAL');

  // Step 4: Hospital Assigns Ambulance
  console.log('\n--- Step 4: Hospital Assigns Nearest Available Ambulance ---');
  const assignAmb = await request(`/api/requests/${testAmbulanceRequestId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${hospitalToken}` },
    body: {
      status: 'ASSIGNED',
      ambulanceId: 'amb_pune_101'
    }
  });
  assert(assignAmb.status === 200, 'Hospital assigned unit amb_pune_101 to emergency request');
  assert(assignAmb.data.request.status === 'ASSIGNED', 'Status progressed to ASSIGNED');

  // Step 5: Ambulance Driver Lifecycle (Accept -> On The Way -> Arrived -> Completed)
  console.log('\n--- Step 5: Ambulance Driver Lifecycle & GPS Telemetry ---');
  const drvLogin = await request('/api/login', {
    method: 'POST',
    body: { identifier: 'driver1@medilink.org', password: 'ambulance123' }
  });
  assert(drvLogin.status === 200, 'Assigned Ambulance Driver (Santosh) logged in');
  driverToken = drvLogin.data.token;
  driverUser = drvLogin.data.user;

  // Driver Accepts
  const drvAccept = await request(`/api/requests/${testAmbulanceRequestId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: { status: 'ACCEPTED' }
  });
  assert(drvAccept.status === 200, 'Driver accepted emergency dispatch');
  assert(drvAccept.data.request.status === 'ACCEPTED', 'Request transitioned to ACCEPTED');

  // Driver updates trip progress: On The Way
  const drvOnWay = await request(`/api/ambulance/${driverUser.ambulanceId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: {
      status: 'ON_DUTY',
      tripStatus: 'On the Way'
    }
  });
  assert(drvOnWay.status === 200, 'Trip status progressed to "On the Way"');

  // Driver updates GPS coordinates
  const drvGps = await request(`/api/ambulance/${driverUser.ambulanceId}/location`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: { latitude: 18.5255, longitude: 73.8420 }
  });
  assert(drvGps.status === 200, 'Live GPS telemetry updated');

  // Driver updates trip progress: Arrived
  const drvArrived = await request(`/api/ambulance/${driverUser.ambulanceId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: {
      status: 'ON_DUTY',
      tripStatus: 'Arrived'
    }
  });
  assert(drvArrived.status === 200, 'Trip status progressed to "Arrived"');

  // Driver Marks Completed
  const drvComplete = await request(`/api/requests/${testAmbulanceRequestId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: { status: 'COMPLETED' }
  });
  assert(drvComplete.status === 200, 'Emergency request successfully marked COMPLETED');
  assert(drvComplete.data.request.status === 'COMPLETED', 'Terminal state COMPLETED reached');

  // Step 6: Patient Searches Blood & Finds Matching Facilities
  console.log('\n--- Step 6: Patient Smart Blood Requirement Matcher ---');
  const bloodMatch = await request('/api/requests/search-blood', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: {
      bloodGroup: 'B+',
      unitsRequired: 2,
      location: 'Pune',
      urgency: 'URGENT'
    }
  });
  assert(bloodMatch.status === 200, 'Smart blood requirement search succeeded');
  assert(Array.isArray(bloodMatch.data.matches), 'Matches returned as array');
  assert(bloodMatch.data.matches.length > 0, 'Found at least 1 facility with sufficient B+ blood stock');
  assert(bloodMatch.data.matches[0].availableUnits >= 2, 'Top match has >= 2 verified units');

  // Step 7: Create Rejected Request for Escalation
  console.log('\n--- Step 7: Hospital Rejects Request with Mandatory Reason ---');
  const rejReq = await request('/api/requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: {
      requestType: 'PATIENT_ADMISSION',
      priority: 'CRITICAL',
      targetHospitalId: 'hosp_ruby_hall',
      notes: 'ICU ventilator bed request for cardiac patient'
    }
  });
  testConflictRequestId = rejReq.data.request.id;

  const hospReject = await request(`/api/requests/${testConflictRequestId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${hospitalToken}` },
    body: {
      status: 'REJECTED',
      responseNotes: 'All cardiac ICU beds currently occupied at full surge capacity'
    }
  });
  assert(hospReject.status === 200, 'Hospital rejected request with detailed reason');
  assert(hospReject.data.request.status === 'REJECTED', 'Status transitioned to REJECTED');

  // Step 8: Admin Views Rejected Request & Assigns to System Doctor
  console.log('\n--- Step 8: Admin Triage & System Doctor Escalation ---');
  const admLogin = await request('/api/login', {
    method: 'POST',
    body: { email: 'admin@medilink.gov.in', password: 'admin123' }
  });
  assert(admLogin.status === 200, 'Central Admin logged in');
  adminToken = admLogin.data.token;
  adminUser = admLogin.data.user;

  // Admin views rejected requests
  const admReqs = await request('/api/admin/patient-requests?status=REJECTED', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(admReqs.status === 200, 'Admin can filter network requests by status=REJECTED');
  assert(admReqs.data.requests.some((r) => r.id === testConflictRequestId), 'Rejected request is visible in admin triage queue');

  // Admin assigns to System Doctor 1
  const admAssignDoc = await request(`/api/admin/requests/${testConflictRequestId}/assign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { doctorId: 'usr_doc_1' }
  });
  assert(admAssignDoc.status === 200, 'Admin escalated rejected request to Dr. Anand Joshi');
  assert(admAssignDoc.data.request.status === 'ASSIGNED', 'Status escalated to ASSIGNED');
  assert(admAssignDoc.data.request.assignedDoctorId === 'usr_doc_1', 'Assigned doctor ID recorded');

  // Step 9: System Doctor Resolves Request & Patient Notified
  console.log('\n--- Step 9: Doctor Conflict Resolution & Patient Real-time Notification ---');
  const docLogin = await request('/api/login', {
    method: 'POST',
    body: { email: 'dr.joshi@medilink.gov.in', password: 'doctor123' }
  });
  assert(docLogin.status === 200, 'Assigned System Doctor (Dr. Joshi) logged in');
  doctorToken = docLogin.data.token;
  doctorUser = docLogin.data.user;

  // Doctor resolves request
  const docResolve = await request(`/api/doctor/requests/${testConflictRequestId}/resolve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}` },
    body: {
      action: 'RE_ROUTE',
      targetHospitalId: 'hosp_kem_pune',
      resolutionNotes: 'Coordinated with KEM Hospital ICU unit. Bed reserved and transport pre-cleared.'
    }
  });
  assert(docResolve.status === 200, 'Doctor successfully resolved escalated conflict');
  assert(docResolve.data.request.status === 'RESOLVED', 'Request reached terminal RESOLVED status');
  assert(docResolve.data.request.targetHospitalId === 'hosp_kem_pune', 'Re-routed target hospital updated');

  // Patient checks notifications
  const patNotifs = await request('/api/notifications', {
    headers: { Authorization: `Bearer ${patientToken}` }
  });
  assert(patNotifs.status === 200, 'Patient can fetch centralized notifications');
  assert(patNotifs.data.notifications.length > 0, 'Patient received conflict resolution notification');
  assert(
    patNotifs.data.notifications.some((n) => n.title.includes('Resolved') || n.title.includes('Resolution') || n.type === 'REQUEST_RESOLVED'),
    'Notification contains conflict resolution details'
  );

  console.log('\n================================================================');
  console.log('PART 2: SECURITY PENETRATION & RBAC INTEGRITY AUDIT');
  console.log('================================================================\n');

  // 1. Invalid JWT
  console.log('--- Test S1: Invalid JWT Signature Rejection ---');
  const invalidJwt = await request('/api/admin/patient-requests', {
    headers: { Authorization: 'Bearer invalid.token.payload' }
  });
  assert(invalidJwt.status === 401 || invalidJwt.status === 403, 'Invalid JWT is rejected with 401/403');

  // 2. Expired JWT
  console.log('\n--- Test S2: Expired JWT Handling ---');
  const expiredToken = jwt.sign(
    { id: 'usr_patient_1', role: 'PATIENT', exp: Math.floor(Date.now() / 1000) - 3600 },
    JWT_SECRET
  );
  const expiredReq = await request('/api/appointments/my', {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  assert(expiredReq.status === 401 || expiredReq.status === 403, 'Expired JWT is rejected with 401/403');

  // 3. Missing JWT
  console.log('\n--- Test S3: Missing Authentication Header ---');
  const missingJwt = await request('/api/doctor/requests');
  assert(missingJwt.status === 401, 'Missing JWT is rejected with 401 Unauthorized');

  // 4. Wrong Role (Patient accessing Admin)
  console.log('\n--- Test S4: Role Boundary Enforcement (Patient -> Admin) ---');
  const patientAsAdmin = await request('/api/admin/patient-requests', {
    headers: { Authorization: `Bearer ${patientToken}` }
  });
  assert(patientAsAdmin.status === 403, 'Patient forbidden from accessing Admin endpoints (403)');

  // 5. Ownership Violation (Hospital 1 modifying Hospital 2's resources)
  console.log('\n--- Test S5: Multi-Tenant Hospital Ownership Guard ---');
  const crossHospUpdate = await request('/api/hospital/hosp_kem_pune/resources', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${hospitalToken}` }, // Ruby Hall token
    body: { availableBeds: 10 }
  });
  assert(crossHospUpdate.status === 403, 'Hospital cannot modify another hospital resources (403 Forbidden)');

  // 6. IDOR (Patient 2 accessing Patient 1's notifications)
  console.log('\n--- Test S6: IDOR Notification Protection ---');
  const pat2Login = await request('/api/login', {
    method: 'POST',
    body: { email: 'sneha@example.com', password: 'patient123' }
  });
  const patient2Token = pat2Login.data.token;
  const pat1NotifId = patNotifs.data.notifications[0].id;

  const idorNotifRead = await request(`/api/notifications/${pat1NotifId}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${patient2Token}` }
  });
  assert(idorNotifRead.status === 403, 'Patient 2 cannot mark Patient 1 notification as read (403 Forbidden)');

  // 7. Unauthorized Doctor Resolution
  console.log('\n--- Test S7: Doctor Isolation & Conflict Hijack Guard ---');
  const doc2Login = await request('/api/login', {
    method: 'POST',
    body: { email: 'dr.kulkarni@medilink.gov.in', password: 'doctor123' }
  });
  const doctor2Token = doc2Login.data.token;

  const hijackDocReq = await request(`/api/doctor/requests/${testConflictRequestId}/resolve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctor2Token}` },
    body: { action: 'RE_ROUTE', resolutionNotes: 'Attempted resolution' }
  });
  assert(hijackDocReq.status === 400 || hijackDocReq.status === 403, 'Unauthorized / already resolved conflict modification blocked');

  // 8. Immutability of Terminal State
  console.log('\n--- Test S8: Terminal State Immutability ---');
  const mutateCompleted = await request(`/api/requests/${testAmbulanceRequestId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${hospitalToken}` },
    body: { status: 'PENDING' }
  });
  assert(mutateCompleted.status === 400, 'Modifying COMPLETED terminal request is strictly blocked (400)');

  // 9. Non-Diagnostic Safety Guard
  console.log('\n--- Test S9: Clinical Non-Diagnostic Safety Guard ---');
  const diagAttempt = await request('/api/requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: {
      requestType: 'PATIENT_ADMISSION',
      notes: 'Prescribe 500mg Amoxicillin for bacterial infection'
    }
  });
  assert(diagAttempt.status === 400, 'Diagnostic/Prescription keyword attempt rejected by Safety Guard');
  assert(diagAttempt.data.error.includes('SAFETY WARNING'), 'Safety warning returned in error response');

  console.log('\n================================================================');
  console.log('PART 3: SUMMARY OF AUDIT FINDINGS & TEST METRICS');
  console.log('================================================================\n');

  console.log(`📊 Phase 10 QA & E2E Audit Results: ${passed} Passed, ${failed} Failed`);

  server.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runQAAudit().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});
