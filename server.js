const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('better-sqlite3');
const admin = require('firebase-admin');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

app.use(cors());
app.use(express.json());
const db = new Database(path.join(__dirname, 'data.db'));
db.exec(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    role TEXT DEFAULT 'student'
  );`
);
// Tabla de settings para opciones configurables
db.exec(
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );`
);
// Si la tabla existía sin las columnas, añadirlas (ALTER TABLE solo si faltan)
const cols = db.prepare("PRAGMA table_info('users')").all().map(r => r.name);
if (!cols.includes('active')) db.prepare("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1").run();
if (!cols.includes('role')) db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'").run();

// Crear usuario demo si no existe (password: password123 por defecto o DEV_STUDENT_PASSWORD env)
(async function ensureDemoUser(){
  try{
    const demoEmail = 'estudiante@ejemplo.edu';
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);
    if(!existing){
      const plain = process.env.DEV_STUDENT_PASSWORD || 'password123';
      const passwordHash = await bcrypt.hash(plain, 10);
      const insert = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
      insert.run(demoEmail, 'estudiante', passwordHash, 1, 'student');
      console.log('Usuario demo creado:', demoEmail);
    }
    // Crear admin demo si no existe (email configurable)
    const adminEmail = process.env.DEV_ADMIN_EMAIL || 'admin@charlotte.com';
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if(!adminExists){
      const adminPass = process.env.DEV_ADMIN_PASSWORD || 'admin123';
      const adminHash = await bcrypt.hash(adminPass, 10);
      const insertAdmin = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
      insertAdmin.run(adminEmail, 'admin', adminHash, 1, 'admin');
      console.log('Usuario admin creado:', adminEmail);
    }
  }catch(err){ console.error('Error creando usuario demo', err); }
})();

