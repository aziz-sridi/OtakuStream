const clients = require('../grpc-clients');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const { valid, userId, username } = await clients.auth.ValidateToken({ token });
    if (!valid) return res.status(401).json({ error: 'invalid token' });
    req.user = { id: userId, username };
    next();
  } catch (err) {
    res.status(401).json({ error: 'token validation failed' });
  }
}

async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const { valid, userId, username } = await clients.auth.ValidateToken({ token });
    if (valid) req.user = { id: userId, username };
  } catch { /* ignore */ }
  next();
}

module.exports = { authMiddleware, optionalAuth };
