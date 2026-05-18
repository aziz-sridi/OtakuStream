const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const grpc = require('@grpc/grpc-js');
const { db } = require('./db');
const { publish } = require('./kafka/producer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_TTL = '7d';

function toProfile(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    createdAt: row.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_TTL });
}

module.exports = {
  async Register(call, cb) {
    try {
      const { username, email, password } = call.request;
      if (!username || !email || !password) {
        return cb({ code: grpc.status.INVALID_ARGUMENT, message: 'username, email, password required' });
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
      if (existing) {
        return cb({ code: grpc.status.ALREADY_EXISTS, message: 'user already exists' });
      }
      const hash = await bcrypt.hash(password, 10);
      const id = uuid();
      const createdAt = new Date().toISOString();
      db.prepare(
        'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(id, username, email, hash, createdAt);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      await publish('user.registered', { user_id: id, username, email, created_at: createdAt });
      cb(null, { token: signToken(user), user: toProfile(user) });
    } catch (err) {
      cb({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  async Login(call, cb) {
    try {
      const { email, password } = call.request;
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) return cb({ code: grpc.status.UNAUTHENTICATED, message: 'invalid credentials' });
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return cb({ code: grpc.status.UNAUTHENTICATED, message: 'invalid credentials' });
      cb(null, { token: signToken(user), user: toProfile(user) });
    } catch (err) {
      cb({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  ValidateToken(call, cb) {
    try {
      const decoded = jwt.verify(call.request.token, JWT_SECRET);
      cb(null, { valid: true, userId: decoded.sub, username: decoded.username });
    } catch {
      cb(null, { valid: false, userId: '', username: '' });
    }
  },

  GetUserProfile(call, cb) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(call.request.userId);
    if (!user) return cb({ code: grpc.status.NOT_FOUND, message: 'user not found' });
    cb(null, toProfile(user));
  },

  UpdateProfile(call, cb) {
    const { userId, username, avatarUrl, bio } = call.request;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return cb({ code: grpc.status.NOT_FOUND, message: 'user not found' });
    db.prepare('UPDATE users SET username = COALESCE(NULLIF(?, ""), username), avatar_url = ?, bio = ? WHERE id = ?')
      .run(username || '', avatarUrl || '', bio || '', userId);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    cb(null, toProfile(updated));
  },
};
