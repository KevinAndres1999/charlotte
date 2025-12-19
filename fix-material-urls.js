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

function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  url = url.trim();

  if (url === '') {
    return false;
  }

  // Check if it's a relative URL
  if (url.startsWith('/')) {
    return true;
  }

  // Check if it's a protocol-relative URL
  if (url.startsWith('//')) {
    return true;
  }

  try {
    const urlObj = new URL(url);
    return ['http:', 'https:', 'ftp:', 'mailto:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

async function validateAndFixMaterialUrls() {
  try {
    console.log('🔍 Iniciando validación de URLs de materiales...');

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const materialesQuery = collection(db, 'materials');
    const materialesSnapshot = await getDocs(materialesQuery);

    let fixedCount = 0;
    let invalidCount = 0;
    let totalCount = 0;

    console.log(`📊 Procesando ${materialesSnapshot.size} materiales...`);

    for (const docSnap of materialesSnapshot.docs) {
      const material = docSnap.data();
      const materialId = docSnap.id;
      totalCount++;

      console.log(`🔍 Verificando material ${totalCount}/${materialesSnapshot.size}: ${materialId}`);

      if (material.url) {
        const isValid = isValidUrl(material.url);

        if (!isValid) {
          console.log(`❌ URL inválida: ${material.url}`);

          // Intentar corregir URLs comunes
          let fixedUrl = material.url.trim();

          // Agregar protocolo si falta
          if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://') && !fixedUrl.startsWith('//')) {
            // Si parece una URL de Google Drive o similar
            if (fixedUrl.includes('drive.google.com') ||
                fixedUrl.includes('docs.google.com') ||
                fixedUrl.includes('dropbox.com') ||
                fixedUrl.includes('onedrive.live.com')) {
              fixedUrl = 'https://' + fixedUrl;
              console.log(`🔧 Agregando protocolo HTTPS: ${fixedUrl}`);
            } else {
              console.log(`⚠️ No se puede corregir automáticamente: ${fixedUrl}`);
              invalidCount++;
              continue;
            }
          }

          // Verificar si la URL corregida es válida
          if (isValidUrl(fixedUrl)) {
            console.log(`✅ Corrigiendo URL a: ${fixedUrl}`);

            await updateDoc(doc(db, 'materials', materialId), {
              url: fixedUrl,
              urlFixed: true,
              urlFixedDate: new Date().toISOString()
            });

            fixedCount++;
          } else {
            console.log(`❌ No se pudo corregir: ${fixedUrl}`);
            invalidCount++;
          }
        } else {
          console.log(`✅ URL válida: ${material.url}`);
        }
      } else {
        console.log(`⚠️ Sin URL configurada`);
        invalidCount++;
      }
    }

    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`📈 Total de materiales procesados: ${totalCount}`);
    console.log(`✅ URLs corregidas automáticamente: ${fixedCount}`);
    console.log(`❌ URLs que necesitan atención manual: ${invalidCount}`);
    console.log(`📊 URLs válidas encontradas: ${totalCount - fixedCount - invalidCount}`);

  } catch (error) {
    console.error('❌ Error al validar URLs:', error);
  }
}

// Ejecutar la validación
validateAndFixMaterialUrls().then(() => {
  console.log('🎉 Validación completada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});