const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  const auth = event.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) {
    return { statusCode: 401, body: JSON.stringify({ message: 'No autorizado' }) };
  }
  const token = parts[1];
  const id = event.path.split('/').pop(); // Assuming path is /admin-students-approve/{id}

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ message: 'Acceso denegado' }) };
    }

    const studentDoc = await db.collection('users').doc(id).get();
    if (!studentDoc.exists || studentDoc.data().role !== 'pending') {
      return { statusCode: 404, body: JSON.stringify({ message: 'Estudiante no encontrado o ya aprobado' }) };
    }

    await db.collection('users').doc(id).update({ role: 'student' });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Estudiante aprobado' })
    };
  } catch (err) {
    console.error('Error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno' }) };
  }
};