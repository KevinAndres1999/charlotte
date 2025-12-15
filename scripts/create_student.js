/**
 * Crea un usuario estudiante en Firebase Auth y su documento en Firestore.
 * Uso: node create_student.js <email> "<name>" <password> <cedula> <telefono> "<programa>" "<sede>" [status]
 * Requiere: colocar la clave de servicio en `scripts/charlotte-babda-firebase-adminsdk-fbsvc-3d48fe741d.json`
 */
const admin = require('firebase-admin');
const fs = require('fs');

const KEY = './charlotte-babda-firebase-adminsdk-fbsvc-3d48fe741d.json';
if (!fs.existsSync(KEY)) {
  console.error('Falta scripts/' + KEY + '. Coloca la clave de servicio en scripts/');
  process.exit(1);
}
const svc = require(KEY);
admin.initializeApp({ credential: admin.credential.cert(svc) });
const auth = admin.auth();
const db = admin.firestore();

const [,, email, name, password, cedula, telefono, programa, sede, statusArg] = process.argv;
if (!email || !name || !password) {
  console.error('Uso: node create_student.js <email> "<name>" <password> <cedula> <telefono> "<programa>" "<sede>" [status]');
  process.exit(1);
}
const status = statusArg || 'approved';

(async ()=>{
  try {
    // Crear usuario en Auth (si existe, obtenerlo)
    let user;
    try { user = await auth.createUser({ email, password, emailVerified: false }); console.log('Auth: usuario creado', user.uid); }
    catch (e) {
      if (e.code === 'auth/email-already-exists') {
        console.log('Auth: email ya existe, recuperando usuario');
        user = await auth.getUserByEmail(email);
      } else { throw e; }
    }

    const uid = user.uid;

    const doc = {
      name,
      email,
      cedula: cedula || '',
      telefono: telefono || '',
      programa: programa || '',
      sede: sede || '',
      role: 'student',
      status: status,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(uid).set(doc, { merge: true });
    console.log('Firestore: users/' + uid + ' creado/actualizado');

    // Añadir también a pendingStudents o approvedStudents según status
    if (status === 'approved') {
      await db.collection('approvedStudents').doc(uid).set(Object.assign({ uid }, doc));
      console.log('Firestore: approvedStudents/' + uid + ' creado');
    } else {
      await db.collection('pendingStudents').doc(uid).set(Object.assign({ uid }, doc));
      console.log('Firestore: pendingStudents/' + uid + ' creado');
    }

    console.log('OK', { uid, email, password });
    process.exit(0);
  } catch (err) {
    console.error('Error creando student:', err);
    process.exit(2);
  }
})();
