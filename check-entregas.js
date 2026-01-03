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

async function checkEntregas() {
  try {
    console.log('🔍 Consultando entregas en Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const entregasRef = collection(db, 'entregas');
    const querySnapshot = await getDocs(entregasRef);

    console.log(`📊 Total de entregas encontradas: ${querySnapshot.size}\n`);

    if (querySnapshot.size === 0) {
      console.log('❌ No se encontraron entregas en la base de datos');
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`🔸 ID de entrega: ${doc.id}`);
      console.log(`   👤 Estudiante: ${data.nombre || 'Sin nombre'} (${data.estudianteId || 'Sin email'})`);
      console.log(`   📚 Actividad: ${data.actividadTitulo || 'Sin título'}`);
      console.log(`   📝 Programa: ${data.programa || 'Sin programa'}`);
      console.log(`   📅 Fecha: ${data.fechaEntrega ? new Date(data.fechaEntrega).toLocaleString('es-ES') : 'Sin fecha'}`);
      console.log(`   ✅ Calificada: ${data.calificada ? 'Sí' : 'No'}`);
      if (data.nota) {
        console.log(`   ⭐ Nota: ${data.nota}`);
      }
      if (data.comentario) {
        console.log(`   💬 Comentario: ${data.comentario}`);
      }

      // Verificar campos de contenido
      console.log(`   📄 Campo 'entrega': ${data.entrega ? '✅ Presente (' + data.entrega.length + ' caracteres)' : '❌ Ausente'}`);
      console.log(`   📄 Campo 'contenido': ${data.contenido ? '✅ Presente (' + data.contenido.length + ' caracteres)' : '❌ Ausente'}`);

      // Mostrar preview del contenido si existe
      if (data.entrega) {
        const preview = data.entrega.length > 100 ? data.entrega.substring(0, 100) + '...' : data.entrega;
        console.log(`   👀 Preview entrega: "${preview}"`);
      }

      if (data.contenido) {
        const preview = data.contenido.length > 100 ? data.contenido.substring(0, 100) + '...' : data.contenido;
        console.log(`   👀 Preview contenido: "${preview}"`);
      }

      console.log('   ──────────────────────────────────────\n');
    });

  } catch (error) {
    console.error('❌ Error consultando entregas:', error.message);
    console.error('Error details:', error);
  }
}

checkEntregas();