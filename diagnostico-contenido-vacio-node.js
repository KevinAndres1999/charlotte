const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function diagnosticarClasesSinContenido() {
    try {
        console.log('🔍 DIAGNÓSTICO: Buscando clases sin contenido...');

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const snapshot = await getDocs(collection(db, 'classes'));
        const clasesSinContenido = [];
        const clasesConContenido = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const hasContent = data.contenido && data.contenido.trim().length > 0;
            const hasChunks = data.hasChunks;

            if (!hasContent && !hasChunks) {
                clasesSinContenido.push({
                    id: doc.id,
                    titulo: data.titulo || 'Sin título',
                    programa: data.programa || 'Sin programa',
                    modulo: data.modulo || 'Sin módulo',
                    fechaCreacion: data.fechaCreacion ? new Date(data.fechaCreacion.seconds * 1000).toLocaleDateString('es-ES') : 'Sin fecha'
                });
            } else {
                clasesConContenido.push({
                    id: doc.id,
                    titulo: data.titulo || 'Sin título',
                    programa: data.programa || 'Sin programa',
                    hasContent: hasContent,
                    hasChunks: hasChunks,
                    contenidoLength: data.contenido ? data.contenido.length : 0
                });
            }
        });

        console.log(`❌ Clases SIN contenido: ${clasesSinContenido.length}`);
        if (clasesSinContenido.length > 0) {
            console.table(clasesSinContenido);
        }

        console.log(`✅ Clases CON contenido: ${clasesConContenido.length}`);
        if (clasesConContenido.length > 0) {
            console.table(clasesConContenido.slice(0, 10)); // Mostrar primeras 10
        }

        return { sinContenido: clasesSinContenido, conContenido: clasesConContenido };

    } catch (error) {
        console.error('Error en diagnóstico:', error);
    }
}

// Ejecutar automáticamente
diagnosticarClasesSinContenido();