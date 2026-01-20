const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function checkActivities() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Obteniendo actividades...');
    const activitiesRef = collection(db, 'activities');
    const activitiesSnapshot = await getDocs(activitiesRef);

    console.log(`\n=== ACTIVIDADES ENCONTRADAS (${activitiesSnapshot.size}) ===\n`);

    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Título: ${data.titulo || 'Sin título'}`);
      console.log(`Programa: ${data.programa || 'Sin programa'}`);
      console.log(`Módulo: ${data.modulo || 'Sin módulo'}`);
      console.log(`Instrucciones: ${data.instrucciones ? data.instrucciones.substring(0, 100) + '...' : 'Sin instrucciones'}`);
      console.log(`Fecha: ${data.fechaRegistro || 'Sin fecha'}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkActivities();