const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'charlotte-a0d47'
});

const db = admin.firestore();

async function checkData() {
  try {
    console.log('Entregas:');
    const entregasSnap = await db.collection('entregas').get();
    entregasSnap.forEach(doc => {
      console.log('ID:', doc.id, 'Programa:', doc.data().programa, 'Estudiante:', doc.data().estudianteId);
    });

    console.log('\nUsuario admin:');
    const userSnap = await db.collection('users').where('email', '==', 'andreachiza8@gmail.com').get();
    userSnap.forEach(doc => {
      console.log('Programa:', doc.data().programa);
    });

    console.log('\nEstudiante que hizo entregas:');
    const estudianteSnap = await db.collection('users').where('email', '==', 'nuestrareceta.ec@gmail.com').get();
    estudianteSnap.forEach(doc => {
      console.log('Programa:', doc.data().programa);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    admin.app().delete();
  }
}

checkData();