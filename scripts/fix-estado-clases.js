/**
 * fix-estado-clases.js
 * 
 * Actualiza todas las clases que tienen estado vacío o 'publicado'
 * y visible=true para que tengan estado='publicada'.
 * 
 * Uso: node scripts/fix-estado-clases.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../charlotte-a0d47-firebase-adminsdk-fbsvc-0b73eda623.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixEstadoClases() {
  console.log('🔍 Buscando clases con estado incorrecto...\n');

  const snapshot = await db.collection('classes').get();
  
  const batch = db.batch();
  const aActualizar = [];
  const yaCorrectas = [];
  const noVisibles = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    const estadoActual = d.estado || '';
    const esVisible = d.visible !== false;

    if (!esVisible) {
      // Clases ocultas: actualizar estado a 'borrador' si está vacío
      if (!estadoActual) {
        noVisibles.push({ id: doc.id, titulo: d.titulo, estado: estadoActual });
        batch.update(doc.ref, { estado: 'borrador', updatedAt: new Date().toISOString() });
      }
      return;
    }

    if (estadoActual === 'publicada') {
      yaCorrectas.push({ id: doc.id, titulo: d.titulo });
      return;
    }

    // Visible=true pero sin estado o con 'publicado' → corregir a 'publicada'
    aActualizar.push({ id: doc.id, titulo: d.titulo, estadoAnterior: estadoActual || '(vacío)' });
    batch.update(doc.ref, { estado: 'publicada', updatedAt: new Date().toISOString() });
  });

  console.log(`✅ Ya correctas (estado='publicada'): ${yaCorrectas.length}`);
  yaCorrectas.forEach(c => console.log(`   - ${c.titulo}`));

  console.log(`\n⚠️  A actualizar → 'publicada' (visible=true): ${aActualizar.length}`);
  aActualizar.forEach(c => console.log(`   - "${c.titulo}" (era: ${c.estadoAnterior})`));

  console.log(`\n🚫 Ocultas → 'borrador' (visible=false): ${noVisibles.length}`);
  noVisibles.forEach(c => console.log(`   - ${c.titulo}`));

  if (aActualizar.length === 0 && noVisibles.length === 0) {
    console.log('\n✅ No hay nada que actualizar.');
    process.exit(0);
  }

  const total = aActualizar.length + noVisibles.length;
  console.log(`\n🔄 Aplicando ${total} actualizaciones...`);
  await batch.commit();
  console.log(`✅ ¡Listo! ${aActualizar.length} clase(s) ahora con estado='publicada'.`);

  process.exit(0);
}

fixEstadoClases().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
