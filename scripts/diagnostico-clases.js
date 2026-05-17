/**
 * diagnostico-clases.js
 * 
 * Muestra qué clases hay en Firebase y su estado, y qué estudiantes existen,
 * para diagnosticar por qué el estudiante no ve clases.
 * 
 * Uso: node scripts/diagnostico-clases.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../charlotte-a0d47-firebase-adminsdk-fbsvc-0b73eda623.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function diagnostico() {
  console.log('='.repeat(60));
  console.log('DIAGNÓSTICO: CLASES EN FIREBASE');
  console.log('='.repeat(60));

  // 1. Ver todas las clases
  const clasesSnap = await db.collection('classes').get();
  console.log(`\n📚 Total clases en 'classes': ${clasesSnap.size}`);

  if (clasesSnap.empty) {
    console.log('❌ No hay ninguna clase guardada en la colección "classes"');
  } else {
    console.log('\n--- Detalle de clases ---');
    clasesSnap.forEach(doc => {
      const d = doc.data();
      console.log(`\n  ID: ${doc.id}`);
      console.log(`  Título:    ${d.titulo || '(sin título)'}`);
      console.log(`  Programa:  "${d.programa || '(vacío)'}"`);
      console.log(`  Módulo:    "${d.modulo || '(vacío)'}"`);
      console.log(`  Estado:    "${d.estado || '(vacío)'}"`);
      console.log(`  Visible:   ${d.visible}`);
      console.log(`  Sedes:     ${JSON.stringify(d.sedes || [])}`);
      console.log(`  Horarios:  ${JSON.stringify(d.horarios || [])}`);
    });
  }

  // 2. Ver estudiantes y sus programas
  console.log('\n' + '='.repeat(60));
  console.log('ESTUDIANTES EN FIREBASE');
  console.log('='.repeat(60));

  const estudiantesSnap = await db.collection('users')
    .where('role', '==', 'student')
    .get();

  console.log(`\n👥 Total estudiantes: ${estudiantesSnap.size}`);

  const programas = {};
  estudiantesSnap.forEach(doc => {
    const d = doc.data();
    const prog = d.programa || '(sin programa)';
    programas[prog] = (programas[prog] || 0) + 1;
  });

  console.log('\n📋 Programas de estudiantes:');
  Object.entries(programas).forEach(([prog, count]) => {
    console.log(`   "${prog}": ${count} estudiante(s)`);
  });

  // 3. Cruzar datos: para cada programa de estudiante, ¿cuántas clases hay?
  console.log('\n' + '='.repeat(60));
  console.log('CRUCE: CLASES vs PROGRAMAS DE ESTUDIANTES');
  console.log('='.repeat(60));

  for (const prog of Object.keys(programas)) {
    if (prog === '(sin programa)') continue;
    const clasesDelPrograma = await db.collection('classes')
      .where('programa', '==', prog)
      .get();

    console.log(`\n  Programa: "${prog}"`);
    console.log(`  Clases totales: ${clasesDelPrograma.size}`);

    let publicadas = 0, noPublicadas = 0, noVisibles = 0;
    clasesDelPrograma.forEach(doc => {
      const d = doc.data();
      if (d.visible === false) noVisibles++;
      if (d.estado === 'publicada') publicadas++;
      else noPublicadas++;
    });

    console.log(`  ✅ Publicadas (estado='publicada'): ${publicadas}`);
    console.log(`  ⚠️  No publicadas (otro estado): ${noPublicadas}`);
    console.log(`  🚫 Ocultas (visible=false): ${noVisibles}`);

    if (publicadas === 0 && clasesDelPrograma.size > 0) {
      console.log(`  ❌ PROBLEMA: Hay clases pero ninguna tiene estado='publicada'`);
      console.log(`     Estados encontrados:`);
      clasesDelPrograma.forEach(doc => {
        const d = doc.data();
        console.log(`       - "${d.titulo}": estado="${d.estado}", visible=${d.visible}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

diagnostico().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
