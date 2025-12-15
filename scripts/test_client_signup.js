const https = require('https');
const fs = require('fs');
const path = require('path');

const svc = require(path.resolve(__dirname, 'charlotte-service-account.json'));
const projectId = svc.project_id;
const apiKey = 'AIzaSyCBpoxr8yhAfCVqP00b6DKtMA0JWljlMMA';

function httpRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + (u.search||''), method: method || 'GET', headers };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async ()=>{
  try {
    const email = `test.signup.${Date.now()}@example.com`;
    const password = 'Prueba2025!';
    console.log('Creando usuario de prueba:', email);

    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const signupRes = await httpRequest(signUpUrl, 'POST', { 'Content-Type': 'application/json' }, { email, password, returnSecureToken: true });
    console.log('signUp status', signupRes.status);
    if (signupRes.status >= 400) { console.error('signUp error', signupRes.body); process.exit(2); }
    const idToken = signupRes.body.idToken;
    const uid = signupRes.body.localId;

    console.log('Usuario creado. uid=', uid);

    // Intentar escribir el documento users/{uid}
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
    const docBody = {
      fields: {
        name: { stringValue: 'Prueba Cliente' },
        email: { stringValue: email },
        cedula: { stringValue: '' },
        telefono: { stringValue: '' },
        programa: { stringValue: '' },
        sede: { stringValue: '' },
        role: { stringValue: 'student' },
        status: { stringValue: 'pending' }
      }
    };

    const writeRes = await httpRequest(docUrl, 'PATCH', { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' }, docBody);
    console.log('Firestore write status', writeRes.status);
    console.log('Write response body:', writeRes.body);
    if (writeRes.status >= 400) process.exit(3);

    console.log('Prueba completada: documento creado correctamente por cliente.');
    process.exit(0);
  } catch (err) {
    console.error('Error en prueba:', err);
    process.exit(4);
  }
})();
