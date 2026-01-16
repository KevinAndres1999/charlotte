// Script para limpiar chunks problemáticos y corregir documentos
// Ejecutar en admin.html

async function limpiarChunksProblematicos() {
    try {
        console.log('🧹 Iniciando limpieza de chunks problemáticos...');

        const classesSnapshot = await db.collection('classes').get();
        const clasesConChunks = [];

        classesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.hasChunks) {
                clasesConChunks.push({
                    id: doc.id,
                    titulo: data.titulo,
                    totalChunks: data.totalChunks || 0
                });
            }
        });

        console.log(`📦 Encontradas ${clasesConChunks.length} clases con hasChunks`);

        for (const clase of clasesConChunks) {
            console.log(`\n🔍 Revisando clase: ${clase.titulo} (${clase.id})`);
            console.log(`   Total chunks esperado: ${clase.totalChunks}`);

            // Contar chunks reales
            const chunksSnapshot = await db.collection('class_chunks').where('claseId', '==', clase.id).get();
            console.log(`   Chunks encontrados: ${chunksSnapshot.size}`);

            if (chunksSnapshot.size !== clase.totalChunks) {
                console.log(`   ❌ Inconsistencia detectada: esperado ${clase.totalChunks}, encontrado ${chunksSnapshot.size}`);

                // Corregir el totalChunks en el documento
                if (chunksSnapshot.size > 0) {
                    await db.collection('classes').doc(clase.id).update({
                        totalChunks: chunksSnapshot.size
                    });
                    console.log(`   ✅ Corregido totalChunks a ${chunksSnapshot.size}`);
                } else {
                    // No hay chunks, quitar hasChunks
                    await db.collection('classes').doc(clase.id).update({
                        hasChunks: false,
                        totalChunks: 0,
                        contenido: 'No hay contenido disponible para esta clase.' // Restaurar contenido básico
                    });
                    console.log(`   ⚠️ No hay chunks, removido hasChunks y restaurado contenido básico`);
                }
            } else {
                console.log(`   ✅ Chunks consistentes`);
            }
        }

        console.log('\n🎉 Limpieza completada');

        return clasesConChunks;

    } catch (error) {
        console.error('❌ Error en limpieza:', error);
    }
}

// Ejecutar limpieza
limpiarChunksProblematicos();