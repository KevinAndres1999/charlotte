const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'charlotte-a0d47'
});

const db = admin.firestore();

async function checkAdmin() {
  try {
    const userSnap = await db.collection('users').where('email', '==', 'andreachiza8@gmail.com').get();
    userSnap.forEach(doc => {
      console.log('Programa del admin:', doc.data().programa);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    admin.app().delete();
  }
}

checkAdmin();