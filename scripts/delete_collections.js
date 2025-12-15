/**
 * Script para borrar colecciones críticas en Firestore.
 * Requisitos:
 *  - Tener un fichero de credenciales de servicio `serviceAccount.json` en este directorio
 *  - Node 14+
 *  - `npm install` ya debe incluir `firebase-admin` (está en package.json)
 * Uso:
 *  node delete_collections.js
 * Este script hace borrados por lotes (batch) y puede tardar según el tamaño.
 */

const admin = require('firebase-admin');
const fs = require('fs');

if (!fs.existsSync('./serviceAccount.json')) {
  console.error('Falta serviceAccount.json en el directorio ./scripts. Coloca allí la clave de servicio y reintenta.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccount.json'))
});

const db = admin.firestore();

async function deleteCollection(path, batchSize = 500) {
  const collectionRef = db.collection(path);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();
  if (snapshot.size === 0) {
    resolve();
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  process.nextTick(() => deleteQueryBatch(query, resolve));
}

(async () => {
  try {
    const collections = ['users','assignments','quizzes','submissions','quizResponses'];
    for (const c of collections) {
      console.log(`Borrando colección: ${c}`);
      await deleteCollection(c);
      console.log(`Colección ${c} borrada.`);
    }
    console.log('Proceso de borrado completado.');
    process.exit(0);
  } catch (err) {
    console.error('Error durante el borrado:', err);
    process.exit(2);
  }
})();
