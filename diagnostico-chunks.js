// Script de diagnóstico para verificar chunks
// Ejecutar en admin.html

async function diagnosticarChunks() {
    try {
        console.log('🔍 DIAGNÓSTICO: Verificando chunks de clases...');

        // 1. Ver todas las clases con hasChunks
        const classesSnapshot = await db.collection('classes').get();
        const clasesConChunks = [];

        classesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.hasChunks) {
                clasesConChunks.push({
                    id: doc.id,
                    titulo: data.titulo,
                    programa: data.programa,
                    totalChunks: data.totalChunks || 0,
                    contenido: data.contenido
                });
            }
        });

        console.log(`📦 Encontradas ${clasesConChunks.length} clases con hasChunks`);

        // 2. Verificar chunks para cada clase
        for (const clase of clasesConChunks) {
            console.log(`\n🔎 Verificando clase: ${clase.titulo} (${clase.id})`);
            console.log(`   Programa: ${clase.programa}`);
            console.log(`   Total chunks esperado: ${clase.totalChunks}`);
            console.log(`   Contenido principal: ${clase.contenido ? 'Presente' : 'Vacío'}`);

            // Buscar chunks
            const chunksSnapshot = await db.collection('class_chunks').where('claseId', '==', clase.id).get();
            console.log(`   Chunks encontrados: ${chunksSnapshot.size}`);

            if (!chunksSnapshot.empty) {
                const chunks = [];
                chunksSnapshot.forEach(doc => {
                    const chunkData = doc.data();
                    chunks.push({
                        id: doc.id,
                        index: chunkData.chunkIndex,
                        contentLength: chunkData.content ? chunkData.content.length : 0,
                        createdAt: chunkData.createdAt
                    });
                });

                // Ordenar por index
                chunks.sort((a, b) => a.index - b.index);

                console.log('   Detalle de chunks:');
                chunks.forEach(chunk => {
                    console.log(`     Chunk ${chunk.index}: ${chunk.contentLength} caracteres (ID: ${chunk.id})`);
                });

                // Intentar reconstruir contenido
                const contenidoReconstruido = chunks.map(c => c.content || '').join('');
                console.log(`   Contenido reconstruido: ${contenidoReconstruido.length} caracteres`);

                // Verificar si tiene imágenes
                const imagenes = contenidoReconstruido.match(/<img[^>]+src="[^"]*"[^>]*>/g);
                console.log(`   Imágenes en contenido: ${imagenes ? imagenes.length : 0}`);

            } else {
                console.log('   ❌ No se encontraron chunks en la base de datos');
            }
        }

        // 3. Verificar función loadContentFromChunks (simular)
        console.log('\n🧪 Probando función loadContentFromChunks...');

        for (const clase of clasesConChunks.slice(0, 2)) { // Solo las primeras 2 para no saturar
            try {
                console.log(`   Probando clase: ${clase.titulo}`);

                // Simular la función loadContentFromChunks
                const chunksQuery = db.collection('class_chunks').where('claseId', '==', clase.id);
                const chunksSnapshot = await chunksQuery.get();

                if (chunksSnapshot.empty) {
                    console.log('   ❌ No hay chunks');
                    continue;
                }

                const chunks = [];
                chunksSnapshot.forEach(doc => {
                    chunks.push({
                        content: doc.data().content,
                        chunkIndex: doc.data().chunkIndex || 0
                    });
                });

                chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
                const contenidoCompleto = chunks.map(chunk => chunk.content).join('');

                console.log(`   ✅ Contenido cargado: ${contenidoCompleto.length} caracteres`);

                // Verificar si tiene imágenes
                const imagenes = contenidoCompleto.match(/<img[^>]+src="[^"]*"[^>]*>/g);
                console.log(`   🖼️  Imágenes encontradas: ${imagenes ? imagenes.length : 0}`);

            } catch (error) {
                console.log(`   ❌ Error probando clase: ${error.message}`);
            }
        }

        return clasesConChunks;

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
}

// Ejecutar diagnóstico
diagnosticarChunks();