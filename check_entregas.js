const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'charlotte-a0d47'
});

const db = admin.firestore();

async function checkEntregas() {
  try {
    const snapshot = await db.collection('entregas').get();
    console.log('Número de entregas:', snapshot.size);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('ID:', doc.id, 'Programa:', data.programa, 'Estudiante:', data.estudianteId);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    admin.app().delete();
  }
}

checkEntregas();