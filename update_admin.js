const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'charlotte-a0d47'
});

const db = admin.firestore();

async function updateAdmin() {
  try {
    const userSnap = await db.collection('users').where('email', '==', 'andreachiza8@gmail.com').get();
    userSnap.forEach(doc => {
      doc.ref.update({ programa: 'Belleza Integral' });
    });
    console.log('Admin actualizado con programa: Belleza Integral');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    admin.app().delete();
  }
}

updateAdmin();