// Crear usuarios en la colección users de Firestore
// El sistema de login usa Firestore, no Firebase Auth

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function createFirestoreUsers() {
  console.log('👥 Creando usuarios en Firestore...');
  
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase inicializado');
    
    const users = [
      {
        email: 'estudiante@ejemplo.edu',
        password: 'password123', // En producción, usar hashes
        name: 'Estudiante Demo',
        role: 'student',
        programa: 'panaderia',
        sede: 'principal',
        horario: 'mañana',
        cedula: '12345678',
        telefono: '3001234567',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        email: 'admin@admin.local',
        password: 'admin123', // En producción, usar hashes
        name: 'Administrador',
        role: 'admin',
        programa: 'todos',
        sede: 'principal',
        horario: 'completo',
        cedula: '87654321',
        telefono: '3009876543',
        active: true,
        createdAt: new Date().toISOString()
      }
    ];
    
    for (const user of users) {
      try {
        console.log(`\n👤 Creando/actualizando usuario: ${user.email}`);
        
        // Verificar si ya existe
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log(`ℹ️ Usuario ya existe: ${user.email}`);
          querySnapshot.forEach((doc) => {
            console.log(`   ID: ${doc.id}`);
            console.log(`   Rol: ${doc.data().role}`);
          });
        } else {
          // Crear nuevo usuario
          const userRef = doc(collection(db, 'users'));
          await setDoc(userRef, user);
          console.log(`✅ Usuario creado: ${user.email}`);
          console.log(`   ID: ${userRef.id}`);
          console.log(`   Rol: ${user.role}`);
        }
        
      } catch (error) {
        console.log(`❌ Error con ${user.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 Usuarios configurados en Firestore!');
    console.log('📋 Credenciales para login:');
    console.log('   Estudiante: estudiante@ejemplo.edu / password123');
    console.log('   Admin: admin@admin.local / admin123');
    console.log('\n🌐 Prueba el login en: https://cursoscharlotte.com/login.html');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.log('\n💡 Soluciones posibles:');
    console.log('1. Verifica la configuración de Firebase');
    console.log('2. Revisa las reglas de seguridad de Firestore');
    console.log('3. Asegúrate de tener permisos de escritura');
  }
}

async function verifyUsers() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('\n🔍 Verificando usuarios en Firestore...');
    
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`📊 Total usuarios encontrados: ${usersSnapshot.size}`);
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n👤 ${data.email}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Nombre: ${data.name}`);
      console.log(`   Rol: ${data.role}`);
      console.log(`   Activo: ${data.active ? 'Sí' : 'No'}`);
    });
    
  } catch (error) {
    console.error('❌ Error verificando usuarios:', error.message);
  }
}

// Ejecutar según parámetro
const command = process.argv[2];

if (command === 'verify') {
  verifyUsers();
} else {
  createFirestoreUsers().then(() => verifyUsers());
}

module.exports = { createFirestoreUsers, verifyUsers };
