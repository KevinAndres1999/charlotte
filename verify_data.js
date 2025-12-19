// Script para verificar datos en Firestore
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

async function checkData() {
    try {
        console.log('Verificando datos en Firestore...');

        // Verificar usuario
        const usersQuery = query(collection(db, 'users'), where('email', '==', 'estudiante@charlotte.edu'));
        const usersSnapshot = await getDocs(usersQuery);
        console.log('Usuarios encontrados:', usersSnapshot.size);
        if (!usersSnapshot.empty) {
            const user = usersSnapshot.docs[0].data();
            console.log('Usuario:', user.name, 'Programa:', user.programa);
        }

        // Verificar clases
        const clasesQuery = query(collection(db, 'classes'), where('programa', '==', 'panaderia'));
        const clasesSnapshot = await getDocs(clasesQuery);
        console.log('Clases para panaderia:', clasesSnapshot.size);

        // Verificar videos
        const videosQuery = query(collection(db, 'content'), where('programa', '==', 'panaderia'));
        const videosSnapshot = await getDocs(videosQuery);
        console.log('Videos para panaderia:', videosSnapshot.size);

        // Verificar actividades
        const actividadesQuery = query(collection(db, 'activities'), where('programa', '==', 'panaderia'));
        const actividadesSnapshot = await getDocs(actividadesQuery);
        console.log('Actividades para panaderia:', actividadesSnapshot.size);

        // Verificar materiales
        const materialesQuery = query(collection(db, 'materials'), where('programa', '==', 'panaderia'));
        const materialesSnapshot = await getDocs(materialesQuery);
        console.log('Materiales para panaderia:', materialesSnapshot.size);

        // Verificar cuestionarios
        const cuestionariosQuery = query(collection(db, 'cuestionarios'), where('programa', '==', 'panaderia'));
        const cuestionariosSnapshot = await getDocs(cuestionariosQuery);
        console.log('Cuestionarios para panaderia:', cuestionariosSnapshot.size);

        // Verificar evaluaciones
        const evaluacionesQuery = query(collection(db, 'evaluaciones'), where('programa', '==', 'panaderia'));
        const evaluacionesSnapshot = await getDocs(evaluacionesQuery);
        console.log('Evaluaciones para panaderia:', evaluacionesSnapshot.size);

    } catch (error) {
        console.error('Error verificando datos:', error);
    }
}

checkData();