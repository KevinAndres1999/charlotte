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

async function quitarRestriccionesClases() {
    try {
        console.log('🔧 Quitando restricciones de sede/horario para clases reparadas...');

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const claseIds = ['QLfBnpYg30T21ykZcXVK', 'UiMVDHWc3zg85rFI2eqL', 'YBryk0rkvjkiKLMbfIMq'];

        for (const claseId of claseIds) {
            console.log(`\n🔧 Procesando clase: ${claseId}`);

            try {
                await updateDoc(doc(db, 'classes', claseId), {
                    sedes: [], // Quitar restricciones de sede
                    horarios: [], // Quitar restricciones de horario
                    combinacionesPermitidas: [] // Quitar combinaciones permitidas
                });

                console.log(`   ✅ Restricciones removidas`);

            } catch (updateError) {
                console.error(`   ❌ Error actualizando ${claseId}:`, updateError.message);
            }
        }

        console.log('\n🎉 Restricciones removidas. Las clases ahora deberían aparecer para todos los usuarios de Belleza Integral.');

    } catch (error) {
        console.error('Error general:', error);
    }
}

quitarRestriccionesClases();