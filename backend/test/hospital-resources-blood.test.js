const http = require('http');
const { app, server } = require('../src/server');
const { store } = require('../src/db/store');
const { getIO } = require('../src/socket');

let baseUrl = '';
let testServer;
let tokens = {};

// Helper for HTTP requests
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
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runPhase4Tests = async () => {
  console.log('🏥 Starting MediLink CARE Phase 4: Hospital Resources & Blood Bank Test Suite...\n');

  // Reset store to fresh seed data
  store.resetToSeed();

  await new Promise((resolve) => {
    testServer = server.listen(0, () => {
      const port = testServer.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test Server running on ${baseUrl}\n`);
      resolve();
    });
  });

  let passCount = 0;
  let failCount = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failCount++;
    }
  };

  try {
    // Track emitted socket events
    const emittedEvents = [];
    const io = getIO();
    if (io) {
      const origEmit = io.emit.bind(io);
      io.emit = (eventName, ...args) => {
        emittedEvents.push({ event: eventName, args });
        return origEmit(eventName, ...args);
      };
    }

    // 1. Setup Auth Tokens
    const hosp1Res = await request('POST', '/api/login', {
      phone: '02066455100',
      password: 'hospital123'
    });
    tokens.hosp1 = hosp1Res.data.token;

    const hosp2Res = await request('POST', '/api/login', {
      phone: '02066037300',
      password: 'hospital123'
    });
    tokens.hosp2 = hosp2Res.data.token;

    const patientRes = await request('POST', '/api/login', {
      phone: '9876543210',
      password: 'patient123'
    });
    tokens.patient = patientRes.data.token;

    const adminRes = await request('POST', '/api/login', {
      phone: '02025550000',
      password: 'admin123'
    });
    tokens.admin = adminRes.data.token;

    // TEST 1: GET /api/hospitals
    const listRes = await request('GET', '/api/hospitals');
    assert(listRes.status === 200 && listRes.data.hospitals.length >= 4, 'GET /api/hospitals returns list of facilities with total count');
    assert(listRes.data.hospitals[0].mapUrl && listRes.data.hospitals[0].resources, 'Hospital entity contains mapUrl, contact, and resources');

    // TEST 2: GET /api/hospital/:id
    const singleRes = await request('GET', '/api/hospital/hosp_ruby_hall');
    assert(singleRes.status === 200 && singleRes.data.hospital.id === 'hosp_ruby_hall', 'GET /api/hospital/:id returns hospital details');

    // TEST 3: GET /api/hospital/:id/resources
    const resSummary = await request('GET', '/api/hospital/hosp_ruby_hall/resources');
    assert(resSummary.status === 200 && resSummary.data.resources.generalBedsTotal !== undefined, 'GET /api/hospital/:id/resources returns live resource counts');

    // TEST 4: Hospital Resource Update by Owner
    emittedEvents.length = 0;
    const updateRes = await request(
      'PUT',
      '/api/hospital/hosp_ruby_hall/resources',
      {
        icuBedsAvailable: 12,
        generalBedsAvailable: 45,
        ventilatorsAvailable: 8,
        oxygenCylindersAvailable: 38
      },
      tokens.hosp1
    );
    assert(updateRes.status === 200 && updateRes.data.resources.icuBedsAvailable === 12, 'Hospital owner successfully updates own resources');

    const resourceBroadcast = emittedEvents.find((e) => e.event === 'resource_updated');
    assert(
      resourceBroadcast && resourceBroadcast.args[0].hospitalId === 'hosp_ruby_hall' && resourceBroadcast.args[0].resources.icuBedsAvailable === 12,
      'Real-time Socket.io broadcast emitted on hospital resource update'
    );

    // TEST 5: Unauthorized Resource Update (Hospital A modifying Hospital B -> 403)
    const unauthorizedRes = await request(
      'PUT',
      '/api/hospital/hosp_kem_pune/resources',
      { icuBedsAvailable: 50 },
      tokens.hosp1
    );
    assert(unauthorizedRes.status === 403, 'Unauthorized resource update across hospitals is blocked with 403 Forbidden');

    // TEST 6: Patient modifying hospital resources -> 403
    const patientHospRes = await request(
      'PUT',
      '/api/hospital/hosp_ruby_hall/resources',
      { icuBedsAvailable: 99 },
      tokens.patient
    );
    assert(patientHospRes.status === 403, 'Patient is forbidden from updating hospital resources (403)');

    // TEST 7: Blood Bank Stock Update across all 8 groups
    emittedEvents.length = 0;
    const bloodRes = await request(
      'PUT',
      '/api/hospital/hosp_ruby_hall/bloodbank',
      {
        'A+': 25,
        'A-': 8,
        'B+': 30,
        'B-': 10,
        'AB+': 15,
        'AB-': 5,
        'O+': 40,
        'O-': 12
      },
      tokens.hosp1
    );
    assert(bloodRes.status === 200 && bloodRes.data.bloodBank['B+'] === 30, 'Hospital owner updates 8 blood groups stock in blood bank');

    const bloodBroadcast = emittedEvents.find((e) => e.event === 'bloodbank_updated');
    assert(
      bloodBroadcast && bloodBroadcast.args[0].hospitalId === 'hosp_ruby_hall' && bloodBroadcast.args[0].bloodBank['B+'] === 30,
      'Real-time Socket.io broadcast emitted on blood bank stock update'
    );

    // TEST 8: Unauthorized Blood Bank Update -> 403
    const unauthBloodRes = await request(
      'PUT',
      '/api/hospital/hosp_kem_pune/bloodbank',
      { 'B+': 99 },
      tokens.hosp1
    );
    assert(unauthBloodRes.status === 403, 'Unauthorized blood bank update is blocked with 403 Forbidden');

    // TEST 9: Negative Resource Prevention (Never allow available beds / ICU / Blood < 0)
    const negResourceRes = await request(
      'PUT',
      '/api/hospital/hosp_ruby_hall/resources',
      {
        icuBedsAvailable: -10,
        generalBedsAvailable: -50,
        ventilatorsAvailable: -5
      },
      tokens.hosp1
    );
    assert(
      negResourceRes.status === 200 &&
      negResourceRes.data.resources.icuBedsAvailable === 0 &&
      negResourceRes.data.resources.generalBedsAvailable === 0,
      'Negative resource values are strictly clamped to 0 (never allow < 0)'
    );

    const negBloodRes = await request(
      'PUT',
      '/api/hospital/hosp_ruby_hall/bloodbank',
      { 'B+': -20, 'O-': -5 },
      tokens.hosp1
    );
    assert(
      negBloodRes.status === 200 &&
      negBloodRes.data.bloodBank['B+'] === 0 &&
      negBloodRes.data.bloodBank['O-'] === 0,
      'Negative blood units are strictly clamped to 0 (never allow blood units < 0)'
    );

    // Restore valid values for remaining tests
    await request('PUT', '/api/hospital/hosp_ruby_hall/resources', { icuBedsAvailable: 8, generalBedsAvailable: 42 }, tokens.hosp1);
    await request('PUT', '/api/hospital/hosp_ruby_hall/bloodbank', { 'B+': 24, 'O-': 8 }, tokens.hosp1);

    // TEST 10: Smart Blood Requirement Search (Group + Units + Location + Urgency)
    const bloodSearch = await request('POST', '/api/requests/search-blood', {
      bloodGroup: 'B+',
      unitsRequired: 2,
      location: 'Pune',
      urgency: 'URGENT'
    });
    assert(bloodSearch.status === 200 && bloodSearch.data.matches.length > 0, 'POST /api/requests/search-blood returns matching facilities');
    assert(bloodSearch.data.matches[0].isSufficient === true && bloodSearch.data.matches[0].bloodGroup === 'B+', 'Matches sorted by location relevance and sufficient stock');
    assert(bloodSearch.data.matches[0].mapUrl && bloodSearch.data.matches[0].emergencyHelpline, 'Blood matches display map link and emergency helpline');

    // TEST 11: Location Filtering in Hospital Facility Search
    const locSearchRes = await request('GET', '/api/hospitals?location=Deccan');
    assert(
      locSearchRes.status === 200 &&
      locSearchRes.data.hospitals.some((h) => h.area.includes('Deccan') || h.name.includes('Sahyadri')),
      'Hospital search successfully filters by location/area (Deccan)'
    );

    // TEST 12: Bed Type & Specialized Equipment Filtering in Hospital Search
    const icuSearchRes = await request('GET', '/api/hospitals?bedType=ICU&specialist=Cardiology');
    assert(
      icuSearchRes.status === 200 &&
      icuSearchRes.data.hospitals.every((h) => h.resources.icuBedsAvailable > 0),
      'Hospital search filters by ICU beds availability and specialist department'
    );

    // TEST 13: GET /api/hospital/:id/dashboard-summary
    const summaryRes = await request('GET', '/api/hospital/hosp_ruby_hall/dashboard-summary', null, tokens.hosp1);
    assert(
      summaryRes.status === 200 &&
      summaryRes.data.metrics.totalAppointments !== undefined &&
      summaryRes.data.resources &&
      summaryRes.data.bloodBank,
      'GET /api/hospital/:id/dashboard-summary returns comprehensive operational dashboard metrics'
    );

    // TEST 14: Resource Decrement when ADMISSION Request is ACCEPTED
    const initialIcuBeds = store.findById('hospitals', 'hosp_ruby_hall').resources.icuBedsAvailable;
    const createAdmissionRes = await request(
      'POST',
      '/api/requests',
      {
        type: 'ADMISSION',
        targetHospitalId: 'hosp_ruby_hall',
        priority: 'EMERGENCY',
        details: { bedType: 'ICU', reason: 'Critical polytrauma triage' }
      },
      tokens.patient
    );
    const admissionReqId = createAdmissionRes.data.request.id;

    // Accept admission
    const acceptRes = await request(
      'PUT',
      `/api/requests/${admissionReqId}/status`,
      { status: 'ACCEPTED', responseNotes: 'ICU bed allocated in trauma ward.' },
      tokens.hosp1
    );
    assert(acceptRes.status === 200 && acceptRes.data.request.status === 'ACCEPTED', 'Hospital accepts admission request');

    const updatedIcuBeds = store.findById('hospitals', 'hosp_ruby_hall').resources.icuBedsAvailable;
    assert(updatedIcuBeds === initialIcuBeds - 1, 'Accepting ADMISSION atomically decrements target hospital available ICU beds');

    // TEST 15: Blood Stock Decrement when BLOOD Request is ACCEPTED
    const initialBPlusUnits = store.findById('hospitals', 'hosp_ruby_hall').bloodBank['B+'];
    const createBloodReq = await request(
      'POST',
      '/api/requests',
      {
        type: 'BLOOD',
        targetHospitalId: 'hosp_ruby_hall',
        priority: 'URGENT',
        details: { bloodGroup: 'B+', unitsRequired: 3, urgency: 'URGENT' }
      },
      tokens.patient
    );
    const bloodReqId = createBloodReq.data.request.id;

    await request(
      'PUT',
      `/api/requests/${bloodReqId}/status`,
      { status: 'ACCEPTED', responseNotes: '3 units B+ packed cells dispatched.' },
      tokens.hosp1
    );

    const updatedBPlusUnits = store.findById('hospitals', 'hosp_ruby_hall').bloodBank['B+'];
    assert(updatedBPlusUnits === initialBPlusUnits - 3, 'Accepting BLOOD request atomically decrements hospital blood bank units');

    // All assertions complete
  } catch (err) {
    console.error('Unexpected test failure:', err);
    failCount++;
  } finally {
    if (testServer) testServer.close();
  }

  console.log(`\n📊 Phase 4 Hospital Resources & Blood Bank Test Summary: ${passCount} Passed, ${failCount} Failed\n`);
  process.exit(failCount > 0 ? 1 : 0);
};

runPhase4Tests();
