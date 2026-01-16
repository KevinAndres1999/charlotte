// Script simplificado para revisar clases de belleza
// Ejecutar en la consola del navegador en admin.html

async function revisarClasesBellezaSimple() {
    try {
        console.log('🔍 Buscando clases de Belleza Integral...');

        const snapshot = await getDocs(collection(db, 'classes'));
        const clasesBelleza = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.programa === 'Belleza Integral') {
                clasesBelleza.push({
                    id: doc.id,
                    titulo: data.titulo || 'Sin título',
                    fecha: data.fechaCreacion ? new Date(data.fechaCreacion.seconds * 1000).toLocaleDateString('es-ES') : 'Sin fecha',
                    contenidoLength: data.contenido ? data.contenido.length : 0,
                    hasContenido: !!data.contenido,
                    hasChunks: data.hasChunks || false,
                    modulo: data.modulo || 'Sin módulo',
                    data: data // Guardar los datos completos
                });
            }
        });

        // Ordenar por fecha (más recientes primero)
        clasesBelleza.sort((a, b) => {
            if (a.fecha === 'Sin fecha') return 1;
            if (b.fecha === 'Sin fecha') return -1;
            return new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-'));
        });

        console.log(`📚 Encontradas ${clasesBelleza.length} clases de Belleza Integral`);
        console.table(clasesBelleza.slice(0, 10));

        // Revisar TODAS las clases de belleza
        console.log('\n🔎 Revisando TODAS las clases de belleza...');

        for (let i = 0; i < clasesBelleza.length; i++) {
            const clase = clasesBelleza[i];
            console.log(`\n--- CLASE ${i + 1}: ${clase.titulo} ---`);
            console.log('ID:', clase.id);
            console.log('Fecha:', clase.fecha);
            console.log('Módulo:', clase.modulo);
            console.log('Longitud contenido:', clase.contenidoLength);

            const data = clase.data;
            let contenido = data.contenido;

            if (data.hasChunks) {
                console.log('⚠️  Esta clase tiene chunks - el contenido está dividido');
                // Intentar cargar chunks si existe la función
                if (typeof loadContentFromChunks === 'function') {
                    try {
                        contenido = await loadContentFromChunks(clase.id);
                        console.log('✅ Contenido cargado desde chunks');
                    } catch (error) {
                        console.log('❌ Error cargando chunks:', error.message);
                    }
                }
            }

            if (contenido) {
                // Buscar imágenes
                const imgRegex = /<img[^>]+src="([^"]+)"/g;
                const images = [];
                let match;
                while ((match = imgRegex.exec(contenido)) !== null) {
                    images.push(match[1]);
                }

                console.log(`🖼️  Imágenes encontradas: ${images.length}`);

                if (images.length > 0) {
                    images.forEach((src, index) => {
                        const tipo = src.includes('data:image/svg+xml') ? '❌ SVG (rota)' :
                                   src.includes('data:image/') ? '✅ Base64' :
                                   '⚠️ URL externa';
                        console.log(`   ${index + 1}. ${tipo}: ${src.substring(0, 50)}...`);
                    });
                } else {
                    console.log('   Ninguna imagen encontrada en el contenido');
                }

                // Mostrar extracto
                const textoPlano = contenido.replace(/<[^>]*>/g, '').trim();
                const extracto = textoPlano.substring(0, 150);
                console.log(`📝 Extracto: "${extracto}${textoPlano.length > 150 ? '...' : ''}"`);

            } else {
                console.log('❌ No hay contenido disponible');
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Función auxiliar para chunks (si existe)
async function loadContentFromChunks(claseId) {
    try {
        const chunksQuery = query(collection(db, 'class_chunks'), where('claseId', '==', claseId));
        const chunksSnapshot = await getDocs(chunksQuery);

        if (chunksSnapshot.empty) return null;

        const chunks = [];
        chunksSnapshot.forEach(doc => {
            chunks.push(doc.data());
        });

        chunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
        return chunks.map(chunk => chunk.content).join('');
    } catch (error) {
        throw error;
    }
}

// Ejecutar
revisarClasesBellezaSimple();