const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Get all patients (ADMIN or HOSPITAL)
router.get('/', authenticateToken, requireRole('ADMIN', 'HOSPITAL'), (req, res) => {
  const users = store.get('users');
  const patients = users
    .filter((u) => u.role === 'PATIENT')
    .map(({ password, ...p }) => p);
  res.json({ patients, count: patients.length });
});

// Get single patient administrative profile
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Patient can view own profile, staff/admin can view any
  if (req.user.role === 'PATIENT' && req.user.id !== id) {
    return res.status(403).json({ error: 'Unauthorized to view another patient record.' });
  }

  const user = store.findById('users', id);
  if (!user || user.role !== 'PATIENT') {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const appointments = store.get('appointments').filter((a) => a.patientId === id);
  const requests = store.get('requests').filter((r) => r.patientId === id);

  const { password, ...safeUser } = user;
  res.json({
    patient: safeUser,
    appointments,
    requests
  });
});

// Update patient profile
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'PATIENT' && req.user.id !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another patient profile.' });
  }

  const allowedUpdates = ['name', 'bloodGroup', 'emergencyContact', 'address', 'phone'];
  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const updated = store.update('users', id, updates);
  if (!updated) return res.status(404).json({ error: 'Patient not found.' });

  const { password, ...safeUser } = updated;
  res.json({ message: 'Patient profile updated', patient: safeUser });
});

module.exports = router;
