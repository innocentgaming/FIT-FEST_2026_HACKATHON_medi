const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  normalizeRequestType,
  validateTransition
} = require('../engine/requestEngine');
const {
  notifyAdmissionRequest,
  notifyTransferRequest,
  notifyAmbulanceEvent,
  notifyBloodRequest,
  notifyConflictResolution
} = require('../services/notificationService');
const {
  broadcastRequestCreated,
  broadcastRequestStatusChange,
  broadcastResourceUpdate,
  broadcastBloodBankUpdate
} = require('../socket');

// Get requests (auto-filtered by role)
router.get('/', authenticateToken, (req, res) => {
  const { type, status, priority } = req.query;
  let requests = store.get('requests');

  // RBAC Auto-filtering
  if (req.user.role === 'PATIENT') {
    requests = requests.filter((r) => r.patientId === req.user.id);
  } else if (req.user.role === 'HOSPITAL') {
    requests = requests.filter(
      (r) => r.targetHospitalId === req.user.hospitalId || r.sourceHospitalId === req.user.hospitalId
    );
  } else if (req.user.role === 'AMBULANCE') {
    requests = requests.filter(
      (r) =>
        r.assignedAmbulanceId === req.user.ambulanceId ||
        (normalizeRequestType(r.type) === REQUEST_TYPES.AMBULANCE_REQUEST && r.status === 'PENDING')
    );
  } else if (req.user.role === 'SYSTEM_DOCTOR') {
    requests = requests.filter((r) => r.assignedDoctorId === req.user.id || r.status === 'REJECTED');
  }
  // ADMIN can see all

  if (type) {
    const norm = normalizeRequestType(type);
    requests = requests.filter((r) => normalizeRequestType(r.type) === norm || r.type === type.toUpperCase());
  }

  if (status) {
    requests = requests.filter((r) => r.status === status.toUpperCase());
  }

  if (priority) {
    requests = requests.filter((r) => r.priority === priority.toUpperCase());
  }

  // Sort newest first
  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ requests, count: requests.length });
});

// Smart Blood Search endpoint (Group + Units Required + Location + Urgency)
router.post('/search-blood', (req, res) => {
  const { bloodGroup, unitsRequired, location, urgency } = req.body;

  if (!bloodGroup) {
    return res.status(400).json({ error: 'Blood group is required.' });
  }

  const requestedUnits = Number(unitsRequired) || 1;
  const formattedGroup = bloodGroup.trim().toUpperCase();
  const hospitals = store.get('hospitals');
  const locQuery = (location || '').trim().toLowerCase();

  const matches = hospitals
    .map((h) => {
      const stock = (h.bloodBank && h.bloodBank[formattedGroup]) || 0;
      const isSufficient = stock >= requestedUnits;

      let locationScore = 0;
      if (locQuery) {
        const cityMatch = h.city && h.city.toLowerCase().includes(locQuery);
        const areaMatch = h.area && h.area.toLowerCase().includes(locQuery);
        const addressMatch = h.address && h.address.toLowerCase().includes(locQuery);
        if (cityMatch && areaMatch) locationScore = 100;
        else if (areaMatch) locationScore = 90;
        else if (cityMatch) locationScore = 80;
        else if (addressMatch) locationScore = 70;
      } else {
        locationScore = 50;
      }

      return {
        hospitalId: h.id,
        hospitalName: h.name,
        address: h.address,
        area: h.area,
        city: h.city,
        phone: h.phone,
        emergencyHelpline: h.emergencyHelpline,
        mapUrl: h.mapUrl || `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`,
        lat: h.lat,
        lng: h.lng,
        bloodGroup: formattedGroup,
        availableUnits: stock,
        isSufficient,
        locationScore,
        urgencyLevel: urgency ? urgency.toUpperCase() : 'NORMAL',
        resources: {
          icuBedsAvailable: h.resources?.icuBedsAvailable || 0,
          generalBedsAvailable: h.resources?.generalBedsAvailable || 0,
          ventilatorsAvailable: h.resources?.ventilatorsAvailable || 0,
          oxygenCylindersAvailable: h.resources?.oxygenCylindersAvailable || 0
        },
        verifiedLiveStock: true
      };
    })
    .sort((a, b) => {
      if (b.locationScore !== a.locationScore) return b.locationScore - a.locationScore;
      if (b.isSufficient !== a.isSufficient) return (b.isSufficient ? 1 : 0) - (a.isSufficient ? 1 : 0);
      return b.availableUnits - a.availableUnits;
    });

  res.json({
    query: {
      bloodGroup: formattedGroup,
      unitsRequired: requestedUnits,
      location: location || 'All Regions',
      urgency: urgency ? urgency.toUpperCase() : 'NORMAL'
    },
    matches,
    totalFacilitiesWithStock: matches.filter((m) => m.availableUnits > 0).length,
    disclaimer: 'Blood availability reflects verified inventory from participating hospital cold storage. Contact facility helpline for emergency pickup.'
  });
});

// Distance helper (Haversine formula in KM)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 5.0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Create new Request
router.post('/', authenticateToken, (req, res) => {
  const {
    type,
    targetHospitalId,
    sourceHospitalId,
    assignedAmbulanceId,
    priority,
    location,
    urgency,
    administrativeNote,
    details: inputDetails
  } = req.body;

  const reqType = normalizeRequestType(type);

  const targetHospital = targetHospitalId ? store.findById('hospitals', targetHospitalId) : null;
  const sourceHospital = sourceHospitalId ? store.findById('hospitals', sourceHospitalId) : null;
  let details = inputDetails ? { ...inputDetails } : {};

  if (location && !details.location) details.location = location;
  if (administrativeNote && !details.administrativeNote) details.administrativeNote = administrativeNote;
  if (urgency && !details.urgency) details.urgency = urgency;

  let assignedAmb = null;

  if (assignedAmbulanceId) {
    assignedAmb = store.findById('ambulances', assignedAmbulanceId);
    if (!assignedAmb) {
      return res.status(404).json({ error: 'Assigned ambulance not found.' });
    }
    const ambStatus = (assignedAmb.status || '').toUpperCase().replace(' ', '_');
    if (ambStatus !== 'AVAILABLE') {
      return res.status(400).json({
        error: `Cannot assign unavailable ambulance. Ambulance is currently ${assignedAmb.status || 'UNAVAILABLE'}.`
      });
    }
  } else if (reqType === REQUEST_TYPES.AMBULANCE_REQUEST) {
    // Nearest available unit selection
    const pLat = Number(details.latitude || details.lat || req.body.latitude || req.body.lat || 18.5204);
    const pLng = Number(details.longitude || details.lng || req.body.longitude || req.body.lng || 73.8567);

    const availableAmbulances = store.get('ambulances').filter((a) => {
      const st = (a.status || '').toUpperCase().replace(' ', '_');
      return st === 'AVAILABLE';
    });

    if (availableAmbulances.length > 0) {
      const scored = availableAmbulances.map((a) => {
        const aLat = a.latitude !== undefined ? a.latitude : (a.currentLocation?.lat || 18.5204);
        const aLng = a.longitude !== undefined ? a.longitude : (a.currentLocation?.lng || 73.8567);
        const dist = calculateDistanceKm(pLat, pLng, aLat, aLng);
        return { ambulance: a, distance: dist };
      }).sort((a, b) => a.distance - b.distance);

      assignedAmb = scored[0].ambulance;
      details.calculatedDistanceKm = scored[0].distance;
      details.estimatedEtaMinutes = Math.max(3, Math.round(scored[0].distance * 3));
    }
  }

  const initialStatus = assignedAmb ? 'ASSIGNED' : 'PENDING';

  const newRequest = {
    id: `req_${reqType.toLowerCase().substring(0, 3)}_${Date.now()}`,
    type: reqType,
    patientId: req.user.role === 'PATIENT' ? req.user.id : (req.body.patientId || null),
    patientName: req.user.role === 'PATIENT' ? req.user.name : (req.body.patientName || 'Emergency Patient'),
    patientPhone: req.user.role === 'PATIENT' ? req.user.phone : (req.body.patientPhone || ''),
    sourceHospitalId: sourceHospital ? sourceHospital.id : null,
    sourceHospitalName: sourceHospital ? sourceHospital.name : null,
    targetHospitalId: targetHospital ? targetHospital.id : (assignedAmb ? assignedAmb.hospitalId : null),
    targetHospitalName: targetHospital ? targetHospital.name : (assignedAmb ? assignedAmb.hospitalName : null),
    assignedAmbulanceId: assignedAmb ? assignedAmb.id : null,
    assignedAmbulanceVehicle: assignedAmb ? (assignedAmb.vehicleNumber || assignedAmb.vehicleNo) : null,
    assignedDoctorId: null,
    assignedDoctorName: null,
    status: initialStatus,
    ambulanceTripStatus: reqType === REQUEST_TYPES.AMBULANCE_REQUEST ? (assignedAmb ? 'Pending' : null) : null,
    priority: priority ? priority.toUpperCase() : (urgency ? urgency.toUpperCase() : (reqType === REQUEST_TYPES.AMBULANCE_REQUEST ? 'EMERGENCY' : 'NORMAL')),
    details: details || {},
    responseNotes: '',
    resolutionNotes: '',
    timeline: [
      {
        status: initialStatus,
        timestamp: new Date().toISOString(),
        actorRole: req.user.role,
        actorName: req.user.name,
        note: `Request initiated by ${req.user.name} (${req.user.role}).`
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.insert('requests', newRequest);

  // Broadcast & Notifications
  broadcastRequestCreated(newRequest);

  if (reqType === REQUEST_TYPES.AMBULANCE_REQUEST) {
    notifyAmbulanceEvent(newRequest, 'CREATED');
  } else if (reqType === REQUEST_TYPES.PATIENT_ADMISSION) {
    notifyAdmissionRequest(newRequest);
  } else if (reqType === REQUEST_TYPES.HOSPITAL_TRANSFER) {
    notifyTransferRequest(newRequest);
  } else if (reqType === REQUEST_TYPES.BLOOD_REQUEST) {
    notifyBloodRequest(newRequest);
  }

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'CREATE_REQUEST',
    resourceType: reqType,
    resourceId: newRequest.id,
    details: newRequest
  });

  res.status(201).json({
    message: 'Request created successfully',
    request: newRequest
  });
});

// Update Request Status with Centralized Status Machine Validation
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    status,
    responseNotes,
    reason,
    resolutionNotes,
    ambulanceTripStatus,
    assignedAmbulanceId,
    assignedDoctorId,
    alternativeHospitalId
  } = req.body;

  const request = store.findById('requests', id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  const targetStatus = status ? status.toUpperCase() : request.status;

  // Centralized Validation Engine
  const validation = validateTransition({
    request,
    targetStatus,
    user: req.user,
    responseNotes,
    reason,
    resolutionNotes,
    ambulanceTripStatus,
    assignedDoctorId,
    store
  });

  if (!validation.valid) {
    return res.status(validation.statusCode || 400).json({
      error: validation.error
    });
  }

  const currentStatus = request.status;
  const finalResponseNotes = (responseNotes || reason || '').trim();
  const finalResolutionNotes = (resolutionNotes || '').trim();

  const updates = {
    status: targetStatus,
    responseNotes: finalResponseNotes || request.responseNotes
  };

  if (finalResolutionNotes) {
    updates.resolutionNotes = finalResolutionNotes;
  }

  if (ambulanceTripStatus) {
    updates.ambulanceTripStatus = ambulanceTripStatus;
  }

  if (assignedAmbulanceId) {
    const amb = store.findById('ambulances', assignedAmbulanceId);
    if (!amb) {
      return res.status(404).json({ error: 'Assigned ambulance not found.' });
    }
    const ambStatus = (amb.status || '').toUpperCase().replace(' ', '_');
    if (ambStatus !== 'AVAILABLE') {
      return res.status(400).json({
        error: `Cannot assign unavailable ambulance. Ambulance is currently ${amb.status || 'UNAVAILABLE'}.`
      });
    }
    updates.assignedAmbulanceId = amb.id;
    updates.assignedAmbulanceVehicle = amb.vehicleNumber || amb.vehicleNo;
  }

  if (assignedDoctorId) {
    const doc = store.findById('users', assignedDoctorId);
    if (doc) {
      updates.assignedDoctorId = doc.id;
      updates.assignedDoctorName = doc.name;
    }
  }

  if (alternativeHospitalId) {
    const altHosp = store.findById('hospitals', alternativeHospitalId);
    if (altHosp) {
      updates.targetHospitalId = altHosp.id;
      updates.targetHospitalName = altHosp.name;
    }
  }

  const normalizedType = normalizeRequestType(request.type);

  // Resource & Stock Decrements
  if (
    (normalizedType === REQUEST_TYPES.PATIENT_ADMISSION || normalizedType === REQUEST_TYPES.HOSPITAL_TRANSFER) &&
    targetStatus === 'ACCEPTED' &&
    currentStatus !== 'ACCEPTED'
  ) {
    const hosp = store.findById('hospitals', request.targetHospitalId);
    if (hosp) {
      const bedType = (request.details?.bedType || 'GENERAL').toUpperCase();
      let resourceKey = 'generalBedsAvailable';
      if (bedType === 'ICU') resourceKey = 'icuBedsAvailable';
      else if (bedType === 'VENTILATOR') resourceKey = 'ventilatorsAvailable';

      const updatedHosp = store.decrementResource(hosp.id, resourceKey, 1);
      if (updatedHosp) {
        broadcastResourceUpdate(hosp.id, updatedHosp.resources);
      }
    }
  }

  if (
    normalizedType === REQUEST_TYPES.BLOOD_REQUEST &&
    targetStatus === 'ACCEPTED' &&
    currentStatus !== 'ACCEPTED'
  ) {
    const hosp = store.findById('hospitals', request.targetHospitalId);
    if (hosp && request.details?.bloodGroup) {
      const units = Number(request.details?.unitsRequired) || 1;
      const formattedGroup = request.details.bloodGroup.trim().toUpperCase();
      const updatedHosp = store.decrementBloodStock(hosp.id, formattedGroup, units);
      if (updatedHosp) {
        broadcastBloodBankUpdate(hosp.id, updatedHosp.bloodBank);
      }
    }
  }

  // Ambulance Fleet Status Transitions
  if (normalizedType === REQUEST_TYPES.AMBULANCE_REQUEST && targetStatus === 'ACCEPTED') {
    const ambId = updates.assignedAmbulanceId || request.assignedAmbulanceId;
    if (ambId) {
      store.update('ambulances', ambId, {
        status: 'ON_DUTY',
        currentRequestId: request.id
      });
      if (!updates.ambulanceTripStatus) {
        updates.ambulanceTripStatus = 'On the Way';
      }
    }
  }

  if (normalizedType === REQUEST_TYPES.AMBULANCE_REQUEST && targetStatus === 'COMPLETED') {
    const ambId = request.assignedAmbulanceId;
    if (ambId) {
      store.update('ambulances', ambId, {
        status: 'AVAILABLE',
        currentRequestId: null
      });
      updates.ambulanceTripStatus = 'Completed';
    }
  }

  if (normalizedType === REQUEST_TYPES.AMBULANCE_REQUEST && targetStatus === 'REJECTED') {
    const ambId = request.assignedAmbulanceId;
    if (ambId) {
      store.update('ambulances', ambId, {
        status: 'AVAILABLE',
        currentRequestId: null
      });
    }
  }

  // Timeline
  const newTimelineItem = {
    status: targetStatus,
    timestamp: new Date().toISOString(),
    actorRole: req.user.role,
    actorName: req.user.name,
    note: updates.responseNotes || updates.resolutionNotes || updates.ambulanceTripStatus || `Status transitioned to ${targetStatus}`
  };

  updates.timeline = [...(request.timeline || []), newTimelineItem];

  const updated = store.update('requests', id, updates);

  // Broadcast & Generate Notifications
  broadcastRequestStatusChange(updated);

  if (normalizedType === REQUEST_TYPES.AMBULANCE_REQUEST) {
    notifyAmbulanceEvent(updated, targetStatus);
  } else if (normalizedType === REQUEST_TYPES.PATIENT_ADMISSION) {
    notifyAdmissionRequest(updated);
  } else if (normalizedType === REQUEST_TYPES.HOSPITAL_TRANSFER) {
    notifyTransferRequest(updated);
  } else if (normalizedType === REQUEST_TYPES.BLOOD_REQUEST) {
    notifyBloodRequest(updated);
  }

  if (targetStatus === 'RESOLVED') {
    notifyConflictResolution(updated);
  }

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_REQUEST_STATUS',
    resourceType: request.type,
    resourceId: id,
    details: { from: currentStatus, to: targetStatus, updates }
  });

  res.json({
    message: `Request status updated to ${targetStatus}`,
    request: updated
  });
});

// Get single request
router.get('/:id', authenticateToken, (req, res) => {
  const request = store.findById('requests', req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ request });
});

module.exports = router;
