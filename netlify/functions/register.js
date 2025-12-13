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
    const { email, password, name } = JSON.parse(event.body || '{}');
    if (!email || !password || !name) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Nombre, email y contraseña requeridos' }) };
    }
    if (password.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ message: 'La contraseña debe tener al menos 6 caracteres' }) };
    }

    // Check if user exists
    try {
      await auth.getUserByEmail(email);
      return { statusCode: 409, body: JSON.stringify({ message: 'El email ya está registrado' }) };
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
    }

    // Create user in Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name
    });

    // Add to Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      active: true,
      role: 'pending'
    });

    // Create custom token
    const token = await auth.createCustomToken(userRecord.uid);

    return {
      statusCode: 201,
      body: JSON.stringify({ token, user: { email, name, role: 'pending', active: true } })
    };
  } catch (err) {
    console.error('Register error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno' }) };
  }
};