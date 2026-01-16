const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function recalcularCalificaciones() {
  try {
    console.log('🔄 Iniciando recálculo de calificaciones...\n');

    // Obtener todas las evaluaciones para mapear preguntas
    const evaluacionesSnapshot = await getDocs(collection(db, 'evaluaciones'));
    const evaluacionesMap = {};

    evaluacionesSnapshot.forEach(docSnap => {
      evaluacionesMap[docSnap.id] = docSnap.data();
    });

    console.log(`📋 Encontradas ${Object.keys(evaluacionesMap).length} evaluaciones`);

    // Crear mapa de preguntas originales para buscar respuestas correctas
    const preguntasOriginalesMap = new Map();
    evaluacionesSnapshot.forEach(docSnap => {
      const evaluacion = docSnap.data();
      if (evaluacion.preguntas && Array.isArray(evaluacion.preguntas)) {
        evaluacion.preguntas.forEach((pregunta, idx) => {
          const texto = (pregunta.texto || pregunta.pregunta || '').trim().toLowerCase();
          if (texto) {
            preguntasOriginalesMap.set(texto, { correctaIdx: pregunta.correctaIdx || pregunta.correcta, pregunta });
          }
        });
      }
    });

    // Obtener todas las respuestas de evaluaciones
    const respuestasSnapshot = await getDocs(collection(db, 'respuestasEvaluaciones'));
    console.log(`📝 Encontradas ${respuestasSnapshot.size} respuestas de evaluaciones\n`);

    let actualizadas = 0;
    let errores = 0;

    for (const docSnap of respuestasSnapshot.docs) {
      const respuesta = docSnap.data();
      const respuestaId = docSnap.id;

      try {
        // Solo procesar si tiene evaluacionId y respuestas
        if (!respuesta.evaluacionId || !respuesta.respuestas) {
          console.log(`⚠️  Saltando ${respuestaId}: faltan datos`);
          continue;
        }

        const evaluacion = evaluacionesMap[respuesta.evaluacionId];
        if (!evaluacion || !evaluacion.preguntas) {
          console.log(`⚠️  Saltando ${respuestaId}: evaluación no encontrada`);
          continue;
        }

        // Recalcular calificación usando la lógica correcta
        let correctas = 0;
        evaluacion.preguntas.forEach((pregunta, idx) => {
          const respuestaEstudiante = respuesta.respuestas[idx];
          const textoPregunta = (pregunta.texto || pregunta.pregunta || '').trim().toLowerCase();

          let respuestaCorrectaIdx = pregunta.respuesta !== undefined ? pregunta.respuesta :
                                     (pregunta.correcta !== undefined ? pregunta.correcta : null);

          if (respuestaCorrectaIdx === null || respuestaCorrectaIdx === undefined) {
            const preguntaOriginal = preguntasOriginalesMap.get(textoPregunta);
            if (preguntaOriginal) {
              respuestaCorrectaIdx = preguntaOriginal.correctaIdx;
            }
          }

          if (respuestaCorrectaIdx !== null && respuestaCorrectaIdx !== undefined &&
              respuestaEstudiante === respuestaCorrectaIdx) {
            correctas++;
          }
        });

        const calificacionRecalculada = Math.round((correctas / evaluacion.preguntas.length) * 100);
        const calificacionAnterior = respuesta.calificacion || respuesta.calificacionAutomatica || 0;

        // Solo actualizar si la calificación cambió
        if (calificacionRecalculada !== calificacionAnterior) {
          await updateDoc(doc(db, 'respuestasEvaluaciones', respuestaId), {
            calificacion: calificacionRecalculada,
            calificacionAutomatica: calificacionRecalculada,
            fechaCalificacion: new Date()
          });

          console.log(`✅ ${respuestaId}: ${calificacionAnterior}% → ${calificacionRecalculada}%`);
          actualizadas++;
        } else {
          console.log(`ℹ️  ${respuestaId}: calificación ya correcta (${calificacionRecalculada}%)`);
        }

      } catch (error) {
        console.error(`❌ Error procesando ${respuestaId}:`, error);
        errores++;
      }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   ✅ Calificaciones actualizadas: ${actualizadas}`);
    console.log(`   ⚠️  Errores: ${errores}`);
    console.log(`   📊 Total procesadas: ${respuestasSnapshot.size}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

recalcularCalificaciones();