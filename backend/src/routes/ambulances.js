const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastAmbulanceStatus, broadcastAmbulanceLocation } = require('../socket');

// List ambulances
router.get('/', optionalAuth, (req, res) => {
  const { hospitalId, status } = req.query;
  let ambulances = store.get('ambulances');

  if (hospitalId) {
    ambulances = ambulances.filter((a) => a.hospitalId === hospitalId);
  }

  if (status) {
    ambulances = ambulances.filter((a) => a.status.toLowerCase() === status.toLowerCase());
  }

  res.json({ ambulances, count: ambulances.length });
});

// Get single ambulance
router.get('/:id', optionalAuth, (req, res) => {
  const ambulance = store.findById('ambulances', req.params.id);
  if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });
  res.json({ ambulance });
});

// Update ambulance status (Available, On Duty, Offline)
router.put('/:id/status', authenticateToken, requireRole('AMBULANCE', 'HOSPITAL', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Available', 'On Duty', 'Offline'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const ambulance = store.findById('ambulances', id);
  if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });

  if (req.user.role === 'AMBULANCE' && req.user.ambulanceId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another ambulance.' });
  }

  const updated = store.update('ambulances', id, { status });

  // Broadcast
  broadcastAmbulanceStatus(updated);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_AMBULANCE_STATUS',
    resourceType: 'AMBULANCE',
    resourceId: id,
    details: `Ambulance ${updated.vehicleNo} status changed to ${status}`
  });

  res.json({ message: 'Ambulance status updated', ambulance: updated });
});

// Update simulated GPS location & stream via Socket
router.put('/:id/location', authenticateToken, requireRole('AMBULANCE', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  const { lat, lng, address, heading, speedKmph } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Latitude and Longitude are required.' });
  }

  const ambulance = store.findById('ambulances', id);
  if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });

  if (req.user.role === 'AMBULANCE' && req.user.ambulanceId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update GPS for another ambulance.' });
  }

  const currentLocation = {
    lat: Number(lat),
    lng: Number(lng),
    address: address || ambulance.currentLocation.address,
    heading: heading !== undefined ? Number(heading) : (ambulance.currentLocation.heading || 0),
    speedKmph: speedKmph !== undefined ? Number(speedKmph) : 35
  };

  const updated = store.update('ambulances', id, {
    currentLocation,
    isSimulatedGps: true
  });

  // Broadcast real-time location
  broadcastAmbulanceLocation({
    ambulanceId: id,
    vehicleNo: ambulance.vehicleNo,
    driverName: ambulance.driverName,
    currentLocation,
    currentRequestId: ambulance.currentRequestId,
    timestamp: new Date().toISOString()
  });

  res.json({ message: 'GPS location updated and broadcasted', ambulance: updated });
});

module.exports = router;
