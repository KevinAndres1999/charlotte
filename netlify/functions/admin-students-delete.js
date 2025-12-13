const admin = require('firebase-admin');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

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

  const auth = event.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) {
    return { statusCode: 401, body: JSON.stringify({ message: 'No autorizado' }) };
  }
  const token = parts[1];
  const id = event.path.split('/').pop(); // Assuming path is /admin-students-delete/{id}

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().status !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ message: 'Acceso denegado' }) };
    }

    const studentDoc = await db.collection('users').doc(id).get();
    if (!studentDoc.exists || studentDoc.data().status !== 'approved') {
      return { statusCode: 404, body: JSON.stringify({ message: 'Estudiante no encontrado o no aprobado' }) };
    }

    await db.collection('users').doc(id).delete();
    await admin.auth().deleteUser(id);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Estudiante eliminado' })
    };
  } catch (err) {
    console.error('Error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno' }) };
  }
};