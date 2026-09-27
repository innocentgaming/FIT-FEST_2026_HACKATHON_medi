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

async function runAuthRbacTests() {
  console.log('🔒 Starting MediLink CARE Phase 2: Auth & RBAC Security Test Suite...\n');
  store.resetToSeed();

  await new Promise((resolve) => {
    testServer = server.listen(0, () => {
      const port = testServer.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test Server running on ${baseUrl}\n`);
      resolve();
    });
  });

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

  try {
    // -------------------------------------------------------------
    // TEST 1: Protected Endpoint with No Token (401)
    // -------------------------------------------------------------
    const noToken = await request('GET', '/api/appointments');
    assert(noToken.status === 401 && noToken.body.error.includes('No token'), 'Accessing protected route without token returns 401 Unauthenticated');

    // -------------------------------------------------------------
    // TEST 2: Protected Endpoint with Invalid Token (403)
    // -------------------------------------------------------------
    const invalidToken = await request('GET', '/api/appointments', null, 'invalid.jwt.token');
    assert(invalidToken.status === 403, 'Accessing protected route with invalid token returns 403 Forbidden');

    // -------------------------------------------------------------
    // TEST 3: Invalid Login - Unknown User (401)
    // -------------------------------------------------------------
    const unknownUser = await request('POST', '/api/login', { identifier: 'unknown@email.com', password: 'password123' });
    assert(unknownUser.status === 401 && unknownUser.body.error.includes('not found'), 'Login with non-existent user returns 401');

    // -------------------------------------------------------------
    // TEST 4: Invalid Login - Wrong Password (401)
    // -------------------------------------------------------------
    const wrongPwd = await request('POST', '/api/login', { identifier: '9876543210', password: 'incorrect_password' });
    assert(wrongPwd.status === 401 && wrongPwd.body.error.includes('incorrect'), 'Login with wrong password returns 401');

    // -------------------------------------------------------------
    // TEST 5: Validation Error - Missing Fields (400)
    // -------------------------------------------------------------
    const missingFields = await request('POST', '/api/login', { identifier: '9876543210' });
    assert(missingFields.status === 400, 'Login without password returns 400 Validation Error');

    // -------------------------------------------------------------
    // TEST 6: Valid Logins for All 5 Roles
    // -------------------------------------------------------------
    const patientLogin = await request('POST', '/api/login', { identifier: '9876543210', password: 'patient123' });
    assert(patientLogin.status === 200 && patientLogin.body.user.role === 'PATIENT' && patientLogin.body.token, 'Patient login returns valid JWT and role PATIENT');
    const patientToken = patientLogin.body.token;

    const patient2Login = await request('POST', '/api/login', { identifier: '9876543222', password: 'patient123' });
    assert(patient2Login.status === 200 && patient2Login.body.user.role === 'PATIENT', 'Patient 2 (Sneha) login successful');
    const patient2Token = patient2Login.body.token;

    const hospitalLogin = await request('POST', '/api/login', { identifier: 'rubyhall@medilink.org', password: 'hospital123' });
    assert(hospitalLogin.status === 200 && hospitalLogin.body.user.role === 'HOSPITAL' && hospitalLogin.body.user.hospitalId === 'hosp_ruby_hall', 'Hospital Admin login returns hospitalId hosp_ruby_hall');
    const hospitalToken = hospitalLogin.body.token;

    const hospital2Login = await request('POST', '/api/login', { identifier: 'kem@medilink.org', password: 'hospital123' });
    assert(hospital2Login.status === 200 && hospital2Login.body.user.hospitalId === 'hosp_kem_pune', 'Hospital 2 (KEM) login returns hospitalId hosp_kem_pune');
    const hospital2Token = hospital2Login.body.token;

    const ambulanceLogin = await request('POST', '/api/login', { identifier: '9822012345', password: 'ambulance123' });
    assert(ambulanceLogin.status === 200 && ambulanceLogin.body.user.role === 'AMBULANCE' && ambulanceLogin.body.user.ambulanceId === 'amb_pune_101', 'Ambulance driver login returns ambulanceId amb_pune_101');
    const ambulanceToken = ambulanceLogin.body.token;

    const adminLogin = await request('POST', '/api/login', { identifier: 'admin@medilink.gov.in', password: 'admin123' });
    assert(adminLogin.status === 200 && adminLogin.body.user.role === 'ADMIN', 'Admin login successful');
    const adminToken = adminLogin.body.token;

    const doctorLogin = await request('POST', '/api/login', { identifier: 'dr.joshi@medilink.gov.in', password: 'doctor123' });
    assert(doctorLogin.status === 200 && doctorLogin.body.user.role === 'SYSTEM_DOCTOR', 'System Doctor login successful');
    const doctorToken = doctorLogin.body.token;

    // -------------------------------------------------------------
    // TEST 7: Patient Ownership Checks
    // -------------------------------------------------------------
    // Patient 1 (Aarav) tries to view Patient 2 (Sneha) profile -> 403
    const patientCrossAccess = await request('GET', '/api/patient/usr_patient_2', null, patientToken);
    assert(patientCrossAccess.status === 403, 'Patient 1 is forbidden (403) from viewing Patient 2 record');

    // Patient 1 views own profile -> 200
    const patientOwnAccess = await request('GET', '/api/patient/usr_patient_1', null, patientToken);
    assert(patientOwnAccess.status === 200 && patientOwnAccess.body.patient.id === 'usr_patient_1', 'Patient 1 successfully accesses own record (200)');

    // -------------------------------------------------------------
    // TEST 8: Hospital Ownership Checks
    // -------------------------------------------------------------
    // Ruby Hall Admin tries to modify KEM Hospital resources -> 403
    const hospitalCrossResource = await request('PUT', '/api/hospital/hosp_kem_pune/resources', { generalBedsAvailable: 999 }, hospitalToken);
    assert(hospitalCrossResource.status === 403, 'Ruby Hall Admin is forbidden (403) from modifying KEM Hospital resources');

    // Ruby Hall Admin modifies Ruby Hall resources -> 200
    const hospitalOwnResource = await request('PUT', '/api/hospital/hosp_ruby_hall/resources', { generalBedsAvailable: 50 }, hospitalToken);
    assert(hospitalOwnResource.status === 200 && hospitalOwnResource.body.resources.generalBedsAvailable === 50, 'Ruby Hall Admin successfully updates own resources (200)');

    // -------------------------------------------------------------
    // TEST 9: Ambulance Ownership Checks
    // -------------------------------------------------------------
    // Driver 1 (Santosh: amb_pune_101) tries to modify Driver 2's ambulance (amb_pune_102) -> 403
    const ambCrossStatus = await request('PUT', '/api/ambulance/amb_pune_102/status', { status: 'Offline' }, ambulanceToken);
    assert(ambCrossStatus.status === 403, 'Driver 1 is forbidden (403) from modifying Driver 2 ambulance status');

    // Driver 1 modifies own ambulance -> 200
    const ambOwnStatus = await request('PUT', '/api/ambulance/amb_pune_101/status', { status: 'Available' }, ambulanceToken);
    assert(ambOwnStatus.status === 200 && (ambOwnStatus.body.ambulance.status === 'Available' || ambOwnStatus.body.ambulance.status === 'AVAILABLE'), 'Driver 1 successfully updates own ambulance status (200)');

    // -------------------------------------------------------------
    // TEST 10: Admin Privileges & System-Wide Access
    // -------------------------------------------------------------
    // Non-admin (Patient) tries to view audit logs -> 403
    const patientAuditFail = await request('GET', '/api/admin/audit-logs', null, patientToken);
    assert(patientAuditFail.status === 403, 'Patient cannot access admin audit logs (403)');

    // Admin views audit logs -> 200
    const adminAuditSuccess = await request('GET', '/api/admin/audit-logs', null, adminToken);
    assert(adminAuditSuccess.status === 200 && adminAuditSuccess.body.logs.length > 0, 'Admin successfully retrieves audit logs (200)');

    // -------------------------------------------------------------
    // TEST 11: Patient Registration End-to-End
    // -------------------------------------------------------------
    const newPatientPhone = `912345${Math.floor(1000 + Math.random() * 9000)}`;
    const regPatient = await request('POST', '/api/patient/register', {
      name: 'Priya Verma',
      phone: newPatientPhone,
      password: 'newpatientpass123',
      bloodGroup: 'A+',
      emergencyContact: 'Amit Verma (9123450000)',
      address: 'Baner, Pune'
    });
    assert(regPatient.status === 201 && regPatient.body.user.role === 'PATIENT' && regPatient.body.token, 'New patient registration returns 201 and JWT');

    // -------------------------------------------------------------
    // TEST 12: Ambulance Registration End-to-End
    // -------------------------------------------------------------
    const newAmbPhone = `982299${Math.floor(1000 + Math.random() * 9000)}`;
    const regAmb = await request('POST', '/api/ambulance/register', {
      driverName: 'Kishore Mane',
      phone: newAmbPhone,
      password: 'driverpass123',
      vehicleNo: `MH-12-KM-${Math.floor(1000 + Math.random() * 9000)}`,
      ambulanceType: 'Advanced Cardiac Life Support (ACLS)'
    });
    assert(regAmb.status === 201 && regAmb.body.user.role === 'AMBULANCE' && regAmb.body.ambulance, 'New ambulance & driver registration returns 201 and ambulance entity');

    // -------------------------------------------------------------
    // TEST 13: Doctor Privileges & Conflict Access
    // -------------------------------------------------------------
    // Non-doctor (Patient) tries to access doctor conflict queue -> 403
    const patientDoctorFail = await request('GET', '/api/doctor/assigned-requests', null, patientToken);
    assert(patientDoctorFail.status === 403, 'Patient cannot access doctor conflict queue (403)');

    // System Doctor accesses conflict queue -> 200
    const doctorAccess = await request('GET', '/api/doctor/assigned-requests', null, doctorToken);
    assert(doctorAccess.status === 200 && Array.isArray(doctorAccess.body.requests), 'System Doctor successfully accesses assigned conflict queue (200)');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    testServer.close();
    console.log(`\n📊 Phase 2 Auth & RBAC Test Summary: ${passed} Passed, ${failed} Failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runAuthRbacTests();
