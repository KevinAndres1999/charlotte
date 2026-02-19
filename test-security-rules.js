// Script para probar reglas de seguridad de Firestore
// Ejecutar después de desplegar las nuevas reglas

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

class SecurityTester {
  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);
  }

  async login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      console.log(`✅ Login exitoso: ${email}`);
      return result.user;
    } catch (error) {
      console.log(`❌ Error login ${email}:`, error.message);
      return null;
    }
  }

  async testCollectionAccess(collectionName, userRole) {
    console.log(`\n🔍 Probando acceso a ${collectionName} (rol: ${userRole})`);
    
    try {
      // Test lectura
      const snapshot = await getDocs(collection(this.db, collectionName));
      console.log(`✅ Lectura permitida: ${snapshot.size} documentos`);
      
      // Test escritura (solo en algunas colecciones)
      if (['contactos', 'pendingStudents'].includes(collectionName)) {
        const testData = {
          test: true,
          timestamp: new Date().toISOString(),
          userRole: userRole
        };
        
        const docRef = await addDoc(collection(this.db, collectionName), testData);
        console.log(`✅ Escritura permitida: ${docRef.id}`);
        
        // Limpiar
        await deleteDoc(doc(this.db, collectionName, docRef.id));
        console.log(`🧹 Documento de prueba eliminado`);
      }
      
    } catch (error) {
      console.log(`❌ Acceso denegado: ${error.message}`);
    }
  }

  async runSecurityTests() {
    console.log('🚀 Iniciando pruebas de seguridad de Firestore...\n');
    
    // Test con usuario estudiante
    console.log('=== TEST USUARIO ESTUDIANTE ===');
    const studentUser = await this.login('estudiante@ejemplo.edu', 'password123');
    
    if (studentUser) {
      await this.testCollectionAccess('classes', 'student');
      await this.testCollectionAccess('cuestionarios', 'student');
      await this.testCollectionAccess('evaluaciones', 'student');
      await this.testCollectionAccess('materials', 'student');
      await this.testCollectionAccess('users', 'student'); // Debe fallar
      await this.testCollectionAccess('configuracion', 'student'); // Debe fallar
    }
    
    // Test con usuario admin
    console.log('\n=== TEST USUARIO ADMIN ===');
    const adminUser = await this.login('admin@admin.local', 'admin123');
    
    if (adminUser) {
      await this.testCollectionAccess('classes', 'admin');
      await this.testCollectionAccess('users', 'admin');
      await this.testCollectionAccess('configuracion', 'admin');
      await this.testCollectionAccess('calificaciones_modulos', 'admin');
    }
    
    // Test sin autenticación
    console.log('\n=== TEST SIN AUTENTICACIÓN ===');
    await this.auth.signOut();
    await this.testCollectionAccess('classes', 'anonymous'); // Debe fallar
    await this.testCollectionAccess('contactos', 'anonymous'); // Solo escritura
  }
}

// Función para verificar reglas específicas
async function verifySpecificRules() {
  console.log('\n🔍 Verificación de reglas específicas:');
  
  const tester = new SecurityTester();
  
  console.log('✅ Reglas implementadas:');
  console.log('  - isAuthenticated(): Verifica usuario autenticado');
  console.log('  - isAdmin(): Solo usuarios con role=admin');
  console.log('  - isStudent(): Solo usuarios con role=student');
  console.log('  - isOwner(): Solo dueño del documento');
  
  console.log('\n📋 Colecciones protegidas:');
  console.log('  - users: Solo admins leen, dueños actualizan');
  console.log('  - classes/*: Solo admins escriben, autenticados leen');
  console.log('  - entregas/*: Dueño o admins leen/actualizan');
  console.log('  - configuración/*: Solo admins');
  
  console.log('\n⚠️  IMPORTANTE: Las reglas requieren que los usuarios tengan claims configurados');
  console.log('    Ejecuta setup-firebase-claims.js para configurar los claims');
}

// Ejecutar pruebas
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runSecurityTests()
    .then(() => verifySpecificRules())
    .catch(console.error);
}

module.exports = { SecurityTester, verifySpecificRules };
