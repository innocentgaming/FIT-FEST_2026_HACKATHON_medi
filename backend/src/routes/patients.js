const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Search and List Patients (Accessible ONLY to authorized staff: HOSPITAL, ADMIN, SYSTEM_DOCTOR)
router.get('/', authenticateToken, requireRole('ADMIN', 'HOSPITAL', 'SYSTEM_DOCTOR'), (req, res) => {
  const { query, bloodGroup } = req.query;
  const users = store.get('users');
  let patients = users
    .filter((u) => u.role === 'PATIENT')
    .map(({ password, ...p }) => ({
      ...p,
      age: p.age || 28 // default age if not set
    }));

  if (query) {
    const q = query.toLowerCase().trim();
    patients = patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    );
  }

  if (bloodGroup) {
    patients = patients.filter((p) => p.bloodGroup === bloodGroup.toUpperCase());
  }

  res.json({ patients, count: patients.length });
});

// Search alias route
router.get('/search', authenticateToken, requireRole('ADMIN', 'HOSPITAL', 'SYSTEM_DOCTOR'), (req, res) => {
  const { query } = req.query;
  const users = store.get('users');
  const q = (query || '').toLowerCase().trim();

  const patients = users
    .filter((u) => u.role === 'PATIENT')
    .filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q))
    )
    .map(({ password, ...p }) => ({
      ...p,
      age: p.age || 28
    }));

  res.json({ query: q, results: patients, count: patients.length });
});

// Get single patient administrative profile
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Patient can only view own profile; staff/admin can view for intake
  if (req.user.role === 'PATIENT' && req.user.id !== id) {
    return res.status(403).json({ error: 'Unauthorized: You do not have permission to view another patient record.' });
  }

  const user = store.findById('users', id);
  if (!user || user.role !== 'PATIENT') {
    return res.status(404).json({ error: 'Patient profile not found.' });
  }

  const appointments = store.get('appointments').filter((a) => a.patientId === id);
  const requests = store.get('requests').filter((r) => r.patientId === id);

  const { password, ...safeUser } = user;
  safeUser.age = safeUser.age || 28;

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
    return res.status(403).json({ error: 'Unauthorized: You cannot update another patient profile.' });
  }

  const allowedUpdates = ['name', 'age', 'bloodGroup', 'emergencyContact', 'address', 'phone', 'email'];
  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (updates.age) {
    updates.age = Number(updates.age);
  }

  const updated = store.update('users', id, updates);
  if (!updated) return res.status(404).json({ error: 'Patient not found.' });

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_PATIENT_PROFILE',
    resourceType: 'PATIENT',
    resourceId: id,
    details: updates
  });

  const { password, ...safeUser } = updated;
  res.json({ message: 'Patient profile updated successfully', patient: safeUser });
});

module.exports = router;
