import jwt from 'jsonwebtoken';
import { db } from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const EXPIRES = '7d';

export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES });

export const publicUser = (u) =>
  u && {
    id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
    title: u.title, bio: u.bio, photo: u.photo, createdAt: u.created_at,
  };

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in required.' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have access to this.' });

export const isStaff = (u) => u.role === 'staff' || u.role === 'admin';

/** A stylist (role 'staff') is limited to their own appointments; returns their id, or null for the manager. */
export const stylistScope = (u) => (u.role === 'staff' ? u.id : null);
