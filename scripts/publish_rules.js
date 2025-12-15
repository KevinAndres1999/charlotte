/**
 * Publica el archivo `firestore.rules` usando la cuenta de servicio
 * Uso: node publish_rules.js
 * Requiere: `scripts/charlotte-babda-firebase-adminsdk-fbsvc-3d48fe741d.json` y `../firestore.rules`
 */
const admin = require('firebase-admin');
const fs = require('fs');
const https = require('https');

const path = require('path');
const KEY = path.resolve(__dirname, 'charlotte-babda-firebase-adminsdk-fbsvc-3d48fe741d.json');
if (!fs.existsSync(KEY)) {
  console.error('Falta ' + KEY + '. Coloca la clave de servicio en scripts/');
  process.exit(1);
}
const svc = require(KEY);
const RULES_PATH = path.resolve(__dirname, '..', 'firestore.rules');
if (!fs.existsSync(RULES_PATH)) {
  console.error('No se encontró ' + RULES_PATH);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(svc) });

async function getAccessToken() {
  const client = admin.credential.cert(svc);
  if (typeof client.getAccessToken !== 'function') {
    // Fallback: use admin.app().INTERNAL.getToken? but usually getAccessToken exists
    throw new Error('No se pudo obtener getAccessToken desde la credencial');
  }
  const res = await client.getAccessToken();
  return res.access_token;
}

function httpRequest(url, method, token, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      method: method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const code = res.statusCode || 0;
        try { const json = data ? JSON.parse(data) : null; resolve({ code, body: json }); }
        catch (e) { resolve({ code, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async ()=>{
  try {
    const projectId = svc.project_id;
    if (!projectId) throw new Error('project_id no encontrado en la clave de servicio');

    const token = await getAccessToken();
    const rulesText = fs.readFileSync(RULES_PATH, 'utf8');

    // 1) Crear ruleset
    const createUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
    const createBody = { source: { files: [ { content: rulesText, name: 'firestore.rules' } ] } };
    const created = await httpRequest(createUrl, 'POST', token, createBody);
    if (created.code < 200 || created.code >= 300) {
      console.error('Error creando ruleset', created.code, created.body);
      process.exit(2);
    }
    const rulesetName = created.body.name; // projects/{projectId}/rulesets/{id}
    console.log('Ruleset creado:', rulesetName);

    // 2) Publicar release para Firestore (release id: cloud.firestore)
    const releaseName = `projects/${projectId}/releases/cloud.firestore`;
    const patchUrl = `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`;
    const patchBody = { rulesetName };
    let patched = await httpRequest(patchUrl, 'PATCH', token, patchBody);
    if (patched.code === 400) {
      // Fallback: intentar PUT con el recurso completo
      console.warn('PATCH no aceptado, intentando reemplazar release con PUT...');
      const putUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
      const putBody = { name: `projects/${projectId}/releases/cloud.firestore`, rulesetName };
      patched = await httpRequest(putUrl, 'PUT', token, putBody);
    }
    if (patched.code < 200 || patched.code >= 300) {
      console.error('Error publicando release', patched.code, patched.body);
      process.exit(3);
    }

    console.log('Reglas publicadas correctamente para Firestore.');
    process.exit(0);
  } catch (err) {
    console.error('Error publicando reglas:', err);
    process.exit(4);
  }
})();
