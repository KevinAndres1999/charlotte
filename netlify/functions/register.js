const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.includes('PRIVATE KEY')) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      console.log('Firebase Admin initialized from env vars');
    } else {
      // Fallback: try loading service account file packaged in repo (scripts/serviceAccount.json)
      try {
        const svcPath1 = '/var/task/scripts/serviceAccount.json';
        const svcPath2 = './scripts/serviceAccount.json';
        let svc = null;
        try { svc = require(svcPath1); } catch (e) { try { svc = require(svcPath2); } catch (e2) { svc = null; } }
        if (svc && svc.private_key) {
          admin.initializeApp({ credential: admin.credential.cert(svc), databaseURL: `https://${svc.project_id}.firebaseio.com` });
          console.log('Firebase Admin initialized from scripts/serviceAccount.json');
        } else {
          throw new Error('No valid Firebase credentials found in env or scripts/serviceAccount.json');
        }
      } catch (e) {
        console.error('Failed to initialize Firebase Admin from repo service account:', e);
        throw e;
      }
    }
  } catch (errInit) {
    console.error('Firebase Admin init error:', errInit);
    throw errInit;
  }
}

const db = admin.firestore();
const auth = admin.auth();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  try {
    // Read body: Netlify may send raw body, possibly base64 encoded. Support JSON and form-encoded bodies.
    let rawBody = event.body || '';
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(rawBody, 'base64').toString('utf8');
    }
    // strip BOM if present
    if (rawBody && rawBody.charCodeAt(0) === 0xFEFF) rawBody = rawBody.slice(1);
    rawBody = (rawBody || '').trim();

    // Try JSON first
    let parsed = null;
    if (rawBody) {
      try {
        parsed = JSON.parse(rawBody);
      } catch (e) {
        // not JSON — try URL-encoded form data
        try {
          const params = new URLSearchParams(rawBody);
          parsed = {};
          for (const [k, v] of params.entries()) parsed[k] = v;
        } catch (e2) {
          console.error('Body parse error (not JSON nor form):', e, e2, 'rawBody:', rawBody.substring(0,200));
          return { statusCode: 400, body: JSON.stringify({ message: 'Cuerpo inválido: se esperaba JSON o form-urlencoded' }) };
        }
      }
    } else {
      parsed = {};
    }

    const { email, password, name, role } = parsed;
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
        console.error('Error checking user existence:', err);
        throw err;
      }
    }

    // Create user in Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name
    });

    // Determine role/status
    const userRole = role === 'teacher' ? 'teacher' : 'student';
    const status = role === 'teacher' ? 'approved' : 'pending';

    // Add to Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      active: true,
      role: userRole,
      status,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Respond with created user info (no custom token to avoid signing issues in this environment)
    return {
      statusCode: 201,
      body: JSON.stringify({ user: { uid: userRecord.uid, email, name, role: userRole, status, active: true } })
    };
  } catch (err) {
    console.error('Register error', err);
    // Map common Firebase Auth errors to HTTP responses
    if (err && err.code === 'auth/email-already-exists') {
      return { statusCode: 409, body: JSON.stringify({ message: 'El email ya está registrado', code: err.code }) };
    }
    const msg = (err && err.message) ? err.message : 'Error interno';
    const stack = (err && err.stack) ? err.stack : null;
    return { statusCode: 500, body: JSON.stringify({ message: msg, stack }) };
  }
};