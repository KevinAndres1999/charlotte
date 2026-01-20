const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

app.use(cors());
app.use(express.json());

// Inicializar SQLite (archivo data.db en la raíz del proyecto)
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
    // Crear admin demo si no existe
    const adminEmail = 'admin@admin.local';
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

// Endpoint admin: obtener estadísticas del dashboard
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  try {
    // Obtener estadísticas de Firestore
    const [
      videosSnap,
      clasesSnap,
      actividadesSnap,
      materialesSnap,
      entregasSnap,
      usuariosSnap,
      cuestionariosSnap,
      evaluacionesSnap
    ] = await Promise.all([
      db.collection('videos').get(),
      db.collection('classes').get(), // Corregido: usar 'classes' en lugar de 'clases'
      db.collection('actividades').get(),
      db.collection('materiales').get(),
      db.collection('entregas').get(),
      db.collection('users').where('active', '==', true).get(),
      db.collection('cuestionarios').get(),
      db.collection('evaluaciones').get()
    ]);

    // Estadísticas básicas
    const stats = {
      videos: videosSnap.size,
      clases: clasesSnap.size,
      actividades: actividadesSnap.size,
      materiales: materialesSnap.size,
      entregas: entregasSnap.size,
      usuarios: usuariosSnap.size,
      cuestionarios: cuestionariosSnap.size,
      evaluaciones: evaluacionesSnap.size
    };

    // Estadísticas avanzadas
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usuariosRecientesSnap = await db.collection('users')
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();

    // Calcular tasa de engagement (entregas por estudiante)
    const engagementRate = usuariosSnap.size > 0 ? 
      Math.round((entregasSnap.size / usuariosSnap.size) * 100) / 100 : 0;

    // Calcular completitud de evaluaciones
    const evaluacionesCompletadasSnap = await db.collection('respuestasEvaluaciones').get();
    const completionRate = evaluacionesSnap.size > 0 ? 
      Math.round((evaluacionesCompletadasSnap.size / evaluacionesSnap.size) * 100) : 0;

    stats.usuariosRecientes = usuariosRecientesSnap.size;
    stats.engagementRate = `${engagementRate}`;
    stats.completionRate = `${completionRate}%`;

    res.json(stats);
  } catch (err) {
    console.error('Admin stats error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Endpoint admin: distribución por programa
app.get('/api/admin/program-distribution', requireAuth, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  try {
    const usuariosSnap = await db.collection('users').where('active', '==', true).get();
    const programas = {};

    usuariosSnap.forEach(doc => {
      const data = doc.data();
      const programa = data.programa || 'Sin programa';
      programas[programa] = (programas[programa] || 0) + 1;
    });

    const distribution = Object.entries(programas).map(([programa, count]) => ({
      programa,
      count
    })).sort((a, b) => b.count - a.count);

    res.json(distribution);
  } catch (err) {
    console.error('Admin program distribution error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Endpoint admin: limpiar datos huérfanos
app.post('/api/admin/clean-orphaned-data', requireAuth, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  try {
    let cleanedCount = 0;

    // Obtener todas las entregas
    const entregasSnap = await db.collection('entregas').get();
    
    for (const entregaDoc of entregasSnap.docs) {
      const entregaData = entregaDoc.data();
      const actividadId = entregaData.actividadId;
      const cuestionarioId = entregaData.cuestionarioId;

      let exists = false;

      // Verificar si la actividad existe
      if (actividadId) {
        const actividadDoc = await db.collection('actividades').doc(actividadId).get();
        if (actividadDoc.exists) exists = true;
      }

      // Verificar si el cuestionario existe
      if (cuestionarioId) {
        const cuestionarioDoc = await db.collection('cuestionarios').doc(cuestionarioId).get();
        if (cuestionarioDoc.exists) exists = true;
      }

      // Si no existe ni actividad ni cuestionario, eliminar la entrega
      if (!exists) {
        await entregaDoc.ref.delete();
        cleanedCount++;
      }
    }

    // Limpiar respuestas de evaluaciones huérfanas
    const respuestasEvaluacionesSnap = await db.collection('respuestasEvaluaciones').get();
    
    for (const respuestaDoc of respuestasEvaluacionesSnap.docs) {
      const respuestaData = respuestaDoc.data();
      const evaluacionId = respuestaData.evaluacionId;

      if (evaluacionId) {
        const evaluacionDoc = await db.collection('evaluaciones').doc(evaluacionId).get();
        if (!evaluacionDoc.exists) {
          await respuestaDoc.ref.delete();
          cleanedCount++;
        }
      }
    }

    res.json({ 
      message: 'Limpieza completada', 
      cleanedCount,
      success: true 
    });
  } catch (err) {
    console.error('Admin clean orphaned data error', err);
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

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
