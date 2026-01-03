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

async function checkEntregasDetailed() {
  try {
    console.log('🔍 Consultando entregas detalladas en Firebase...\n');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const entregasRef = collection(db, 'entregas');
    const querySnapshot = await getDocs(entregasRef);

    console.log(`📊 Total de entregas: ${querySnapshot.size}\n`);

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      console.log(`🔸 ENTREGA ID: ${docSnap.id}`);
      console.log(`   📋 Todos los campos disponibles:`);

      Object.keys(data).forEach(key => {
        const value = data[key];
        if (typeof value === 'string' && value.length > 50) {
          console.log(`      ${key}: "${value.substring(0, 50)}..." (${value.length} chars)`);
        } else {
          console.log(`      ${key}: ${JSON.stringify(value)}`);
        }
      });

      console.log(`   🔍 Campo específico 'entrega': ${data.entrega ? '✅ PRESENTE' : '❌ AUSENTE'}`);
      console.log(`   🔍 Campo específico 'contenido': ${data.contenido ? '✅ PRESENTE' : '❌ AUSENTE'}`);

      if (data.entrega) {
        console.log(`   📝 Contenido completo de 'entrega':`);
        console.log(`      "${data.entrega}"`);
      }

      console.log('   ──────────────────────────────────────\n');
    }

    // También verificar si hay actividades relacionadas
    console.log('🏫 Verificando actividades relacionadas...\n');
    const activitiesRef = collection(db, 'activities');
    const activitiesSnapshot = await getDocs(activitiesRef);

    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📚 Actividad ID: ${doc.id} - Título: ${data.titulo || 'Sin título'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEntregasDetailed();