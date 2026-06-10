// server.js - PetPal uygulama mantığı + REST API (Backend Developer role)
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const { signToken, requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const n = (v) => (v === undefined ? null : v); // undefined -> null (node:sqlite için)

// ---------------- AUTH ----------------
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
    return res.status(409).json({ error: 'This email is already registered' });
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
    .run(name, email, hash);
  const user = { id: info.lastInsertRowid, name, email };
  res.status(201).json({ token: signToken(user), user });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password || '', row.password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const user = { id: row.id, name: row.name, email: row.email };
  res.json({ token: signToken(user), user });
});

// ---------------- helpers ----------------
function ownsPet(userId, petId) {
  return db.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?').get(petId, userId);
}
// Bir pet'e ait alt kayıtların sahipliğini doğrula
function guardPet(req, res, next) {
  const pet = ownsPet(req.user.id, req.params.petId);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });
  req.pet = pet;
  next();
}

// ---------------- PETS ----------------
app.get('/api/pets', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM pets WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});

app.get('/api/pets/:petId', requireAuth, guardPet, (req, res) => res.json(req.pet));

app.post('/api/pets', requireAuth, (req, res) => {
  const { name, species, breed, gender, avatar, weight, birthdate, vet_name, vet_phone } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Pet name is required' });
  const info = db.prepare(
    `INSERT INTO pets (user_id, name, species, breed, gender, avatar, weight, birthdate, vet_name, vet_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, name, n(species), n(breed), n(gender), n(avatar), n(weight), n(birthdate), n(vet_name), n(vet_phone));
  // İlk kilo kaydını otomatik ekle
  if (weight) db.prepare('INSERT INTO weights (pet_id, weight, date) VALUES (?, ?, date(\'now\'))').run(info.lastInsertRowid, weight);
  res.status(201).json(db.prepare('SELECT * FROM pets WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/pets/:petId', requireAuth, guardPet, (req, res) => {
  const cur = req.pet;
  const b = req.body || {};
  const f = (k) => (b[k] !== undefined ? b[k] : cur[k]);
  db.prepare(
    `UPDATE pets SET name=?, species=?, breed=?, gender=?, avatar=?, weight=?, birthdate=?, vet_name=?, vet_phone=? WHERE id=?`
  ).run(f('name'), f('species'), f('breed'), f('gender'), f('avatar'), f('weight'), f('birthdate'), f('vet_name'), f('vet_phone'), cur.id);
  res.json(db.prepare('SELECT * FROM pets WHERE id = ?').get(cur.id));
});

app.delete('/api/pets/:petId', requireAuth, guardPet, (req, res) => {
  db.prepare('DELETE FROM pets WHERE id = ?').run(req.pet.id);
  res.json({ ok: true });
});

// ---------------- VACCINATIONS ----------------
app.get('/api/pets/:petId/vaccinations', requireAuth, guardPet, (req, res) => {
  res.json(db.prepare('SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY next_due ASC').all(req.pet.id));
});
app.post('/api/pets/:petId/vaccinations', requireAuth, guardPet, (req, res) => {
  const { name, date_given, next_due, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Vaccine name is required' });
  const info = db.prepare('INSERT INTO vaccinations (pet_id, name, date_given, next_due, notes) VALUES (?, ?, ?, ?, ?)')
    .run(req.pet.id, name, n(date_given), n(next_due), n(notes));
  res.status(201).json(db.prepare('SELECT * FROM vaccinations WHERE id = ?').get(info.lastInsertRowid));
});
app.delete('/api/vaccinations/:id', requireAuth, (req, res) => {
  const v = db.prepare('SELECT * FROM vaccinations WHERE id = ?').get(req.params.id);
  if (!v || !ownsPet(req.user.id, v.pet_id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM vaccinations WHERE id = ?').run(v.id);
  res.json({ ok: true });
});

// ---------------- MEDICATIONS ----------------
app.get('/api/pets/:petId/medications', requireAuth, guardPet, (req, res) => {
  res.json(db.prepare('SELECT * FROM medications WHERE pet_id = ? ORDER BY next_due ASC').all(req.pet.id));
});
app.post('/api/pets/:petId/medications', requireAuth, guardPet, (req, res) => {
  const { name, dose, frequency, next_due, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Medication name is required' });
  const info = db.prepare('INSERT INTO medications (pet_id, name, dose, frequency, next_due, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.pet.id, name, n(dose), n(frequency), n(next_due), n(notes));
  res.status(201).json(db.prepare('SELECT * FROM medications WHERE id = ?').get(info.lastInsertRowid));
});
app.delete('/api/medications/:id', requireAuth, (req, res) => {
  const m = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id);
  if (!m || !ownsPet(req.user.id, m.pet_id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM medications WHERE id = ?').run(m.id);
  res.json({ ok: true });
});

// ---------------- WEIGHTS ----------------
app.get('/api/pets/:petId/weights', requireAuth, guardPet, (req, res) => {
  res.json(db.prepare('SELECT * FROM weights WHERE pet_id = ? ORDER BY date ASC').all(req.pet.id));
});
app.post('/api/pets/:petId/weights', requireAuth, guardPet, (req, res) => {
  const { weight, date } = req.body || {};
  if (!weight) return res.status(400).json({ error: 'Weight is required' });
  const d = date || new Date().toISOString().slice(0, 10);
  const info = db.prepare('INSERT INTO weights (pet_id, weight, date) VALUES (?, ?, ?)').run(req.pet.id, weight, d);
  // güncel kiloyu pet üzerinde de tut
  db.prepare('UPDATE pets SET weight = ? WHERE id = ?').run(weight, req.pet.id);
  res.status(201).json(db.prepare('SELECT * FROM weights WHERE id = ?').get(info.lastInsertRowid));
});
app.delete('/api/weights/:id', requireAuth, (req, res) => {
  const w = db.prepare('SELECT * FROM weights WHERE id = ?').get(req.params.id);
  if (!w || !ownsPet(req.user.id, w.pet_id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM weights WHERE id = ?').run(w.id);
  res.json({ ok: true });
});

// ---------------- APPOINTMENTS ----------------
app.get('/api/appointments', requireAuth, (req, res) => {
  res.json(db.prepare(
    `SELECT a.*, p.name AS pet_name, p.avatar FROM appointments a
     JOIN pets p ON p.id = a.pet_id WHERE p.user_id = ? ORDER BY a.datetime ASC`
  ).all(req.user.id));
});
app.get('/api/pets/:petId/appointments', requireAuth, guardPet, (req, res) => {
  res.json(db.prepare('SELECT * FROM appointments WHERE pet_id = ? ORDER BY datetime ASC').all(req.pet.id));
});
app.post('/api/pets/:petId/appointments', requireAuth, guardPet, (req, res) => {
  const { title, vet_name, location, datetime, notes } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Appointment title is required' });
  const info = db.prepare('INSERT INTO appointments (pet_id, title, vet_name, location, datetime, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.pet.id, title, n(vet_name), n(location), n(datetime), n(notes));
  res.status(201).json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid));
});
app.put('/api/appointments/:id', requireAuth, (req, res) => {
  const a = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!a || !ownsPet(req.user.id, a.pet_id)) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const f = (k) => (b[k] !== undefined ? b[k] : a[k]);
  db.prepare(
    'UPDATE appointments SET title=?, vet_name=?, location=?, datetime=?, notes=? WHERE id=?'
  ).run(f('title'), f('vet_name'), f('location'), f('datetime'), f('notes'), a.id);
  res.json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(a.id));
});
app.delete('/api/appointments/:id', requireAuth, (req, res) => {
  const a = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!a || !ownsPet(req.user.id, a.pet_id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM appointments WHERE id = ?').run(a.id);
  res.json({ ok: true });
});

// ---------------- ACTIVITIES (günlük) ----------------
app.get('/api/activities', requireAuth, (req, res) => {
  res.json(db.prepare(
    `SELECT a.*, p.name AS pet_name, p.avatar FROM activities a
     JOIN pets p ON p.id = a.pet_id WHERE p.user_id = ? ORDER BY a.at DESC LIMIT 50`
  ).all(req.user.id));
});
app.get('/api/pets/:petId/activities', requireAuth, guardPet, (req, res) => {
  res.json(db.prepare('SELECT * FROM activities WHERE pet_id = ? ORDER BY at DESC LIMIT 50').all(req.pet.id));
});
app.post('/api/pets/:petId/activities', requireAuth, guardPet, (req, res) => {
  const { type, note, at } = req.body || {};
  if (!type) return res.status(400).json({ error: 'Activity type is required' });
  const info = db.prepare('INSERT INTO activities (pet_id, type, note, at) VALUES (?, ?, ?, ?)')
    .run(req.pet.id, type, n(note), at || new Date().toISOString().slice(0, 16).replace('T', ' '));
  res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(info.lastInsertRowid));
});
app.delete('/api/activities/:id', requireAuth, (req, res) => {
  const a = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
  if (!a || !ownsPet(req.user.id, a.pet_id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM activities WHERE id = ?').run(a.id);
  res.json({ ok: true });
});

// ---------------- NOTIFICATIONS (birleşik) ----------------
// Aşı + ilaç + randevuların yaklaşan/geçmiş olanları
app.get('/api/notifications', requireAuth, (req, res) => {
  const uid = req.user.id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const SOON = 14;
  const out = [];

  const pushDated = (rows, kind, icon, label) => {
    for (const r of rows) {
      if (!r.due) continue;
      const due = new Date(r.due.slice(0, 10) + 'T00:00:00');
      const days = Math.round((due - today) / 86400000);
      if (days > SOON) continue;
      const overdue = days < 0;
      out.push({
        kind, icon, pet_name: r.pet_name, pet_id: r.pet_id, days,
        level: overdue ? 'overdue' : 'soon',
        message: `${r.pet_name} · ${label}: "${r.title}" ${overdue ? `${-days}d overdue` : days === 0 ? 'today' : `in ${days}d`}`,
      });
    }
  };

  pushDated(db.prepare(
    `SELECT v.name AS title, v.next_due AS due, p.name AS pet_name, p.id AS pet_id
     FROM vaccinations v JOIN pets p ON p.id = v.pet_id
     WHERE p.user_id = ? AND v.next_due IS NOT NULL AND v.next_due != ''`).all(uid), 'vaccine', '💉', 'Vaccine');

  pushDated(db.prepare(
    `SELECT m.name AS title, m.next_due AS due, p.name AS pet_name, p.id AS pet_id
     FROM medications m JOIN pets p ON p.id = m.pet_id
     WHERE p.user_id = ? AND m.next_due IS NOT NULL AND m.next_due != ''`).all(uid), 'medication', '💊', 'Medication');

  pushDated(db.prepare(
    `SELECT a.title AS title, a.datetime AS due, p.name AS pet_name, p.id AS pet_id
     FROM appointments a JOIN pets p ON p.id = a.pet_id
     WHERE p.user_id = ? AND a.datetime IS NOT NULL AND a.datetime != ''`).all(uid), 'appointment', '📅', 'Appointment');

  out.sort((a, b) => a.days - b.days);
  res.json(out);
});

// ---------------- SUMMARY (dashboard özeti) ----------------
app.get('/api/summary', requireAuth, (req, res) => {
  const uid = req.user.id;
  const c = (sql) => db.prepare(sql).get(uid).c;
  res.json({
    pets: c('SELECT COUNT(*) c FROM pets WHERE user_id = ?'),
    vaccinations: c('SELECT COUNT(*) c FROM vaccinations v JOIN pets p ON p.id=v.pet_id WHERE p.user_id = ?'),
    appointments: c('SELECT COUNT(*) c FROM appointments a JOIN pets p ON p.id=a.pet_id WHERE p.user_id = ?'),
    activities_today: c("SELECT COUNT(*) c FROM activities a JOIN pets p ON p.id=a.pet_id WHERE p.user_id = ? AND date(a.at)=date('now')"),
  });
});

app.listen(PORT, () => console.log(`PetPal backend running at http://localhost:${PORT}`));
