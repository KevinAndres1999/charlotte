// Script para configurar claims de usuarios en Firebase Auth
// Necesita Firebase Admin SDK - ejecutar en entorno seguro

const admin = require('firebase-admin');

// Configuración del service account (necesitas descargar este archivo)
const serviceAccount = require('./charlotte-service-account.json');

async function setupUserClaims() {
  try {
    console.log('🔧 Configurando Firebase Admin SDK...');
    
    // Inicializar Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'charlotte-a0d47'
    });
    
    const auth = admin.auth();
    console.log('✅ Firebase Admin inicializado');
    
    // Lista de usuarios y sus roles
    const users = [
      { email: 'estudiante@ejemplo.edu', role: 'student', displayName: 'Estudiante Demo' },
      { email: 'admin@admin.local', role: 'admin', displayName: 'Administrador' }
    ];
    
    for (const user of users) {
      try {
        console.log(`👤 Procesando usuario: ${user.email}`);
        
        // Buscar usuario por email
        const userRecord = await auth.getUserByEmail(user.email);
        console.log(`✅ Usuario encontrado: ${userRecord.uid}`);
        
        // Establecer custom claims
        await auth.setCustomUserClaims(userRecord.uid, { 
          role: user.role,
          displayName: user.displayName
        });
        
        console.log(`✅ Claim establecido: role=${user.role} para ${user.email}`);
        
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`⚠️ Usuario no encontrado en Firebase Auth: ${user.email}`);
          console.log(`💡 Creando usuario en Firebase Auth...`);
          
          // Crear usuario si no existe
          const newUser = await auth.createUser({
            email: user.email,
            password: user.email === 'admin@admin.local' ? 'admin123' : 'password123',
            displayName: user.displayName
          });
          
          // Establecer claims
          await auth.setCustomUserClaims(newUser.uid, { 
            role: user.role,
            displayName: user.displayName
          });
          
          console.log(`✅ Usuario creado y claim establecido: ${user.email}`);
        } else {
          console.log(`❌ Error con ${user.email}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Claims configurados exitosamente!');
    console.log('🔄 Los usuarios deberían poder hacer login ahora');
    
  } catch (error) {
    console.error('❌ Error general:', error);
    console.log('\n💡 Soluciones posibles:');
    console.log('1. Descarga la clave de servicio de Firebase Console');
    console.log('2. Nombra el archivo: charlotte-service-account.json');
    console.log('3. Instala firebase-admin: npm install firebase-admin');
    console.log('4. Ejecuta este script nuevamente');
  }
}

// Verificar claims después de configurar
async function verifyClaims() {
  try {
    const admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      const serviceAccount = require('./charlotte-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'charlotte-a0d47'
      });
    }
    
    const auth = admin.auth();
    
    console.log('\n🔍 Verificando claims configurados...');
    
    const users = ['estudiante@ejemplo.edu', 'admin@admin.local'];
    
    for (const email of users) {
      try {
        const userRecord = await auth.getUserByEmail(email);
        const claims = userRecord.customClaims;
        
        console.log(`👤 ${email}:`);
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Role: ${claims?.role || 'NO CONFIGURADO'}`);
        console.log(`   Claims: ${JSON.stringify(claims, null, 2)}`);
        
      } catch (error) {
        console.log(`❌ Error verificando ${email}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error verificando claims:', error.message);
  }
}

// Crear usuario de prueba si no existe
async function createTestUsers() {
  try {
    const { initializeApp } = require('firebase/app');
    const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
    
    const firebaseConfig = {
      apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
      authDomain: "charlotte-a0d47.firebaseapp.com",
      projectId: "charlotte-a0d47",
      storageBucket: "charlotte-a0d47.firebasestorage.app",
      messagingSenderId: "971007838036",
      appId: "1:971007838036:web:381b5c516ba841fef12ac1"
    };
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    console.log('\n👥 Creando usuarios de prueba en Firebase Auth...');
    
    try {
      await createUserWithEmailAndPassword(auth, 'estudiante@ejemplo.edu', 'password123');
      console.log('✅ Usuario estudiante creado');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Usuario estudiante ya existe');
      } else {
        console.log('❌ Error creando estudiante:', error.message);
      }
    }
    
    try {
      await createUserWithEmailAndPassword(auth, 'admin@admin.local', 'admin123');
      console.log('✅ Usuario admin creado');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Usuario admin ya existe');
      } else {
        console.log('❌ Error creando admin:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error.message);
  }
}

// Ejecutar según parámetro
const command = process.argv[2];

if (command === 'verify') {
  verifyClaims();
} else if (command === 'create') {
  createTestUsers();
} else {
  setupUserClaims().then(() => verifyClaims());
}

module.exports = { setupUserClaims, verifyClaims, createTestUsers };
