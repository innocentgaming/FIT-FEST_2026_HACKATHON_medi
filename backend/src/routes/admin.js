const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastRequestStatusChange } = require('../socket');

// All admin routes require ADMIN role
router.use(authenticateToken, requireRole('ADMIN'));

// Get all hospitals for Admin network dashboard
router.get('/hospitals', (req, res) => {
  const hospitals = store.get('hospitals');
  res.json({ hospitals, count: hospitals.length });
});

// Get system doctors list for triage assignment
router.get('/system-doctors', (req, res) => {
  const users = store.get('users');
  const doctors = users
    .filter((u) => u.role === 'SYSTEM_DOCTOR')
    .map(({ password, ...doc }) => doc);
  res.json({ doctors, count: doctors.length });
});

// Macro request overview & triage queue
router.get('/patient-requests', (req, res) => {
  const requests = store.get('requests');
  const rejectedRequests = requests.filter((r) => r.status === 'REJECTED');
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const escalatedRequests = requests.filter((r) => r.status === 'ASSIGNED' && r.assignedDoctorId);
  const resolvedRequests = requests.filter((r) => r.status === 'RESOLVED');

  res.json({
    summary: {
      totalRequests: requests.length,
      rejectedCount: rejectedRequests.length,
      pendingCount: pendingRequests.length,
      escalatedCount: escalatedRequests.length,
      resolvedCount: resolvedRequests.length
    },
    allRequests: requests,
    unresolvedQueue: rejectedRequests
  });
});

// Assign rejected request to System Doctor (Triage Escalation)
router.post('/requests/:requestId/assign', (req, res) => {
  const { requestId } = req.params;
  const { doctorId, triageNotes } = req.body;

  if (!doctorId) {
    return res.status(400).json({ error: 'System Doctor ID is required for escalation.' });
  }

  const doctor = store.findById('users', doctorId);
  if (!doctor || doctor.role !== 'SYSTEM_DOCTOR') {
    return res.status(400).json({ error: 'Specified user is not a valid System Doctor.' });
  }

  const request = store.findById('requests', requestId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  const updates = {
    status: 'ASSIGNED',
    assignedDoctorId: doctor.id,
    assignedDoctorName: doctor.name,
    triageNotes: triageNotes || 'Escalated by Admin for System Doctor conflict resolution & alternative facility routing.',
    timeline: [
      ...(request.timeline || []),
      {
        status: 'ASSIGNED',
        timestamp: new Date().toISOString(),
        actorRole: 'ADMIN',
        actorName: req.user.name,
        note: `Admin escalated rejected request to System Doctor ${doctor.name}. Notes: ${triageNotes || 'Priority triage'}`
      }
    ]
  };

  const updated = store.update('requests', requestId, updates);

  broadcastRequestStatusChange(updated);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'ADMIN',
    action: 'ESCALATE_TO_SYSTEM_DOCTOR',
    resourceType: request.type,
    resourceId: requestId,
    details: { assignedDoctorId: doctor.id, doctorName: doctor.name, triageNotes }
  });

  res.json({
    message: `Request #${requestId} escalated and assigned to System Doctor ${doctor.name}`,
    request: updated
  });
});

// View Audit Logs
router.get('/audit-logs', (req, res) => {
  const { limit } = req.query;
  const logs = store.get('auditLogs');
  const max = Number(limit) || 100;
  // Newest first
  const sorted = [...logs].reverse().slice(0, max);
  res.json({ logs: sorted, total: logs.length });
});

// Reset system to demo seed
router.post('/reset-demo', (req, res) => {
  store.resetToSeed();
  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'ADMIN',
    action: 'RESET_SYSTEM_DATA',
    resourceType: 'SYSTEM',
    resourceId: 'ALL',
    details: 'System restored to initial hackathon demonstration seeds.'
  });
  res.json({ message: 'System state successfully reset to initial demo seeds.' });
});

module.exports = router;
