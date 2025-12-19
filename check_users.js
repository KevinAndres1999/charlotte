// Verificar usuarios
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUsers() {
    try {
        console.log('Verificando usuarios...');

        const usersSnapshot = await getDocs(collection(db, 'users'));

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            console.log('Usuario:', user.email, '- Programa:', user.programa);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();