const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function checkBellezaEvaluations() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const evaluacionesSnapshot = await getDocs(collection(db, 'evaluaciones'));
  console.log('Evaluaciones para belleza:');
  evaluacionesSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.programa === 'belleza' || data.programa === 'Belleza') {
      console.log(`ID: ${doc.id}, Título: ${data.titulo}, Programa: ${data.programa}, Módulo: ${data.modulo}`);
    }
  });

  console.log('Script completado');
}

checkBellezaEvaluations();