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

async function runTests() {
  console.log('🚀 Starting MediLink CARE Backend Test Suite...');
  store.resetToSeed();

  await new Promise((resolve) => {
    testServer = server.listen(0, () => {
      const port = testServer.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running on ${baseUrl}`);
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
    // 1. Health check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'HEALTHY', 'Health check is operational');

    // 2. Safety scope violation guard
    const safetyTest = await request('POST', '/api/requests', {
      type: 'ADMISSION',
      details: { prescription: 'Paracetamol 500mg' }
    });
    assert(safetyTest.status === 400 && safetyTest.body.error.includes('Scope Violation'), 'Prohibits clinical prescription/diagnosis');

    // 3. Login for all 5 roles
    const patientLogin = await request('POST', '/api/login', { identifier: '9876543210', password: 'patient123' });
    assert(patientLogin.status === 200 && patientLogin.body.user.role === 'PATIENT', 'Patient login successful');
    const patientToken = patientLogin.body.token;

    const hospitalLogin = await request('POST', '/api/login', { identifier: 'rubyhall@medilink.org', password: 'hospital123' });
    assert(hospitalLogin.status === 200 && hospitalLogin.body.user.role === 'HOSPITAL', 'Hospital Admin login successful');
    const hospitalToken = hospitalLogin.body.token;

    const ambulanceLogin = await request('POST', '/api/login', { identifier: '9822012345', password: 'ambulance123' });
    assert(ambulanceLogin.status === 200 && ambulanceLogin.body.user.role === 'AMBULANCE', 'Ambulance driver login successful');
    const ambulanceToken = ambulanceLogin.body.token;

    const adminLogin = await request('POST', '/api/login', { identifier: 'admin@medilink.gov.in', password: 'admin123' });
    assert(adminLogin.status === 200 && adminLogin.body.user.role === 'ADMIN', 'Admin login successful');
    const adminToken = adminLogin.body.token;

    const doctorLogin = await request('POST', '/api/login', { identifier: 'dr.joshi@medilink.gov.in', password: 'doctor123' });
    assert(doctorLogin.status === 200 && doctorLogin.body.user.role === 'SYSTEM_DOCTOR', 'System Doctor login successful');
    const doctorToken = doctorLogin.body.token;

    // 4. RBAC Check: Patient cannot modify hospital resources
    const rbacFail = await request('PUT', '/api/hospital/hosp_ruby_hall/resources', { icuBedsAvailable: 100 }, patientToken);
    assert(rbacFail.status === 403, 'RBAC blocks Patient from modifying hospital resources');

    // 5. Hospital updates resources
    const hospResUpdate = await request('PUT', '/api/hospital/hosp_ruby_hall/resources', { icuBedsAvailable: 15 }, hospitalToken);
    assert(hospResUpdate.status === 200 && hospResUpdate.body.resources.icuBedsAvailable === 15, 'Hospital successfully updates live ICU bed count');

    // 6. Appointment Booking & Status Lifecycle
    const bookApt = await request('POST', '/api/appointments', {
      hospitalId: 'hosp_ruby_hall',
      date: '2026-10-01',
      time: '10:00 AM',
      purpose: 'Cardiology OPD Consultation Desk'
    }, patientToken);
    assert(bookApt.status === 201 && bookApt.body.appointment.status === 'SCHEDULED', 'Patient books administrative appointment with SCHEDULED status');
    const aptId = bookApt.body.appointment.id;

    const confirmApt = await request('PUT', `/api/appointments/${aptId}/status`, { status: 'CONFIRMED' }, hospitalToken);
    assert(confirmApt.status === 200 && confirmApt.body.appointment.status === 'CONFIRMED', 'Hospital marks appointment CONFIRMED');

    // 7. Smart Blood Search
    const bloodSearch = await request('POST', '/api/requests/search-blood', {
      bloodGroup: 'B+',
      unitsRequired: 2,
      location: 'Pune',
      urgency: 'Urgent'
    });
    assert(bloodSearch.status === 200 && bloodSearch.body.matches.length > 0 && bloodSearch.body.matches[0].availableUnits >= 2, 'Smart blood search returns verified stock matches');

    // 8. Ambulance Request Lifecycle
    const ambReq = await request('POST', '/api/requests', {
      type: 'AMBULANCE',
      targetHospitalId: 'hosp_ruby_hall',
      assignedAmbulanceId: 'amb_pune_101',
      details: { pickupLocation: 'Kothrud, Pune', dropLocation: 'Ruby Hall Clinic' }
    }, patientToken);
    assert(ambReq.status === 201 && ambReq.body.request.status === 'ASSIGNED', 'Patient dispatches ambulance request');
    const reqId = ambReq.body.request.id;

    // Driver accepts request
    const ambAccept = await request('PUT', `/api/requests/${reqId}/status`, {
      status: 'ACCEPTED',
      ambulanceTripStatus: 'ON_THE_WAY'
    }, ambulanceToken);
    assert(ambAccept.status === 200 && ambAccept.body.request.status === 'ACCEPTED' && ambAccept.body.request.ambulanceTripStatus === 'ON_THE_WAY', 'Driver accepts trip and sets ON_THE_WAY');

    // Driver completes trip
    const ambComplete = await request('PUT', `/api/requests/${reqId}/status`, {
      status: 'COMPLETED'
    }, ambulanceToken);
    assert(ambComplete.status === 200 && ambComplete.body.request.status === 'COMPLETED', 'Trip progresses to terminal COMPLETED');

    // 9. Rejection requires responseNotes validation
    const rejFail = await request('PUT', '/api/requests/req_bld_903/status', {
      status: 'REJECTED',
      responseNotes: ''
    }, hospitalToken);
    assert(rejFail.status === 400 && rejFail.body.error.includes('responseNotes'), 'REJECTED status strictly requires responseNotes');

    // 10. Admin Escalation & System Doctor Conflict Resolution
    // Request req_adm_902 is REJECTED in initial seed. Admin escalates it to Dr. Anand Joshi (usr_doc_1)
    const escalate = await request('POST', '/api/admin/requests/req_adm_902/assign', {
      doctorId: 'usr_doc_1',
      triageNotes: 'Re-routing patient from KEM to Ruby Hall ICU'
    }, adminToken);
    assert(escalate.status === 200 && escalate.body.request.status === 'ASSIGNED' && escalate.body.request.assignedDoctorId === 'usr_doc_1', 'Admin successfully escalates rejected emergency to System Doctor');

    // System Doctor resolves conflict
    const resolveConflict = await request('PUT', '/api/doctor/requests/req_adm_902/resolve', {
      alternativeHospitalId: 'hosp_ruby_hall',
      resolutionNotes: 'Reserved ICU Bed 04 at Ruby Hall Clinic. Patient transferred smoothly.'
    }, doctorToken);
    assert(resolveConflict.status === 200 && resolveConflict.body.request.status === 'RESOLVED', 'System Doctor resolves conflict to terminal RESOLVED');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    testServer.close();
    console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
