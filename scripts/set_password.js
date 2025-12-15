/**
 * Actualiza la contraseña de un usuario por email.
 * Uso: node set_password.js <email> <newPassword>
 */
const admin = require('firebase-admin');
const fs = require('fs');
const KEY = './charlotte-babda-firebase-adminsdk-fbsvc-3d48fe741d.json';
if (!fs.existsSync(KEY)) { console.error('Falta scripts/' + KEY); process.exit(1); }
const svc = require(KEY);
admin.initializeApp({ credential: admin.credential.cert(svc) });
const auth = admin.auth();

const [,, email, newPass] = process.argv;
if (!email || !newPass) { console.error('Uso: node set_password.js <email> <newPassword>'); process.exit(1); }
(async ()=>{
  try {
    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password: newPass });
    console.log('Contraseña actualizada para', email, 'uid=', user.uid);
    process.exit(0);
  } catch (err) { console.error('Error:', err); process.exit(2); }
})();
