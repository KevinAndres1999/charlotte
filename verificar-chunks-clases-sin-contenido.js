const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function verificarChunksParaClasesSinContenido() {
    try {
        console.log('🔍 Verificando chunks para clases sin contenido...');

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        console.log('Firebase inicializado');

        // IDs de las clases sin contenido
        const claseIds = ['QLfBnpYg30T21ykZcXVK', 'UiMVDHWc3zg85rFI2eqL', 'YBryk0rkvjkiKLMbfIMq'];

        for (const claseId of claseIds) {
            console.log(`\n🔎 Verificando chunks para clase ID: ${claseId}`);

            try {
                // Buscar chunks para esta clase
                const chunksQuery = query(collection(db, 'class_chunks'), where('claseId', '==', claseId));
                const chunksSnapshot = await getDocs(chunksQuery);

                console.log(`   Chunks encontrados: ${chunksSnapshot.size}`);

                if (!chunksSnapshot.empty) {
                    chunksSnapshot.forEach(doc => {
                        const chunkData = doc.data();
                        console.log(`   Chunk ${chunkData.chunkIndex}: ${chunkData.content ? chunkData.content.length : 0} caracteres`);
                    });
                } else {
                    console.log('   ❌ No se encontraron chunks para esta clase');
                }
            } catch (queryError) {
                console.error(`Error consultando chunks para ${claseId}:`, queryError);
            }
        }

    } catch (error) {
        console.error('Error general:', error);
    }
}

// Ejecutar automáticamente
verificarChunksParaClasesSinContenido();