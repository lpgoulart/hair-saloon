import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authenticate, publicUser, signToken } from '../auth.js';

const r = Router();
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

r.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Please enter your name.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const info = db.prepare(
    `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'client')`,
  ).run(name.trim(), email.trim().toLowerCase(), phone?.trim() || null, bcrypt.hashSync(password, 10));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

r.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email || '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

r.get('/me', authenticate, (req, res) => res.json(publicUser(req.user)));

r.patch('/me', authenticate, (req, res) => {
  const { name, phone, password } = req.body || {};
  if (password && password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
    .run(name?.trim() || null, phone?.trim() ?? null, req.user.id);
  if (password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.user.id);
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)));
});

export default r;
