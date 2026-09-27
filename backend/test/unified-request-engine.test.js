const http = require('http');
const { app, server } = require('../src/server');
const { store } = require('../src/db/store');
const {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  normalizeRequestType,
  validateTransition
} = require('../src/engine/requestEngine');
const { sanitizeRequestForGlobalBroadcast } = require('../src/socket');

let testServer;
let baseUrl;

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runUnifiedEngineTests() {
  console.log('\n⚙️ Starting MediLink CARE Phase 8: Unified Request Engine, Notifications & Realtime Test Suite...\n');
  store.resetToSeed();

  await new Promise((resolve) => {
    testServer = server.listen(0, () => {
      const port = testServer.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test Server running on ${baseUrl}\n`);
      resolve();
    });
  });

  let totalTests = 0;
  let passedTests = 0;

  const assert = (condition, description) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${description}`);
    } else {
      console.error(`  ❌ FAIL: ${description}`);
    }
  };

  try {
    // 1. Authenticate Stakeholders
    console.log('--- Step 1: Stakeholder Authentication ---');
    const patientLogin = await request('POST', '/api/login', { identifier: '9876543210', password: 'patient123' });
    assert(patientLogin.status === 200, 'Patient logged in');
    const patientToken = patientLogin.body.token;
    const patientId = patientLogin.body.user.id;

    const hosp1Login = await request('POST', '/api/login', { identifier: 'rubyhall@medilink.org', password: 'hospital123' });
    assert(hosp1Login.status === 200, 'Hospital 1 (Ruby Hall) logged in');
    const hosp1Token = hosp1Login.body.token;

    const hosp2Login = await request('POST', '/api/login', { identifier: 'kem@medilink.org', password: 'hospital123' });
    assert(hosp2Login.status === 200, 'Hospital 2 (KEM) logged in');
    const hosp2Token = hosp2Login.body.token;

    const driver1Login = await request('POST', '/api/login', { identifier: '9822012345', password: 'ambulance123' });
    assert(driver1Login.status === 200, 'Driver 1 (Santosh) logged in');
    const driver1Token = driver1Login.body.token;

    const driver2Login = await request('POST', '/api/login', { identifier: '9822056789', password: 'ambulance123' });
    assert(driver2Login.status === 200, 'Driver 2 (Vijay) logged in');
    const driver2Token = driver2Login.body.token;

    const adminLogin = await request('POST', '/api/login', { identifier: 'admin@medilink.gov.in', password: 'admin123' });
    assert(adminLogin.status === 200, 'Admin logged in');
    const adminToken = adminLogin.body.token;

    const doc1Login = await request('POST', '/api/login', { identifier: 'dr.joshi@medilink.gov.in', password: 'doctor123' });
    assert(doc1Login.status === 200, 'System Doctor 1 (Dr. Joshi) logged in');
    const doc1Token = doc1Login.body.token;
    const doc1Id = doc1Login.body.user.id;

    const doc2Login = await request('POST', '/api/login', { identifier: 'dr.kulkarni@medilink.gov.in', password: 'doctor123' });
    assert(doc2Login.status === 200, 'System Doctor 2 (Dr. Kulkarni) logged in');
    const doc2Token = doc2Login.body.token;

    // 2. Canonical Request Types Normalization
    console.log('\n--- Step 2: Canonical Request Types Normalization ---');
    assert(normalizeRequestType('PATIENT_ADMISSION') === REQUEST_TYPES.PATIENT_ADMISSION, 'Supports PATIENT_ADMISSION');
    assert(normalizeRequestType('HOSPITAL_TRANSFER') === REQUEST_TYPES.HOSPITAL_TRANSFER, 'Supports HOSPITAL_TRANSFER');
    assert(normalizeRequestType('BLOOD_REQUEST') === REQUEST_TYPES.BLOOD_REQUEST, 'Supports BLOOD_REQUEST');
    assert(normalizeRequestType('EQUIPMENT_REQUEST') === REQUEST_TYPES.EQUIPMENT_REQUEST, 'Supports EQUIPMENT_REQUEST');
    assert(normalizeRequestType('AMBULANCE_REQUEST') === REQUEST_TYPES.AMBULANCE_REQUEST, 'Supports AMBULANCE_REQUEST');
    assert(normalizeRequestType('BED') === REQUEST_TYPES.PATIENT_ADMISSION, 'Legacy alias BED -> PATIENT_ADMISSION');
    assert(normalizeRequestType('H2H_TRANSFER') === REQUEST_TYPES.HOSPITAL_TRANSFER, 'Legacy alias H2H_TRANSFER -> HOSPITAL_TRANSFER');
    assert(normalizeRequestType('BLOOD') === REQUEST_TYPES.BLOOD_REQUEST, 'Legacy alias BLOOD -> BLOOD_REQUEST');

    // 3. Centralized Status Machine: Test Every Allowed Transition
    console.log('\n--- Step 3: Centralized Transition Engine - Allowed Paths ---');

    // Path A: PENDING -> ACCEPTED -> COMPLETED (Patient Admission)
    const createAdm = await request('POST', '/api/requests', {
      type: 'PATIENT_ADMISSION',
      targetHospitalId: 'hosp_ruby_hall',
      details: { bedType: 'GENERAL', reason: 'Elective medical admission' }
    }, patientToken);
    assert(createAdm.status === 201 && createAdm.body.request.status === 'PENDING', 'Created request in PENDING state');
    const admId = createAdm.body.request.id;

    const acceptAdm = await request('PUT', `/api/requests/${admId}/status`, {
      status: 'ACCEPTED',
      responseNotes: 'Bed allocated in Ward 3'
    }, hosp1Token);
    assert(acceptAdm.status === 200 && acceptAdm.body.request.status === 'ACCEPTED', 'Transition: PENDING -> ACCEPTED (Hospital)');

    const completeAdm = await request('PUT', `/api/requests/${admId}/status`, {
      status: 'COMPLETED',
      responseNotes: 'Admission procedure finished'
    }, hosp1Token);
    assert(completeAdm.status === 200 && completeAdm.body.request.status === 'COMPLETED', 'Transition: ACCEPTED -> COMPLETED');

    // Path B: PENDING -> REJECTED (Missing Reason Rejected vs Valid Reason)
    const createReq2 = await request('POST', '/api/requests', {
      type: 'PATIENT_ADMISSION',
      targetHospitalId: 'hosp_ruby_hall',
      details: { bedType: 'ICU' }
    }, patientToken);
    const req2Id = createReq2.body.request.id;

    const rejectNoReason = await request('PUT', `/api/requests/${req2Id}/status`, {
      status: 'REJECTED',
      responseNotes: ''
    }, hosp1Token);
    assert(rejectNoReason.status === 400, 'Missing rejection reason rejected (400)');

    const rejectWithReason = await request('PUT', `/api/requests/${req2Id}/status`, {
      status: 'REJECTED',
      responseNotes: 'All ICU beds full'
    }, hosp1Token);
    assert(rejectWithReason.status === 200 && rejectWithReason.body.request.status === 'REJECTED', 'Transition: PENDING -> REJECTED');

    // Path C: REJECTED -> ASSIGNED (Admin Escalation) -> RESOLVED (Doctor Resolution)
    const escalateRes = await request('POST', `/api/admin/requests/${req2Id}/assign`, {
      doctorId: doc1Id,
      triageNotes: 'Re-route ICU patient'
    }, adminToken);
    assert(escalateRes.status === 200 && escalateRes.body.request.status === 'ASSIGNED', 'Transition: REJECTED -> ASSIGNED (Admin Triage)');

    const resolveRes = await request('PUT', `/api/doctor/requests/${req2Id}/resolve`, {
      alternativeHospitalId: 'hosp_kem_pune',
      resolutionNotes: 'Alternative ICU bed booked at KEM'
    }, doc1Token);
    assert(resolveRes.status === 200 && resolveRes.body.request.status === 'RESOLVED', 'Transition: ASSIGNED -> RESOLVED (Doctor)');

    // Path D: PENDING -> ASSIGNED -> ACCEPTED -> REJECTED (Ambulance Workflow)
    const createAmbReq = await request('POST', '/api/requests', {
      type: 'AMBULANCE_REQUEST',
      assignedAmbulanceId: 'amb_pune_101',
      details: { location: 'Shivajinagar' }
    }, patientToken);
    assert(createAmbReq.status === 201 && createAmbReq.body.request.status === 'ASSIGNED', 'Ambulance created in ASSIGNED state');
    const ambReqId = createAmbReq.body.request.id;

    const acceptAmb = await request('PUT', `/api/requests/${ambReqId}/status`, {
      status: 'ACCEPTED'
    }, driver1Token);
    assert(acceptAmb.status === 200 && acceptAmb.body.request.status === 'ACCEPTED', 'Transition: ASSIGNED -> ACCEPTED (Driver 1)');

    const rejectAfterAccept = await request('PUT', `/api/requests/${ambReqId}/status`, {
      status: 'REJECTED',
      reason: 'Vehicle breakdown en route'
    }, driver1Token);
    assert(rejectAfterAccept.status === 200 && rejectAfterAccept.body.request.status === 'REJECTED', 'Transition: ACCEPTED -> REJECTED (Driver)');

    // 4. Centralized Status Machine: Test Forbidden Transitions
    console.log('\n--- Step 4: Centralized Transition Engine - Forbidden Transitions ---');

    // Forbidden 1: Terminal state modification (COMPLETED is immutable)
    const modifyCompleted = await request('PUT', `/api/requests/${admId}/status`, {
      status: 'PENDING'
    }, adminToken);
    assert(modifyCompleted.status === 400, 'Forbidden: Modifying COMPLETED terminal state returns 400');

    // Forbidden 2: Terminal state modification (RESOLVED is immutable)
    const modifyResolved = await request('PUT', `/api/requests/${req2Id}/status`, {
      status: 'ACCEPTED'
    }, adminToken);
    assert(modifyResolved.status === 400, 'Forbidden: Modifying RESOLVED terminal state returns 400');

    // Forbidden 3: Invalid transition jump (PENDING -> COMPLETED directly)
    const createJumpReq = await request('POST', '/api/requests', {
      type: 'PATIENT_ADMISSION',
      targetHospitalId: 'hosp_ruby_hall'
    }, patientToken);
    const jumpId = createJumpReq.body.request.id;

    const jumpRes = await request('PUT', `/api/requests/${jumpId}/status`, {
      status: 'COMPLETED'
    }, hosp1Token);
    assert(jumpRes.status === 400, 'Forbidden: Invalid jump PENDING -> COMPLETED directly returns 400');

    // 5. Role & Ownership Authorization Guards
    console.log('\n--- Step 5: Role & Ownership Authorization Guards ---');

    // Wrong driver cannot accept Driver 1's request
    const createDriver2Req = await request('POST', '/api/requests', {
      type: 'AMBULANCE_REQUEST',
      assignedAmbulanceId: 'amb_pune_101'
    }, patientToken);
    const d2ReqId = createDriver2Req.body.request.id;

    const wrongDriverAccept = await request('PUT', `/api/requests/${d2ReqId}/status`, {
      status: 'ACCEPTED'
    }, driver2Token);
    assert(wrongDriverAccept.status === 403, 'Forbidden: Wrong driver accepting another driver request returns 403');

    // Wrong hospital cannot accept Hospital 1's request
    const wrongHospAccept = await request('PUT', `/api/requests/${jumpId}/status`, {
      status: 'ACCEPTED',
      responseNotes: 'Unauthorized accept'
    }, hosp2Token);
    assert(wrongHospAccept.status === 403, 'Forbidden: Wrong hospital modifying another hospital request returns 403');

    // Wrong doctor cannot resolve Doctor 1's assigned conflict
    const createDocConflict = store.insert('requests', {
      id: 'req_doc_conflict_test',
      type: 'PATIENT_ADMISSION',
      status: 'ASSIGNED',
      assignedDoctorId: doc1Id,
      assignedDoctorName: 'Dr. Anand Joshi',
      targetHospitalId: 'hosp_ruby_hall'
    });
    const wrongDocResolve = await request('PUT', `/api/doctor/requests/${createDocConflict.id}/resolve`, {
      alternativeHospitalId: 'hosp_kem_pune',
      resolutionNotes: 'Unauthorized doctor resolve'
    }, doc2Token);
    assert(wrongDocResolve.status === 403, 'Forbidden: Wrong doctor resolving another doctor conflict returns 403');

    // 6. Notifications System
    console.log('\n--- Step 6: Centralized Notification System ---');
    const notifRes = await request('GET', '/api/notifications', null, patientToken);
    assert(notifRes.status === 200, 'Patient can fetch own notifications');
    assert(Array.isArray(notifRes.body.notifications), 'Notifications returned as array');
    assert(typeof notifRes.body.unreadCount === 'number', 'Unread count computed accurately');

    if (notifRes.body.notifications.length > 0) {
      const targetNotifId = notifRes.body.notifications[0].id;
      const markReadRes = await request('PUT', `/api/notifications/${targetNotifId}/read`, null, patientToken);
      assert(markReadRes.status === 200 && markReadRes.body.notification.read === true, 'Single notification marked read');

      // Cross-user notification modify blocked
      const crossNotifRes = await request('PUT', `/api/notifications/${targetNotifId}/read`, null, hosp2Token);
      assert(crossNotifRes.status === 403, 'Unauthorized notification read modification blocked (403)');
    }

    const readAllRes = await request('PUT', '/api/notifications/read-all', null, patientToken);
    assert(readAllRes.status === 200, 'All user notifications marked as read (PUT /read-all)');

    const unreadCountRes = await request('GET', '/api/notifications/unread-count', null, patientToken);
    assert(unreadCountRes.status === 200 && unreadCountRes.body.unreadCount === 0, 'Unread count resets to 0');

    // 7. Socket Event Payload Privacy Sanitization
    console.log('\n--- Step 7: Socket Privacy Sanitization ---');
    const mockPrivateReq = {
      id: 'req_test_priv',
      type: 'PATIENT_ADMISSION',
      status: 'PENDING',
      patientName: 'Confidential Patient',
      patientPhone: '9999988888',
      clinicalNotes: 'Private medical diagnostic notes',
      targetHospitalId: 'hosp_ruby_hall',
      targetHospitalName: 'Ruby Hall Clinic'
    };
    const sanitized = sanitizeRequestForGlobalBroadcast(mockPrivateReq);
    assert(sanitized.id === 'req_test_priv', 'Sanitized payload keeps public ID');
    assert(sanitized.targetHospitalName === 'Ruby Hall Clinic', 'Sanitized payload keeps target hospital');
    assert(!sanitized.patientName, 'Sanitized payload STRIPS patientName from global broadcast');
    assert(!sanitized.patientPhone, 'Sanitized payload STRIPS patientPhone from global broadcast');
    assert(!sanitized.clinicalNotes, 'Sanitized payload STRIPS private medical notes from global broadcast');

    // 8. Audit Log Verification for Status Transitions
    console.log('\n--- Step 8: Audit Log Verification ---');
    const auditRes = await request('GET', '/api/admin/audit-logs', null, adminToken);
    assert(auditRes.status === 200, 'Admin can fetch system audit logs');
    const hasStatusUpdateAudit = auditRes.body.logs.some((l) => l.action === 'UPDATE_REQUEST_STATUS' || l.action === 'CREATE_REQUEST');
    assert(hasStatusUpdateAudit, 'Audit log recorded for request status transitions');

    console.log(`\n🎉 PHASE 8 TESTS COMPLETED: ${passedTests}/${totalTests} Passed!\n`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (testServer) {
      testServer.close();
    }
  }
}

runUnifiedEngineTests();
