// Script para crear usuario de prueba para belleza
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

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

async function createBellezaUser() {
    try {
        console.log('Creando usuario de prueba para belleza...');

        const testUser = {
            name: 'Estudiante Belleza',
            email: 'estudiantebelleza@charlotte.edu',
            password: '123456',
            role: 'student',
            programa: 'belleza',
            sede: 'Bogotá',
            cedula: '9876543210',
            telefono: '+57 300 987 6543'
        };

        await addDoc(collection(db, 'users'), testUser);
        console.log('Usuario de belleza creado exitosamente:', testUser.email);
        console.log('Credenciales:');
        console.log('Email: estudiantebelleza@charlotte.edu');
        console.log('Password: 123456');

    } catch (error) {
        console.error('Error creando usuario de belleza:', error);
    }
}

createBellezaUser();