const http = require('http');
const { app, server } = require('../src/server');
const { store } = require('../src/db/store');

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

async function runEscalationTests() {
  console.log('\n⚖️ Starting MediLink CARE Phase 7: Admin Escalation & System Doctor Conflict Resolution Test Suite...\n');
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
    // 1. Authenticate users using seed credentials
    console.log('--- Step 1: Role Authentication ---');
    const adminLogin = await request('POST', '/api/login', {
      identifier: 'admin@medilink.gov.in',
      password: 'admin123'
    });
    assert(adminLogin.status === 200 && adminLogin.body.token, 'Admin logged in successfully');
    const adminToken = adminLogin.body.token;

    const doctor1Login = await request('POST', '/api/login', {
      identifier: 'dr.joshi@medilink.gov.in',
      password: 'doctor123'
    });
    assert(doctor1Login.status === 200 && doctor1Login.body.token, 'System Doctor 1 (Dr. Anand Joshi) logged in');
    const doctor1Token = doctor1Login.body.token;
    const doctor1Id = doctor1Login.body.user.id;

    // Login second System Doctor for wrong-doctor isolation tests
    const doctor2Login = await request('POST', '/api/login', {
      identifier: 'dr.kulkarni@medilink.gov.in',
      password: 'doctor123'
    });
    assert(doctor2Login.status === 200 && doctor2Login.body.token, 'System Doctor 2 (Dr. Meera Kulkarni) logged in');
    const doctor2Token = doctor2Login.body.token;
    const doctor2Id = doctor2Login.body.user.id;

    const patientLogin = await request('POST', '/api/login', {
      identifier: '9876543210',
      password: 'patient123'
    });
    assert(patientLogin.status === 200 && patientLogin.body.token, 'Patient logged in');
    const patientToken = patientLogin.body.token;

    const hospitalLogin = await request('POST', '/api/login', {
      identifier: 'rubyhall@medilink.org',
      password: 'hospital123'
    });
    assert(hospitalLogin.status === 200 && hospitalLogin.body.token, 'Hospital Administrator logged in');
    const hospitalToken = hospitalLogin.body.token;

    // 2. Admin Dashboard Overview Metrics
    console.log('\n--- Step 2: Admin Dashboard & Macro Metrics ---');
    const adminOverview = await request('GET', '/api/admin/patient-requests', null, adminToken);
    assert(adminOverview.status === 200, 'Admin can access network overview');
    const summary = adminOverview.body.summary;
    assert(typeof summary.totalHospitals === 'number' && summary.totalHospitals >= 3, `Metric: Total hospitals (${summary.totalHospitals})`);
    assert(typeof summary.activeAmbulances === 'number', `Metric: Active ambulances (${summary.activeAmbulances})`);
    assert(typeof summary.activeRequests === 'number', `Metric: Active requests (${summary.activeRequests})`);
    assert(typeof summary.pendingRequests === 'number', `Metric: Pending requests (${summary.pendingRequests})`);
    assert(typeof summary.rejectedRequests === 'number', `Metric: Rejected requests (${summary.rejectedRequests})`);
    assert(typeof summary.unresolvedRequests === 'number', `Metric: Unresolved requests (${summary.unresolvedRequests})`);
    assert(typeof summary.emergencyRequests === 'number', `Metric: Emergency requests (${summary.emergencyRequests})`);

    // 3. Network Request Table Filters
    console.log('\n--- Step 3: Admin Network Request Table Filters ---');
    const filteredByStatus = await request('GET', '/api/admin/patient-requests?status=REJECTED', null, adminToken);
    assert(filteredByStatus.status === 200 && filteredByStatus.body.allRequests.every((r) => r.status === 'REJECTED'), 'Filter by status: REJECTED matches correctly');

    const filteredByPriority = await request('GET', '/api/admin/patient-requests?priority=CRITICAL', null, adminToken);
    assert(filteredByPriority.status === 200 && filteredByPriority.body.allRequests.every((r) => r.priority === 'CRITICAL'), 'Filter by priority: CRITICAL matches correctly');

    const filteredByType = await request('GET', '/api/admin/patient-requests?type=BED', null, adminToken);
    assert(filteredByType.status === 200 && filteredByType.body.allRequests.every((r) => r.type === 'BED'), 'Filter by request type: BED matches correctly');

    // 4. Escalation Workflow: Identify rejected request and assign to System Doctor
    console.log('\n--- Step 4: Admin Escalation to System Doctor ---');
    let targetRejectedRequest = adminOverview.body.unresolvedQueue[0] || adminOverview.body.allRequests.find((r) => r.status === 'REJECTED');
    if (!targetRejectedRequest) {
      const newReq = store.insert('requests', {
        type: 'BED',
        priority: 'URGENT',
        status: 'REJECTED',
        patientName: 'Kavita Joshi',
        contactPhone: '+91 98888 12345',
        targetHospitalId: 'hosp_ruby_hall',
        targetHospitalName: 'Ruby Hall Clinic',
        bedType: 'ICU_BED',
        responseNotes: 'No ICU beds currently available due to surge in trauma admissions.'
      });
      targetRejectedRequest = newReq;
    }

    const targetReqId = targetRejectedRequest.id;

    const assignRes = await request(
      'POST',
      `/api/admin/requests/${targetReqId}/assign`,
      {
        doctorId: doctor1Id,
        triageNotes: 'Urgent ICU bed re-routing required for critical post-cardiac patient.'
      },
      adminToken
    );

    assert(assignRes.status === 200, `Admin successfully assigned request #${targetReqId} to Doctor`);
    assert(assignRes.body.request.status === 'ASSIGNED', 'Status transitioned REJECTED -> ASSIGNED');
    assert(assignRes.body.request.assignedDoctorId === doctor1Id, 'assignedDoctorId properly saved');
    assert(assignRes.body.request.assignedDoctorName === 'Dr. Anand Joshi', 'assignedDoctorName properly saved');
    assert(!!assignRes.body.request.assignedAt, 'assignedAt timestamp recorded');

    // 5. Doctor Dashboard Visibility
    console.log('\n--- Step 5: Doctor Dashboard Visibility & Isolation ---');
    const doc1Requests = await request('GET', '/api/doctor/requests', null, doctor1Token);
    assert(doc1Requests.status === 200, 'Doctor 1 can fetch assigned requests');
    const hasAssignedReq = doc1Requests.body.requests.some((r) => r.id === targetReqId);
    assert(hasAssignedReq, 'Doctor 1 sees the escalated request in their queue');

    // Verify Doctor 2 does NOT see Doctor 1's assigned request
    const doc2Requests = await request('GET', '/api/doctor/requests', null, doctor2Token);
    assert(doc2Requests.status === 200, 'Doctor 2 can fetch assigned requests');
    const doc2HasDoc1Req = doc2Requests.body.requests.some((r) => r.id === targetReqId);
    assert(!doc2HasDoc1Req, 'Doctor 2 DOES NOT see Doctor 1 assigned request (isolation maintained)');

    // 6. Security: Wrong Doctor cannot resolve Doctor 1's request
    console.log('\n--- Step 6: Security & RBAC Enforcement on Conflict Resolution ---');
    const wrongDocResolveRes = await request(
      'PUT',
      `/api/doctor/requests/${targetReqId}/resolve`,
      {
        alternativeHospitalId: 'hosp_kem_pune',
        resolutionNotes: 'Attempting resolution from unauthorized doctor account.'
      },
      doctor2Token
    );
    assert(wrongDocResolveRes.status === 403, 'Wrong doctor attempting to resolve returns 403 Forbidden');

    // Hospital administrator cannot resolve doctor escalation
    const hospitalResolveRes = await request(
      'PUT',
      `/api/doctor/requests/${targetReqId}/resolve`,
      {
        alternativeHospitalId: 'hosp_kem_pune',
        resolutionNotes: 'Hospital admin trying to resolve system conflict.'
      },
      hospitalToken
    );
    assert(hospitalResolveRes.status === 403, 'Hospital admin attempting to resolve returns 403 Forbidden');

    // Patient cannot access doctor endpoints
    const patientDocAccess = await request('GET', '/api/doctor/requests', null, patientToken);
    assert(patientDocAccess.status === 403, 'Patient accessing doctor endpoints returns 403 Forbidden');

    // 7. Legitimate Resolution by Assigned Doctor
    console.log('\n--- Step 7: Legitimate Conflict Resolution by Assigned Doctor ---');
    const resolveRes = await request(
      'PUT',
      `/api/doctor/requests/${targetReqId}/resolve`,
      {
        alternativeHospitalId: 'hosp_kem_pune',
        resolutionNotes: 'Verified bed inventory at KEM Hospital Pune. Allocated Bed ICU-04 under Dr. Kulkarni.'
      },
      doctor1Token
    );

    assert(resolveRes.status === 200, `Assigned doctor successfully resolved request #${targetReqId}`);
    assert(resolveRes.body.request.status === 'RESOLVED', 'Status transitioned ASSIGNED -> RESOLVED');
    assert(resolveRes.body.request.targetHospitalId === 'hosp_kem_pune', 'Target hospital re-routed to alternative facility');
    assert(resolveRes.body.request.resolvedByDoctorId === doctor1Id, 'resolvedByDoctorId recorded');
    assert(resolveRes.body.request.resolvedByDoctorName === 'Dr. Anand Joshi', 'resolvedByDoctorName recorded');
    assert(!!resolveRes.body.request.resolvedAt, 'resolvedAt timestamp recorded');

    // 8. Terminal State Immutability
    console.log('\n--- Step 8: Immutability of Resolved Requests ---');
    const reResolveRes = await request(
      'PUT',
      `/api/doctor/requests/${targetReqId}/resolve`,
      {
        alternativeHospitalId: 'hosp_sahyadri',
        resolutionNotes: 'Attempting to re-resolve an already resolved terminal request.'
      },
      doctor1Token
    );
    assert(reResolveRes.status === 400, 'Resolved request is immutable: subsequent resolution attempt returns 400 Bad Request');

    // 9. Audit Trail Verification
    console.log('\n--- Step 9: Audit Trail Logging & Verification ---');
    const auditRes = await request('GET', '/api/admin/audit-logs', null, adminToken);
    assert(auditRes.status === 200, 'Admin can fetch audit logs');
    const logs = auditRes.body.logs;

    const escalateLog = logs.find((l) => l.action === 'ESCALATE_TO_SYSTEM_DOCTOR' && l.resourceId === targetReqId);
    assert(!!escalateLog, 'Audit log recorded for ESCALATE_TO_SYSTEM_DOCTOR');
    if (escalateLog) {
      const details = typeof escalateLog.details === 'string' ? JSON.parse(escalateLog.details) : escalateLog.details;
      assert(escalateLog.actorRole === 'ADMIN', 'Audit log captures actorRole: ADMIN');
      assert(details.newStatus === 'ASSIGNED', 'Audit log captures status transition to ASSIGNED');
    }

    const resolveLog = logs.find((l) => l.action === 'RESOLVE_CONFLICT_REQUEST' && l.resourceId === targetReqId);
    assert(!!resolveLog, 'Audit log recorded for RESOLVE_CONFLICT_REQUEST');
    if (resolveLog) {
      const details = typeof resolveLog.details === 'string' ? JSON.parse(resolveLog.details) : resolveLog.details;
      assert(resolveLog.actorRole === 'SYSTEM_DOCTOR', 'Audit log captures actorRole: SYSTEM_DOCTOR');
      assert(details.newStatus === 'RESOLVED', 'Audit log captures status transition to RESOLVED');
      assert(!!details.alternativeHospital, 'Audit log captures alternative facility');
    }

    console.log(`\n🎉 PHASE 7 TESTS COMPLETED: ${passedTests}/${totalTests} Passed!\n`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (testServer) {
      testServer.close();
    }
  }
}

runEscalationTests();
