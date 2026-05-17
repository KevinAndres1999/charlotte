/**
 * fix-status-pendiente.js
 * 
 * Corrige estudiantes que están en la colección 'users' (ya aprobados)
 * pero su campo 'status' sigue como 'pendiente' en lugar de 'cursando'.
 * 
 * Uso: node scripts/fix-status-pendiente.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../charlotte-a0d47-firebase-adminsdk-fbsvc-0b73eda623.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixStatusPendiente() {
  console.log('🔍 Buscando estudiantes con status "pendiente" en la colección users...\n');

  try {
    // Buscar todos los estudiantes con status incorrecto: 'pending', 'pendiente' o 'cursando'
    const [snapshotPending, snapshotPendiente, snapshotCursando] = await Promise.all([
      db.collection('users').where('role', '==', 'student').where('status', '==', 'pending').get(),
      db.collection('users').where('role', '==', 'student').where('status', '==', 'pendiente').get(),
      db.collection('users').where('role', '==', 'student').where('status', '==', 'cursando').get()
    ]);

    // Combinar resultados evitando duplicados por ID
    const seenIds = new Set();
    const allDocs = [];
    [...snapshotPending.docs, ...snapshotPendiente.docs, ...snapshotCursando.docs].forEach(doc => {
      if (!seenIds.has(doc.id)) { seenIds.add(doc.id); allDocs.push(doc); }
    });

    // Crear snapshot-like object para mantener compatibilidad
    const snapshot = { empty: allDocs.length === 0, size: allDocs.length, forEach: (cb) => allDocs.forEach(cb) };

    if (snapshot.empty) {
      console.log('✅ No se encontraron estudiantes con status "pendiente" en users.');
      console.log('\nVerificando también si hay status vacíos o null...');
      
      // Buscar todos los estudiantes para reportar
      const allSnapshot = await db.collection('users')
        .where('role', '==', 'student')
        .get();
      
      console.log(`\n📊 Total estudiantes en users: ${allSnapshot.size}`);
      
      const statusCount = {};
      allSnapshot.forEach(doc => {
        const s = doc.data().status || '(sin status)';
        statusCount[s] = (statusCount[s] || 0) + 1;
      });
      
      console.log('📋 Distribución de status:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} estudiante(s)`);
      });
      
      process.exit(0);
    }

    console.log(`⚠️  Encontrados ${snapshot.size} estudiante(s) con status "pendiente":\n`);

    const batch = db.batch();
    const usuarios = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      usuarios.push({ id: doc.id, name: data.name, email: data.email, programa: data.programa, sede: data.sede });
      
      batch.update(doc.ref, {
        status: 'active',
        updatedAt: new Date().toISOString()
      });
    });

    // Mostrar lista de afectados
    usuarios.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name || '(sin nombre)'} — ${u.email}`);
      console.log(`     Programa: ${u.programa || 'N/A'} | Sede: ${u.sede || 'N/A'}`);
    });

    // Confirmar antes de aplicar
    console.log(`\n🔄 Actualizando ${snapshot.size} estudiante(s) → "active"...`);

    await batch.commit();

    console.log(`\n✅ ¡Listo! ${snapshot.size} estudiante(s) actualizados a "active" correctamente.`);
    console.log('   Ahora pueden acceder a la plataforma normalmente.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

fixStatusPendiente();
