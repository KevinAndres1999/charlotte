const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function checkCalificaciones() {
  try {
    console.log('🔍 Verificando calificaciones en Firebase...\n');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Verificar entregas con calificaciones
    console.log('📋 ENTREGAS CALIFICADAS:\n');
    const entregasRef = collection(db, 'entregas');
    const entregasSnapshot = await getDocs(entregasRef);

    entregasSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.calificada && data.nota) {
        console.log(`🔸 Entrega ID: ${doc.id}`);
        console.log(`   👤 Estudiante: ${data.nombre} (${data.estudianteId})`);
        console.log(`   📚 Actividad: ${data.actividadId}`);
        console.log(`   ⭐ Nota: ${data.nota}`);
        console.log(`   📝 Comentario: ${data.comentario || 'Sin comentario'}`);
        console.log(`   📅 Fecha calificación: ${data.fechaCalificacion ? new Date(data.fechaCalificacion.seconds * 1000).toLocaleString('es-ES') : 'Sin fecha'}`);
        console.log('   ──────────────────────────────────────\n');
      }
    });

    // Verificar si hay una colección específica de calificaciones
    console.log('📊 VERIFICANDO COLECCIÓN DE CALIFICACIONES:\n');
    try {
      const calificacionesRef = collection(db, 'calificaciones');
      const calificacionesSnapshot = await getDocs(calificacionesRef);
      console.log(`📈 Total de documentos en 'calificaciones': ${calificacionesSnapshot.size}`);

      if (calificacionesSnapshot.size > 0) {
        calificacionesSnapshot.forEach(doc => {
          console.log(`🔸 Calificación ID: ${doc.id}`);
          console.log(`   📋 Datos:`, JSON.stringify(doc.data(), null, 2));
          console.log('   ──────────────────────────────────────\n');
        });
      } else {
        console.log('❌ No hay documentos en la colección "calificaciones"');
      }
    } catch (error) {
      console.log('❌ Error accediendo a colección "calificaciones":', error.message);
    }

    // Verificar actividades para entender la estructura
    console.log('🏫 VERIFICANDO ACTIVIDADES:\n');
    const activitiesRef = collection(db, 'activities');
    const activitiesSnapshot = await getDocs(activitiesRef);

    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📚 Actividad ID: ${doc.id}`);
      console.log(`   📖 Título: ${data.titulo || 'Sin título'}`);
      console.log(`   📂 Módulo: ${data.modulo || 'Sin módulo'}`);
      console.log(`   🎯 Tipo: ${data.tipo || 'Sin tipo'}`);
      console.log('   ──────────────────────────────────────\n');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCalificaciones();