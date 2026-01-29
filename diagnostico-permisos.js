// Script de diagnóstico para verificar permisos de estudiante
console.log('🔍 DIAGNÓSTICO DE PERMISOS DE ESTUDIANTE');
console.log('=====================================');

// Verificar usuario actual
const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
if (!currentUser) {
    console.error('❌ No hay usuario logueado');
    return;
}

console.log('👤 Usuario actual:', currentUser);
console.log('📧 Email:', currentUser.email);
console.log('📚 Programa:', currentUser.programa);
console.log('🏢 Sede:', currentUser.sede);
console.log('⏰ Horario:', currentUser.horario);

// Verificar Firebase
if (typeof firebase === 'undefined' || !firebase.apps.length) {
    console.error('❌ Firebase no inicializado');
    return;
}

const db = firebase.firestore();
console.log('✅ Firebase inicializado');

// Verificar cuestionarios disponibles
db.collection('cuestionarios').get().then(snapshot => {
    console.log('📊 Cuestionarios totales en BD:', snapshot.size);

    if (snapshot.size > 0) {
        console.log('📋 Lista de cuestionarios:');
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${doc.id}: "${data.titulo || data.nombre}"`);
            console.log(`    Programa: ${data.programa || 'No definido'}`);
            console.log(`    Sedes: ${data.sedes ? data.sedes.join(', ') : 'No definidas'}`);
            console.log(`    Horarios: ${data.horarios ? data.horarios.join(', ') : 'No definidos'}`);
            console.log(`    Combinaciones: ${data.combinacionesPermitidas ? JSON.stringify(data.combinacionesPermitidas) : 'No definidas'}`);
        });
    }
}).catch(error => {
    console.error('❌ Error al cargar cuestionarios:', error);
});

// Verificar evaluaciones disponibles
db.collection('evaluaciones').get().then(snapshot => {
    console.log('📊 Evaluaciones totales en BD:', snapshot.size);

    if (snapshot.size > 0) {
        console.log('📋 Lista de evaluaciones:');
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${doc.id}: "${data.titulo || data.nombre}"`);
            console.log(`    Programa: ${data.programa || 'No definido'}`);
            console.log(`    Sedes: ${data.sedes ? data.sedes.join(', ') : 'No definidas'}`);
            console.log(`    Horarios: ${data.horarios ? data.horarios.join(', ') : 'No definidos'}`);
            console.log(`    Combinaciones: ${data.combinacionesPermitidas ? JSON.stringify(data.combinacionesPermitidas) : 'No definidas'}`);
        });
    }
}).catch(error => {
    console.error('❌ Error al cargar evaluaciones:', error);
});

console.log('🔍 Diagnóstico completado. Revisa los logs arriba para identificar el problema.');