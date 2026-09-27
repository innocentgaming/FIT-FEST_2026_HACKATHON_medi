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

async function runAppointmentsTests() {
  console.log('📅 Starting MediLink CARE Phase 3: Patient & Appointment Management Test Suite...\n');
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
    // 1. Authenticate Patient and Hospital
    const patientLogin = await request('POST', '/api/login', { identifier: '9876543210', password: 'patient123' });
    const patientToken = patientLogin.body.token;

    const patient2Login = await request('POST', '/api/login', { identifier: '9876543222', password: 'patient123' });
    const patient2Token = patient2Login.body.token;

    const hospitalLogin = await request('POST', '/api/login', { identifier: 'rubyhall@medilink.org', password: 'hospital123' });
    const hospitalToken = hospitalLogin.body.token;

    // 2. Patient can book appointment for tomorrow
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const bookApt = await request('POST', '/api/appointments', {
      hospitalId: 'hosp_ruby_hall',
      appointmentDate: tomorrow,
      appointmentTime: '10:00 AM',
      specialistName: 'Dr. A. Deshmukh',
      specialty: 'Cardiology',
      purpose: 'Administrative OPD Consultation Desk'
    }, patientToken);
    assert(bookApt.status === 201 && bookApt.body.appointment.status === 'SCHEDULED', 'Patient books administrative appointment with SCHEDULED status (201)');
    const aptId = bookApt.body.appointment.id;

    // 3. Prevent Duplicate Booking
    const dupBooking = await request('POST', '/api/appointments', {
      hospitalId: 'hosp_ruby_hall',
      appointmentDate: tomorrow,
      appointmentTime: '10:00 AM',
      purpose: 'Duplicate check'
    }, patientToken);
    assert(dupBooking.status === 400 && dupBooking.body.error.includes('Duplicate booking'), 'Duplicate booking for same slot is blocked with 400');

    // 4. Prevent Past Date Booking
    const pastBooking = await request('POST', '/api/appointments', {
      hospitalId: 'hosp_ruby_hall',
      appointmentDate: '2020-01-01',
      appointmentTime: '10:00 AM',
      purpose: 'Past booking check'
    }, patientToken);
    assert(pastBooking.status === 400 && pastBooking.body.error.includes('past dates'), 'Past date booking is blocked with 400');

    // 5. Hospital sees appointment in listing & breakdown
    const hospApts = await request('GET', '/api/appointments', null, hospitalToken);
    const found = (hospApts.body.appointments || []).find((a) => a.id === aptId);
    assert(hospApts.status === 200 && found && hospApts.body.summary.upcoming > 0, 'Hospital sees appointment with summary analytics');

    // 6. Hospital updates status: CONFIRMED
    const confirmApt = await request('PUT', `/api/appointments/${aptId}/status`, { status: 'CONFIRMED' }, hospitalToken);
    assert(confirmApt.status === 200 && confirmApt.body.appointment.status === 'CONFIRMED', 'Hospital marks appointment CONFIRMED');

    // 7. Hospital marks FOLLOW_UP
    const followUpApt = await request('PUT', `/api/appointments/${aptId}/status`, { status: 'FOLLOW_UP', administrativeNotes: 'Scheduled follow up in 2 weeks' }, hospitalToken);
    assert(followUpApt.status === 200 && followUpApt.body.appointment.status === 'FOLLOW_UP', 'Hospital marks appointment FOLLOW_UP');

    // 8. Hospital completes appointment: COMPLETED
    const completeApt = await request('PUT', `/api/appointments/${aptId}/status`, { status: 'COMPLETED' }, hospitalToken);
    assert(completeApt.status === 200 && completeApt.body.appointment.status === 'COMPLETED', 'Hospital marks appointment COMPLETED');

    // 9. Patient sees own appointment
    const patientOwnApts = await request('GET', '/api/appointments', null, patientToken);
    const hasOwn = (patientOwnApts.body.appointments || []).some((a) => a.id === aptId);
    assert(patientOwnApts.status === 200 && hasOwn, 'Patient retrieves own appointment history');

    // 10. Patient cannot see another patient private appointment detail
    const crossAptCheck = await request('GET', `/api/appointments/${aptId}`, null, patient2Token);
    assert(crossAptCheck.status === 403, 'Patient 2 cannot access Patient 1 private appointment detail (403)');

    // 11. Patient Search by Name, ID, Phone (Hospital authorized, Patient blocked)
    const patientSearchBlocked = await request('GET', '/api/patients/search?query=Aarav', null, patientToken);
    assert(patientSearchBlocked.status === 403, 'Patient is forbidden from searching patient directory (403)');

    const hospitalSearchName = await request('GET', '/api/patients/search?query=Aarav', null, hospitalToken);
    assert(hospitalSearchName.status === 200 && hospitalSearchName.body.results.length > 0 && hospitalSearchName.body.results[0].name.includes('Aarav'), 'Hospital searches patient by name (200)');

    const hospitalSearchId = await request('GET', '/api/patients/search?query=usr_patient_1', null, hospitalToken);
    assert(hospitalSearchId.status === 200 && hospitalSearchId.body.results[0].id === 'usr_patient_1', 'Hospital searches patient by patient ID (200)');

    const hospitalSearchPhone = await request('GET', '/api/patients/search?query=9876543210', null, hospitalToken);
    assert(hospitalSearchPhone.status === 200 && hospitalSearchPhone.body.results[0].phone === '9876543210', 'Hospital searches patient by phone (200)');

    // 12. Patient Profile contains Age and no clinical fields
    const profile = await request('GET', '/api/patient/usr_patient_1', null, hospitalToken);
    assert(profile.status === 200 && profile.body.patient.age !== undefined && profile.body.patient.diagnosis === undefined, 'Patient profile contains age and strictly excludes diagnosis/treatment');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    testServer.close();
    console.log(`\n📊 Phase 3 Patient & Appointment Test Summary: ${passed} Passed, ${failed} Failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runAppointmentsTests();
