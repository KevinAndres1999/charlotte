// Script para reparar clases con chunks problemáticos
// Ejecutar en admin.html

async function repararClasesChunks() {
    try {
        console.log('🔧 Iniciando reparación de clases con chunks...');

        const classesSnapshot = await db.collection('classes').get();
        let reparadas = 0;

        for (const doc of classesSnapshot.docs) {
            const clase = doc.data();

            if (clase.hasChunks) {
                console.log(`🔍 Revisando: ${clase.titulo}`);

                // Verificar si hay chunks
                const chunksSnapshot = await db.collection('class_chunks').where('claseId', '==', doc.id).get();

                if (chunksSnapshot.empty) {
                    console.log(`  ❌ No hay chunks, removiendo hasChunks`);
                    await doc.ref.update({
                        hasChunks: false,
                        totalChunks: 0,
                        contenido: clase.contenido || 'Contenido restaurado automáticamente.'
                    });
                    reparadas++;
                } else {
                    // Verificar si los chunks tienen contenido
                    let totalContentLength = 0;
                    chunksSnapshot.forEach(chunkDoc => {
                        const chunkData = chunkDoc.data();
                        totalContentLength += (chunkData.content || '').length;
                    });

                    if (totalContentLength === 0) {
                        console.log(`  ❌ Chunks vacíos, removiendo hasChunks`);
                        await doc.ref.update({
                            hasChunks: false,
                            totalChunks: 0,
                            contenido: clase.contenido || 'Contenido restaurado automáticamente.'
                        });
                        reparadas++;
                    } else {
                        console.log(`  ✅ Chunks OK: ${totalContentLength} caracteres total`);
                    }
                }
            }
        }

        console.log(`\n✅ Reparación completada: ${reparadas} clases reparadas`);

        // Mostrar resumen
        alert(`Reparación completada. ${reparadas} clases fueron reparadas.`);

    } catch (error) {
        console.error('❌ Error en reparación:', error);
    }
}

// Ejecutar reparación
repararClasesChunks();