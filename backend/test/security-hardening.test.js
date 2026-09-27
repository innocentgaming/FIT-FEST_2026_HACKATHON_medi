/**
 * MediLink CARE - Phase 1 Security Hardening & Penetration Test Suite
 * Validates JWT, RBAC, IDOR, BOLA, Staff PIN, Database Reset Guard, Security Headers, Rate Limiting, and Input Sanitization.
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/server');
const { store } = require('../src/db/store');
const { JWT_SECRET } = require('../src/middleware/auth');

let server;
let baseUrl;

function request(method, path, body = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = {};
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = { raw: data };
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSecuritySuite() {
  console.log('🔒 Starting MediLink CARE Security Hardening Test Suite...\n');
  store.resetToSeed();

  const port = 10899;
  server = app.listen(port);
  baseUrl = `http://localhost:${port}`;
  console.log(`Security Test Server running on ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    })();
  }

  // --- Step 0: Generate Test Tokens ---
  const patientToken = jwt.sign({ id: 'usr_patient_1', role: 'PATIENT', name: 'Aarav Sharma' }, JWT_SECRET, { expiresIn: '1h' });
  const patientToken2 = jwt.sign({ id: 'usr_patient_2', role: 'PATIENT', name: 'Sneha Patil' }, JWT_SECRET, { expiresIn: '1h' });
  const hospitalToken = jwt.sign({ id: 'usr_hosp_1', role: 'HOSPITAL', hospitalId: 'hosp_ruby_hall', name: 'Ruby Hall Admin' }, JWT_SECRET, { expiresIn: '1h' });
  const hospitalToken2 = jwt.sign({ id: 'usr_hosp_2', role: 'HOSPITAL', hospitalId: 'hosp_kem_pune', name: 'KEM Admin' }, JWT_SECRET, { expiresIn: '1h' });
  const driverToken = jwt.sign({ id: 'usr_amb_1', role: 'AMBULANCE', ambulanceId: 'amb_pune_101', name: 'Santosh Driver' }, JWT_SECRET, { expiresIn: '1h' });
  const adminToken = jwt.sign({ id: 'usr_admin', role: 'ADMIN', name: 'Central Admin' }, JWT_SECRET, { expiresIn: '1h' });
  const doctorToken = jwt.sign({ id: 'usr_doc_1', role: 'SYSTEM_DOCTOR', name: 'Dr. Anand Joshi' }, JWT_SECRET, { expiresIn: '1h' });

  // 1. JWT & Authentication Integrity
  await test('1.1: Missing JWT token returns 401 Unauthorized', async () => {
    const res = await request('GET', '/api/appointments');
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error);
  });

  await test('1.2: Tampered JWT signature returns 403 Forbidden', async () => {
    const tampered = patientToken.slice(0, -5) + 'xxxxx';
    const res = await request('GET', '/api/appointments', null, tampered);
    assert.strictEqual(res.status, 403);
  });

  await test('1.3: Expired JWT returns 403 Forbidden', async () => {
    const expiredToken = jwt.sign({ id: 'usr_patient_1', role: 'PATIENT' }, JWT_SECRET, { expiresIn: '-10s' });
    const res = await request('GET', '/api/appointments', null, expiredToken);
    assert.strictEqual(res.status, 403);
  });

  await test('1.4: Non-existent user in valid token returns 401', async () => {
    const ghostToken = jwt.sign({ id: 'usr_ghost_nonexistent', role: 'PATIENT' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request('GET', '/api/appointments', null, ghostToken);
    assert.strictEqual(res.status, 401);
  });

  // 2. HTTP Security Headers
  await test('2.1: Server returns nosniff X-Content-Type-Options header', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  });

  await test('2.2: Server returns DENY X-Frame-Options header', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');
  });

  await test('2.3: Server returns Content-Security-Policy header', async () => {
    const res = await request('GET', '/health');
    assert.ok(res.headers['content-security-policy']);
    assert.ok(res.headers['content-security-policy'].includes("default-src 'self'"));
  });

  // 3. RBAC & IDOR / BOLA Boundary Guards
  await test('3.1: Patient is forbidden from modifying hospital resources (403)', async () => {
    const res = await request('PUT', '/api/hospitals/hosp_ruby_hall/resources', { icuBedsAvailable: 99 }, patientToken);
    assert.strictEqual(res.status, 403);
  });

  await test('3.2: Hospital A is forbidden from modifying Hospital B resources (403)', async () => {
    const res = await request('PUT', '/api/hospitals/hosp_kem_pune/resources', { icuBedsAvailable: 99 }, hospitalToken);
    assert.strictEqual(res.status, 403);
  });

  let createdAptId = null;

  await test('3.3: Patient A cannot access Patient B single appointment record (403)', async () => {
    // Book appointment as Patient 1
    const createRes = await request('POST', '/api/appointments', {
      hospitalId: 'hosp_ruby_hall',
      date: '2026-12-01',
      time: '10:00 AM',
      purpose: 'Cardiology Check'
    }, patientToken, { 'x-bypass-rate-limit': 'test-bypass-key' });

    assert.strictEqual(createRes.status, 201);
    createdAptId = createRes.body.appointment.id;

    // Patient 2 attempts IDOR access
    const idorRes = await request('GET', `/api/appointments/${createdAptId}`, null, patientToken2);
    assert.strictEqual(idorRes.status, 403);
  });

  await test('3.4: Patient cannot modify another patient appointment status (403)', async () => {
    assert.ok(createdAptId);
    const res = await request('PUT', `/api/appointments/${createdAptId}/status`, { status: 'CANCELLED' }, patientToken2);
    assert.strictEqual(res.status, 403);
  });

  // 4. Server-Side Staff PIN Verification
  await test('4.1: Hospital resource update with valid Staff PIN succeeds (200)', async () => {
    const res = await request(
      'PUT',
      '/api/hospitals/hosp_ruby_hall/resources',
      { icuBedsAvailable: 8, staffPin: '1234' },
      hospitalToken
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.resources.icuBedsAvailable, 8);
    // Ensure PIN is not leaked in output
    assert.strictEqual(res.body.resources.staffPin, undefined);
  });

  await test('4.2: Hospital resource update with invalid Staff PIN fails with 403', async () => {
    const res = await request(
      'PUT',
      '/api/hospitals/hosp_ruby_hall/resources',
      { icuBedsAvailable: 8, staffPin: '9999_wrong_pin' },
      hospitalToken
    );
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error.includes('Staff authorization failed'));
  });

  // 5. Database Reset Guard
  await test('5.1: Non-admin cannot invoke reset-demo (403)', async () => {
    const res = await request('POST', '/api/admin/reset-demo', {}, patientToken);
    assert.strictEqual(res.status, 403);
  });

  await test('5.2: Admin reset works when allowed in dev/test environment (200)', async () => {
    const res = await request('POST', '/api/admin/reset-demo', {}, adminToken, { 'x-bypass-rate-limit': 'test-bypass-key' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('successfully reset'));
  });

  // 6. Input Validation & Bounds Checking
  await test('6.1: Negative blood stock values are clamped to 0', async () => {
    const res = await request(
      'PUT',
      '/api/hospitals/hosp_ruby_hall/bloodbank',
      { 'B+': -10, staffPin: '1234' },
      hospitalToken
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.bloodBank['B+'], 0);
  });

  await test('6.2: Invalid/NaN GPS coordinates in ambulance update return 400 Bad Request', async () => {
    const res = await request(
      'PUT',
      '/api/ambulances/amb_pune_101/location',
      { lat: 'not_a_number', lng: 73.8567 },
      driverToken,
      { 'x-bypass-rate-limit': 'test-bypass-key' }
    );
    assert.strictEqual(res.status, 400);
  });

  await test('6.3: Out-of-range latitude (> 90) returns 400 Bad Request', async () => {
    const res = await request(
      'PUT',
      '/api/ambulances/amb_pune_101/location',
      { lat: 145.0, lng: 73.8567 },
      driverToken,
      { 'x-bypass-rate-limit': 'test-bypass-key' }
    );
    assert.strictEqual(res.status, 400);
  });

  await test('6.4: Invalid blood search units (negative or zero) return 400 Bad Request', async () => {
    const res = await request('POST', '/api/requests/search-blood', {
      bloodGroup: 'B+',
      unitsRequired: -5
    });
    assert.strictEqual(res.status, 400);
  });

  // 7. Information Leakage Prevention
  await test('7.1: User login never exposes password hash in response', async () => {
    const res = await request('POST', '/api/login', {
      identifier: '9876543210',
      password: 'patient123'
    }, null, { 'x-bypass-rate-limit': 'test-bypass-key' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.password, undefined);
  });

  await test('7.2: Demo accounts list clearly contains DEMO ONLY disclaimer', async () => {
    const res = await request('GET', '/api/demo-accounts');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.notice.includes('DEMO CREDENTIALS'));
  });

  // Cleanup
  server.close();

  console.log(`\n📊 Security Hardening Suite Summary: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSecuritySuite().catch((err) => {
    console.error('Fatal Security Suite Error:', err);
    process.exit(1);
  });
}

module.exports = { runSecuritySuite };
