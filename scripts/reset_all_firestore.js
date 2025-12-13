// reset_all_firestore.js
// Script para eliminar todos los documentos de las colecciones principales en Firestore

// Debe ejecutarse en un entorno Node.js con permisos de administrador y credenciales de Firebase

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Debes descargar tu clave de servicio de Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const collections = [
  'actividades',
  'videos',
  'clases',
  'materiales',
  'cuestionarios',
  'evaluaciones',
  'entregas',
  'pendingStudents',
  'approvedStudents'
];

async function deleteCollection(coll) {
  const snapshot = await db.collection(coll).get();
  const batch = db.batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Colección ${coll} eliminada.`);
}

async function resetAll() {
  for (const coll of collections) {
    await deleteCollection(coll);
  }
  console.log('¡Todas las colecciones han sido eliminadas!');
}

resetAll();
