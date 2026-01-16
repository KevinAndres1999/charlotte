const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC8rZ3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

async function exportCalificaciones() {
  try {
    console.log('🔄 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('📊 Exportando calificaciones de módulos...');
    const calificacionesSnapshot = await getDocs(collection(db, 'calificaciones_modulos'));

    console.log(`📋 Encontradas ${calificacionesSnapshot.size} calificaciones:`);

    const calificaciones = [];
    calificacionesSnapshot.forEach(doc => {
      const data = doc.data();
      calificaciones.push({
        id: doc.id,
        estudianteId: data.estudianteId,
        modulo: data.modulo,
        actividades: data.actividades || 0,
        evaluaciones: data.evaluaciones || 0,
        practica: data.practica || 0,
        fechaActualizacion: data.fechaActualizacion
      });
    });

    // Mostrar resumen
    console.log('\n📈 Resumen de calificaciones por estudiante:');
    const porEstudiante = {};
    calificaciones.forEach(calif => {
      if (!porEstudiante[calif.estudianteId]) {
        porEstudiante[calif.estudianteId] = {};
      }
      porEstudiante[calif.estudianteId][calif.modulo] = {
        actividades: calif.actividades,
        evaluaciones: calif.evaluaciones,
        practica: calif.practica
      };
    });

    Object.keys(porEstudiante).forEach(estudianteId => {
      console.log(`\n👤 Estudiante: ${estudianteId}`);
      Object.keys(porEstudiante[estudianteId]).forEach(modulo => {
        const data = porEstudiante[estudianteId][modulo];
        console.log(`  📚 ${modulo}: Act=${data.actividades}, Eval=${data.evaluaciones}, Pract=${data.practica}`);
      });
    });

    // Exportar a JSON
    const fs = require('fs');
    fs.writeFileSync('calificaciones_export.json', JSON.stringify(calificaciones, null, 2));
    console.log('\n💾 Calificaciones exportadas a calificaciones_export.json');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

exportCalificaciones();