const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastRequestStatusChange } = require('../socket');

// All doctor routes require SYSTEM_DOCTOR or ADMIN role
router.use(authenticateToken, requireRole('SYSTEM_DOCTOR', 'ADMIN'));

// Get all requests assigned to the logged-in System Doctor (or all escalations for Admin)
router.get('/assigned-requests', (req, res) => {
  const requests = store.get('requests');
  let assigned = [];

  if (req.user.role === 'SYSTEM_DOCTOR') {
    assigned = requests.filter(
      (r) => (r.assignedDoctorId === req.user.id && r.status === 'ASSIGNED') || (r.status === 'REJECTED')
    );
  } else {
    assigned = requests.filter((r) => r.status === 'ASSIGNED' && r.assignedDoctorId);
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

  // Must be ASSIGNED or REJECTED to be resolved
  if (request.status === 'RESOLVED' || request.status === 'COMPLETED') {
    return res.status(400).json({ error: `Request #${requestId} is already in terminal state ${request.status}.` });
  }

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
    ? `Resolved by System Doctor ${req.user.name}: Re-routed to ${altHospital.name}. Notes: ${resolutionNotes}`
    : `Resolved by System Doctor ${req.user.name}. Notes: ${resolutionNotes}`;

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

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'SYSTEM_DOCTOR',
    action: 'RESOLVE_CONFLICT_REQUEST',
    resourceType: request.type,
    resourceId: requestId,
    details: { alternativeHospital: altHospital ? altHospital.name : null, resolutionNotes }
  });

  res.json({
    message: `Conflict for Request #${requestId} successfully resolved. Alternative coordination completed.`,
    request: updated
  });
});

module.exports = router;
