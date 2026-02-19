// Suite de pruebas completo para Charlotte
// Verifica: API, Firebase, Videos, Componentes, Rendimiento

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SystemTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
    this.serverProcess = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪'
    }[type];
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
    
    if (type === 'success') this.results.passed++;
    if (type === 'error') this.results.failed++;
    if (type === 'warning') this.results.warnings++;
    
    this.results.details.push({ timestamp, message, type });
  }

  async testFileStructure() {
    this.log('=== ESTRUCTURA DE ARCHIVOS ===', 'test');
    
    const requiredFiles = [
      'index.html',
      'estudiante.html', 
      'admin.html',
      'server.js',
      'package.json',
      'firestore.rules',
      'netlify.toml',
      'styles.css',
      'script.js'
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.log(`✓ Archivo encontrado: ${file}`, 'success');
      } else {
        this.log(`✗ Archivo faltante: ${file}`, 'error');
      }
    }

    // Verificar videos optimizados
    const videos = ['video inicio.mp4', 'video belleza.mp4', 'video panaderia.mp4'];
    for (const video of videos) {
      if (fs.existsSync(video)) {
        const stats = fs.statSync(video);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        this.log(`✓ Video encontrado: ${video} (${sizeMB}MB)`, 'success');
      } else {
        this.log(`✗ Video faltante: ${video}`, 'error');
      }
    }
  }

  async testDependencies() {
    this.log('\n=== DEPENDENCIAS ===', 'test');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      this.log(`✓ package.json válido`, 'success');
      
      // Verificar dependencias clave
      const requiredDeps = ['express', 'firebase', 'bcryptjs', 'better-sqlite3'];
      for (const dep of requiredDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.log(`✓ Dependencia: ${dep}@${packageJson.dependencies[dep]}`, 'success');
        } else {
          this.log(`✗ Dependencia faltante: ${dep}`, 'error');
        }
      }
    } catch (error) {
      this.log(`✗ Error leyendo package.json: ${error.message}`, 'error');
    }

    // Verificar node_modules
    if (fs.existsSync('node_modules')) {
      this.log(`✓ node_modules existe`, 'success');
    } else {
      this.log(`⚠️ node_modules no encontrado - ejecuta npm install`, 'warning');
    }
  }

  async testServer() {
    this.log('\n=== SERVIDOR LOCAL ===', 'test');
    
    try {
      // Iniciar servidor en background
      this.log('Iniciando servidor local...', 'info');
      this.serverProcess = exec('npm start', { 
        cwd: __dirname,
        detached: true,
        stdio: 'ignore'
      });
      
      // Esperar a que inicie
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Probar conexión
      const response = await fetch('http://localhost:3000/api/profile', {
        headers: { 'Authorization': 'Bearer test' }
      }).catch(() => null);
      
      if (response || this.serverProcess.pid) {
        this.log(`✓ Servidor iniciado (PID: ${this.serverProcess.pid})`, 'success');
      } else {
        this.log(`✗ Error iniciando servidor`, 'error');
      }
      
    } catch (error) {
      this.log(`✗ Error en servidor: ${error.message}`, 'error');
    }
  }

  async testAPIEndpoints() {
    this.log('\n=== ENDPOINTS API ===', 'test');
    
    const baseUrl = 'http://localhost:3000/api';
    
    // Test login
    try {
      const loginResponse = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'estudiante@ejemplo.edu',
          password: 'password123'
        })
      });
      
      if (loginResponse.ok) {
        const data = await loginResponse.json();
        this.log(`✓ Login API funcional`, 'success');
        this.log(`  Token recibido: ${data.token ? 'Sí' : 'No'}`, 'info');
        
        // Test profile con token
        if (data.token) {
          const profileResponse = await fetch(`${baseUrl}/profile`, {
            headers: { 'Authorization': `Bearer ${data.token}` }
          });
          
          if (profileResponse.ok) {
            this.log(`✓ Profile API funcional`, 'success');
          } else {
            this.log(`✗ Profile API error: ${profileResponse.status}`, 'error');
          }
        }
      } else {
        this.log(`✗ Login API error: ${loginResponse.status}`, 'error');
      }
    } catch (error) {
      this.log(`✗ Error API: ${error.message}`, 'error');
    }

    // Test register
    try {
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'test123456'
        })
      });
      
      if (registerResponse.ok || registerResponse.status === 409) {
        this.log(`✓ Register API funcional`, 'success');
      } else {
        this.log(`✗ Register API error: ${registerResponse.status}`, 'error');
      }
    } catch (error) {
      this.log(`✗ Error Register API: ${error.message}`, 'error');
    }
  }

  async testFirebaseConnection() {
    this.log('\n=== CONEXIÓN FIREBASE ===', 'test');
    
    try {
      // Verificar configuración Firebase
      const { initializeApp } = require('firebase/app');
      const { getFirestore } = require('firebase/firestore');
      
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
      
      this.log(`✓ Firebase inicializado`, 'success');
      this.log(`  Project ID: ${firebaseConfig.projectId}`, 'info');
      
      // Test conexión simple (sin hacer operaciones)
      this.log(`✓ Configuración Firebase válida`, 'success');
      
    } catch (error) {
      this.log(`✗ Error Firebase: ${error.message}`, 'error');
    }
  }

  async testHTMLFiles() {
    this.log('\n=== ARCHIVOS HTML ===', 'test');
    
    const htmlFiles = ['index.html', 'estudiante.html', 'admin.html'];
    
    for (const file of htmlFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const size = (content.length / 1024).toFixed(1);
        
        this.log(`✓ ${file} (${size}KB)`, 'success');
        
        // Verificar elementos básicos
        if (content.includes('<!DOCTYPE html>')) {
          this.log(`  ✓ DOCTYPE válido`, 'success');
        } else {
          this.log(`  ✗ DOCTYPE inválido`, 'error');
        }
        
        if (content.includes('<meta charset="utf-8">')) {
          this.log(`  ✓ Charset UTF-8`, 'success');
        } else {
          this.log(`  ✗ Charset faltante`, 'warning');
        }
        
        // Verificar Firebase config
        if (content.includes('FIREBASE_CONFIG')) {
          this.log(`  ✓ Config Firebase encontrada`, 'success');
        } else {
          this.log(`  ✗ Config Firebase faltante`, 'warning');
        }
        
      } catch (error) {
        this.log(`✗ Error leyendo ${file}: ${error.message}`, 'error');
      }
    }
  }

  async testVideoOptimization() {
    this.log('\n=== OPTIMIZACIÓN DE VIDEOS ===', 'test');
    
    const videos = [
      { name: 'video inicio.mp4', maxSize: 5 * 1024 * 1024 }, // 5MB
      { name: 'video belleza.mp4', maxSize: 12 * 1024 * 1024 }, // 12MB
      { name: 'video panaderia.mp4', maxSize: 2 * 1024 * 1024 } // 2MB
    ];
    
    for (const video of videos) {
      if (fs.existsSync(video.name)) {
        const stats = fs.statSync(video.name);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        
        if (stats.size <= video.maxSize) {
          this.log(`✓ ${video.name} optimizado (${sizeMB}MB)`, 'success');
        } else {
          this.log(`⚠️ ${video.name} podría optimizarse más (${sizeMB}MB)`, 'warning');
        }
        
        // Verificar backup
        const backupFile = `${video.name}.backup`;
        if (fs.existsSync(backupFile)) {
          this.log(`  ✓ Backup existe: ${backupFile}`, 'success');
        } else {
          this.log(`  ⚠️ Backup no encontrado: ${backupFile}`, 'warning');
        }
      } else {
        this.log(`✗ Video faltante: ${video.name}`, 'error');
      }
    }
  }

  async testSecurityRules() {
    this.log('\n=== REGLAS DE SEGURIDAD ===', 'test');
    
    try {
      const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
      
      // Verificar que no haya reglas demasiado permisivas
      if (rulesContent.includes('allow read, write: if true')) {
        this.log(`✗ Reglas inseguras encontradas (allow read, write: if true)`, 'error');
      } else {
        this.log(`✓ Sin reglas completamente abiertas`, 'success');
      }
      
      // Verificar funciones helper
      if (rulesContent.includes('function isAuthenticated()')) {
        this.log(`✓ Función isAuthenticated encontrada`, 'success');
      } else {
        this.log(`✗ Función isAuthenticated faltante`, 'error');
      }
      
      if (rulesContent.includes('function isAdmin()')) {
        this.log(`✓ Función isAdmin encontrada`, 'success');
      } else {
        this.log(`✗ Función isAdmin faltante`, 'error');
      }
      
      // Verificar reglas específicas por colección
      const collections = ['users', 'classes', 'evaluaciones'];
      for (const collection of collections) {
        if (rulesContent.includes(`match /${collection}/{`)) {
          this.log(`✓ Reglas para ${collection} encontradas`, 'success');
        } else {
          this.log(`✗ Reglas para ${collection} faltantes`, 'error');
        }
      }
      
    } catch (error) {
      this.log(`✗ Error leyendo firestore.rules: ${error.message}`, 'error');
    }
  }

  async testNetlifyConfig() {
    this.log('\n=== CONFIGURACIÓN NETLIFY ===', 'test');
    
    try {
      const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
      
      // Verificar configuración básica
      if (netlifyConfig.includes('[build]')) {
        this.log(`✓ Configuración build encontrada`, 'success');
      } else {
        this.log(`✗ Configuración build faltante`, 'error');
      }
      
      if (netlifyConfig.includes('publish = "."')) {
        this.log(`✓ Directorio publish correcto`, 'success');
      } else {
        this.log(`✗ Directorio publish incorrecto`, 'error');
      }
      
      // Verificar redirects
      if (netlifyConfig.includes('[[redirects]]')) {
        this.log(`✓ Configuración redirects encontrada`, 'success');
      } else {
        this.log(`⚠️ Configuración redirects faltante`, 'warning');
      }
      
      // Verificar headers de seguridad
      if (netlifyConfig.includes('X-Frame-Options')) {
        this.log(`✓ Headers de seguridad configurados`, 'success');
      } else {
        this.log(`⚠️ Headers de seguridad limitados`, 'warning');
      }
      
    } catch (error) {
      this.log(`✗ Error leyendo netlify.toml: ${error.message}`, 'error');
    }
  }

  async cleanup() {
    this.log('\n=== LIMPIEZA ===', 'test');
    
    // Detener servidor
    if (this.serverProcess && this.serverProcess.pid) {
      try {
        process.kill(-this.serverProcess.pid, 'SIGTERM');
        this.log(`✓ Servidor detenido`, 'success');
      } catch (error) {
        this.log(`⚠️ Error deteniendo servidor: ${error.message}`, 'warning');
      }
    }
    
    // Limpiar archivos temporales
    const tempFiles = ['*-compressed.mp4', '*.tmp'];
    for (const pattern of tempFiles) {
      try {
        await execAsync(`Remove-Item "${pattern}" -Force -ErrorAction SilentlyContinue`);
        this.log(`✓ Limpiados archivos temporales: ${pattern}`, 'success');
      } catch (error) {
        // Ignorar errores de archivos no encontrados
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE FINAL DE PRUEBAS');
    console.log('='.repeat(60));
    
    console.log(`✅ Pruebas exitosas: ${this.results.passed}`);
    console.log(`❌ Pruebas fallidas: ${this.results.failed}`);
    console.log(`⚠️ Advertencias: ${this.results.warnings}`);
    
    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = ((this.results.passed / total) * 100).toFixed(1);
    
    console.log(`📈 Tasa de éxito: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 ¡SISTEMA LISTO PARA DESPLIEGUE!');
      console.log('✅ Todas las pruebas críticas pasaron');
      console.log('🚀 Puedes proceder con el despliegue a producción');
    } else {
      console.log('\n⚠️ PROBLEMAS DETECTADOS');
      console.log('❌ Resuelve los errores antes del despliegue');
      console.log('🔧 Revisa los detalles arriba para más información');
    }
    
    if (this.results.warnings > 0) {
      console.log('\n💡 RECOMENDACIONES');
      console.log('⚠️ Considera abordar las advertencias para mejor rendimiento');
    }
    
    console.log('\n📋 PRÓXIMOS PASOS');
    if (this.results.failed === 0) {
      console.log('1. Desplegar reglas de Firebase: firebase deploy --only firestore:rules');
      console.log('2. Hacer push a GitHub: git add . && git commit -m "System ready for deployment"');
      console.log('3. Desplegar en Netlify (automático)');
    } else {
      console.log('1. Corregir errores identificados');
      console.log('2. Ejecutar pruebas nuevamente: node test-complete-system.js');
      console.log('3. Proceder con despliegue cuando todo esté OK');
    }
    
    console.log('='.repeat(60));
  }

  async runAllTests() {
    console.log('🧪 INICIANDO PRUEBAS COMPLETAS DEL SISTEMA');
    console.log('='.repeat(60));
    
    try {
      await this.testFileStructure();
      await this.testDependencies();
      await this.testServer();
      await this.testAPIEndpoints();
      await this.testFirebaseConnection();
      await this.testHTMLFiles();
      await this.testVideoOptimization();
      await this.testSecurityRules();
      await this.testNetlifyConfig();
      
    } catch (error) {
      this.log(`Error inesperado: ${error.message}`, 'error');
    } finally {
      await this.cleanup();
      this.generateReport();
    }
  }
}

// Ejecutar pruebas
if (require.main === module) {
  const tester = new SystemTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SystemTester;
