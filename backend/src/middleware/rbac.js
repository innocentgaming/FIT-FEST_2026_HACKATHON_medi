const { store } = require('../db/store');

/**
 * Role-Based Access Control Middleware
 * Enforces server-side permissions for the 5 official roles:
 * - PATIENT
 * - HOSPITAL
 * - AMBULANCE
 * - ADMIN
 * - DOCTOR / SYSTEM_DOCTOR
 */
const normalizeRole = (role) => {
  if (!role) return '';
  const r = role.toUpperCase();
  if (r === 'DOCTOR') return 'SYSTEM_DOCTOR';
  return r;
};

const requireRole = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. No session found.' });
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedAllowed.includes(userRole) && userRole !== 'ADMIN') {
      store.logAudit({
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resourceType: 'API_ENDPOINT',
        resourceId: req.originalUrl,
        details: `Role ${req.user.role} attempted to access restricted endpoint requiring [${allowedRoles.join(', ')}]`
      });

      return res.status(403).json({
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role is ${req.user.role}.`
      });
    }

    next();
  };
};

/**
 * Patient Ownership Check
 * Ensures patient can only access their own appointments, requests, or profile
 */
const requirePatientOwnership = (targetPatientIdExtractor) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Admins and staff have system-level access
    if (['ADMIN', 'SYSTEM_DOCTOR', 'HOSPITAL'].includes(normalizeRole(req.user.role))) {
      return next();
    }

    const targetPatientId = typeof targetPatientIdExtractor === 'function'
      ? targetPatientIdExtractor(req)
      : (req.params[targetPatientIdExtractor] || req.params.id || req.body.patientId);

    if (req.user.id !== targetPatientId) {
      store.logAudit({
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'PATIENT_OWNERSHIP_VIOLATION',
        resourceType: 'PATIENT_RECORD',
        resourceId: targetPatientId,
        details: `User ${req.user.id} tried accessing patient ${targetPatientId}`
      });

      return res.status(403).json({
        error: 'Forbidden: You only have permission to access your own patient records.'
      });
    }

    next();
  };
};

/**
 * Hospital Ownership Check
 * Ensures hospital staff can only update their own resources, blood bank, specialists, and requests
 */
const requireHospitalOwnership = (targetHospitalIdExtractor) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // System Admins and System Doctors have cross-facility coordination override
    if (['ADMIN', 'SYSTEM_DOCTOR'].includes(normalizeRole(req.user.role))) {
      return next();
    }

    if (normalizeRole(req.user.role) !== 'HOSPITAL') {
      return res.status(403).json({ error: 'Forbidden: Hospital role required.' });
    }

    const targetHospitalId = typeof targetHospitalIdExtractor === 'function'
      ? targetHospitalIdExtractor(req)
      : (req.params[targetHospitalIdExtractor] || req.params.id || req.params.hospitalId || req.body.hospitalId);

    if (req.user.hospitalId !== targetHospitalId) {
      store.logAudit({
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'HOSPITAL_OWNERSHIP_VIOLATION',
        resourceType: 'HOSPITAL_RESOURCE',
        resourceId: targetHospitalId,
        details: `Hospital admin ${req.user.hospitalId} attempted modifying hospital ${targetHospitalId}`
      });

      return res.status(403).json({
        error: 'Forbidden: You do not have permission to modify another hospital facility.'
      });
    }

    next();
  };
};

/**
 * Ambulance Driver Ownership Check
 * Ensures drivers can only update their own ambulance status, GPS, or assigned requests
 */
const requireAmbulanceOwnership = (targetAmbulanceIdExtractor) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (normalizeRole(req.user.role) === 'ADMIN') {
      return next();
    }

    if (normalizeRole(req.user.role) !== 'AMBULANCE') {
      return res.status(403).json({ error: 'Forbidden: Ambulance role required.' });
    }

    const targetAmbId = typeof targetAmbulanceIdExtractor === 'function'
      ? targetAmbulanceIdExtractor(req)
      : (req.params[targetAmbulanceIdExtractor] || req.params.id || req.params.ambulanceId || req.body.ambulanceId);

    if (req.user.ambulanceId !== targetAmbId) {
      store.logAudit({
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'AMBULANCE_OWNERSHIP_VIOLATION',
        resourceType: 'AMBULANCE_DISPATCH',
        resourceId: targetAmbId,
        details: `Driver ${req.user.ambulanceId} attempted modifying ambulance ${targetAmbId}`
      });

      return res.status(403).json({
        error: 'Forbidden: You can only update your own assigned ambulance unit.'
      });
    }

    next();
  };
};

module.exports = {
  normalizeRole,
  requireRole,
  requirePatientOwnership,
  requireHospitalOwnership,
  requireAmbulanceOwnership
};
