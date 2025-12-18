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
      updates.push(doc.ref.update({ programa: 'Belleza Integral' }));
    });
    await Promise.all(updates);
    console.log('Entregas actualizadas con programa: Belleza Integral');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    admin.app().delete();
  }
}

updateEntregas();