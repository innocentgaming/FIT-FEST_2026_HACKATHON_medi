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

// Macro request overview & triage queue with rich filters
router.get('/patient-requests', (req, res) => {
  const { status, priority, type, requestType, hospitalId, hospital, date } = req.query;
  const hospitals = store.get('hospitals');
  const ambulances = store.get('ambulances');
  let requests = store.get('requests');

  // Compute metrics across entire network
  const totalHospitals = hospitals.length;
  const activeAmbulances = ambulances.filter(
    (a) => (a.status || '').toUpperCase().replace(' ', '_') === 'AVAILABLE' || (a.status || '').toUpperCase().replace(' ', '_') === 'ON_DUTY'
  ).length;
  const activeRequests = requests.filter((r) => ['PENDING', 'ASSIGNED', 'ACCEPTED'].includes(r.status)).length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
  const rejectedRequests = requests.filter((r) => r.status === 'REJECTED').length;
  const unresolvedRequests = requests.filter(
    (r) => r.status === 'REJECTED' || (r.status === 'ASSIGNED' && r.assignedDoctorId)
  ).length;
  const emergencyRequests = requests.filter(
    (r) => r.priority === 'EMERGENCY' || r.priority === 'CRITICAL' || r.type === 'AMBULANCE'
  ).length;

  // Apply filters for the network requests table
  if (status) {
    requests = requests.filter((r) => r.status === status.toUpperCase());
  }

  if (priority) {
    requests = requests.filter((r) => r.priority === priority.toUpperCase());
  }

  const reqType = type || requestType;
  if (reqType) {
    requests = requests.filter((r) => r.type === reqType.toUpperCase());
  }

  const hosp = hospitalId || hospital;
  if (hosp) {
    requests = requests.filter(
      (r) => r.targetHospitalId === hosp || r.sourceHospitalId === hosp || r.targetHospitalName?.toLowerCase().includes(hosp.toLowerCase())
    );
  }

  if (date) {
    requests = requests.filter((r) => (r.createdAt || '').startsWith(date));
  }

  // Sort newest first
  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    summary: {
      totalHospitals,
      activeAmbulances,
      activeRequests,
      pendingRequests,
      rejectedRequests,
      unresolvedRequests,
      emergencyRequests,
      totalRequests: store.get('requests').length,
      rejectedCount: rejectedRequests,
      pendingCount: pendingRequests,
      escalatedCount: store.get('requests').filter((r) => r.status === 'ASSIGNED' && r.assignedDoctorId).length,
      resolvedCount: store.get('requests').filter((r) => r.status === 'RESOLVED').length
    },
    allRequests: requests,
    unresolvedQueue: store.get('requests').filter((r) => r.status === 'REJECTED')
  });
});

// Alias for PRD route
router.get('/network-requests', (req, res) => {
  res.redirect(307, '/api/admin/patient-requests');
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

  const oldStatus = request.status;
  const assignedAt = new Date().toISOString();

  const updates = {
    status: 'ASSIGNED',
    assignedDoctorId: doctor.id,
    assignedDoctorName: doctor.name,
    assignedAt,
    triageNotes: triageNotes || 'Escalated by Admin for System Doctor conflict resolution & alternative facility routing.',
    timeline: [
      ...(request.timeline || []),
      {
        status: 'ASSIGNED',
        timestamp: assignedAt,
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
    details: {
      oldStatus,
      newStatus: 'ASSIGNED',
      assignedDoctorId: doctor.id,
      doctorName: doctor.name,
      assignedAt,
      triageNotes: updates.triageNotes
    }
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
