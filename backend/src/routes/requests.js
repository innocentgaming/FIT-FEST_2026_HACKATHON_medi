const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastRequestStatusChange, broadcastResourceUpdate } = require('../socket');

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

// Smart Blood Search endpoint
router.post('/search-blood', (req, res) => {
  const { bloodGroup, unitsRequired, location, urgency } = req.body;

  if (!bloodGroup) {
    return res.status(400).json({ error: 'Blood group is required.' });
  }

  const requestedUnits = Number(unitsRequired) || 1;
  const hospitals = store.get('hospitals');

  const formattedGroup = bloodGroup.trim().toUpperCase();

  // Find matching hospitals with available stock
  const matches = hospitals
    .map((h) => {
      const stock = (h.bloodBank && h.bloodBank[formattedGroup]) || 0;
      const isSufficient = stock >= requestedUnits;
      return {
        hospitalId: h.id,
        hospitalName: h.name,
        address: h.address,
        area: h.area,
        city: h.city,
        phone: h.phone,
        emergencyHelpline: h.emergencyHelpline,
        lat: h.lat,
        lng: h.lng,
        bloodGroup: formattedGroup,
        availableUnits: stock,
        isSufficient,
        urgencyLevel: urgency || 'Standard',
        verifiedLiveStock: true
      };
    })
    .sort((a, b) => b.availableUnits - a.availableUnits);

  res.json({
    query: { bloodGroup: formattedGroup, unitsRequired: requestedUnits, location, urgency },
    matches,
    totalFacilitiesWithStock: matches.filter((m) => m.availableUnits > 0).length
  });
});

// Create new Request
router.post('/', authenticateToken, (req, res) => {
  const {
    type,
    targetHospitalId,
    sourceHospitalId,
    assignedAmbulanceId,
    priority,
    details
  } = req.body;

  if (!type || !VALID_REQUEST_TYPES.includes(type.toUpperCase())) {
    return res.status(400).json({
      error: `Invalid request type. Must be one of: ${VALID_REQUEST_TYPES.join(', ')}`
    });
  }

  const reqType = type.toUpperCase();
  const targetHospital = targetHospitalId ? store.findById('hospitals', targetHospitalId) : null;
  const sourceHospital = sourceHospitalId ? store.findById('hospitals', sourceHospitalId) : null;
  const ambulance = assignedAmbulanceId ? store.findById('ambulances', assignedAmbulanceId) : null;

  const newRequest = {
    id: `req_${reqType.toLowerCase()}_${Date.now()}`,
    type: reqType,
    patientId: req.user.role === 'PATIENT' ? req.user.id : (req.body.patientId || null),
    patientName: req.user.role === 'PATIENT' ? req.user.name : (req.body.patientName || 'Emergency Patient'),
    patientPhone: req.user.role === 'PATIENT' ? req.user.phone : (req.body.patientPhone || ''),
    sourceHospitalId: sourceHospital ? sourceHospital.id : null,
    sourceHospitalName: sourceHospital ? sourceHospital.name : null,
    targetHospitalId: targetHospital ? targetHospital.id : null,
    targetHospitalName: targetHospital ? targetHospital.name : null,
    assignedAmbulanceId: ambulance ? ambulance.id : null,
    assignedAmbulanceVehicle: ambulance ? ambulance.vehicleNo : null,
    assignedDoctorId: null,
    assignedDoctorName: null,
    status: ambulance ? 'ASSIGNED' : 'PENDING',
    ambulanceTripStatus: reqType === 'AMBULANCE' ? null : null,
    priority: priority ? priority.toUpperCase() : (reqType === 'AMBULANCE' ? 'EMERGENCY' : 'NORMAL'),
    details: details || {},
    responseNotes: '',
    resolutionNotes: '',
    timeline: [
      {
        status: ambulance ? 'ASSIGNED' : 'PENDING',
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
  const { status, responseNotes, ambulanceTripStatus, assignedAmbulanceId, assignedDoctorId } = req.body;

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

  // Rule 1: REJECTED requires responseNotes
  if (targetStatus === 'REJECTED' && (!responseNotes || !responseNotes.trim())) {
    return res.status(400).json({
      error: 'Rejection requires a mandatory explanation in responseNotes.'
    });
  }

  // Rule 2: Only assigned ambulance driver can ACCEPT an ambulance request
  if (request.type === 'AMBULANCE' && targetStatus === 'ACCEPTED') {
    if (req.user.role !== 'AMBULANCE' && req.user.role !== 'ADMIN') {
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
    responseNotes: responseNotes !== undefined ? responseNotes : request.responseNotes
  };

  if (ambulanceTripStatus) {
    updates.ambulanceTripStatus = ambulanceTripStatus;
  }

  if (assignedAmbulanceId) {
    const amb = store.findById('ambulances', assignedAmbulanceId);
    if (amb) {
      updates.assignedAmbulanceId = amb.id;
      updates.assignedAmbulanceVehicle = amb.vehicleNo;
    }
  }

  if (assignedDoctorId) {
    const doc = store.findById('users', assignedDoctorId);
    if (doc) {
      updates.assignedDoctorId = doc.id;
      updates.assignedDoctorName = doc.name;
    }
  }

  // Transactional resource decrement if ADMISSION is ACCEPTED
  if (request.type === 'ADMISSION' && targetStatus === 'ACCEPTED' && currentStatus !== 'ACCEPTED') {
    const hosp = store.findById('hospitals', request.targetHospitalId);
    if (hosp) {
      const bedType = request.details?.bedType || 'GENERAL';
      const updatedResources = { ...hosp.resources };
      if (bedType === 'ICU' && updatedResources.icuBedsAvailable > 0) {
        updatedResources.icuBedsAvailable -= 1;
      } else if (bedType === 'VENTILATOR' && updatedResources.ventilatorsAvailable > 0) {
        updatedResources.ventilatorsAvailable -= 1;
      } else if (updatedResources.generalBedsAvailable > 0) {
        updatedResources.generalBedsAvailable -= 1;
      }
      store.update('hospitals', hosp.id, { resources: updatedResources });
      broadcastResourceUpdate(hosp.id, updatedResources);
    }
  }

  // If ambulance accepted, update ambulance's currentRequestId and trip status
  if (request.type === 'AMBULANCE' && targetStatus === 'ACCEPTED') {
    const ambId = updates.assignedAmbulanceId || request.assignedAmbulanceId;
    if (ambId) {
      store.update('ambulances', ambId, {
        status: 'On Duty',
        currentRequestId: request.id
      });
      if (!updates.ambulanceTripStatus) {
        updates.ambulanceTripStatus = 'ON_THE_WAY';
      }
    }
  }

  if (request.type === 'AMBULANCE' && targetStatus === 'COMPLETED') {
    const ambId = request.assignedAmbulanceId;
    if (ambId) {
      store.update('ambulances', ambId, {
        status: 'Available',
        currentRequestId: null
      });
      updates.ambulanceTripStatus = 'COMPLETED';
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