// Helpers para settings
function getSetting(key){
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}
function setSetting(key, value){
  const up = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  up.run(key, value);
}

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });
  try{
    const row = db.prepare('SELECT email, name, passwordHash, active, role FROM users WHERE email = ?').get(email);
    if(!row) return res.status(401).json({ message: 'Credenciales inválidas' });
    if(!row.active) return res.status(403).json({ message: 'Cuenta deshabilitada' });
    const ok = await bcrypt.compare(password, row.passwordHash);
    if(!ok) return res.status(401).json({ message: 'Credenciales inválidas' });
    const token = jwt.sign({ email: row.email, name: row.name, role: row.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { email: row.email, name: row.name, role: row.role, active: row.active } });
  }catch(err){
    console.error('Login error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Registro de usuario (demo, guardar en memoria)
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ message: 'Nombre, email y contraseña requeridos' });
  if (password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  try{
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ message: 'El email ya está registrado' });
    const passwordHash = await bcrypt.hash(password, 10);
    const insert = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
    insert.run(email, name, passwordHash, 1, 'student');
    const token = jwt.sign({ email, name, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { email, name, role: 'student', active: 1 } });
  }catch(err){
    console.error('Register error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Middleware simple para verificar token y adjuntar payload
function requireAuth(req, res, next){
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if(parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try{
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data; // {email,name,role}
    next();
  } catch(err){
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// Endpoint admin: listar usuarios
app.get('/api/admin/users', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  try{
    const rows = db.prepare('SELECT id, email, name, role, active FROM users ORDER BY id DESC').all();
    res.json({ users: rows });
  }catch(err){
    console.error('Admin list error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Endpoint admin: actualizar active
app.patch('/api/admin/users/:email/active', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  const email = req.params.email;
  const { active } = req.body || {};
  if(typeof active === 'undefined') return res.status(400).json({ message: 'Campo active requerido' });
  try{
    const update = db.prepare('UPDATE users SET active = ? WHERE email = ?');
    const info = update.run(active ? 1 : 0, email);
    if(info.changes === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'OK' });
  }catch(err){
    console.error('Admin update error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Endpoint admin: obtener/actualizar settings
app.get('/api/admin/settings', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  try{
    const confirmWord = getSetting('confirmWord') || 'CONFIRMAR';
    res.json({ settings: { confirmWord } });
  }catch(err){
    console.error('Admin settings get error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

app.patch('/api/admin/settings', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  const { confirmWord } = req.body || {};
  if(typeof confirmWord !== 'string' || !confirmWord.trim()) return res.status(400).json({ message: 'confirmWord requerido' });
  try{
    setSetting('confirmWord', confirmWord.trim().toUpperCase());
    res.json({ message: 'OK', settings: { confirmWord: confirmWord.trim().toUpperCase() } });
  }catch(err){
    console.error('Admin settings update error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

app.get('/api/profile', (req, res) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    res.json({ user: { email: data.email, name: data.name } });
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
});

// Servir archivos estáticos (frontend) desde la carpeta del proyecto
app.use(express.static(path.join(__dirname)));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicializar Firebase Admin si se proporciona credencial de servicio
let firestoreAdmin = null;
try {
  if (process.env.SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(path.resolve(process.env.SERVICE_ACCOUNT_PATH));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firestoreAdmin = admin.firestore();
    console.log('Firebase Admin inicializado desde SERVICE_ACCOUNT_PATH');
  } else {
    // Intentar inicializar con application default credentials
    try { admin.initializeApp(); firestoreAdmin = admin.firestore(); console.log('Firebase Admin inicializado con ADC'); } catch (e) { /* no ADC available */ }
  }
} catch (e) {
  console.warn('No se pudo inicializar Firebase Admin:', e.message);
}

// Proxy seguro para leer/escribir Firestore desde el backend
app.get('/api/firestore/:collection', async (req, res) => {
  const col = req.params.collection;
  try {
    if (firestoreAdmin) {
      const snapshot = await firestoreAdmin.collection(col).orderBy('fechaCreacion', 'desc').get();
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json(docs);
    }
    // Fallback local JSON
    const dir = path.join(__dirname, 'data', 'firestore_backup');
    const file = path.join(dir, `${col}.json`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) return res.json([]);
    const content = fs.readFileSync(file, 'utf8');
    const docs = JSON.parse(content || '[]');
    res.json(docs);
  } catch (err) {
    console.error('Error proxy GET /api/firestore/', err);
    res.status(500).json({ message: err.message });
  }
});

// Public endpoint para crear pendingStudents
app.post('/api/firestore/pendingStudents', async (req, res) => {
  try {
    if (!firestoreAdmin) return res.status(503).json({ message: 'Firestore admin no configurado' });
    const docRef = await firestoreAdmin.collection('pendingStudents').add(req.body);
    res.json({ id: docRef.id });
  } catch (err) {
    console.error('Error POST pendingStudents', err);
    res.status(500).json({ message: err.message });
  }
});

// Public endpoint para que los estudiantes suban entregas
app.post('/api/firestore/entregas', async (req, res) => {
  try {
    if (!firestoreAdmin) return res.status(503).json({ message: 'Firestore admin no configurado' });
    const docRef = await firestoreAdmin.collection('entregas').add(req.body);
    res.json({ id: docRef.id });
  } catch (err) {
    console.error('Error POST entregas', err);
    res.status(500).json({ message: err.message });
  }
});

// Generic protected POST for other collections (admin only)
app.post('/api/firestore/:collection', requireAuth, async (req, res) => {
  const col = req.params.collection;
  try {
    if (!firestoreAdmin) return res.status(503).json({ message: 'Firestore admin no configurado' });
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
    const docRef = await firestoreAdmin.collection(col).add(req.body);
    res.json({ id: docRef.id });
  } catch (err) {
    console.error('Error proxy POST /api/firestore/', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH para actualizar documentos (admin)
app.patch('/api/firestore/:collection/:id', requireAuth, async (req, res) => {
  const col = req.params.collection;
  const id = req.params.id;
  try {
    if (!firestoreAdmin) return res.status(503).json({ message: 'Firestore admin no configurado' });
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
    await firestoreAdmin.collection(col).doc(id).set(req.body, { merge: true });
    res.json({ message: 'OK' });
  } catch (err) {
    console.error('Error PATCH /api/firestore/', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/firestore/:collection/:id', requireAuth, async (req, res) => {
  const col = req.params.collection;
  const id = req.params.id;
  if (!firestoreAdmin) return res.status(503).json({ message: 'Firestore admin no configurado' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  try {
    await firestoreAdmin.collection(col).doc(id).delete();
    res.json({ message: 'OK' });
  } catch (err) {
    console.error('Error proxy DELETE /api/firestore/', err);
    res.status(500).json({ message: err.message });
  }
});

// Public admin endpoints for common collections (development-friendly)
const PUBLIC_ADMIN_COLLECTIONS = new Set(['videos','clases','actividades','materiales','cuestionarios','evaluaciones','pendingStudents','approvedStudents']);

function isLocalRequest(req) {
  const ip = req.ip || req.connection.remoteAddress || '';
  return ip === '::1' || ip === '127.0.0.1' || ip.endsWith('::1');
}

app.post('/api/public-admin/:collection', async (req, res) => {
  const col = req.params.collection;
  if (!PUBLIC_ADMIN_COLLECTIONS.has(col)) return res.status(404).json({ message: 'Colección no gestionada por este endpoint' });
  // Requerir autenticación JWT + rol admin
  if (!req.headers || !req.headers.authorization) return res.status(401).json({ message: 'No autorizado' });
  try {
    const parts = req.headers.authorization.split(' ');
    if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
    const token = parts[1];
    const data = jwt.verify(token, JWT_SECRET);
    if (!data || data.role !== 'admin') return res.status(403).json({ message: 'Requiere rol admin' });
    req.user = data;
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido' });
  }
  try {
    if (firestoreAdmin) {
      const docRef = await firestoreAdmin.collection(col).add(req.body);
      return res.json({ id: docRef.id });
    }
    // Fallback: guardar en archivo local
    const dir = path.join(__dirname, 'data', 'firestore_backup');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${col}.json`);
    const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8') || '[]') : [];
    const doc = { id: String(Date.now()) + Math.random().toString(36).slice(2), ...req.body };
    arr.unshift(doc);
    fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf8');
    res.json({ id: doc.id, _local: true });
  } catch (err) {
    console.error('Error public-admin POST', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/public-admin/:collection/:id', async (req, res) => {
  const col = req.params.collection;
  const id = req.params.id;
  if (!PUBLIC_ADMIN_COLLECTIONS.has(col)) return res.status(404).json({ message: 'Colección no gestionada por este endpoint' });
  // Requerir autenticación JWT + rol admin
  if (!req.headers || !req.headers.authorization) return res.status(401).json({ message: 'No autorizado' });
  try {
    const parts = req.headers.authorization.split(' ');
    if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
    const token = parts[1];
    const data = jwt.verify(token, JWT_SECRET);
    if (!data || data.role !== 'admin') return res.status(403).json({ message: 'Requiere rol admin' });
    req.user = data;
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido' });
  }
  try {
    if (firestoreAdmin) {
      await firestoreAdmin.collection(col).doc(id).delete();
      return res.json({ message: 'OK' });
    }
    // Fallback local
    const dir = path.join(__dirname, 'data', 'firestore_backup');
    const file = path.join(dir, `${col}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'No encontrado' });
    const arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
    const filtered = arr.filter(d => String(d.id) !== String(id));
    fs.writeFileSync(file, JSON.stringify(filtered, null, 2), 'utf8');
    res.json({ message: 'OK', _local: true });
  } catch (err) {
    console.error('Error public-admin DELETE', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH public-admin (actualizar documento) - útil para restablecer contraseñas desde admin
app.patch('/api/public-admin/:collection/:id', async (req, res) => {
  const col = req.params.collection;
  const id = req.params.id;
  if (!PUBLIC_ADMIN_COLLECTIONS.has(col)) return res.status(404).json({ message: 'Colección no gestionada por este endpoint' });
  // Requerir autenticación JWT + rol admin
  if (!req.headers || !req.headers.authorization) return res.status(401).json({ message: 'No autorizado' });
  try {
    const parts = req.headers.authorization.split(' ');
    if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
    const token = parts[1];
    const data = jwt.verify(token, JWT_SECRET);
    if (!data || data.role !== 'admin') return res.status(403).json({ message: 'Requiere rol admin' });
    req.user = data;
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido' });
  }
  try {
    if (firestoreAdmin) {
      await firestoreAdmin.collection(col).doc(id).set(req.body, { merge: true });
      return res.json({ message: 'OK' });
    }
    // Fallback local
    const dir = path.join(__dirname, 'data', 'firestore_backup');
    const file = path.join(dir, `${col}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'No encontrado' });
    const arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
    const idx = arr.findIndex(d => String(d.id) === String(id));
    if (idx === -1) return res.status(404).json({ message: 'No encontrado' });
    arr[idx] = { ...arr[idx], ...req.body };
    fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf8');
    res.json({ message: 'OK', _local: true });
  } catch (err) {
    console.error('Error public-admin PATCH', err);
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
