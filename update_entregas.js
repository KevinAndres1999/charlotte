const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'charlotte-a0d47'
});

const db = admin.firestore();

async function updateEntregas() {
  try {
    const snapshot = await db.collection('entregas').get();
    const updates = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.programa) {
        updates.push(doc.ref.update({ programa: 'panaderia' }));
      }
    });
    await Promise.all(updates);
    console.log('Entregas actualizadas con programa: panaderia');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    admin.app().delete();
  }
}

updateEntregas();