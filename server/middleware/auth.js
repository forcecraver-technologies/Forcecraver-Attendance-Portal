const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'attendance_super_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// Allows Admin and Developer (for viewing dashboards)
function requireAdminOrDev(req, res, next) {
  if (!req.user || !['admin', 'developer'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access forbidden. Administrator or Developer rights required.' });
  }
  next();
}

// Allows Developer ONLY (for modifying / editing attendance or configurations)
function requireDeveloper(req, res, next) {
  if (!req.user || req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Access denied. Admin can only view attendance. Edits/modifications are strictly restricted to Developer.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin: requireAdminOrDev,
  requireAdminOrDev,
  requireDeveloper,
  JWT_SECRET,
};
