// auth.js - JWT yardımcıları ve middleware
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'petcare-dev-secret-change-in-prod';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET, {
    expiresIn: '7d',
  });
}

// Korumalı uçlar için: Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { signToken, requireAuth };
