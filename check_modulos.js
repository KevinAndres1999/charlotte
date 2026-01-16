const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function checkModulos() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const modulosSnapshot = await getDocs(collection(db, 'modulos'));
  console.log('Módulos disponibles:');
  modulosSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}, Nombre: ${data.nombre}, Programa: ${data.programa}`);
  });
}

checkModulos();