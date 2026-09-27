const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastRequestStatusChange, broadcastResourceUpdate, broadcastBloodBankUpdate } = require('../socket');

const VALID_REQUEST_STATUSES = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'RESOLVED'];
const VALID_REQUEST_TYPES = ['ADMISSION', 'H2H_TRANSFER', 'BLOOD', 'EQUIPMENT', 'AMBULANCE'];

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
        (r.type === 'AMBULANCE' && r.status === 'PENDING')
    );
  } else if (req.user.role === 'SYSTEM_DOCTOR') {
    requests = requests.filter((r) => r.assignedDoctorId === req.user.id || r.status === 'REJECTED');
  }
  // ADMIN can see all

  if (type) {
    requests = requests.filter((r) => r.type === type.toUpperCase());
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

  // Find matching hospitals with available stock
  const matches = hospitals
    .map((h) => {
      const stock = (h.bloodBank && h.bloodBank[formattedGroup]) || 0;
      const isSufficient = stock >= requestedUnits;

      // Location match score for practical relevance
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
      // 1. Location match score (practical proximity)
      if (b.locationScore !== a.locationScore) {
        return b.locationScore - a.locationScore;
      }
      // 2. Stock sufficiency (sufficient units prioritized)
      if (b.isSufficient !== a.isSufficient) {
        return (b.isSufficient ? 1 : 0) - (a.isSufficient ? 1 : 0);
      }
      // 3. Total available units (descending)
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
  const R = 6371; // Earth radius in km
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

  if (!type || !VALID_REQUEST_TYPES.includes(type.toUpperCase())) {
    return res.status(400).json({
      error: `Invalid request type. Must be one of: ${VALID_REQUEST_TYPES.join(', ')}`
    });
  }

  const reqType = type.toUpperCase();
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
  } else if (reqType === 'AMBULANCE') {
    // Nearest suitable unit selection
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

  const newRequest = {
    id: `req_${reqType.toLowerCase()}_${Date.now()}`,
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
    status: assignedAmb ? 'ASSIGNED' : 'PENDING',
    ambulanceTripStatus: reqType === 'AMBULANCE' ? (assignedAmb ? 'Pending' : null) : null,
    priority: priority ? priority.toUpperCase() : (urgency ? urgency.toUpperCase() : (reqType === 'AMBULANCE' ? 'EMERGENCY' : 'NORMAL')),
    details: details || {},
    responseNotes: '',
    resolutionNotes: '',
    timeline: [
      {
        status: assignedAmb ? 'ASSIGNED' : 'PENDING',
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

  // Broadcast
  broadcastRequestStatusChange(newRequest);

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

// Update Request Status with state machine validation
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, responseNotes, reason, ambulanceTripStatus, assignedAmbulanceId, assignedDoctorId } = req.body;

  const request = store.findById('requests', id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  // Terminal states cannot be transitioned
  if (request.status === 'COMPLETED' || request.status === 'RESOLVED') {
    return res.status(400).json({
      error: `Request #${id} is in terminal state '${request.status}' and cannot be modified.`
    });
  }

  const targetStatus = status ? status.toUpperCase() : request.status;

  if (!VALID_REQUEST_STATUSES.includes(targetStatus)) {
    return res.status(400).json({
      error: `Invalid status '${targetStatus}'. Must be one of: ${VALID_REQUEST_STATUSES.join(', ')}`
    });
  }

  // Validate State Transitions
  const currentStatus = request.status;
  const finalResponseNotes = (responseNotes || reason || '').trim();

  // Rule 1: REJECTED requires responseNotes or reason
  if (targetStatus === 'REJECTED' && !finalResponseNotes) {
    return res.status(400).json({
      error: 'Rejection requires a mandatory explanation in responseNotes.'
    });
  }

  // Rule 2: Only assigned ambulance driver can ACCEPT an ambulance request
  if (request.type === 'AMBULANCE' && targetStatus === 'ACCEPTED') {
    if (req.user.role === 'AMBULANCE') {
      if (request.assignedAmbulanceId && req.user.ambulanceId !== request.assignedAmbulanceId) {
        return res.status(403).json({
          error: "Driver cannot accept another driver's request."
        });
      }
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only the assigned ambulance driver or admin can mark ambulance request as ACCEPTED.'
      });
    }
  }

  // Rule 3: Only assigned System Doctor can RESOLVE a conflict
  if (targetStatus === 'RESOLVED') {
    if (req.user.role !== 'SYSTEM_DOCTOR' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only an authorized System Doctor can mark an escalated request as RESOLVED.'
      });
    }
  }

  // State Transition validity matrix
  let isValidTransition = false;

  if (currentStatus === targetStatus && ambulanceTripStatus) {
    // Only updating trip sub-state
    isValidTransition = true;
  } else if (currentStatus === 'PENDING') {
    if (['ASSIGNED', 'ACCEPTED', 'REJECTED'].includes(targetStatus)) isValidTransition = true;
  } else if (currentStatus === 'ASSIGNED') {
    if (['ACCEPTED', 'REJECTED', 'RESOLVED'].includes(targetStatus)) isValidTransition = true;
  } else if (currentStatus === 'ACCEPTED') {
    if (['COMPLETED', 'REJECTED'].includes(targetStatus)) isValidTransition = true;
  } else if (currentStatus === 'REJECTED') {
    if (targetStatus === 'ASSIGNED' && (req.user.role === 'ADMIN' || req.user.role === 'SYSTEM_DOCTOR')) {
      isValidTransition = true; // Admin escalating to doctor
    }
  }

  if (!isValidTransition) {
    return res.status(400).json({
      error: `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`
    });
  }

  // Prepare updates
  const updates = {
    status: targetStatus,
    responseNotes: finalResponseNotes || request.responseNotes
  };

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

  // Transactional resource decrement if ADMISSION or H2H_TRANSFER is ACCEPTED
  if ((request.type === 'ADMISSION' || request.type === 'H2H_TRANSFER') && targetStatus === 'ACCEPTED' && currentStatus !== 'ACCEPTED') {
    const hosp = store.findById('hospitals', request.targetHospitalId);
    if (hosp) {
      const bedType = (request.details?.bedType || 'GENERAL').toUpperCase();
      let resourceKey = 'generalBedsAvailable';
      if (bedType === 'ICU') {
        resourceKey = 'icuBedsAvailable';
      } else if (bedType === 'VENTILATOR') {
        resourceKey = 'ventilatorsAvailable';
      }
      const updatedHosp = store.decrementResource(hosp.id, resourceKey, 1);
      if (updatedHosp) {
        broadcastResourceUpdate(hosp.id, updatedHosp.resources);
      }
    }
  }

  // Transactional blood stock decrement if BLOOD request is ACCEPTED
  if (request.type === 'BLOOD' && targetStatus === 'ACCEPTED' && currentStatus !== 'ACCEPTED') {
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

  // If ambulance accepted, update ambulance's currentRequestId and trip status
  if (request.type === 'AMBULANCE' && targetStatus === 'ACCEPTED') {
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

  if (request.type === 'AMBULANCE' && targetStatus === 'COMPLETED') {
    const ambId = request.assignedAmbulanceId;
    if (ambId) {
      store.update('ambulances', ambId, {
        status: 'AVAILABLE',
        currentRequestId: null
      });
      updates.ambulanceTripStatus = 'Completed';
    }
  }

  if (request.type === 'AMBULANCE' && targetStatus === 'REJECTED') {
    const ambId = request.assignedAmbulanceId;
    if (ambId) {
      store.update('ambulances', ambId, {
        currentRequestId: null
      });
    }
  }

  // Append timeline entry
  const newTimelineItem = {
    status: targetStatus,
    timestamp: new Date().toISOString(),
    actorRole: req.user.role,
    actorName: req.user.name,
    note: updates.responseNotes || updates.ambulanceTripStatus || `Status transitioned to ${targetStatus}`
  };

  updates.timeline = [...(request.timeline || []), newTimelineItem];

  const updated = store.update('requests', id, updates);

  // Broadcast real-time Socket event
  broadcastRequestStatusChange(updated);

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
