const jwt = require('jsonwebtoken');
const { store } = require('../db/store');

const JWT_SECRET = process.env.JWT_SECRET || 'medilink_care_hackathon_secret_2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = store.findById('users', decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found or session invalid.' });
    }
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hospitalId: user.hospitalId,
      ambulanceId: user.ambulanceId
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = store.findById('users', decoded.id);
    if (user) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hospitalId: user.hospitalId,
        ambulanceId: user.ambulanceId
      };
    }
  } catch (err) {
    // Ignore optional auth error
  }
  next();
};

module.exports = { authenticateToken, optionalAuth, JWT_SECRET };
