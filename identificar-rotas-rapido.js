// Script rápido para identificar clases con imágenes rotas
// Ejecutar en admin.html

async function identificarImagenesRotasRapido() {
    try {
        console.log('🔍 Buscando clases de Belleza con imágenes rotas...');

        const snapshot = await getDocs(collection(db, 'classes'));
        const clasesBelleza = [];
        const clasesConImagenesRotas = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.programa === 'Belleza Integral') {
                clasesBelleza.push({ id: doc.id, ...data });
            }
        });

        console.log(`📚 Encontradas ${clasesBelleza.length} clases de Belleza`);

        for (let i = 0; i < clasesBelleza.length; i++) {
            const clase = clasesBelleza[i];
            let contenido = clase.contenido;

            // Si tiene chunks, intentar cargarlos
            if (clase.hasChunks) {
                try {
                    const chunksQuery = query(collection(db, 'class_chunks'), where('claseId', '==', clase.id));
                    const chunksSnapshot = await getDocs(chunksQuery);
                    if (!chunksSnapshot.empty) {
                        const chunks = [];
                        chunksSnapshot.forEach(doc => chunks.push(doc.data()));
                        chunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
                        contenido = chunks.map(chunk => chunk.content).join('');
                    }
                } catch (error) {
                    console.log(`⚠️ Error cargando chunks para ${clase.titulo}:`, error.message);
                }
            }

            if (contenido) {
                // Buscar imágenes SVG (rotas)
                const svgImages = contenido.match(/<img[^>]+src="data:image\/svg\+xml[^"]*"/g) || [];
                const totalImages = (contenido.match(/<img[^>]+src="[^"]+"/g) || []).length;

                if (svgImages.length > 0) {
                    clasesConImagenesRotas.push({
                        titulo: clase.titulo,
                        id: clase.id,
                        modulo: clase.modulo,
                        imagenesRotas: svgImages.length,
                        totalImagenes: totalImages
                    });
                    console.log(`❌ ${clase.titulo} - ${svgImages.length} imágenes rotas de ${totalImages} total`);
                } else if (totalImages > 0) {
                    console.log(`✅ ${clase.titulo} - ${totalImages} imágenes OK`);
                } else {
                    console.log(`📝 ${clase.titulo} - Sin imágenes`);
                }
            } else {
                console.log(`⚠️ ${clase.titulo} - Sin contenido`);
            }
        }

        console.log(`\n🚨 CLASES QUE NECESITAN RE-EDICIÓN (${clasesConImagenesRotas.length}):`);
        clasesConImagenesRotas.forEach((clase, index) => {
            console.log(`${index + 1}. ${clase.titulo} (Módulo: ${clase.modulo}) - ${clase.imagenesRotas} imágenes rotas`);
        });

        if (clasesConImagenesRotas.length === 0) {
            console.log('🎉 ¡Ninguna clase tiene imágenes rotas!');
        }

        return clasesConImagenesRotas;

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar
identificarImagenesRotasRapido();