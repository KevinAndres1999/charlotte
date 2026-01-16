const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function loadContentFromChunks(claseId) {
    try {
        console.log(`Cargando chunks para clase: ${claseId}`);

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // Obtener todos los chunks para esta clase
        const chunksQuery = query(collection(db, 'class_chunks'), where('claseId', '==', claseId));
        const chunksSnapshot = await getDocs(chunksQuery);

        console.log(`Chunks encontrados: ${chunksSnapshot.size}`);

        if (chunksSnapshot.empty) {
            return null;
        }

        const chunks = [];
        chunksSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Chunk ${data.chunkIndex}: ${data.content ? data.content.length : 0} caracteres`);
            if (data && data.content) {  // Validar que el chunk tenga contenido
                chunks.push({
                    content: data.content,
                    chunkIndex: data.chunkIndex || 0
                });
            }
        });

        console.log(`Chunks válidos: ${chunks.length}`);

        if (chunks.length === 0) {
            return null;  // No hay chunks válidos
        }

        // Ordenar los chunks por chunkIndex
        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

        // Unir todos los chunks
        const fullContent = chunks.map(chunk => chunk.content).join('');

        console.log(`Contenido total: ${fullContent.length} caracteres`);

        // Validar que el contenido final no esté vacío
        if (!fullContent || fullContent.trim().length === 0) {
            return null;
        }

        return fullContent;
    } catch (error) {
        console.error('Error loading content from chunks:', error);
        return null;
    }
}

async function testLoadContent() {
    const claseId = 'QLfBnpYg30T21ykZcXVK'; // Primera clase reparada
    const content = await loadContentFromChunks(claseId);

    if (content) {
        console.log('✅ Contenido cargado exitosamente');
        console.log('Primeros 200 caracteres:', content.substring(0, 200));
    } else {
        console.log('❌ No se pudo cargar el contenido');
    }
}

testLoadContent();