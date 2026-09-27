const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastResourceUpdate, broadcastBloodBankUpdate } = require('../socket');

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// List all hospitals / clinics with search & filtering
router.get('/', optionalAuth, (req, res) => {
  const {
    query,
    search,
    city,
    location,
    area,
    bedType,
    beds,
    minBeds,
    icuBeds,
    minIcuBeds,
    ventilators,
    minVentilators,
    oxygen,
    minOxygen,
    hasOxygen,
    hasBlood,
    bloodGroup,
    specialist,
    equipment
  } = req.query;

  let hospitals = store.get('hospitals');

  // Location filter (city, area, address)
  const locTerm = (location || city || area || '').trim().toLowerCase();
  if (locTerm) {
    hospitals = hospitals.filter(
      (h) =>
        (h.city && h.city.toLowerCase().includes(locTerm)) ||
        (h.area && h.area.toLowerCase().includes(locTerm)) ||
        (h.address && h.address.toLowerCase().includes(locTerm))
    );
  }

  // Keyword query search (name, area, address, specialists, equipment)
  const q = (query || search || '').trim().toLowerCase();
  if (q) {
    hospitals = hospitals.filter(
      (h) =>
        (h.name && h.name.toLowerCase().includes(q)) ||
        (h.area && h.area.toLowerCase().includes(q)) ||
        (h.address && h.address.toLowerCase().includes(q)) ||
        (h.specialists || []).some(
          (s) => s.specialty?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)
        ) ||
        (h.equipment || []).some((e) => e.toLowerCase().includes(e))
    );
  }

  // Facility Type filter (Hospital, Clinic, Blood Bank)
  const fType = (req.query.type || req.query.facilityType || '').trim().toLowerCase();
  if (fType && fType !== 'all') {
    hospitals = hospitals.filter((h) => {
      const hType = (h.type || '').toLowerCase();
      const hName = (h.name || '').toLowerCase();
      if (fType.includes('blood')) {
        return hType.includes('blood') || hName.includes('blood') || Object.values(h.bloodBank || {}).some((v) => v > 0);
      }
      if (fType.includes('clinic')) {
        return hType.includes('clinic') || hName.includes('clinic');
      }
      if (fType.includes('hospital')) {
        return hType.includes('hospital') || hName.includes('hospital');
      }
      return hType.includes(fType);
    });
  }

  // Bed type category filter
  if (bedType) {
    const bt = bedType.toUpperCase();
    if (bt === 'ICU') {
      hospitals = hospitals.filter((h) => (h.resources?.icuBedsAvailable || 0) > 0);
    } else if (bt === 'VENTILATOR') {
      hospitals = hospitals.filter((h) => (h.resources?.ventilatorsAvailable || 0) > 0);
    } else if (bt === 'OXYGEN') {
      hospitals = hospitals.filter((h) => (h.resources?.oxygenCylindersAvailable || 0) > 0);
    } else if (bt === 'GENERAL') {
      hospitals = hospitals.filter((h) => (h.resources?.generalBedsAvailable || 0) > 0);
    }
  }

  // General Beds count filter
  const bedsCount = minBeds || beds;
  if (bedsCount !== undefined) {
    const reqCount = Number(bedsCount) || 1;
    hospitals = hospitals.filter((h) => (h.resources?.generalBedsAvailable || 0) >= reqCount);
  }

  // ICU Beds count filter
  const icuCount = minIcuBeds || icuBeds;
  if (icuCount !== undefined) {
    const reqCount = Number(icuCount) || 1;
    hospitals = hospitals.filter((h) => (h.resources?.icuBedsAvailable || 0) >= reqCount);
  }

  // Ventilators count filter
  const ventCount = minVentilators || ventilators;
  if (ventCount !== undefined) {
    const reqCount = Number(ventCount) || 1;
    hospitals = hospitals.filter((h) => (h.resources?.ventilatorsAvailable || 0) >= reqCount);
  }

  // Oxygen count / availability filter
  const oxyCount = minOxygen || oxygen;
  if (oxyCount !== undefined || hasOxygen === 'true' || hasOxygen === true) {
    const reqCount = oxyCount !== undefined ? (Number(oxyCount) || 1) : 1;
    hospitals = hospitals.filter((h) => (h.resources?.oxygenCylindersAvailable || 0) >= reqCount);
  }

  // Blood availability filter
  const bg = bloodGroup || hasBlood;
  if (bg) {
    const formattedBg = bg.trim().toUpperCase();
    hospitals = hospitals.filter((h) => ((h.bloodBank && h.bloodBank[formattedBg]) || 0) > 0);
  }

  // Specialist filter
  if (specialist) {
    const spec = specialist.trim().toLowerCase();
    hospitals = hospitals.filter((h) =>
      (h.specialists || []).some(
        (s) => s.specialty?.toLowerCase().includes(spec) || s.name?.toLowerCase().includes(spec)
      )
    );
  }

  // Equipment filter
  if (equipment) {
    const eq = equipment.trim().toLowerCase();
    hospitals = hospitals.filter((h) =>
      (h.equipment || []).some((e) => e.toLowerCase().includes(eq))
    );
  }

  // Ensure each hospital has mapUrl and fallback values
  const enrichedHospitals = hospitals.map((h) => ({
    ...h,
    mapUrl: h.mapUrl || `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`
  }));

  res.json({ hospitals: enrichedHospitals, total: enrichedHospitals.length });
});

// Get hospital by ID
router.get('/:id', (req, res) => {
  const hospital = store.findById('hospitals', req.params.id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }
  const enriched = {
    ...hospital,
    mapUrl: hospital.mapUrl || `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`
  };
  res.json({ hospital: enriched });
});

// Update hospital basic details (HOSPITAL or ADMIN)
router.put('/:id', authenticateToken, requireRole('HOSPITAL', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another hospital.' });
  }

  const allowedUpdates = ['name', 'phone', 'emergencyHelpline', 'email', 'address', 'area', 'city', 'equipment', 'mapUrl'];
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
  res.json({
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    resources: hospital.resources,
    equipment: hospital.equipment || [],
    mapUrl: hospital.mapUrl || `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`
  });
});

const crypto = require('crypto');

function verifyStaffPin(providedPin) {
  const configuredPin = process.env.DEMO_INVENTORY_PIN || '1234';
  if (!providedPin || typeof providedPin !== 'string') return false;
  
  const cleanProvided = providedPin.trim();
  const cleanExpected = configuredPin.trim();
  
  if (cleanProvided.length !== cleanExpected.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(Buffer.from(cleanProvided), Buffer.from(cleanExpected));
  } catch (e) {
    return false;
  }
}

// Update Live Resources (HOSPITAL, ADMIN, or SYSTEM_DOCTOR) + Broadcast
router.put('/:id/resources', authenticateToken, requireRole('HOSPITAL', 'ADMIN', 'SYSTEM_DOCTOR'), (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another hospital resources.' });
  }

  // Server-side Staff PIN Verification Guard
  const incomingPin = req.headers['x-staff-pin'] || req.body.staffPin;
  const isPinRequired = process.env.REQUIRE_STAFF_PIN === 'true';

  if (incomingPin) {
    if (!verifyStaffPin(String(incomingPin))) {
      return res.status(403).json({ error: 'Staff authorization failed: Invalid Staff PIN.' });
    }
  } else if (isPinRequired && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Staff verification PIN required to modify hospital inventory.' });
  }

  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  // Clone payload and delete any non-resource metadata or PIN
  const bodyPayload = { ...req.body };
  delete bodyPayload.staffPin;

  const updatedResources = {
    ...hospital.resources,
    ...bodyPayload
  };

  // Clamp numbers to non-negative (Never allow available beds / ICU / ventilators / oxygen < 0 or NaN)
  for (const k in updatedResources) {
    if (typeof updatedResources[k] === 'number') {
      if (isNaN(updatedResources[k])) {
        updatedResources[k] = 0;
      } else {
        updatedResources[k] = Math.max(0, updatedResources[k]);
      }
    }
  }

  const updates = { resources: updatedResources };
  if (req.body.equipment && Array.isArray(req.body.equipment)) {
    updates.equipment = req.body.equipment;
  }

  const updated = store.update('hospitals', id, updates);

  // Broadcast real-time Socket.io update
  broadcastResourceUpdate(id, updated.resources);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_RESOURCES',
    resourceType: 'HOSPITAL_RESOURCES',
    resourceId: id,
    details: updated.resources
  });

  res.json({
    message: 'Live resources updated and broadcasted',
    resources: updated.resources,
    equipment: updated.equipment || [],
    hospital: updated
  });
});

// Update Blood Bank Stock + Broadcast
router.put('/:id/bloodbank', authenticateToken, requireRole('HOSPITAL', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another blood bank.' });
  }

  // Server-side Staff PIN Verification Guard
  const incomingPin = req.headers['x-staff-pin'] || req.body.staffPin;
  const isPinRequired = process.env.REQUIRE_STAFF_PIN === 'true';

  if (incomingPin) {
    if (!verifyStaffPin(String(incomingPin))) {
      return res.status(403).json({ error: 'Staff authorization failed: Invalid Staff PIN.' });
    }
  } else if (isPinRequired && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Staff verification PIN required to modify blood stock.' });
  }

  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const bodyPayload = { ...req.body };
  delete bodyPayload.staffPin;

  const updatedBloodBank = {
    ...hospital.bloodBank,
    ...bodyPayload
  };

  // Clamp numbers for all blood groups (Never allow blood units < 0 or NaN)
  for (const g of ALL_BLOOD_GROUPS) {
    if (updatedBloodBank[g] !== undefined) {
      const parsed = Number(updatedBloodBank[g]);
      updatedBloodBank[g] = isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
  }

  const updated = store.update('hospitals', id, { bloodBank: updatedBloodBank });

  broadcastBloodBankUpdate(id, updated.bloodBank);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_BLOOD_BANK',
    resourceType: 'HOSPITAL_BLOOD_BANK',
    resourceId: id,
    details: updated.bloodBank
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
  const activeAdmissions = requests.filter((r) => (r.type === 'ADMISSION' || r.type === 'H2H_TRANSFER') && r.status === 'ACCEPTED');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => (a.appointmentDate || a.date) === todayStr);

  const enriched = {
    ...hospital,
    mapUrl: hospital.mapUrl || `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`
  };

  res.json({
    hospital: enriched,
    metrics: {
      totalAppointments: appointments.length,
      todayAppointments: todayAppointments.length,
      pendingRequestsCount: pendingRequests.length,
      activeAdmissionsCount: activeAdmissions.length,
      assignedAmbulancesCount: ambulances.length,
      availableAmbulancesCount: ambulances.filter((a) => a.status === 'Available').length
    },
    resources: hospital.resources,
    equipment: hospital.equipment || [],
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
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another hospital specialists.' });
  }

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
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another hospital specialists.' });
  }

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
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== id) {
    return res.status(403).json({ error: 'Unauthorized to delete another hospital specialists.' });
  }

  const hospital = store.findById('hospitals', id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const specialists = (hospital.specialists || []).filter((s) => s.id !== specialistId);
  store.update('hospitals', id, { specialists });
  res.json({ message: 'Specialist removed', specialists });
});

module.exports = router;
