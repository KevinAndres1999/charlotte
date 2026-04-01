const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('better-sqlite3');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuración de CORS para producción
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'https://cursoscharlotte.com',
  'https://www.cursoscharlotte.com',
  'https://cursoscharlotte.netlify.app',
  // Agregar más dominios según sea necesario
];

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Permitir requests sin origin (como mobile apps o postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'La política CORS no permite acceso desde el origen: ' + origin;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('⚠️ ERROR: JWT_SECRET no está configurado en las variables de entorno');
  console.error('Por favor configure JWT_SECRET en su archivo .env o variables de entorno');
  process.exit(1);
}

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como mobile apps o postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'La política CORS no permite acceso desde el origen: ' + origin;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
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

// Tabla de salas de videoconferencia
db.exec(
  `CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    createdBy TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    isActive INTEGER DEFAULT 1,
    maxParticipants INTEGER DEFAULT 50
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

// ============================================
// CONFIGURACIÓN SOCKET.IO PARA VIDEOCONFERENCIAS
// ============================================

// Almacenamiento en memoria de las salas activas
const activeRooms = new Map(); // roomId -> { participants: Map(socketId -> userData) }

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);
  
  // Unirse a una sala
  socket.on('join-room', ({ roomId, userName, userId }) => {
    console.log(`${userName} (${socket.id}) se une a la sala: ${roomId}`);
    
    // Verificar si la sala existe en la base de datos
    const room = db.prepare('SELECT * FROM rooms WHERE roomId = ? AND isActive = 1').get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Sala no encontrada o inactiva' });
      return;
    }
    
    // Inicializar sala si no existe en memoria
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, { participants: new Map() });
    }
    
    const roomData = activeRooms.get(roomId);
    
    // Verificar límite de participantes
    if (roomData.participants.size >= room.maxParticipants) {
      socket.emit('error', { message: 'Sala llena' });
      return;
    }
    
    // Agregar participante
    roomData.participants.set(socket.id, { userName, userId, joinedAt: new Date() });
    socket.join(roomId);
    
    // Notificar a otros participantes que alguien se unió
    const participants = Array.from(roomData.participants.entries()).map(([id, data]) => ({
      socketId: id,
      userName: data.userName,
      userId: data.userId
    }));
    
    // Enviar lista de participantes actuales al nuevo usuario
    socket.emit('room-joined', { 
      roomId, 
      participants: participants.filter(p => p.socketId !== socket.id)
    });
    
    // Notificar a otros que hay un nuevo participante
    socket.to(roomId).emit('user-joined', { 
      socketId: socket.id, 
      userName,
      userId 
    });
  });
  
  // Señalización WebRTC: enviar oferta
  socket.on('offer', ({ to, offer }) => {
    socket.to(to).emit('offer', { 
      from: socket.id, 
      offer 
    });
  });
  
  // Señalización WebRTC: enviar respuesta
  socket.on('answer', ({ to, answer }) => {
    socket.to(to).emit('answer', { 
      from: socket.id, 
      answer 
    });
  });
  
  // Señalización WebRTC: enviar candidato ICE
  socket.on('ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice-candidate', { 
      from: socket.id, 
      candidate 
    });
  });
  
  // Mensajes de chat
  socket.on('chat-message', ({ roomId, message }) => {
    const roomData = activeRooms.get(roomId);
    if (roomData) {
      const userData = roomData.participants.get(socket.id);
      if (userData) {
        io.to(roomId).emit('chat-message', {
          userName: userData.userName,
          message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  // Cambio de estado de audio/video
  socket.on('media-state-change', ({ roomId, audio, video }) => {
    socket.to(roomId).emit('user-media-state', {
      socketId: socket.id,
      audio,
      video
    });
  });
  
  // Compartir pantalla
  socket.on('screen-share-started', ({ roomId }) => {
    socket.to(roomId).emit('user-screen-share-started', {
      socketId: socket.id
    });
  });
  
  socket.on('screen-share-stopped', ({ roomId }) => {
    socket.to(roomId).emit('user-screen-share-stopped', {
      socketId: socket.id
    });
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    
    // Remover de todas las salas
    activeRooms.forEach((roomData, roomId) => {
      if (roomData.participants.has(socket.id)) {
        const userData = roomData.participants.get(socket.id);
        roomData.participants.delete(socket.id);
        
        // Notificar a otros participantes
        socket.to(roomId).emit('user-left', { 
          socketId: socket.id,
          userName: userData.userName
        });
        
        // Eliminar sala de memoria si está vacía
        if (roomData.participants.size === 0) {
          activeRooms.delete(roomId);
        }
      }
    });
  });
});

// ============================================
// API ENDPOINTS PARA SALAS DE VIDEOCONFERENCIA
// ============================================

// Crear sala (solo admin)
app.post('/api/rooms', requireAuth, (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido' });
  }
  
  const { name, description, maxParticipants } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Nombre de sala requerido' });
  }
  
  try {
    const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const insert = db.prepare(
      'INSERT INTO rooms (roomId, name, description, createdBy, maxParticipants) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run(roomId, name, description || '', req.user.email, maxParticipants || 50);
    
    res.status(201).json({ 
      roomId, 
      name, 
      description,
      maxParticipants: maxParticipants || 50
    });
  } catch (err) {
    console.error('Error creando sala:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Listar salas
app.get('/api/rooms', requireAuth, (req, res) => {
  try {
    const rooms = db.prepare(
      'SELECT id, roomId, name, description, createdAt, isActive, maxParticipants FROM rooms WHERE isActive = 1 ORDER BY createdAt DESC'
    ).all();
    
    // Agregar información de participantes actuales
    const roomsWithParticipants = rooms.map(room => ({
      ...room,
      currentParticipants: activeRooms.get(room.roomId)?.participants.size || 0
    }));
    
    res.json({ rooms: roomsWithParticipants });
  } catch (err) {
    console.error('Error listando salas:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Obtener información de una sala
app.get('/api/rooms/:roomId', requireAuth, (req, res) => {
  try {
    const room = db.prepare(
      'SELECT * FROM rooms WHERE roomId = ? AND isActive = 1'
    ).get(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }
    
    const roomData = activeRooms.get(req.params.roomId);
    const participants = roomData ? 
      Array.from(roomData.participants.values()).map(p => ({
        userName: p.userName,
        userId: p.userId
      })) : [];
    
    res.json({ 
      room,
      currentParticipants: participants.length,
      participants
    });
  } catch (err) {
    console.error('Error obteniendo sala:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Actualizar sala (solo admin)
app.patch('/api/rooms/:roomId', requireAuth, (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido' });
  }
  
  const { name, description, isActive, maxParticipants } = req.body;
  try {
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(isActive ? 1 : 0);
    }
    if (maxParticipants !== undefined) {
      updates.push('maxParticipants = ?');
      values.push(maxParticipants);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }
    
    values.push(req.params.roomId);
    const query = `UPDATE rooms SET ${updates.join(', ')} WHERE roomId = ?`;
    const result = db.prepare(query).run(...values);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }
    
    res.json({ message: 'Sala actualizada' });
  } catch (err) {
    console.error('Error actualizando sala:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Eliminar sala (solo admin)
app.delete('/api/rooms/:roomId', requireAuth, (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido' });
  }
  
  try {
    const result = db.prepare('UPDATE rooms SET isActive = 0 WHERE roomId = ?').run(req.params.roomId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }
    
    // Desconectar a todos los participantes si la sala está activa
    const roomData = activeRooms.get(req.params.roomId);
    if (roomData) {
      io.to(req.params.roomId).emit('room-closed', { 
        message: 'La sala ha sido cerrada por el administrador' 
      });
      activeRooms.delete(req.params.roomId);
    }
    
    res.json({ message: 'Sala eliminada' });
  } catch (err) {
    console.error('Error eliminando sala:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Servir archivos estáticos (frontend) desde la carpeta del proyecto
app.use(express.static(path.join(__dirname)));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
