// Script para verificar datos de belleza
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkBellezaData() {
    try {
        console.log('Verificando datos para programa "belleza"...');

        // Verificar clases
        const clasesQuery = query(collection(db, 'classes'), where('programa', '==', 'belleza'));
        const clasesSnapshot = await getDocs(clasesQuery);
        console.log('Clases para belleza:', clasesSnapshot.size);

        // Verificar videos
        const videosQuery = query(collection(db, 'content'), where('programa', '==', 'belleza'));
        const videosSnapshot = await getDocs(videosQuery);
        console.log('Videos para belleza:', videosSnapshot.size);

        // Verificar actividades
        const actividadesQuery = query(collection(db, 'activities'), where('programa', '==', 'belleza'));
        const actividadesSnapshot = await getDocs(actividadesQuery);
        console.log('Actividades para belleza:', actividadesSnapshot.size);

        // Verificar materiales
        const materialesQuery = query(collection(db, 'materials'), where('programa', '==', 'belleza'));
        const materialesSnapshot = await getDocs(materialesQuery);
        console.log('Materiales para belleza:', materialesSnapshot.size);

        // Verificar cuestionarios
        const cuestionariosQuery = query(collection(db, 'cuestionarios'), where('programa', '==', 'belleza'));
        const cuestionariosSnapshot = await getDocs(cuestionariosQuery);
        console.log('Cuestionarios para belleza:', cuestionariosSnapshot.size);

        // Verificar evaluaciones
        const evaluacionesQuery = query(collection(db, 'evaluaciones'), where('programa', '==', 'belleza'));
        const evaluacionesSnapshot = await getDocs(evaluacionesQuery);
        console.log('Evaluaciones para belleza:', evaluacionesSnapshot.size);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkBellezaData();