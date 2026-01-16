const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8',
  authDomain: 'charlotte-a0d47.firebaseapp.com',
  projectId: 'charlotte-a0d47',
  storageBucket: 'charlotte-a0d47.firebasestorage.app',
  messagingSenderId: '971007838036',
  appId: '1:971007838036:web:381b5c516ba841fef12ac1'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listEvaluaciones() {
  try {
    const evaluacionesSnapshot = await getDocs(collection(db, 'evaluaciones'));
    console.log('=== EVALUACIONES EN FIREBASE ===');
    const evaluaciones = [];
    evaluacionesSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      evaluaciones.push({
        id: docSnap.id,
        titulo: data.titulo || 'Sin título',
        fechaCreacion: data.fechaCreacion || 'Sin fecha'
      });
    });

    evaluaciones.forEach(eval => {
      console.log(`ID: ${eval.id}`);
      console.log(`Título: ${eval.titulo}`);
      console.log(`Fecha creación: ${eval.fechaCreacion}`);
      console.log('---');
    });

    return evaluaciones;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

async function deleteEvaluacion(id) {
  try {
    await deleteDoc(doc(db, 'evaluaciones', id));
    console.log(`✅ Eliminada evaluación: ${id}`);
  } catch (error) {
    console.error(`❌ Error eliminando ${id}:`, error);
  }
}

async function analyzeRespuestas() {
  try {
    const respuestasSnapshot = await getDocs(collection(db, 'respuestasEvaluaciones'));
    console.log('=== ANÁLISIS DE RESPUESTAS DE EVALUACIONES ===');
    console.log(`Total respuestas: ${respuestasSnapshot.size}`);

    const respuestasPorEvaluacion = {};

    respuestasSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const evalId = data.evaluacionId || 'sin-evaluacion';

      if (!respuestasPorEvaluacion[evalId]) {
        respuestasPorEvaluacion[evalId] = [];
      }

      respuestasPorEvaluacion[evalId].push({
        id: docSnap.id,
        estudiante: data.estudianteId || data.email || data.nombre || 'desconocido',
        calificacion: data.calificacion,
        fecha: data.fechaRespuesta,
        respuestas: data.respuestas ? data.respuestas.length : 0
      });
    });

    Object.keys(respuestasPorEvaluacion).forEach(evalId => {
      const respuestas = respuestasPorEvaluacion[evalId];
      console.log(`\nEvaluación ${evalId}:`);
      console.log(`  Total respuestas: ${respuestas.length}`);

      const calificaciones = respuestas.map(r => r.calificacion).filter(c => c !== undefined);
      if (calificaciones.length > 0) {
        const promedio = Math.round(calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length);
        console.log(`  Calificaciones: [${calificaciones.join(', ')}]`);
        console.log(`  Promedio: ${promedio}%`);
      } else {
        console.log('  No hay calificaciones guardadas');
      }

      respuestas.forEach(r => {
        console.log(`    - ${r.estudiante}: ${r.calificacion || 'sin calificación'}% (${r.respuestas} respuestas)`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  console.log('🔍 ANALIZANDO EVALUACIONES Y RESPUESTAS...\n');
  await analyzeRespuestas();

  console.log('\n📋 EVALUACIONES:');
  const evaluaciones = await listEvaluaciones();

  if (evaluaciones.length === 0) {
    console.log('No hay evaluaciones para eliminar');
    return;
  }

  console.log(`\nSe encontraron ${evaluaciones.length} evaluaciones`);
  console.log('¿Cuál es la evaluación que quieres mantener? (ingresa el ID)');
}

main();