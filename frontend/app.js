/* PetPal — Frontend (React, single file, no build step) */
const { useState, useEffect, useRef } = React;

/* ---------- helpers ---------- */
async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}
const fmtDate = (s) => (s ? new Date(s.slice(0, 10)).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const ageFrom = (b) => { if (!b) return ''; const d = new Date(b), n = new Date(); let y = n.getFullYear() - d.getFullYear(); let m = n.getMonth() - d.getMonth(); if (m < 0) { y--; m += 12; } return y > 0 ? `${y} yr` : `${m} mo`; };
const dueDays = (s) => (s ? Math.round((new Date(s.slice(0, 10) + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000) : null);
const duePill = (s) => { const d = dueDays(s); if (d === null) return null; if (d < 0) return <span className="pill overdue">{-d}d overdue</span>; if (d <= 14) return <span className="pill soon">{d === 0 ? 'today' : 'in ' + d + 'd'}</span>; return <span className="pill ok">{fmtDate(s)}</span>; };
const PET_EMOJIS = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐢', '🐠', '🐍', '🦜', '🐴'];
const ACT = { feeding: { e: '🍖', l: 'Feeding' }, water: { e: '💧', l: 'Water' }, walk: { e: '🦮', l: 'Walk' }, play: { e: '🎾', l: 'Play' }, grooming: { e: '🛁', l: 'Grooming' }, other: { e: '📝', l: 'Other' } };

/* ---------- small components ---------- */
function Field({ label, ...p }) {
  return (<div><label>{label}</label><input {...p} /></div>);
}
function Sheet({ title, onClose, children }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab"></div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
function Empty({ emoji, text }) {
  return <div className="empty"><span className="be">{emoji}</span>{text}</div>;
}

/* ---------- AUTH ---------- */
function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const data = await api(mode === 'login' ? '/api/login' : '/api/register', { method: 'POST', body: f });
      onAuth(data.token, data.user);
    } catch (e) { setErr(e.message); }
  };
  return (
    <div className="auth-wrap">
      <div className="logo">
        <div className="big">🐾</div>
        <h1>PetPal</h1>
        <p>Everything about your pet, in one place</p>
      </div>
      <div className="auth-card">
        <div className="seg">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log In</button>
          <button className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Sign Up</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' && <Field label="Your name" value={f.name} onChange={set('name')} placeholder="Your name" />}
          <Field label="Email" type="email" value={f.email} onChange={set('email')} placeholder="you@mail.com" />
          <Field label="Password" type="password" value={f.password} onChange={set('password')} placeholder="••••••" />
          <div style={{ marginTop: 18 }}><button className="btn" type="submit">{mode === 'login' ? 'Log In' : 'Create Account'}</button></div>
          {err && <div className="err">{err}</div>}
        </form>
      </div>
    </div>
  );
}

/* ---------- HOME / DASHBOARD ---------- */
function Home({ token, user, pets, activePet, setActivePet, goAddPet, reload }) {
  const [sum, setSum] = useState({});
  const [notes, setNotes] = useState([]);
  useEffect(() => {
    api('/api/summary', { token }).then(setSum).catch(() => {});
    api('/api/notifications', { token }).then(setNotes).catch(() => {});
  }, [pets]);

  return (
    <>
      <div className="head">
        <div className="head-row">
          <div>
            <div className="sub">Hello 👋</div>
            <h1>{user.name}</h1>
          </div>
          <button className="avatar-btn">{user.name?.[0]?.toUpperCase() || '🙂'}</button>
        </div>
      </div>
      <div className="scroll">
        <div className="grid2" style={{ marginTop: 16 }}>
          <div className="stat bg-p"><div className="num">{sum.pets || 0}</div><div className="lbl">🐾 Pets</div></div>
          <div className="stat bg-t"><div className="num">{sum.vaccinations || 0}</div><div className="lbl">💉 Vaccines</div></div>
          <div className="stat bg-a"><div className="num">{sum.appointments || 0}</div><div className="lbl">📅 Appointments</div></div>
          <div className="stat bg-r"><div className="num">{sum.activities_today || 0}</div><div className="lbl">✅ Logged today</div></div>
        </div>

        <div className="card">
          <h3>🔔 Reminders</h3>
          {notes.length === 0 && <div className="muted">Nothing coming up — all good! 🎉</div>}
          {notes.map((nt, i) => (
            <div key={i} className={'notif ' + nt.level}>
              <span className="em">{nt.icon}</span><span>{nt.message}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>My Pets</h3>
            <button className="x" style={{ color: 'var(--purple)', fontWeight: 700, fontSize: 14 }} onClick={goAddPet}>+ Add</button>
          </div>
          {pets.length === 0
            ? <Empty emoji="🐕" text="No pets yet. Let's add your first one!" />
            : <div className="pets-scroll" style={{ marginTop: 10 }}>
                {pets.map((p) => (
                  <div key={p.id} className={'petchip' + (activePet?.id === p.id ? ' active' : '')} onClick={() => setActivePet(p)}>
                    <div className="emo">{p.avatar || '🐾'}</div>
                    <div className="nm">{p.name}</div>
                    <div className="br">{p.breed || p.species || ''}</div>
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </>
  );
}

/* ---------- PET DETAIL (health, meds, weight, appointments, journal) ---------- */
function PetDetail({ token, pet, onChange }) {
  const [tab, setTab] = useState('health');
  const [data, setData] = useState({ vaccinations: [], medications: [], weights: [], appointments: [], activities: [] });
  const [sheet, setSheet] = useState(null);
  const [editAppt, setEditAppt] = useState(null);
  const chartRef = useRef(null), chartInst = useRef(null);

  const load = () => {
    const t = { token };
    Promise.all([
      api(`/api/pets/${pet.id}/vaccinations`, t),
      api(`/api/pets/${pet.id}/medications`, t),
      api(`/api/pets/${pet.id}/weights`, t),
      api(`/api/pets/${pet.id}/appointments`, t),
      api(`/api/pets/${pet.id}/activities`, t),
    ]).then(([v, m, w, a, ac]) => setData({ vaccinations: v, medications: m, weights: w, appointments: a, activities: ac }));
  };
  useEffect(() => { load(); }, [pet.id]);

  // weight chart
  useEffect(() => {
    if (tab !== 'weight' || !chartRef.current) return;
    if (chartInst.current) chartInst.current.destroy();
    const w = data.weights;
    chartInst.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: w.map((x) => fmtDate(x.date)),
        datasets: [{ data: w.map((x) => x.weight), borderColor: '#7c5cff', backgroundColor: 'rgba(124,92,255,.12)',
          fill: true, tension: .35, pointBackgroundColor: '#7c5cff', pointRadius: 4, borderWidth: 3 }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: 'kg' } } }, responsive: true, maintainAspectRatio: false },
    });
  }, [tab, data.weights]);

  const del = async (url) => { await api(url, { method: 'DELETE', token }); load(); };
  const tabs = [['health', '💉 Health'], ['meds', '💊 Meds'], ['weight', '⚖️ Weight'], ['appts', '📅 Appts'], ['journal', '📔 Journal']];

  return (
    <>
      <div className="head alt">
        <div className="head-row">
          <button className="avatar-btn" onClick={() => onChange(null)}>‹</button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 40 }}>{pet.avatar || '🐾'}</div>
            <h1 style={{ fontSize: 21 }}>{pet.name}</h1>
            <div className="sub">{[pet.breed || pet.species, ageFrom(pet.birthdate), pet.weight ? pet.weight + ' kg' : ''].filter(Boolean).join(' · ')}</div>
          </div>
          <button className="avatar-btn" onClick={() => setSheet('editpet')}>✎</button>
        </div>
      </div>
      <div className="scroll">
        <div className="chip-tabs" style={{ marginTop: 14 }}>
          {tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>

        {tab === 'health' && (
          <div className="card">
            <h3>Vaccination Schedule</h3>
            {data.vaccinations.length === 0 && <Empty emoji="💉" text="No vaccination records" />}
            {data.vaccinations.map((v) => (
              <div className="item" key={v.id}>
                <div className="ic">💉</div>
                <div><div className="tt">{v.name}</div><div className="ss">{v.date_given ? 'Given: ' + fmtDate(v.date_given) : 'Scheduled'}</div></div>
                <div className="right">{duePill(v.next_due)}</div>
                <button className="x" onClick={() => del(`/api/vaccinations/${v.id}`)}>×</button>
              </div>
            ))}
            <button className="btn sec" style={{ marginTop: 12 }} onClick={() => setSheet('vacc')}>+ Add vaccination</button>
          </div>
        )}

        {tab === 'meds' && (
          <div className="card">
            <h3>Medication & Parasite</h3>
            {data.medications.length === 0 && <Empty emoji="💊" text="No medication records" />}
            {data.medications.map((m) => (
              <div className="item" key={m.id}>
                <div className="ic">💊</div>
                <div><div className="tt">{m.name}</div><div className="ss">{[m.dose, m.frequency].filter(Boolean).join(' · ')}</div></div>
                <div className="right">{duePill(m.next_due)}</div>
                <button className="x" onClick={() => del(`/api/medications/${m.id}`)}>×</button>
              </div>
            ))}
            <button className="btn sec" style={{ marginTop: 12 }} onClick={() => setSheet('med')}>+ Add medication</button>
          </div>
        )}

        {tab === 'weight' && (
          <div className="card">
            <h3>Weight Tracking</h3>
            {data.weights.length === 0
              ? <Empty emoji="⚖️" text="No weight records" />
              : <div style={{ height: 220 }}><canvas ref={chartRef}></canvas></div>}
            <div style={{ marginTop: 10 }}>
              {data.weights.slice().reverse().slice(0, 4).map((w) => (
                <div className="item" key={w.id}>
                  <div className="ic">⚖️</div>
                  <div><div className="tt">{w.weight} kg</div><div className="ss">{fmtDate(w.date)}</div></div>
                  <button className="x" style={{ marginLeft: 'auto' }} onClick={() => del(`/api/weights/${w.id}`)}>×</button>
                </div>
              ))}
            </div>
            <button className="btn sec" style={{ marginTop: 12 }} onClick={() => setSheet('weight')}>+ Log weight</button>
          </div>
        )}

        {tab === 'appts' && (
          <div className="card">
            <h3>Vet Appointments</h3>
            {data.appointments.length === 0 && <Empty emoji="📅" text="No appointments" />}
            {data.appointments.map((a) => (
              <div className="item" key={a.id}>
                <div className="ic">📅</div>
                <div><div className="tt">{a.title}</div><div className="ss">{[a.vet_name, a.location].filter(Boolean).join(' · ')}</div></div>
                <div className="right">{duePill(a.datetime)}</div>
                <button className="x" title="Edit" onClick={() => { setEditAppt(a); setSheet('appt'); }}>✎</button>
                <button className="x" title="Delete" onClick={() => del(`/api/appointments/${a.id}`)}>×</button>
              </div>
            ))}
            <button className="btn sec" style={{ marginTop: 12 }} onClick={() => { setEditAppt(null); setSheet('appt'); }}>+ Add appointment</button>
          </div>
        )}

        {tab === 'journal' && (
          <div className="card">
            <h3>Daily Care</h3>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
              {Object.entries(ACT).map(([k, v]) => (
                <button key={k} className="btn ghost" style={{ flex: '0 0 auto', width: 'auto', padding: '9px 12px' }}
                  onClick={async () => { await api(`/api/pets/${pet.id}/activities`, { method: 'POST', body: { type: k }, token }); load(); }}>
                  {v.e} {v.l}
                </button>
              ))}
            </div>
            {data.activities.length === 0 && <Empty emoji="📔" text="No entries yet today" />}
            {data.activities.map((a) => (
              <div className="item" key={a.id}>
                <div className="ic">{(ACT[a.type] || ACT.other).e}</div>
                <div><div className="tt">{(ACT[a.type] || ACT.other).l}</div><div className="ss">{a.at}</div></div>
                <button className="x" style={{ marginLeft: 'auto' }} onClick={() => del(`/api/activities/${a.id}`)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {sheet === 'vacc' && <VaccSheet petId={pet.id} token={token} close={() => setSheet(null)} done={load} />}
      {sheet === 'med' && <MedSheet petId={pet.id} token={token} close={() => setSheet(null)} done={load} />}
      {sheet === 'weight' && <WeightSheet petId={pet.id} token={token} close={() => setSheet(null)} done={() => { load(); onChange('refresh'); }} />}
      {sheet === 'appt' && <ApptSheet petId={pet.id} token={token} appt={editAppt} close={() => { setSheet(null); setEditAppt(null); }} done={() => { load(); setEditAppt(null); }} />}
      {sheet === 'editpet' && <PetSheet token={token} pet={pet} close={() => setSheet(null)} done={() => { setSheet(null); onChange('refresh'); }} />}
    </>
  );
}

/* ---------- sheet forms ---------- */
function VaccSheet({ petId, token, close, done }) {
  const [f, setF] = useState({ name: '', date_given: '', next_due: '', notes: '' });
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => { if (!f.name) return; await api(`/api/pets/${petId}/vaccinations`, { method: 'POST', body: f, token }); close(); done(); };
  return (
    <Sheet title="💉 Add vaccination" onClose={close}>
      <Field label="Vaccine name" value={f.name} onChange={s('name')} placeholder="Rabies, Combo..." />
      <div className="row"><Field label="Date given" type="date" value={f.date_given} onChange={s('date_given')} />
        <Field label="Next due" type="date" value={f.next_due} onChange={s('next_due')} /></div>
      <label>Notes</label><input value={f.notes} onChange={s('notes')} />
      <div style={{ marginTop: 16 }}><button className="btn" onClick={save}>Save</button></div>
    </Sheet>
  );
}
function MedSheet({ petId, token, close, done }) {
  const [f, setF] = useState({ name: '', dose: '', frequency: '', next_due: '', notes: '' });
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => { if (!f.name) return; await api(`/api/pets/${petId}/medications`, { method: 'POST', body: f, token }); close(); done(); };
  return (
    <Sheet title="💊 Add medication" onClose={close}>
      <Field label="Medication / parasite name" value={f.name} onChange={s('name')} placeholder="Dewormer, vitamin..." />
      <div className="row"><Field label="Dose" value={f.dose} onChange={s('dose')} placeholder="1 tablet" />
        <Field label="Frequency" value={f.frequency} onChange={s('frequency')} placeholder="Monthly" /></div>
      <Field label="Next due" type="date" value={f.next_due} onChange={s('next_due')} />
      <div style={{ marginTop: 16 }}><button className="btn" onClick={save}>Save</button></div>
    </Sheet>
  );
}
function WeightSheet({ petId, token, close, done }) {
  const [f, setF] = useState({ weight: '', date: new Date().toISOString().slice(0, 10) });
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => { if (!f.weight) return; await api(`/api/pets/${petId}/weights`, { method: 'POST', body: { weight: parseFloat(f.weight), date: f.date }, token }); close(); done(); };
  return (
    <Sheet title="⚖️ Log weight" onClose={close}>
      <div className="row"><Field label="Weight (kg)" type="number" step="0.1" value={f.weight} onChange={s('weight')} />
        <Field label="Date" type="date" value={f.date} onChange={s('date')} /></div>
      <div style={{ marginTop: 16 }}><button className="btn" onClick={save}>Save</button></div>
    </Sheet>
  );
}
function ApptSheet({ petId, token, appt, close, done }) {
  const [f, setF] = useState(appt || { title: '', vet_name: '', location: '', datetime: '', notes: '' });
  useEffect(() => { setF(appt || { title: '', vet_name: '', location: '', datetime: '', notes: '' }); }, [appt]);
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.title) return;
    const body = { title: f.title, vet_name: f.vet_name, location: f.location, datetime: f.datetime, notes: f.notes };
    if (appt) await api(`/api/appointments/${appt.id}`, { method: 'PUT', body, token });
    else await api(`/api/pets/${petId}/appointments`, { method: 'POST', body, token });
    close(); done();
  };
  return (
    <Sheet title={appt ? '✎ Edit appointment' : '📅 Add appointment'} onClose={close}>
      <Field label="Title" value={f.title} onChange={s('title')} placeholder="Checkup, neutering..." />
      <div className="row"><Field label="Vet" value={f.vet_name} onChange={s('vet_name')} />
        <Field label="Location" value={f.location} onChange={s('location')} /></div>
      <Field label="Date & time" type="datetime-local" value={f.datetime} onChange={s('datetime')} />
      <label>Notes</label><input value={f.notes} onChange={s('notes')} />
      <div style={{ marginTop: 16 }}><button className="btn" onClick={save}>{appt ? 'Update' : 'Save'}</button></div>
    </Sheet>
  );
}
function PetSheet({ token, pet, close, done }) {
  const editing = !!pet;
  const [f, setF] = useState(pet || { name: '', species: 'Dog', breed: '', gender: 'Male', avatar: '🐶', weight: '', birthdate: '', vet_name: '', vet_phone: '' });
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.name) return;
    const body = { ...f, weight: f.weight ? parseFloat(f.weight) : null };
    if (editing) await api(`/api/pets/${pet.id}`, { method: 'PUT', body, token });
    else await api('/api/pets', { method: 'POST', body, token });
    close(); done();
  };
  return (
    <Sheet title={editing ? '✎ Edit profile' : '🐾 Add a new pet'} onClose={close}>
      <label>Pick an avatar</label>
      <div className="emoji-pick">
        {PET_EMOJIS.map((e) => <button key={e} className={f.avatar === e ? 'on' : ''} onClick={() => setF({ ...f, avatar: e })}>{e}</button>)}
      </div>
      <Field label="Name" value={f.name} onChange={s('name')} placeholder="Buddy" />
      <div className="row">
        <div><label>Species</label><select value={f.species} onChange={s('species')}><option>Dog</option><option>Cat</option><option>Bird</option><option>Rodent</option><option>Other</option></select></div>
        <Field label="Breed" value={f.breed} onChange={s('breed')} placeholder="Golden..." />
      </div>
      <div className="row">
        <div><label>Gender</label><select value={f.gender} onChange={s('gender')}><option>Male</option><option>Female</option></select></div>
        <Field label="Weight (kg)" type="number" step="0.1" value={f.weight || ''} onChange={s('weight')} />
      </div>
      <Field label="Birth date" type="date" value={f.birthdate || ''} onChange={s('birthdate')} />
      <div className="row"><Field label="Vet" value={f.vet_name || ''} onChange={s('vet_name')} />
        <Field label="Vet phone" value={f.vet_phone || ''} onChange={s('vet_phone')} /></div>
      <div style={{ marginTop: 16 }}><button className="btn" onClick={save}>{editing ? 'Update' : 'Add pet'}</button></div>
    </Sheet>
  );
}

/* ---------- AGENDA (bottom tab) ---------- */
function Agenda({ token }) {
  const [appts, setAppts] = useState([]);
  const [acts, setActs] = useState([]);
  useEffect(() => {
    api('/api/appointments', { token }).then(setAppts).catch(() => {});
    api('/api/activities', { token }).then(setActs).catch(() => {});
  }, []);
  return (
    <>
      <div className="head"><h1>Agenda</h1><div className="sub">All appointments and recent activity</div></div>
      <div className="scroll">
        <div className="card">
          <h3>📅 Upcoming appointments</h3>
          {appts.length === 0 && <Empty emoji="📅" text="No appointments" />}
          {appts.map((a) => (
            <div className="item" key={a.id}>
              <div className="ic">{a.avatar || '📅'}</div>
              <div><div className="tt">{a.title}</div><div className="ss">{a.pet_name} · {[a.vet_name, a.location].filter(Boolean).join(' · ')}</div></div>
              <div className="right">{duePill(a.datetime)}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>📔 Recent activity</h3>
          {acts.length === 0 && <Empty emoji="📔" text="No records" />}
          {acts.slice(0, 12).map((a) => (
            <div className="item" key={a.id}>
              <div className="ic">{(ACT[a.type] || ACT.other).e}</div>
              <div><div className="tt">{a.pet_name} · {(ACT[a.type] || ACT.other).l}</div><div className="ss">{a.at}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- PROFILE ---------- */
function Profile({ user, onLogout }) {
  return (
    <>
      <div className="head"><h1>Profile</h1></div>
      <div className="scroll">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60 }}>🙂</div>
          <h3 style={{ marginBottom: 2 }}>{user.name}</h3>
          <div className="muted">{user.email}</div>
        </div>
        <div className="card">
          <div className="item"><div className="ic">🔔</div><div className="tt">Notifications</div><div className="right muted">On</div></div>
          <div className="item"><div className="ic">🌐</div><div className="tt">Language</div><div className="right muted">English</div></div>
          <div className="item"><div className="ic">ℹ️</div><div className="tt">Version</div><div className="right muted">PetPal 1.0</div></div>
        </div>
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={onLogout}>Log Out</button>
      </div>
    </>
  );
}

/* ---------- ROOT ---------- */
const NAV_ITEMS = [['home', '🏠', 'Home'], ['pets', '🐾', 'My Pets'], ['agenda', '📅', 'Agenda'], ['profile', '👤', 'Profile']];

function App() {
  const [token, setToken] = useState(window.__token);
  const [user, setUser] = useState(window.__user || null);
  const [tab, setTab] = useState('home');
  const [pets, setPets] = useState([]);
  const [activePet, setActivePet] = useState(null);
  const [petSheet, setPetSheet] = useState(false);

  const loadPets = () => api('/api/pets', { token }).then((ps) => {
    setPets(ps);
    setActivePet((cur) => cur ? ps.find((p) => p.id === cur.id) || null : null);
  });
  useEffect(() => { if (token) loadPets(); }, [token]);

  const onAuth = (t, u) => { window.__token = t; window.__user = u; setToken(t); setUser(u); };
  const logout = () => { window.__token = null; setToken(null); setUser(null); setActivePet(null); setTab('home'); };
  const goTab = (t) => { setActivePet(null); setTab(t); };

  if (!token) return <Auth onAuth={onAuth} />;

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={goTab} user={user} logout={logout} />
      <main className="main">
        <div className="container">
          {activePet
            ? <PetDetail token={token} pet={activePet}
                onChange={(act) => { if (act === 'refresh') loadPets(); else setActivePet(null); }} />
            : <>
                {tab === 'home' && <Home token={token} user={user} pets={pets} activePet={activePet} setActivePet={setActivePet} goAddPet={() => setPetSheet(true)} reload={loadPets} />}
                {tab === 'pets' && (
                  <>
                    <div className="head"><h1>My Pets</h1><div className="sub">{pets.length} pets</div></div>
                    <div className="scroll">
                      {pets.length === 0 && <Empty emoji="🐕" text="You haven't added any pets yet" />}
                      <div className="cards-grid" style={{ marginTop: 18 }}>
                        {pets.map((p) => (
                          <div className="card" key={p.id} style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setActivePet(p)}>
                            <div style={{ fontSize: 42 }}>{p.avatar || '🐾'}</div>
                            <div><div style={{ fontWeight: 800, fontSize: 17 }}>{p.name}</div>
                              <div className="muted">{[p.breed || p.species, ageFrom(p.birthdate), p.weight ? p.weight + ' kg' : ''].filter(Boolean).join(' · ')}</div></div>
                            <div style={{ marginLeft: 'auto', color: 'var(--purple)', fontSize: 24 }}>›</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {tab === 'agenda' && <Agenda token={token} />}
                {tab === 'profile' && <Profile user={user} onLogout={logout} />}
              </>}
        </div>
      </main>

      {!activePet && (tab === 'home' || tab === 'pets') && <button className="fab" onClick={() => setPetSheet(true)}>+</button>}
      {petSheet && <PetSheet token={token} pet={null} close={() => setPetSheet(false)} done={() => { setPetSheet(false); loadPets(); }} />}
      <Nav tab={tab} setTab={goTab} />
    </div>
  );
}

function Sidebar({ tab, setTab, user, logout }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="lg">🐾</span><b>PetPal</b></div>
      <nav className="side-nav">
        {NAV_ITEMS.map(([k, i, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <span className="ni">{i}</span>{l}
          </button>
        ))}
      </nav>
      <div className="side-user">
        <div className="ava">{user.name?.[0]?.toUpperCase() || '🙂'}</div>
        <div><div className="nm">{user.name}</div><div className="em">{user.email}</div></div>
      </div>
      <button className="btn ghost side-logout" onClick={logout}>Log Out</button>
    </aside>
  );
}

function Nav({ tab, setTab }) {
  return (
    <div className="nav">
      {NAV_ITEMS.map(([k, i, l]) => (
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
          <span className="ni">{i}</span>{l}
        </button>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
