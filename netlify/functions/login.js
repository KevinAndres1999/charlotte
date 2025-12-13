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
const auth = admin.auth();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  try {
    const { email, password } = JSON.parse(event.body || '{}');
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Email y contraseña requeridos' }) };
    }

    // Sign in with Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Credenciales inválidas' }) };
    }

    // Check custom claims or Firestore for role
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (!userDoc.exists) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Usuario no encontrado' }) };
    }
    const userData = userDoc.data();
    if (!userData.active) {
      return { statusCode: 403, body: JSON.stringify({ message: 'Cuenta deshabilitada' }) };
    }
    if (userData.role === 'pending') {
      return { statusCode: 403, body: JSON.stringify({ message: 'Cuenta pendiente de aprobación por el administrador' }) };
    }

    // Create custom token or use Firebase Auth token
    const token = await auth.createCustomToken(userRecord.uid);

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
        user: {
          email: userRecord.email,
          name: userData.name,
          role: userData.role,
          active: userData.active
        }
      })
    };
  } catch (err) {
    console.error('Login error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno' }) };
  }
};