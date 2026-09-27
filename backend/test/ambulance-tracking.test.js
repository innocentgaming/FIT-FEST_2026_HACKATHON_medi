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

async function runAmbulanceTrackingTests() {
  console.log('\n🚑 Starting MediLink CARE Phase 5: Ambulance Management & Live Tracking Test Suite...\n');
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
    // Setup Tokens for all required roles
    // -------------------------------------------------------------
    // Driver 1 (Santosh: amb_pune_101 at Ruby Hall)
    const driver1Login = await request('POST', '/api/login', { identifier: '9822012345', password: 'ambulance123' });
    const driver1Token = driver1Login.body.token;

    // Driver 2 (Vijay: amb_pune_102 at KEM)
    const driver2Login = await request('POST', '/api/login', { identifier: '9822056789', password: 'ambulance123' });
    const driver2Token = driver2Login.body.token;

    // Hospital 1 Admin (Ruby Hall)
    const hosp1Login = await request('POST', '/api/login', { identifier: 'rubyhall@medilink.org', password: 'hospital123' });
    const hosp1Token = hosp1Login.body.token;

    // Hospital 2 Admin (KEM)
    const hosp2Login = await request('POST', '/api/login', { identifier: 'kem@medilink.org', password: 'hospital123' });
    const hosp2Token = hosp2Login.body.token;

    // Patient
    const patientLogin = await request('POST', '/api/login', { identifier: '9876543210', password: 'patient123' });
    const patientToken = patientLogin.body.token;

    // Admin
    const adminLogin = await request('POST', '/api/login', { identifier: 'admin@medilink.gov.in', password: 'admin123' });
    const adminToken = adminLogin.body.token;

    // -------------------------------------------------------------
    // TEST 1: Ambulance Entity Fields & Availability Listing
    // -------------------------------------------------------------
    const ambList = await request('GET', '/api/ambulance');
    assert(ambList.status === 200 && ambList.body.ambulances.length >= 4, 'GET /api/ambulance lists all fleet units');
    
    const sampleAmb = ambList.body.ambulances[0];
    const hasRequiredFields =
      sampleAmb.id &&
      sampleAmb.driverName &&
      (sampleAmb.phone || sampleAmb.driverPhone) &&
      (sampleAmb.vehicleNumber || sampleAmb.vehicleNo) &&
      sampleAmb.hospitalId &&
      ['AVAILABLE', 'ON_DUTY', 'OFFLINE'].includes(sampleAmb.status) &&
      sampleAmb.latitude !== undefined &&
      sampleAmb.longitude !== undefined &&
      sampleAmb.updatedAt;
    assert(hasRequiredFields, 'Ambulance entity contains id, driverName, phone, vehicleNumber, hospitalId, status, latitude, longitude, updatedAt');

    // Single ambulance retrieval
    const singleAmb = await request('GET', `/api/ambulance/${sampleAmb.id}`);
    assert(singleAmb.status === 200 && singleAmb.body.ambulance.id === sampleAmb.id, 'GET /api/ambulance/:id returns single ambulance details');

    // -------------------------------------------------------------
    // TEST 2: Hospital Dashboard & Multi-Tenant Isolation
    // -------------------------------------------------------------
    // Hospital 1 views its own ambulances
    const hosp1Ambs = await request('GET', '/api/ambulance?hospitalId=hosp_ruby_hall', null, hosp1Token);
    assert(hosp1Ambs.status === 200 && hosp1Ambs.body.ambulances.every((a) => a.hospitalId === 'hosp_ruby_hall'), 'Hospital 1 can view own ambulances');

    // Hospital 1 cannot modify Hospital 2 ambulance -> 403 Forbidden
    const hospCrossModify = await request('PUT', '/api/ambulance/amb_pune_102/status', { status: 'OFFLINE' }, hosp1Token);
    assert(hospCrossModify.status === 403, "Hospital cannot modify another hospital's ambulance (403 Forbidden)");

    // Hospital 1 can update its own ambulance status -> 200 OK
    const hospOwnModify = await request('PUT', '/api/ambulance/amb_pune_101/status', { status: 'AVAILABLE' }, hosp1Token);
    assert(hospOwnModify.status === 200, "Hospital can update its own ambulance status (200 OK)");

    // -------------------------------------------------------------
    // TEST 3: Driver Dashboard & Availability Toggle
    // -------------------------------------------------------------
    // Driver 1 sets availability to OFFLINE
    const driverSetOffline = await request('PUT', '/api/ambulance/amb_pune_101/status', { status: 'OFFLINE' }, driver1Token);
    assert(driverSetOffline.status === 200 && driverSetOffline.body.ambulance.status === 'OFFLINE', 'Driver 1 sets availability to OFFLINE');

    // -------------------------------------------------------------
    // TEST 4: Unavailable Ambulance Cannot Be Assigned
    // -------------------------------------------------------------
    // Attempting to assign offline ambulance amb_pune_101 -> 400 Bad Request
    const assignOffline = await request('POST', '/api/requests', {
      type: 'AMBULANCE',
      assignedAmbulanceId: 'amb_pune_101',
      details: { pickupLocation: 'Kothrud' }
    }, patientToken);
    assert(assignOffline.status === 400 && assignOffline.body.error.includes('unavailable'), 'Unavailable (OFFLINE) ambulance cannot be assigned (400 Bad Request)');

    // Driver 1 sets availability back to AVAILABLE
    const driverSetAvailable = await request('PUT', '/api/ambulance/amb_pune_101/status', { status: 'AVAILABLE' }, driver1Token);
    assert(driverSetAvailable.status === 200 && driverSetAvailable.body.ambulance.status === 'AVAILABLE', 'Driver 1 sets availability to AVAILABLE');

    // -------------------------------------------------------------
    // TEST 5: Nearest Ambulance Auto-Selection & Distance Calculation
    // -------------------------------------------------------------
    // Patient creates emergency request near Ruby Hall (18.5310, 73.8760) without specifying ambulance
    const autoDispatch = await request('POST', '/api/requests', {
      type: 'AMBULANCE',
      urgency: 'CRITICAL',
      location: 'Near Pune Railway Station',
      details: {
        latitude: 18.5310,
        longitude: 73.8760,
        administrativeNote: 'Severe breathlessness emergency'
      }
    }, patientToken);
    assert(autoDispatch.status === 201 && autoDispatch.body.request.status === 'ASSIGNED' && autoDispatch.body.request.assignedAmbulanceId, 'System selects nearest available ambulance and calculates distance');
    const assignedReqId = autoDispatch.body.request.id;
    const assignedAmbId = autoDispatch.body.request.assignedAmbulanceId;

    // -------------------------------------------------------------
    // TEST 6: Driver Authorization & Acceptance Checks
    // -------------------------------------------------------------
    // Determine which driver is assigned vs other driver
    const isDriver1Assigned = assignedAmbId === 'amb_pune_101';
    const assignedDriverToken = isDriver1Assigned ? driver1Token : driver2Token;
    const unassignedDriverToken = isDriver1Assigned ? driver2Token : driver1Token;

    // Unassigned driver attempts to accept request -> 403 Forbidden
    const unassignedAccept = await request('PUT', `/api/requests/${assignedReqId}/status`, {
      status: 'ACCEPTED',
      ambulanceTripStatus: 'On the Way'
    }, unassignedDriverToken);
    assert(unassignedAccept.status === 403, "Driver cannot accept another driver's request (403 Forbidden)");

    // Only assigned driver can accept -> 200 OK
    const assignedAccept = await request('PUT', `/api/requests/${assignedReqId}/status`, {
      status: 'ACCEPTED',
      ambulanceTripStatus: 'On the Way'
    }, assignedDriverToken);
    assert(assignedAccept.status === 200 && assignedAccept.body.request.status === 'ACCEPTED', 'Only assigned driver can accept request (200 OK)');

    // Verify ambulance status transitioned to ON_DUTY
    const ambAfterAccept = await request('GET', `/api/ambulance/${assignedAmbId}`);
    assert(ambAfterAccept.body.ambulance.status === 'ON_DUTY', 'Ambulance automatically transitions to ON_DUTY upon acceptance');

    // -------------------------------------------------------------
    // TEST 7: Cannot Assign ON_DUTY Ambulance
    // -------------------------------------------------------------
    const assignOnDuty = await request('POST', '/api/requests', {
      type: 'AMBULANCE',
      assignedAmbulanceId: assignedAmbId,
      details: { pickupLocation: 'Swargate' }
    }, patientToken);
    assert(assignOnDuty.status === 400, 'Cannot assign an ambulance that is ON_DUTY (400 Bad Request)');

    // -------------------------------------------------------------
    // TEST 8: Trip Progress & Live GPS Location Sharing
    // -------------------------------------------------------------
    // Driver updates trip sub-status to 'Arrived'
    const tripProgress = await request('PUT', `/api/requests/${assignedReqId}/status`, {
      ambulanceTripStatus: 'Arrived'
    }, assignedDriverToken);
    assert(tripProgress.status === 200 && tripProgress.body.request.ambulanceTripStatus === 'Arrived', 'Driver updates trip progress to Arrived');

    // Driver updates simulated GPS location
    const gpsUpdate = await request('PUT', `/api/ambulance/${assignedAmbId}/location`, {
      lat: 18.5325,
      lng: 73.8775,
      address: 'Near Pune Station Overbridge',
      heading: 120,
      speedKmph: 42
    }, assignedDriverToken);
    assert(gpsUpdate.status === 200 && gpsUpdate.body.ambulance.latitude === 18.5325 && gpsUpdate.body.ambulance.isSimulatedGps === true, 'Driver streams simulated GPS location updates (200 OK)');

    // Unassigned driver cannot update GPS for another ambulance -> 403 Forbidden
    const unauthGps = await request('PUT', `/api/ambulance/${assignedAmbId}/location`, {
      lat: 18.5300,
      lng: 73.8700
    }, unassignedDriverToken);
    assert(unauthGps.status === 403, 'Driver cannot update GPS coordinates for another ambulance (403 Forbidden)');

    // -------------------------------------------------------------
    // TEST 9: Terminal State Immutability (Completed Request Cannot Change)
    // -------------------------------------------------------------
    // Driver completes the trip
    const tripComplete = await request('PUT', `/api/requests/${assignedReqId}/status`, {
      status: 'COMPLETED'
    }, assignedDriverToken);
    assert(tripComplete.status === 200 && tripComplete.body.request.status === 'COMPLETED', 'Driver completes request and marks COMPLETED');

    // Verify ambulance returned to AVAILABLE
    const ambAfterComplete = await request('GET', `/api/ambulance/${assignedAmbId}`);
    assert(ambAfterComplete.body.ambulance.status === 'AVAILABLE', 'Ambulance automatically resets to AVAILABLE after trip completion');

    // Attempting to change completed request -> 400 Bad Request
    const changeCompleted = await request('PUT', `/api/requests/${assignedReqId}/status`, {
      status: 'ACCEPTED'
    }, assignedDriverToken);
    assert(changeCompleted.status === 400 && changeCompleted.body.error.includes('terminal'), 'Completed request cannot change (400 Bad Request)');

    // -------------------------------------------------------------
    // TEST 10: Rejection MUST Require a Reason
    // -------------------------------------------------------------
    // Create new ambulance request
    const newReq = await request('POST', '/api/requests', {
      type: 'AMBULANCE',
      assignedAmbulanceId: 'amb_pune_102',
      details: { pickupLocation: 'KEM Hospital Gate 2' }
    }, patientToken);
    const newReqId = newReq.body.request.id;

    // Driver 2 attempts to reject without reason -> 400 Bad Request
    const rejectNoReason = await request('PUT', `/api/requests/${newReqId}/status`, {
      status: 'REJECTED',
      responseNotes: ''
    }, driver2Token);
    assert(rejectNoReason.status === 400 && rejectNoReason.body.error.includes('responseNotes'), 'Driver rejection without reason returns 400 Bad Request');

    // Driver 2 rejects with mandatory reason -> 200 OK
    const rejectWithReason = await request('PUT', `/api/requests/${newReqId}/status`, {
      status: 'REJECTED',
      responseNotes: 'Vehicle undergoing mandatory oxygen calibration and scheduled refuel.'
    }, driver2Token);
    assert(rejectWithReason.status === 200 && rejectWithReason.body.request.status === 'REJECTED', 'Driver rejection with mandatory reason succeeds (200 OK)');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    testServer.close();
    console.log(`\n📊 Phase 5 Ambulance Tracking Test Summary: ${passed} Passed, ${failed} Failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runAmbulanceTrackingTests();
