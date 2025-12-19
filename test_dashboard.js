// Script para probar las funciones de carga de datos
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

// Simular sessionStorage
global.sessionStorage = {
    getItem: (key) => {
        if (key === 'currentUser') {
            return JSON.stringify({
                uid: 'estudiante@charlotte.edu',
                email: 'estudiante@charlotte.edu',
                role: 'student',
                name: 'Estudiante de Prueba',
                programa: 'panaderia',
                sede: 'Bogotá',
                cedula: '1234567890',
                telefono: '+57 300 123 4567'
            });
        }
        return null;
    }
};

// Simular document
global.document = {
    getElementById: (id) => ({
        textContent: 0,
        style: {}
    })
};

async function testLoadDashboardStats() {
    console.log('Testing loadDashboardStats...');

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        console.log('No current user found');
        return;
    }

    console.log('Loading dashboard stats for user:', currentUser.name, 'programa:', currentUser.programa);

    try {
        if (!currentUser.programa) {
            console.log('User has no programa assigned');
            return;
        }

        // Contar clases
        const clasesQuery = query(collection(db, 'classes'), where('programa', '==', currentUser.programa));
        const clasesSnapshot = await getDocs(clasesQuery);
        console.log('Clases found:', clasesSnapshot.size);

        // Contar videos
        const videosQuery = query(collection(db, 'content'), where('programa', '==', currentUser.programa));
        const videosSnapshot = await getDocs(videosQuery);
        console.log('Videos found:', videosSnapshot.size);

        // Contar actividades
        const actividadesQuery = query(collection(db, 'activities'), where('programa', '==', currentUser.programa));
        const actividadesSnapshot = await getDocs(actividadesQuery);
        console.log('Actividades found:', actividadesSnapshot.size);

        // Contar materiales
        const materialesQuery = query(collection(db, 'materials'), where('programa', '==', currentUser.programa));
        const materialesSnapshot = await getDocs(materialesQuery);
        console.log('Materiales found:', materialesSnapshot.size);

        // Contar cuestionarios
        const cuestionariosQuery = query(collection(db, 'cuestionarios'), where('programa', '==', currentUser.programa));
        const cuestionariosSnapshot = await getDocs(cuestionariosQuery);
        console.log('Cuestionarios found:', cuestionariosSnapshot.size);

        // Contar evaluaciones
        const evaluacionesQuery = query(collection(db, 'evaluaciones'), where('programa', '==', currentUser.programa));
        const evaluacionesSnapshot = await getDocs(evaluacionesQuery);
        console.log('Evaluaciones found:', evaluacionesSnapshot.size);

        console.log('Test completed successfully!');

    } catch (error) {
        console.error('Error in test:', error);
    }
}

testLoadDashboardStats();