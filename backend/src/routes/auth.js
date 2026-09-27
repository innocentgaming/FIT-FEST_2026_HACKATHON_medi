const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../db/store');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Unified login for all 5 roles
router.post('/login', (req, res) => {
  const { identifier, email, phone, password } = req.body;
  const loginKey = (identifier || email || phone || '').trim().toLowerCase();

  if (!loginKey || !password) {
    return res.status(400).json({ error: 'Please provide email/phone and password.' });
  }

  const users = store.get('users');
  const user = users.find(
    (u) =>
      (u.email && u.email.toLowerCase() === loginKey) ||
      (u.phone && u.phone === loginKey) ||
      (u.name && u.name.toLowerCase() === loginKey)
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  store.logAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'USER_LOGIN',
    resourceType: 'AUTH',
    resourceId: user.id,
    details: `User ${user.name} logged in successfully as ${user.role}`
  });

  const { password: _, ...safeUser } = user;
  res.json({
    message: 'Login successful',
    token,
    user: safeUser
  });
});

// Patient Registration
router.post('/patient/register', (req, res) => {
  const { name, phone, email, password, bloodGroup, emergencyContact, address } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone, and password are required.' });
  }

  const users = store.get('users');
  const existing = users.find((u) => u.phone === phone || (email && u.email === email));
  if (existing) {
    return res.status(400).json({ error: 'A user with this phone or email already exists.' });
  }

  const newPatient = {
    id: `usr_patient_${Date.now()}`,
    name,
    phone,
    email: email || `${phone}@patient.medilink.org`,
    password: bcrypt.hashSync(password, 10),
    role: 'PATIENT',
    bloodGroup: bloodGroup || 'Unknown',
    emergencyContact: emergencyContact || '',
    address: address || '',
    createdAt: new Date().toISOString()
  };

  store.insert('users', newPatient);

  store.logAudit({
    actorId: newPatient.id,
    actorName: newPatient.name,
    actorRole: 'PATIENT',
    action: 'PATIENT_REGISTER',
    resourceType: 'USER',
    resourceId: newPatient.id,
    details: `Registered new patient ${newPatient.name}`
  });

  const token = jwt.sign(
    { id: newPatient.id, role: newPatient.role, name: newPatient.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...safeUser } = newPatient;
  res.status(201).json({
    message: 'Patient registered successfully',
    token,
    user: safeUser
  });
});

// Ambulance Driver Registration
router.post('/ambulance/register', (req, res) => {
  const { driverName, phone, password, vehicleNo, hospitalId, ambulanceType } = req.body;

  if (!driverName || !phone || !password || !vehicleNo) {
    return res.status(400).json({ error: 'Driver name, phone, password, and vehicle number are required.' });
  }

  const users = store.get('users');
  const existing = users.find((u) => u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: 'A driver with this phone already exists.' });
  }

  const ambulanceId = `amb_${Date.now()}`;
  const userId = `usr_amb_${Date.now()}`;

  const hospital = hospitalId ? store.findById('hospitals', hospitalId) : null;

  const newAmbulance = {
    id: ambulanceId,
    vehicleNo,
    driverName,
    driverPhone: phone,
    driverUserId: userId,
    hospitalId: hospitalId || null,
    hospitalName: hospital ? hospital.name : 'Independent Dispatch Network',
    type: ambulanceType || 'Advanced Life Support (ALS)',
    equipment: ['Oxygen Cylinder', 'Stretcher', 'Emergency First Response Kit'],
    status: 'Available',
    currentLocation: hospital
      ? { lat: hospital.lat, lng: hospital.lng, address: hospital.address, heading: 0, speedKmph: 0 }
      : { lat: 18.5204, lng: 73.8567, address: 'Pune Central Base', heading: 0, speedKmph: 0 },
    isSimulatedGps: true,
    currentRequestId: null,
    updatedAt: new Date().toISOString()
  };

  store.insert('ambulances', newAmbulance);

  const newDriverUser = {
    id: userId,
    name: driverName,
    phone,
    email: `${phone}@ambulance.medilink.org`,
    password: bcrypt.hashSync(password, 10),
    role: 'AMBULANCE',
    ambulanceId,
    hospitalId: hospitalId || null,
    vehicleNo,
    createdAt: new Date().toISOString()
  };

  store.insert('users', newDriverUser);

  store.logAudit({
    actorId: userId,
    actorName: driverName,
    actorRole: 'AMBULANCE',
    action: 'AMBULANCE_REGISTER',
    resourceType: 'AMBULANCE',
    resourceId: ambulanceId,
    details: `Registered new ambulance driver ${driverName} for vehicle ${vehicleNo}`
  });

  const token = jwt.sign(
    { id: userId, role: 'AMBULANCE', name: driverName, ambulanceId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...safeUser } = newDriverUser;
  res.status(201).json({
    message: 'Ambulance & Driver registered successfully',
    token,
    user: safeUser,
    ambulance: newAmbulance
  });
});

// Hospital Admin Registration
router.post('/hospital/register', (req, res) => {
  const { hospitalName, email, phone, password, address, city, area, lat, lng } = req.body;

  if (!hospitalName || !email || !password || !phone) {
    return res.status(400).json({ error: 'Hospital name, email, phone, and password are required.' });
  }

  const users = store.get('users');
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const hospitalId = `hosp_${Date.now()}`;
  const userId = `usr_hosp_${Date.now()}`;

  const newHospital = {
    id: hospitalId,
    name: hospitalName,
    type: 'Multi-Speciality Hospital',
    address: address || 'Pune, Maharashtra',
    city: city || 'Pune',
    area: area || 'Central',
    lat: lat || 18.5204,
    lng: lng || 73.8567,
    phone,
    emergencyHelpline: phone,
    email,
    resources: {
      generalBedsTotal: 100,
      generalBedsAvailable: 20,
      icuBedsTotal: 20,
      icuBedsAvailable: 4,
      ventilatorsTotal: 10,
      ventilatorsAvailable: 2,
      oxygenCylindersTotal: 50,
      oxygenCylindersAvailable: 15
    },
    bloodBank: {
      'A+': 10,
      'A-': 3,
      'B+': 10,
      'B-': 3,
      'AB+': 5,
      'AB-': 2,
      'O+': 15,
      'O-': 4
    },
    specialists: [
      { id: 'spec_1', name: 'Dr. Duty Medical Officer', specialty: 'General & Emergency Triage', timing: '24x7', status: 'Available' }
    ],
    ambulances: []
  };

  store.insert('hospitals', newHospital);

  const newHospUser = {
    id: userId,
    name: `${hospitalName} Admin`,
    email,
    phone,
    password: bcrypt.hashSync(password, 10),
    role: 'HOSPITAL',
    hospitalId,
    address: newHospital.address,
    createdAt: new Date().toISOString()
  };

  store.insert('users', newHospUser);

  const token = jwt.sign(
    { id: userId, role: 'HOSPITAL', name: newHospUser.name, hospitalId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...safeUser } = newHospUser;
  res.status(201).json({
    message: 'Hospital and Admin account registered successfully',
    token,
    user: safeUser,
    hospital: newHospital
  });
});

// Authenticated current user profile
router.get('/me', authenticateToken, (req, res) => {
  const user = store.findById('users', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safeUser } = user;

  let extra = {};
  if (user.role === 'HOSPITAL' && user.hospitalId) {
    extra.hospital = store.findById('hospitals', user.hospitalId);
  }
  if (user.role === 'AMBULANCE' && user.ambulanceId) {
    extra.ambulance = store.findById('ambulances', user.ambulanceId);
  }

  res.json({ user: safeUser, ...extra });
});

// Seeded quick demo accounts helper for hackathon judges & testers
router.get('/demo-accounts', (req, res) => {
  res.json({
    accounts: [
      { role: 'PATIENT', label: 'Patient (Aarav Sharma)', identifier: '9876543210', password: 'patient123' },
      { role: 'HOSPITAL', label: 'Hospital Admin (Ruby Hall Clinic)', identifier: 'rubyhall@medilink.org', password: 'hospital123' },
      { role: 'AMBULANCE', label: 'Ambulance Driver (Santosh Shinde)', identifier: '9822012345', password: 'ambulance123' },
      { role: 'ADMIN', label: 'State Command Admin', identifier: 'admin@medilink.gov.in', password: 'admin123' },
      { role: 'SYSTEM_DOCTOR', label: 'System Doctor (Dr. Anand Joshi)', identifier: 'dr.joshi@medilink.gov.in', password: 'doctor123' }
    ]
  });
});

module.exports = router;
