const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function checkCurrentCalificaciones() {
  try {
    console.log('=== CALIFICACIONES ACTUALES EN calificaciones_modulos ===');
    const calificacionesSnapshot = await getDocs(collection(db, 'calificaciones_modulos'));

    if (calificacionesSnapshot.empty) {
      console.log('No hay calificaciones en calificaciones_modulos');
      return;
    }

    calificacionesSnapshot.forEach(doc => {
      const calif = doc.data();
      console.log(`${calif.estudianteId} - ${calif.modulo}:`, JSON.stringify(calif, null, 2));
    });

    console.log('\n=== EVALUACIONES POR ESTUDIANTE ===');
    const estudiantesSnapshot = await getDocs(collection(db, 'users'));

    for (const estudianteDoc of estudiantesSnapshot.docs) {
      const estudianteId = estudianteDoc.id;
      const estudiante = estudianteDoc.data();

      const evaluacionesSnapshot = await getDocs(query(
        collection(db, 'resultados_evaluaciones'),
        where('estudianteId', '==', estudianteId)
      ));

      if (!evaluacionesSnapshot.empty) {
        let totalScore = 0;
        let count = 0;

        evaluacionesSnapshot.forEach(doc => {
          const resultado = doc.data();
          if (resultado.notaFinal) {
            totalScore += resultado.notaFinal;
            count++;
          }
        });

        if (count > 0) {
          const promedio = totalScore / count;
          const notaFinal = Math.min(promedio / 50, 2); // Convertir a escala 0-2

          console.log(`${estudiante.name} (${estudianteId}): ${count} evaluaciones, promedio ${promedio.toFixed(2)}, nota final ${notaFinal.toFixed(2)}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCurrentCalificaciones();