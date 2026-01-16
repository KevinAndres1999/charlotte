const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function verificarDatosClasesReparadas() {
    try {
        console.log('🔍 Verificando datos de clases reparadas...');

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const claseIds = ['QLfBnpYg30T21ykZcXVK', 'UiMVDHWc3zg85rFI2eqL', 'YBryk0rkvjkiKLMbfIMq'];

        for (const claseId of claseIds) {
            console.log(`\n🔎 Verificando clase: ${claseId}`);

            const docRef = doc(db, 'classes', claseId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('Datos completos:', {
                    id: docSnap.id,
                    titulo: data.titulo,
                    programa: data.programa,
                    modulo: data.modulo,
                    hasChunks: data.hasChunks,
                    totalChunks: data.totalChunks,
                    contenido: data.contenido ? `${data.contenido.length} caracteres` : 'vacío',
                    combinacionesPermitidas: data.combinacionesPermitidas,
                    sedes: data.sedes,
                    horarios: data.horarios,
                    fechaInicio: data.fechaInicio,
                    fechaFin: data.fechaFin
                });
            } else {
                console.log('❌ Clase no encontrada');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

verificarDatosClasesReparadas();