const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function checkEvaluations() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Obteniendo evaluaciones...');
    const evaluacionesRef = collection(db, 'evaluaciones');
    const evaluacionesSnapshot = await getDocs(evaluacionesRef);

    // Crear mapa de preguntas originales
    const preguntasOriginalesMap = new Map();
    
    // Cargar preguntas de cuestionarios
    const cuestionariosRef = collection(db, 'cuestionarios');
    const cuestionariosSnapshot = await getDocs(cuestionariosRef);
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

    console.log(`\nMapa de preguntas originales cargado: ${preguntasOriginalesMap.size} preguntas`);

    // Verificar específicamente las respuestas correctas en cuestionarios
    console.log('\n=== VERIFICACIÓN DETALLADA DE RESPUESTAS CORRECTAS ===');
    cuestionariosSnapshot.forEach(docSnap => {
      const cuest = docSnap.data();
      if (cuest.preguntas && Array.isArray(cuest.preguntas)) {
        cuest.preguntas.forEach((p, idx) => {
          const texto = (p.texto || p.pregunta || '').trim().toLowerCase();
          if (texto) {
            console.log(`Cuestionario pregunta ${idx}: "${texto.substring(0, 50)}..." -> correcta: ${p.correcta}, respuesta: ${p.respuesta}`);
          }
        });
      }
    });
    evaluacionesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Título: ${data.titulo}`);
      console.log(`  Módulo: ${data.modulo}`);
      console.log(`  Preguntas: ${data.preguntas ? data.preguntas.length : 0}`);
      if (data.preguntas && data.preguntas.length > 0) {
        console.log('  Todas las preguntas:');
        data.preguntas.forEach((p, i) => {
          console.log(`    ${i}: correcta=${p.correcta}, respuesta=${p.respuesta}`);
        });
      }
      console.log('---');
    });

    // Verificar las preguntas específicas que actualicé
    console.log('\n=== PREGUNTAS ESPECÍFICAS ACTUALIZADAS ===');
    const preguntasProblematicas = [
      "¿qué propiedad del azúcar permite que las mermeladas con >65% de azúcar no necesiten refrigeración?",
      "¿cuál es la proporción correcta para la masa quebrada (pâte brisée) según el texto?",
      "¿qué efecto tiene añadir una gota de yema al batir claras para merengue?",
      "¿a qué temperatura comienza a coagular la clara del huevo?",
      "¿qué función de los lácteos se describe como 'participar en reacciones de dorado y caramelización'?",
      "¿cuál es la temperatura de cocción para crema inglesa que evita grumos?"
    ];
    
    preguntasProblematicas.forEach((textoBusqueda, idx) => {
      const textoNormalizado = textoBusqueda.trim().toLowerCase();
      const preguntaOriginal = preguntasOriginalesMap.get(textoNormalizado);
      console.log(`Pregunta ${idx + 1}: "${textoBusqueda.substring(0, 50)}..."`);
      console.log(`  En mapa: correcta=${preguntaOriginal ? preguntaOriginal.correcta : 'NO ENCONTRADA'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkEvaluations();