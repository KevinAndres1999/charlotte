/**
 * Crea un usuario teacher en Firebase Auth y su documento en Firestore.
 * Uso: node create_teacher.js <email> "<name>" <password>
 * Requiere: colocar el JSON de la cuenta de servicio en `scripts/serviceAccount.json`
 */

const admin = require('firebase-admin');
const fs = require('fs');

if (!fs.existsSync('./serviceAccount.json')) {
  console.error('Falta scripts/serviceAccount.json. Descarga la clave de servicio desde Firebase Console y colócala en scripts/serviceAccount.json');
  process.exit(1);
}

const svc = require('./serviceAccount.json');
admin.initializeApp({ credential: admin.credential.cert(svc) });
const auth = admin.auth();
const db = admin.firestore();

const [,, email, name, password] = process.argv;
if (!email || !name || !password) {
  console.error('Uso: node create_teacher.js <email> "<name>" <password>');
  process.exit(1);
}

(async () => {
  try {
    const user = await auth.createUser({ email, password, emailVerified: true });
    await db.collection('users').doc(user.uid).set({
      name,
      email,
      role: 'teacher',
      status: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Teacher creado:', user.uid);
    process.exit(0);
  } catch (err) {
    console.error('Error creando teacher:', err);
    process.exit(2);
  }
})();
