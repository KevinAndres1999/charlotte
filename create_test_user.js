// Script para crear usuario de prueba en Firestore
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

async function createTestUser() {
    try {
        console.log('Creando usuario de prueba...');

        const testUser = {
            name: 'Estudiante de Prueba',
            email: 'estudiante@charlotte.edu',
            password: '123456',
            role: 'student',
            programa: 'panaderia',
            sede: 'Bogotá',
            cedula: '1234567890',
            telefono: '+57 300 123 4567'
        };

        await addDoc(collection(db, 'users'), testUser);
        console.log('Usuario de prueba creado exitosamente:', testUser.email);
        console.log('Credenciales:');
        console.log('Email: estudiante@charlotte.edu');
        console.log('Password: 123456');

    } catch (error) {
        console.error('Error creando usuario de prueba:', error);
    }
}

createTestUser();