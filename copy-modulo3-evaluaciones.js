const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, setDoc } = require('firebase/firestore');

// Configuración de Firebase
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

async function copyModulo3Evaluaciones() {
  try {
    console.log('Iniciando proceso de copia de calificaciones de evaluaciones del módulo 3...');

    // Cargar preguntas originales para recalcular calificaciones
    console.log('Cargando preguntas originales...');
    const preguntasOriginalesMap = new Map();

    try {
      // Cargar preguntas de cuestionarios
      const cuestionariosSnapshot = await getDocs(collection(db, 'cuestionarios'));
      cuestionariosSnapshot.forEach(docSnap => {
        const cuest = docSnap.data();
        if (cuest.preguntas && Array.isArray(cuest.preguntas)) {
          cuest.preguntas.forEach(p => {
            const texto = (p.texto || p.pregunta || '').trim().toLowerCase();
            if (texto) {
              preguntasOriginalesMap.set(texto, {
                opciones: p.opciones || [],
                correcta: p.correcta !== undefined ? p.correcta : (p.respuesta !== undefined ? p.respuesta : null)
              });
            }
          });
        }
      });

      // Cargar preguntas de evaluaciones
      const evaluacionesSnapshot = await getDocs(collection(db, 'evaluaciones'));
      evaluacionesSnapshot.forEach(docSnap => {
        const ev = docSnap.data();
        if (ev.preguntas && Array.isArray(ev.preguntas)) {
          ev.preguntas.forEach(p => {
            const texto = (p.texto || p.pregunta || '').trim().toLowerCase();
            if (texto && !preguntasOriginalesMap.has(texto)) {
              preguntasOriginalesMap.set(texto, {
                opciones: p.opciones || [],
                correcta: p.correcta !== undefined ? p.correcta : (p.respuesta !== undefined ? p.respuesta : null)
              });
            }
          });
        }
      });

      console.log(`Preguntas originales cargadas: ${preguntasOriginalesMap.size}`);
    } catch (error) {
      console.log('Error cargando preguntas originales:', error);
    }

    // Cargar todas las evaluaciones y respuestas
    console.log('Cargando evaluaciones y respuestas...');
    const [evaluacionesSnapshot, respuestasSnapshot] = await Promise.all([
      getDocs(collection(db, 'evaluaciones')),
      getDocs(collection(db, 'respuestasEvaluaciones'))
    ]);

    // Crear mapa de evaluaciones
    const evaluacionesMap = {};
    evaluacionesSnapshot.forEach(doc => {
      const evaluacion = doc.data();
      evaluacionesMap[doc.id] = evaluacion;
    });

    // Crear mapa de respuestas por estudiante
    const respuestasPorEstudiante = {};
    respuestasSnapshot.forEach(doc => {
      const respuesta = doc.data();
      const estudianteId = respuesta.estudianteId;
      const evaluacionId = respuesta.evaluacionId;

      if (!respuestasPorEstudiante[estudianteId]) {
        respuestasPorEstudiante[estudianteId] = {};
      }

      // Mantener solo la respuesta más reciente
      if (!respuestasPorEstudiante[estudianteId][evaluacionId] ||
          new Date(respuesta.fechaRespuesta) > new Date(respuestasPorEstudiante[estudianteId][evaluacionId].fechaRespuesta)) {
        respuestasPorEstudiante[estudianteId][evaluacionId] = respuesta;
      }
    });

    // Función para recalcular calificación
    function recalcularCalificacion(respuestas, preguntas) {
      if (!respuestas || !preguntas || preguntas.length === 0) return null;

      let correctas = 0;
      preguntas.forEach((pregunta, idx) => {
        const respuestaEstudiante = respuestas[idx];
        const textoPregunta = (pregunta.texto || pregunta.pregunta || '').trim().toLowerCase();

        let respuestaCorrectaIdx = pregunta.respuesta !== undefined ? pregunta.respuesta :
                                   (pregunta.correcta !== undefined ? pregunta.correcta : null);

        if (respuestaCorrectaIdx === null || respuestaCorrectaIdx === undefined) {
          const preguntaOriginal = preguntasOriginalesMap.get(textoPregunta);
          if (preguntaOriginal) {
            respuestaCorrectaIdx = preguntaOriginal.correcta;
          }
        }

        if (respuestaEstudiante === respuestaCorrectaIdx) {
          correctas++;
        }
      });

      const resultado = Math.round((correctas / preguntas.length) * 100);
      return resultado;
    }

    // Obtener estudiantes
    console.log('Obteniendo estudiantes...');
    const estudiantesSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Encontrados ${estudiantesSnapshot.size} estudiantes`);

    let procesados = 0;
    let actualizados = 0;
    let creados = 0;

    for (const estudianteDoc of estudiantesSnapshot.docs) {
      const estudianteId = estudianteDoc.id;
      const estudiante = estudianteDoc.data();

      // Solo procesar estudiantes (no admin)
      if (estudiante.role === 'admin') continue;

      console.log(`Procesando estudiante: ${estudiante.name} (${estudianteId})`);
      procesados++;

      // Calcular evaluaciones del módulo 3
      if (respuestasPorEstudiante[estudianteId]) {
        const respuestasEstudiante = respuestasPorEstudiante[estudianteId];
        let totalEvaluaciones = 0;
        let countEvaluaciones = 0;

        Object.entries(respuestasEstudiante).forEach(([evaluacionId, respuesta]) => {
          const evaluacion = evaluacionesMap[evaluacionId];
          if (evaluacion && respuesta.respuestas && evaluacion.preguntas) {
            const calificacionRecalculada = recalcularCalificacion(respuesta.respuestas, evaluacion.preguntas);

            if (calificacionRecalculada !== null) {
              // Determinar si pertenece al módulo 3
              const moduloEvaluacion = (evaluacion.modulo || '').toLowerCase();
              const tituloEvaluacion = (evaluacion.titulo || '').toLowerCase();

              const esModulo3 = moduloEvaluacion.includes('pasteleria') ||
                               moduloEvaluacion.includes('pastelería') ||
                               moduloEvaluacion.includes('pasteles') ||
                               tituloEvaluacion.includes('pasteleria') ||
                               tituloEvaluacion.includes('pastelería') ||
                               tituloEvaluacion.includes('pasteles');

              if (esModulo3) {
                // Convertir calificación a escala 0-2 (máximo 2 puntos)
                const notaEscala2 = (calificacionRecalculada / 100) * 2;
                totalEvaluaciones += notaEscala2;
                countEvaluaciones++;
                console.log(`  - Evaluación "${evaluacion.titulo}": ${calificacionRecalculada}% -> ${notaEscala2.toFixed(2)} puntos`);
              }
            }
          }
        });

        if (countEvaluaciones > 0) {
          // Calcular promedio de evaluaciones del módulo 3
          const promedioEvaluaciones = totalEvaluaciones / countEvaluaciones;

          console.log(`  → ${countEvaluaciones} evaluaciones módulo 3, promedio: ${promedioEvaluaciones.toFixed(2)} puntos`);

          // Verificar si ya existe una calificación para este estudiante y módulo 3
          const existingQuery = query(
            collection(db, 'calificaciones_modulos'),
            where('estudianteId', '==', estudianteId),
            where('modulo', '==', 'modulo3')
          );
          const existingSnapshot = await getDocs(existingQuery);

          const califData = {
            estudianteId: estudianteId,
            modulo: 'modulo3',
            evaluaciones: promedioEvaluaciones,
            fechaActualizacion: new Date()
          };

          if (!existingSnapshot.empty) {
            // Actualizar calificación existente (solo el campo evaluaciones)
            const docId = existingSnapshot.docs[0].id;
            await setDoc(doc(db, 'calificaciones_modulos', docId), califData, { merge: true });
            console.log(`  ✓ Actualizada calificación para ${estudiante.name}`);
            actualizados++;
          } else {
            // Crear nueva calificación
            await setDoc(doc(db, 'calificaciones_modulos', `${estudianteId}_modulo3`), califData);
            console.log(`  ✓ Creada calificación para ${estudiante.name}`);
            creados++;
          }
        } else {
          console.log(`  → No hay evaluaciones del módulo 3 para ${estudiante.name}`);
        }
      } else {
        console.log(`  → No hay respuestas de evaluaciones para ${estudiante.name}`);
      }
    }

    console.log('\n=== RESUMEN DEL PROCESO ===');
    console.log(`Estudiantes procesados: ${procesados}`);
    console.log(`Calificaciones actualizadas: ${actualizados}`);
    console.log(`Calificaciones creadas: ${creados}`);
    console.log('Proceso completado exitosamente ✓');

  } catch (error) {
    console.error('Error en el proceso:', error);
  }
}

copyModulo3Evaluaciones();