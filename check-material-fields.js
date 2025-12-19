const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function checkMaterialFields() {
  try {
    console.log('🔍 Verificando campos de materiales en Firebase...');

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const materialesQuery = collection(db, 'materials');
    const materialesSnapshot = await getDocs(materialesQuery);

    console.log(`📊 Encontrados ${materialesSnapshot.size} materiales`);

    for (const docSnap of materialesSnapshot.docs) {
      const material = docSnap.data();
      const materialId = docSnap.id;

      console.log(`\n📄 Material: ${materialId}`);
      console.log(`   Título: ${material.titulo || 'N/A'}`);
      console.log(`   Tipo: ${material.tipo || 'N/A'}`);
      console.log(`   Programa: ${material.programa || 'N/A'}`);

      // Verificar diferentes posibles campos de URL
      const possibleFields = ['url', 'pdfData', 'pdfUrl', 'fileUrl', 'link'];

      for (const field of possibleFields) {
        if (material[field]) {
          console.log(`   ✅ ${field}: ${material[field]}`);
        }
      }

      // Si tiene pdfData pero no url, corregir
      if (material.pdfData && !material.url) {
        console.log(`   🔧 Corrigiendo: moviendo pdfData a url`);

        await updateDoc(doc(db, 'materials', materialId), {
          url: material.pdfData,
          urlMigrated: true,
          urlMigratedDate: new Date().toISOString()
        });

        console.log(`   ✅ Corregido: pdfData → url`);
      }

      // Si no tiene ningún campo de URL
      const hasAnyUrlField = possibleFields.some(field => material[field]);
      if (!hasAnyUrlField) {
        console.log(`   ⚠️ No tiene ningún campo de URL configurado`);
      }
    }

  } catch (error) {
    console.error('❌ Error al verificar campos:', error);
  }
}

// Ejecutar la verificación
checkMaterialFields().then(() => {
  console.log('\n🎉 Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});