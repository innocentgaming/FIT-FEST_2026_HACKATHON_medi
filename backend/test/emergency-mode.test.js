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

async function runEmergencyModeTests() {
  console.log('\n🚨 Starting MediLink CARE Phase 6: Emergency Mode & Unified Coordination Test Suite...\n');
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
    // Setup Tokens for all roles
    // -------------------------------------------------------------
    const patientLogin = await request('POST', '/api/login', { identifier: '9876543210', password: 'patient123' });
    const patientToken = patientLogin.body.token;

    const hospitalLogin = await request('POST', '/api/login', { identifier: 'rubyhall@medilink.org', password: 'hospital123' });
    const hospitalToken = hospitalLogin.body.token;

    const ambulanceLogin = await request('POST', '/api/login', { identifier: '9822012345', password: 'ambulance123' });
    const ambulanceToken = ambulanceLogin.body.token;

    const adminLogin = await request('POST', '/api/login', { identifier: 'admin@medilink.gov.in', password: 'admin123' });
    const adminToken = adminLogin.body.token;

    // -------------------------------------------------------------
    // TEST 1: Safety & Scope Verification (Prohibits Clinical Diagnosis)
    // -------------------------------------------------------------
    const safetyCheck = await request('POST', '/api/requests', {
      type: 'AMBULANCE',
      details: { prescription: 'Inject 50mg Tramadol IV STAT' }
    }, patientToken);
    assert(safetyCheck.status === 400 && safetyCheck.body.error.includes('Scope Violation'), 'Safety Guard blocks clinical prescriptions in Emergency Mode');

    // -------------------------------------------------------------
    // TEST 2: Action 1 - Request Ambulance (Auto Nearest Unit Matching)
    // -------------------------------------------------------------
    // Request ambulance near Ruby Hall Hub (18.5314, 73.8765) where amb_pune_101 is located
    const ambEmergencyReq = await request('POST', '/api/requests', {
      type: 'AMBULANCE',
      assignedAmbulanceId: 'amb_pune_101',
      urgency: 'CRITICAL',
      location: 'Sangamvadi / Pune Station (18.5314, 73.8765)',
      details: {
        latitude: 18.5314,
        longitude: 73.8765,
        requiresOxygen: true,
        administrativeNote: 'Severe respiratory distress, immediate transport required'
      }
    }, patientToken);

    assert(
      ambEmergencyReq.status === 201 &&
      ambEmergencyReq.body.request.status === 'ASSIGNED' &&
      ambEmergencyReq.body.request.assignedAmbulanceId === 'amb_pune_101',
      'Action 1: Ambulance request created with assigned unit and details'
    );
    const emReqId = ambEmergencyReq.body.request.id;

    // -------------------------------------------------------------
    // TEST 3: Action 2 - Find Blood (Smart Match Matrix)
    // -------------------------------------------------------------
    const bloodSearch = await request('POST', '/api/requests/search-blood', {
      bloodGroup: 'B+',
      unitsRequired: 3,
      location: 'Pune',
      urgency: 'CRITICAL'
    });

    assert(
      bloodSearch.status === 200 &&
      bloodSearch.body.matches.length > 0 &&
      bloodSearch.body.matches[0].hospitalName &&
      bloodSearch.body.matches[0].emergencyHelpline &&
      bloodSearch.body.matches[0].availableUnits >= 3,
      'Action 2: Find Blood returns matching cold storage facilities with verified stock units and helpline'
    );

    // Direct Requisition
    const targetFacility = bloodSearch.body.matches[0];
    const bloodRequisition = await request('POST', '/api/requests', {
      type: 'BLOOD',
      targetHospitalId: targetFacility.hospitalId,
      priority: 'EMERGENCY',
      details: {
        bloodGroup: 'B+',
        unitsRequired: 3,
        location: 'Pune Central',
        urgency: 'CRITICAL',
        administrativeNote: `Direct emergency blood requisition for 3 units of B+ at ${targetFacility.hospitalName}.`
      }
    }, patientToken);

    assert(bloodRequisition.status === 201 && bloodRequisition.body.request.status === 'PENDING', 'Action 2: 1-Click Blood Requisition created successfully');

    // -------------------------------------------------------------
    // TEST 4: Action 3 - Find Healthcare Facility (Type & Resource Filters)
    // -------------------------------------------------------------
    // Hospital type filter
    const hospFilter = await request('GET', '/api/hospitals?type=Hospital');
    assert(hospFilter.status === 200 && hospFilter.body.hospitals.length > 0, 'Action 3: Filter by facility type (Hospital)');

    // Clinic type filter
    const clinicFilter = await request('GET', '/api/hospitals?type=Clinic');
    assert(clinicFilter.status === 200, 'Action 3: Filter by facility type (Clinic)');

    // Blood Bank type filter
    const bloodBankFilter = await request('GET', '/api/hospitals?type=Blood Bank');
    assert(bloodBankFilter.status === 200 && bloodBankFilter.body.hospitals.length > 0, 'Action 3: Filter by facility type (Blood Bank)');

    // ICU & Ventilator resource filter
    const icuResourceFilter = await request('GET', '/api/hospitals?bedType=ICU&minIcuBeds=5');
    assert(
      icuResourceFilter.status === 200 &&
      icuResourceFilter.body.hospitals.every((h) => (h.resources?.icuBedsAvailable || 0) >= 5),
      'Action 3: Resource filter strictly enforces minimum ICU beds available (>= 5)'
    );

    // Oxygen cylinders resource filter
    const oxygenFilter = await request('GET', '/api/hospitals?hasOxygen=true&minOxygen=10');
    assert(
      oxygenFilter.status === 200 &&
      oxygenFilter.body.hospitals.every((h) => (h.resources?.oxygenCylindersAvailable || 0) >= 10),
      'Action 3: Resource filter enforces oxygen cylinder availability'
    );

    // -------------------------------------------------------------
    // TEST 5: Action 4 - Request Status & 7-Step Visual Timeline Progression
    // -------------------------------------------------------------
    // Timeline Step 1: REQUESTED / PENDING -> Handled on creation
    // Timeline Step 2: ASSIGNED -> Verified on emReqId
    assert(ambEmergencyReq.body.request.status === 'ASSIGNED', 'Timeline: Request is in ASSIGNED state');

    // Timeline Step 3: Driver ACCEPTED
    const acceptStep = await request('PUT', `/api/requests/${emReqId}/status`, {
      status: 'ACCEPTED',
      ambulanceTripStatus: 'On the Way',
      responseNotes: 'Driver confirmed emergency pickup. Moving to scene.'
    }, ambulanceToken);
    assert(acceptStep.status === 200 && acceptStep.body.request.status === 'ACCEPTED', 'Timeline: Request transitions to ACCEPTED');

    // Timeline Step 4: Driver ON THE WAY
    const onTheWayStep = await request('PUT', `/api/requests/${emReqId}/status`, {
      ambulanceTripStatus: 'On the Way'
    }, ambulanceToken);
    assert(onTheWayStep.status === 200 && onTheWayStep.body.request.ambulanceTripStatus === 'On the Way', 'Timeline: Sub-state advances to On the Way');

    // Timeline Step 5: Driver ARRIVED
    const arrivedStep = await request('PUT', `/api/requests/${emReqId}/status`, {
      ambulanceTripStatus: 'Arrived'
    }, ambulanceToken);
    assert(arrivedStep.status === 200 && arrivedStep.body.request.ambulanceTripStatus === 'Arrived', 'Timeline: Sub-state advances to Arrived');

    // Timeline Step 6: COMPLETED
    const completeStep = await request('PUT', `/api/requests/${emReqId}/status`, {
      status: 'COMPLETED'
    }, ambulanceToken);
    assert(completeStep.status === 200 && completeStep.body.request.status === 'COMPLETED', 'Timeline: Terminal state transitions to COMPLETED');

    // -------------------------------------------------------------
    // TEST 6: Unified Dashboard View (Active Requests & Multi-Role Sync)
    // -------------------------------------------------------------
    const allEmergencyRequests = await request('GET', '/api/requests?type=AMBULANCE', null, adminToken);
    assert(allEmergencyRequests.status === 200 && allEmergencyRequests.body.requests.length >= 1, 'Unified Dashboard: Admin & coordinator can track all fleet dispatches');

    const patientRequests = await request('GET', '/api/requests', null, patientToken);
    assert(patientRequests.status === 200 && patientRequests.body.requests.some((r) => r.id === emReqId), 'Unified Dashboard: Patient views active & past incident history');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    testServer.close();
    console.log(`\n📊 Phase 6 Emergency Mode Test Summary: ${passed} Passed, ${failed} Failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runEmergencyModeTests();
