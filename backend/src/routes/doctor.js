const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastRequestStatusChange } = require('../socket');
const { notifyConflictResolution } = require('../services/notificationService');

// All doctor routes require SYSTEM_DOCTOR or ADMIN role
router.use(authenticateToken, requireRole('SYSTEM_DOCTOR', 'ADMIN'));

// Get all requests assigned to the logged-in System Doctor
router.get('/requests', (req, res) => {
  const requests = store.get('requests');
  let assigned = [];

  if (req.user.role === 'SYSTEM_DOCTOR') {
    assigned = requests.filter(
      (r) => r.assignedDoctorId === req.user.id
    );
  } else {
    // Admin can view all doctor escalations
    assigned = requests.filter((r) => r.assignedDoctorId);
  }

  res.json({ requests: assigned, count: assigned.length });
});

router.get('/assigned-requests', (req, res) => {
  const requests = store.get('requests');
  let assigned = [];

  if (req.user.role === 'SYSTEM_DOCTOR') {
    assigned = requests.filter(
      (r) => r.assignedDoctorId === req.user.id
    );
  } else {
    assigned = requests.filter((r) => r.assignedDoctorId);
  }

  res.json({ requests: assigned, count: assigned.length });
});

// Resolve Conflict (Select alternative facility, add resolutionNotes, mark RESOLVED)
router.put('/requests/:requestId/resolve', (req, res) => {
  const { requestId } = req.params;
  const { alternativeHospitalId, resolutionNotes, assignedBedType } = req.body;

  if (!resolutionNotes || !resolutionNotes.trim()) {
    return res.status(400).json({ error: 'Comprehensive resolution notes are required to resolve the conflict.' });
  }

  const request = store.findById('requests', requestId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  // Security Guard: Doctor cannot resolve another doctor's request
  if (req.user.role === 'SYSTEM_DOCTOR' && request.assignedDoctorId && request.assignedDoctorId !== req.user.id) {
    return res.status(403).json({ error: "Unauthorized: Doctor cannot resolve another doctor's assigned request." });
  }

  // Must be ASSIGNED to be resolved; cannot modify terminal states
  if (request.status === 'RESOLVED' || request.status === 'COMPLETED') {
    return res.status(400).json({ error: `Request #${requestId} is already in terminal state '${request.status}' and cannot be modified.` });
  }

  const oldStatus = request.status;
  const altHospital = alternativeHospitalId ? store.findById('hospitals', alternativeHospitalId) : null;

  const updates = {
    status: 'RESOLVED',
    resolutionNotes: resolutionNotes.trim(),
    resolvedByDoctorId: req.user.id,
    resolvedByDoctorName: req.user.name,
    resolvedAt: new Date().toISOString()
  };

  if (altHospital) {
    updates.targetHospitalId = altHospital.id;
    updates.targetHospitalName = altHospital.name;
    updates.reallocatedFacility = altHospital.name;
  }

  // Append timeline
  const noteDetails = altHospital
    ? `Resolved by System Doctor ${req.user.name}: Re-routed to ${altHospital.name}. Notes: ${resolutionNotes.trim()}`
    : `Resolved by System Doctor ${req.user.name}. Notes: ${resolutionNotes.trim()}`;

  updates.timeline = [
    ...(request.timeline || []),
    {
      status: 'RESOLVED',
      timestamp: new Date().toISOString(),
      actorRole: 'SYSTEM_DOCTOR',
      actorName: req.user.name,
      note: noteDetails
    }
  ];

  const updated = store.update('requests', requestId, updates);

  broadcastRequestStatusChange(updated);
  notifyConflictResolution(updated);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'SYSTEM_DOCTOR',
    action: 'RESOLVE_CONFLICT_REQUEST',
    resourceType: request.type,
    resourceId: requestId,
    details: {
      oldStatus,
      newStatus: 'RESOLVED',
      alternativeHospital: altHospital ? altHospital.name : null,
      resolutionNotes: resolutionNotes.trim(),
      resolvedAt: updates.resolvedAt
    }
  });

  res.json({
    message: `Conflict for Request #${requestId} successfully resolved. Alternative coordination completed.`,
    request: updated
  });
});

module.exports = router;
