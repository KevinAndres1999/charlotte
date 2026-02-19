// Script para crear usuarios de prueba en Firebase Auth
// Usa el cliente SDK para crear usuarios básicos

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function createTestUsers() {
  console.log('👥 Creando usuarios de prueba en Firebase Auth...');
  
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    const testUsers = [
      {
        email: 'estudiante@ejemplo.edu',
        password: 'password123',
        displayName: 'Estudiante Demo'
      },
      {
        email: 'admin@admin.local',
        password: 'admin123',
        displayName: 'Administrador'
      }
    ];
    
    for (const user of testUsers) {
      try {
        console.log(`\n👤 Creando usuario: ${user.email}`);
        
        const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
        console.log(`✅ Usuario creado: ${userCredential.user.uid}`);
        
        // Hacer logout para el siguiente usuario
        await auth.signOut();
        
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`ℹ️ Usuario ya existe: ${user.email}`);
          
          // Verificar que podemos hacer login
          try {
            await signInWithEmailAndPassword(auth, user.email, user.password);
            console.log(`✅ Login verificado: ${user.email}`);
            await auth.signOut();
          } catch (loginError) {
            console.log(`❌ Error login ${user.email}:`, loginError.message);
          }
        } else {
          console.log(`❌ Error creando ${user.email}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Usuarios de prueba configurados!');
    console.log('📋 Credenciales:');
    console.log('   Estudiante: estudiante@ejemplo.edu / password123');
    console.log('   Admin: admin@admin.local / admin123');
    console.log('\n🌐 Ahora puedes probar el login en: https://cursoscharlotte.com');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

if (require.main === module) {
  createTestUsers();
}

module.exports = createTestUsers;
