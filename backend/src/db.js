import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH || resolve(here, '../data/salon.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('client','staff','admin')),
  title         TEXT,
  bio           TEXT,
  photo         TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS services (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  duration_min  INTEGER NOT NULL,
  price_cents   INTEGER NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS appointments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id    INTEGER NOT NULL REFERENCES users(id),
  staff_id     INTEGER NOT NULL REFERENCES users(id),
  service_id   INTEGER NOT NULL REFERENCES services(id),
  start_at     TEXT NOT NULL,            -- 'YYYY-MM-DD HH:MM' salon local time
  end_at       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed'
               CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  price_cents  INTEGER NOT NULL,
  notes        TEXT,
  staff_notes  TEXT,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  review       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_appt_start  ON appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_appt_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appt_staff  ON appointments(staff_id, start_at);
`);

export const isEmpty = () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;

/** Run fn inside a transaction. */
export function tx(fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
