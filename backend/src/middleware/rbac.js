/**
 * Role-Based Access Control Middleware
 * Enforces server-side permissions for the 5 official roles:
 * - PATIENT
 * - HOSPITAL
 * - AMBULANCE
 * - ADMIN
 * - SYSTEM_DOCTOR
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role is ${req.user.role}.`
      });
    }

    next();
  };
};

module.exports = { requireRole };
