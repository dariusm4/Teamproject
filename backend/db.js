// db.js - Database layer (Data Specialist role)
// PetPal - SQLite veritabanı bağlantısı ve şema tanımları
// Node'un yerleşik SQLite modülü (node >= 22.5, --experimental-sqlite ile çalışır)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'petcare.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

// --- Şema (tablolar) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    species    TEXT,
    breed      TEXT,
    gender     TEXT,
    avatar     TEXT,            -- emoji avatar (🐶 🐱 ...)
    weight     REAL,            -- güncel kilo (kg)
    birthdate  TEXT,
    vet_name   TEXT,
    vet_phone  TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vaccinations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id     INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    date_given TEXT,
    next_due   TEXT,
    notes      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS medications (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id    INTEGER NOT NULL,
    name      TEXT    NOT NULL,   -- ör. parazit/iç-dış, vitamin
    dose      TEXT,
    frequency TEXT,               -- ör. "Aylık", "Günde 1"
    next_due  TEXT,
    notes     TEXT,
    created_at TEXT   NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weights (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id  INTEGER NOT NULL,
    weight  REAL    NOT NULL,
    date    TEXT    NOT NULL,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id    INTEGER NOT NULL,
    title     TEXT    NOT NULL,
    vet_name  TEXT,
    location  TEXT,
    datetime  TEXT,               -- ISO: 2026-06-10T14:30
    notes     TEXT,
    created_at TEXT   NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activities (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id    INTEGER NOT NULL,
    type      TEXT    NOT NULL,   -- feeding | water | walk | play | grooming | other
    note      TEXT,
    at        TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
  );
`);

module.exports = db;
