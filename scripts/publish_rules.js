const fs = require('fs');
const { JWT } = require('google-auth-library');
const https = require('https');

async function getAccessToken(svc) {
  const client = new JWT({
    email: svc.client_email,
    key: svc.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const r = await client.authorize();
  return r.access_token;
}

function httpRequest(method, url, token, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => {
        try { const json = data ? JSON.parse(data) : {}; resolve({ status: res.statusCode, body: json }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    if (!fs.existsSync('./serviceAccount.json')) throw new Error('Missing scripts/serviceAccount.json');
    const svc = require('./serviceAccount.json');
    const projectId = svc.project_id;
    if (!projectId) throw new Error('serviceAccount.json missing project_id');
    const rulesContent = fs.readFileSync('../firestore.rules', 'utf8');

    const token = await getAccessToken(svc);

    // create ruleset
    const createUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
    const createBody = { source: { files: [{ name: 'firestore.rules', content: rulesContent }] } };
    const createRes = await httpRequest('POST', createUrl, token, createBody);
    if (createRes.status < 200 || createRes.status >= 300) {
      console.error('Error creating ruleset', createRes);
      process.exit(2);
    }
    const rulesetName = createRes.body.name; // projects/{project}/rulesets/{id}
    console.log('Ruleset created:', rulesetName);

    // upsert release 'firestore.rules'
    const releaseName = `projects/${projectId}/releases/firestore.rules`;
    // check if exists
    const getUrl = `https://firebaserules.googleapis.com/v1/${releaseName}`;
    const getRes = await httpRequest('GET', getUrl, token);
    if (getRes.status === 200) {
      // patch
      const patchUrl = `https://firebaserules.googleapis.com/v1/${releaseName}`;
      const patchBody = { rulesetName };
      const patchRes = await httpRequest('PATCH', patchUrl, token, patchBody);
      console.log('Release patched:', patchRes.status, patchRes.body.name || 'ok');
    } else {
      // create
      const postUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases?releaseId=firestore.rules`;
      const postBody = { name: releaseName, rulesetName };
      const postRes = await httpRequest('POST', postUrl, token, postBody);
      console.log('Release created:', postRes.status, postRes.body.name || 'ok');
    }

    console.log('Reglas publicadas correctamente.');
  } catch (err) {
    console.error('Error publishing rules:', err);
    process.exit(1);
  }
}

main();
