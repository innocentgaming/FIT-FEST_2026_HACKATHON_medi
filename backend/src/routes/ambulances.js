const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastAmbulanceStatus, broadcastAmbulanceLocation } = require('../socket');

// Normalization helper
const formatAmbulance = (amb) => {
  if (!amb) return null;
  const lat = amb.latitude !== undefined ? amb.latitude : (amb.currentLocation?.lat || 18.5204);
  const lng = amb.longitude !== undefined ? amb.longitude : (amb.currentLocation?.lng || 73.8567);
  const rawStatus = (amb.status || 'AVAILABLE').toUpperCase().replace(' ', '_');
  const normalizedStatus = ['AVAILABLE', 'ON_DUTY', 'OFFLINE'].includes(rawStatus)
    ? rawStatus
    : (rawStatus === 'ON_DUTY' || rawStatus === 'ONDUTY' ? 'ON_DUTY' : 'AVAILABLE');

  return {
    ...amb,
    id: amb.id,
    driverName: amb.driverName || 'Designated Driver',
    phone: amb.phone || amb.driverPhone || '',
    driverPhone: amb.driverPhone || amb.phone || '',
    vehicleNumber: amb.vehicleNumber || amb.vehicleNo || 'MH-12-EMG',
    vehicleNo: amb.vehicleNo || amb.vehicleNumber || 'MH-12-EMG',
    hospitalId: amb.hospitalId,
    hospitalName: amb.hospitalName || 'Network Facility',
    status: normalizedStatus,
    latitude: lat,
    longitude: lng,
    currentLocation: {
      lat,
      lng,
      address: amb.currentLocation?.address || 'Pune Emergency Corridor',
      heading: amb.currentLocation?.heading || 0,
      speedKmph: amb.currentLocation?.speedKmph || 0
    },
    isSimulatedGps: amb.isSimulatedGps !== undefined ? amb.isSimulatedGps : true,
    updatedAt: amb.updatedAt || new Date().toISOString()
  };
};

// List ambulances
router.get('/', optionalAuth, (req, res) => {
  const { hospitalId, status, availability } = req.query;
  let ambulances = store.get('ambulances').map(formatAmbulance);

  // If user is a HOSPITAL and no hospitalId query is passed, optionally auto-filter or allow querying
  if (hospitalId) {
    ambulances = ambulances.filter((a) => a.hospitalId === hospitalId);
  }

  const statusFilter = status || availability;
  if (statusFilter) {
    const targetStatus = statusFilter.toUpperCase().replace(' ', '_');
    ambulances = ambulances.filter((a) => a.status === targetStatus);
  }

  res.json({ ambulances, count: ambulances.length });
});

// Get single ambulance
router.get('/:id', optionalAuth, (req, res) => {
  const ambulance = store.findById('ambulances', req.params.id);
  if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });
  res.json({ ambulance: formatAmbulance(ambulance) });
});

// Update ambulance status (AVAILABLE, ON_DUTY, OFFLINE)
router.put('/:id/status', authenticateToken, requireRole('AMBULANCE', 'HOSPITAL', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required. Must be one of: AVAILABLE, ON_DUTY, OFFLINE' });
  }

  const normalizedInput = status.toUpperCase().replace(' ', '_');
  const validStatuses = ['AVAILABLE', 'ON_DUTY', 'OFFLINE'];
  if (!validStatuses.includes(normalizedInput)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const ambulance = store.findById('ambulances', id);
  if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });

  // RBAC Guards:
  // Hospital can ONLY modify its own ambulances
  if (req.user.role === 'HOSPITAL' && req.user.hospitalId !== ambulance.hospitalId) {
    return res.status(403).json({ error: "Unauthorized: Hospital cannot modify another hospital's ambulance." });
  }

  // Driver can ONLY modify their own assigned ambulance
  if (req.user.role === 'AMBULANCE' && req.user.ambulanceId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update another ambulance.' });
  }

  const updatedRaw = store.update('ambulances', id, {
    status: normalizedInput,
    updatedAt: new Date().toISOString()
  });

  const updated = formatAmbulance(updatedRaw);

  // Broadcast real-time status update
  broadcastAmbulanceStatus(updated);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_AMBULANCE_STATUS',
    resourceType: 'AMBULANCE',
    resourceId: id,
    details: `Ambulance ${updated.vehicleNumber} status changed to ${normalizedInput}`
  });

  res.json({ message: 'Ambulance status updated', ambulance: updated });
});

const { telemetryLimiter } = require('../middleware/rateLimiter');

// Update simulated GPS location & stream via Socket
router.put('/:id/location', authenticateToken, requireRole('AMBULANCE', 'ADMIN'), telemetryLimiter, (req, res) => {
  const { id } = req.params;
  const lat = req.body.lat !== undefined ? req.body.lat : req.body.latitude;
  const lng = req.body.lng !== undefined ? req.body.lng : req.body.longitude;
  const { address, heading, speedKmph } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Latitude and Longitude are required.' });
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (isNaN(latNum) || isNaN(lngNum) || !isFinite(latNum) || !isFinite(lngNum)) {
    return res.status(400).json({ error: 'Latitude and Longitude must be valid finite numbers.' });
  }

  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({ error: 'Latitude must be between -90 and 90, and longitude between -180 and 180.' });
  }

  const ambulance = store.findById('ambulances', id);
  if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });

  if (req.user.role === 'AMBULANCE' && req.user.ambulanceId !== id) {
    return res.status(403).json({ error: 'Unauthorized to update GPS for another ambulance.' });
  }

  const currentLocation = {
    lat: latNum,
    lng: lngNum,
    address: address || ambulance.currentLocation?.address || 'Simulated Location',
    heading: heading !== undefined && !isNaN(Number(heading)) ? Number(heading) : (ambulance.currentLocation?.heading || 0),
    speedKmph: speedKmph !== undefined && !isNaN(Number(speedKmph)) ? Number(speedKmph) : 35
  };

  const updatedRaw = store.update('ambulances', id, {
    latitude: latNum,
    longitude: lngNum,
    currentLocation,
    isSimulatedGps: true,
    updatedAt: new Date().toISOString()
  });

  const updated = formatAmbulance(updatedRaw);

  // Broadcast real-time location to all clients
  broadcastAmbulanceLocation({
    ambulanceId: id,
    vehicleNumber: updated.vehicleNumber,
    vehicleNo: updated.vehicleNo,
    driverName: updated.driverName,
    latitude: latNum,
    longitude: lngNum,
    currentLocation,
    currentRequestId: updated.currentRequestId,
    isSimulatedGps: true,
    timestamp: new Date().toISOString()
  });

  res.json({ message: 'GPS location updated and broadcasted', ambulance: updated });
});

module.exports = router;
