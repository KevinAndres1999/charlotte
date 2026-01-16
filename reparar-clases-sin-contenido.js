const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function repararClasesSinContenido() {
    try {
        console.log('🔧 Reparando clases sin contenido...');

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        console.log('Firebase inicializado');

        // Datos de las clases a reparar
        const clasesAReparar = [
            { id: 'QLfBnpYg30T21ykZcXVK', totalChunks: 3 },
            { id: 'UiMVDHWc3zg85rFI2eqL', totalChunks: 7 },
            { id: 'YBryk0rkvjkiKLMbfIMq', totalChunks: 6 }
        ];

        for (const clase of clasesAReparar) {
            console.log(`\n🔧 Reparando clase: ${clase.id}`);

            try {
                const claseRef = doc(db, 'classes', clase.id);
                console.log(`   Actualizando documento: ${claseRef.path}`);

                await updateDoc(claseRef, {
                    hasChunks: true,
                    totalChunks: clase.totalChunks,
                    contenido: '' // Asegurar que contenido esté vacío
                });

                console.log(`   ✅ Actualizada: hasChunks=true, totalChunks=${clase.totalChunks}`);

            } catch (updateError) {
                console.error(`   ❌ Error actualizando ${clase.id}:`, updateError.message);
            }
        }

        console.log('\n🎉 Reparación completada. Las clases ahora deberían cargar desde chunks.');

    } catch (error) {
        console.error('Error general:', error);
    }
}

// Ejecutar automáticamente
repararClasesSinContenido();