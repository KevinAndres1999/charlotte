/**
 * Busca un usuario por email en Auth y crea/actualiza su doc en Firestore como teacher.
 * Uso: node upsert_teacher_doc.js <email> "<name>"
 */
const admin = require('firebase-admin');
const fs = require('fs');

if (!fs.existsSync('./charlotte-babda-firebase-adminsdk-fbsvc-3d48fe741d.json')) {
  console.error('Falta scripts/serviceAccount.json. Asegúrate de que el JSON esté en scripts/ y renómbalo si es necesario.');
  process.exit(1);
}
if (!fs.existsSync('./charlotte-service-account.json')) {
  console.error('Falta el archivo de clave de servicio en scripts/ (charlotte-service-account.json)');
  process.exit(1);
}
const svc = require('./charlotte-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(svc) });
const auth = admin.auth();
const db = admin.firestore();

const [,, email, name] = process.argv;
if (!email || !name) {
  console.error('Uso: node upsert_teacher_doc.js <email> "<name>"');
  process.exit(1);
}

(async () => {
  try {
    const user = await auth.getUserByEmail(email);
    const uid = user.uid;
    await db.collection('users').doc(uid).set({
      name,
      email,
      role: 'teacher',
      status: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('Doc users/' + uid + ' creado/actualizado');
    process.exit(0);
  } catch (err) {
    console.error('Error upsert:', err);
    process.exit(2);
  }
})();
