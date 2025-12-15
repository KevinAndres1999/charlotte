const admin = require('firebase-admin');
const fs = require('fs');

const keyPath = './charlotte-service-account.json';
if (!fs.existsSync(keyPath)) {
  console.error('Falta el JSON de servicio en scripts/ (charlotte-service-account.json)');
  process.exit(1);
}
const svc = require(keyPath);
admin.initializeApp({ credential: admin.credential.cert(svc) });
const auth = admin.auth();
const db = admin.firestore();

const email = process.argv[2];
if (!email) { console.error('Uso: node verify_admin.js email'); process.exit(1); }

(async ()=>{
  try{
    const user = await auth.getUserByEmail(email).catch(()=>null);
    console.log('Auth user:');
    console.log(user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified } : 'No encontrado');

    if(!user){
      console.error('Usuario no encontrado en Auth, verifique que exista y la contraseña.');
      process.exit(2);
    }

    const doc = await db.collection('users').doc(user.uid).get();
    console.log('\nFirestore users doc:');
    if(!doc.exists){ console.log('No existe documento users/' + user.uid); }
    else { console.log(Object.assign({ id: doc.id }, doc.data())); }

    const pending = await db.collection('users').where('role','==','student').where('status','==','pending').get();
    console.log('\nEstudiantes pendientes (count):', pending.size);

    process.exit(0);
  }catch(e){
    console.error('Error:', e);
    process.exit(3);
  }
})();
