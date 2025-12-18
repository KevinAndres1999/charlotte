const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'charlotte-a0d47'
});

const db = admin.firestore();

async function cleanDuplicateEntregas() {
  try {
    const snapshot = await db.collection('entregas').get();
    const entregasMap = new Map();

    snapshot.forEach(doc => {
      const data = doc.data();
      const key = `${data.actividadId}-${data.estudianteId}`;
      if (!entregasMap.has(key)) {
        entregasMap.set(key, []);
      }
      entregasMap.get(key).push({ id: doc.id, fecha: data.fechaEntrega || 0, data });
    });

    for (const [key, entregas] of entregasMap) {
      if (entregas.length > 1) {
        // Ordenar por fecha descendente
        entregas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        // Mantener la primera (más reciente), eliminar las demás
        const toDelete = entregas.slice(1);
        console.log(`Eliminando ${toDelete.length} entregas duplicadas para ${key}`);
        for (const entrega of toDelete) {
          await db.collection('entregas').doc(entrega.id).delete();
          console.log('Eliminado:', entrega.id);
        }
      }
    }

    console.log('Limpieza completada');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    admin.app().delete();
  }
}

cleanDuplicateEntregas();