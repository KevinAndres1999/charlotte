const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined
    })
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  try {
    const authHeader = event.headers.Authorization || event.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Missing or invalid Authorization header' }) };
    }
    const idToken = match[1];

    // Verify ID token and get caller UID
    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerUid = decoded.uid;

    // Check caller role in Firestore
    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists) {
      return { statusCode: 403, body: JSON.stringify({ message: 'Caller user not found' }) };
    }
    const callerData = callerDoc.data();
    const callerRole = callerData && callerData.role;
    if (callerRole !== 'teacher' && callerRole !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ message: 'Insufficient permissions' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const targetUid = body.uid || body.targetUid;
    if (!targetUid) {
      return { statusCode: 400, body: JSON.stringify({ message: 'target uid requerido en el body' }) };
    }

    const targetRef = db.collection('users').doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Usuario objetivo no encontrado' }) };
    }

    await targetRef.update({
      status: 'approved',
      approvedBy: callerUid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Usuario aprobado', uid: targetUid })
    };
  } catch (err) {
    console.error('approve-student error', err);
    const code = err.code || 500;
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno', error: String(err) }) };
  }
};
