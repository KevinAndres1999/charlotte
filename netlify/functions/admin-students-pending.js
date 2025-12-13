const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  // const auth = event.headers.authorization || '';
  // const parts = auth.split(' ');
  // if (parts.length !== 2) {
  //   return { statusCode: 401, body: JSON.stringify({ message: 'No autorizado' }) };
  // }
  // const token = parts[1];
  try {
    // const decoded = await admin.auth().verifyIdToken(token);
    // const userDoc = await db.collection('users').doc(decoded.uid).get();
    // if (!userDoc.exists || userDoc.data().status !== 'admin') {
    //   return { statusCode: 403, body: JSON.stringify({ message: 'Acceso denegado' }) };
    // }

    const snapshot = await db.collection('users').where('status', '==', 'pending').get();
    const students = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(students)
    };
  } catch (err) {
    console.error('Error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno', error: err.message }) };
  }
};