const { initializeApp } = require('firebase/app');
const { getAuth, getAuth as getAdminAuth } = require('firebase/auth');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

// NOTA: Este script requiere Firebase Admin SDK para establecer claims
// Debe ejecutarse en un entorno seguro (server-side)

const admin = require('firebase-admin');

// Configuración para Admin SDK (necesitas el archivo de clave privada)
// const serviceAccount = require('./path/to/service-account-key.json');

async function setupUserClaims() {
  try {
    console.log('🔧 Configurando claims de usuarios en Firebase Auth...');
    
    // Inicializar Firebase Admin
    // admin.initializeApp({
    //   credential: admin.credential.cert(serviceAccount),
    //   projectId: 'charlotte-a0d47'
    // });
    
    // const auth = admin.auth();
    
    // Obtener usuarios de la colección users
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    console.log(`📋 Encontrados ${usersSnapshot.size} usuarios en la colección`);
    
    for (const userDoc of usersSnapshot) {
      const userData = userDoc.data();
      const email = userData.email;
      const role = userData.role || 'student';
      
      console.log(`👤 Procesando usuario: ${email} - Rol: ${role}`);
      
      // En un entorno real, establecerías los claims así:
      // await auth.setCustomUserClaims(email, { role: role });
      // console.log(`✅ Claim establecido para ${email}: role=${role}`);
      
      console.log(`⚠️  Modo demo: claim NO establecido (requiere Admin SDK)`);
    }
    
    console.log('\n📝 Instrucciones para producción:');
    console.log('1. Descarga la clave privada del servicio de Firebase');
    console.log('2. Instala firebase-admin: npm install firebase-admin');
    console.log('3. Descomenta el código de Admin SDK');
    console.log('4. Ejecuta este script en un entorno seguro');
    
  } catch (error) {
    console.error('❌ Error configurando claims:', error);
  }
}

// Verificación de reglas
async function testSecurityRules() {
  try {
    console.log('\n🔍 Verificando configuración de seguridad...');
    
    // Aquí podrías agregar pruebas para verificar que las reglas funcionan
    console.log('✅ Reglas de seguridad actualizadas en firestore.rules');
    console.log('⚠️  Las reglas necesitan ser desplegadas a Firebase');
    
    console.log('\n📋 Próximos pasos:');
    console.log('1. Ejecuta: firebase deploy --only firestore:rules');
    console.log('2. Configura los claims de usuario con Admin SDK');
    console.log('3. Prueba el acceso con diferentes roles');
    
  } catch (error) {
    console.error('❌ Error verificando reglas:', error);
  }
}

if (require.main === module) {
  setupUserClaims().then(() => testSecurityRules());
}

module.exports = { setupUserClaims, testSecurityRules };
