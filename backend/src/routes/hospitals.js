const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastResourceUpdate, broadcastBloodBankUpdate } = require('../socket');

// List all hospitals / clinics with search & filtering
router.get('/', optionalAuth, (req, res) => {
  const { query, city, bedType, hasBlood } = req.query;
  let hospitals = store.get('hospitals');

  if (city) {
    hospitals = hospitals.filter((h) => h.city.toLowerCase() === city.toLowerCase());
  }

  if (query) {
    const q = query.toLowerCase();
    hospitals = hospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.area.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.specialists.some((s) => s.specialty.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    );
  }

  if (bedType) {
    if (bedType === 'ICU') {
      hospitals = hospitals.filter((h) => h.resources.icuBedsAvailable > 0);
    } else if (bedType === 'VENTILATOR') {
      hospitals = hospitals.filter((h) => h.resources.ventilatorsAvailable > 0);
    } else if (bedType === 'OXYGEN') {
      hospitals = hospitals.filter((h) => h.resources.oxygenCylindersAvailable > 0);
    } else if (bedType === 'GENERAL') {
      hospitals = hospitals.filter((h) => h.resources.generalBedsAvailable > 0);
    }
  }

  if (hasBlood) {
    hospitals = hospitals.filter((h) => (h.bloodBank[hasBlood] || 0) > 0);
  }

  res.json({ hospitals, total: hospitals.length });
});

// Get hospital by ID
router.get('/:id', (req, res) => {
  const hospital = store.findById('hospitals', req.params.id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }
  res.json({ hospital });
});

// Update hospital basic details (HOSPITAL or ADMIN)
router.put('/:id', authenticateToken, requireRole('HOSPITAL', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another hospital.' });
  }

  const allowedUpdates = ['name', 'phone', 'emergencyHelpline', 'email', 'address', 'area', 'city'];
  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const updated = store.update('hospitals', id, updates);
  if (!updated) return res.status(404).json({ error: 'Hospital not found' });

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_HOSPITAL_DETAILS',
    resourceType: 'HOSPITAL',
    resourceId: id,
    details: updates
  });

  res.json({ message: 'Hospital details updated', hospital: updated });
});

// Get Live Resources
router.get('/:id/resources', (req, res) => {
  const hospital = store.findById('hospitals', req.params.id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
  res.json({ hospitalId: hospital.id, hospitalName: hospital.name, resources: hospital.resources });
});

// Update Live Resources (HOSPITAL, ADMIN, or SYSTEM_DOCTOR) + Broadcast
router.put('/:id/resources', authenticateToken, requireRole('HOSPITAL', 'ADMIN', 'SYSTEM_DOCTOR'), (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another hospital resources.' });
  }

  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const updatedResources = {
    ...hospital.resources,
    ...req.body
  };

  // Clamp numbers to non-negative
  for (const k in updatedResources) {
    if (typeof updatedResources[k] === 'number') {
      updatedResources[k] = Math.max(0, updatedResources[k]);
    }
  }

  const updated = store.update('hospitals', id, { resources: updatedResources });

  // Broadcast real-time Socket.io update
  broadcastResourceUpdate(id, updatedResources);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_RESOURCES',
    resourceType: 'HOSPITAL_RESOURCES',
    resourceId: id,
    details: updatedResources
  });

  res.json({ message: 'Live resources updated and broadcasted', resources: updated.resources });
});

// Update Blood Bank Stock + Broadcast
router.put('/:id/bloodbank', authenticateToken, requireRole('HOSPITAL', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another blood bank.' });
  }

  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const updatedBloodBank = {
    ...hospital.bloodBank,
    ...req.body
  };

  // Clamp numbers
  for (const g in updatedBloodBank) {
    if (typeof updatedBloodBank[g] === 'number') {
      updatedBloodBank[g] = Math.max(0, updatedBloodBank[g]);
    }
  }

  const updated = store.update('hospitals', id, { bloodBank: updatedBloodBank });

  broadcastBloodBankUpdate(id, updatedBloodBank);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_BLOOD_BANK',
    resourceType: 'HOSPITAL_BLOOD_BANK',
    resourceId: id,
    details: updatedBloodBank
  });

  res.json({ message: 'Blood bank stock updated and broadcasted', bloodBank: updated.bloodBank });
});

// Dashboard Summary for Hospital Portal
router.get('/:id/dashboard-summary', authenticateToken, requireRole('HOSPITAL', 'ADMIN', 'SYSTEM_DOCTOR'), (req, res) => {
  const { id } = req.params;
  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const appointments = store.get('appointments').filter((a) => a.hospitalId === id);
  const requests = store.get('requests').filter((r) => r.targetHospitalId === id || r.sourceHospitalId === id);
  const ambulances = store.get('ambulances').filter((amb) => amb.hospitalId === id);

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const activeAdmissions = requests.filter((r) => r.type === 'ADMISSION' && r.status === 'ACCEPTED');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayStr);

  res.json({
    hospital,
    metrics: {
      totalAppointments: appointments.length,
      todayAppointments: todayAppointments.length,
      pendingRequestsCount: pendingRequests.length,
      activeAdmissionsCount: activeAdmissions.length,
      assignedAmbulancesCount: ambulances.length,
      availableAmbulancesCount: ambulances.filter((a) => a.status === 'Available').length
    },
    resources: hospital.resources,
    bloodBank: hospital.bloodBank,
    specialists: hospital.specialists,
    recentAppointments: appointments.slice(-5).reverse(),
    pendingRequests: pendingRequests.reverse(),
    ambulances
  });
});

// Specialists management
router.post('/:id/specialists', authenticateToken, requireRole('HOSPITAL', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  const { name, specialty, timing, status } = req.body;

  if (!name || !specialty) {
    return res.status(400).json({ error: 'Specialist name and specialty are required.' });
  }

  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const newSpecialist = {
    id: `spec_${Date.now()}`,
    name,
    specialty,
    timing: timing || '09:00 AM - 05:00 PM',
    status: status || 'Available'
  };

  const specialists = [...(hospital.specialists || []), newSpecialist];
  store.update('hospitals', id, { specialists });

  res.status(201).json({ message: 'Specialist added', specialist: newSpecialist, specialists });
});

router.put('/:id/specialists/:specialistId', authenticateToken, requireRole('HOSPITAL', 'ADMIN'), (req, res) => {
  const { id, specialistId } = req.params;
  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const specialists = (hospital.specialists || []).map((s) => {
    if (s.id === specialistId) {
      return { ...s, ...req.body };
    }
    return s;
  });

  store.update('hospitals', id, { specialists });
  res.json({ message: 'Specialist updated', specialists });
});

router.delete('/:id/specialists/:specialistId', authenticateToken, requireRole('HOSPITAL', 'ADMIN'), (req, res) => {
  const { id, specialistId } = req.params;
  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const specialists = (hospital.specialists || []).filter((s) => s.id !== specialistId);
  store.update('hospitals', id, { specialists });
  res.json({ message: 'Specialist removed', specialists });
});

module.exports = router;
