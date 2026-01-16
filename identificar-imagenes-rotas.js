// Script para identificar clases con imágenes rotas
// Ejecutar en la consola del navegador en admin.html

async function revisarContenidoClasesBelleza() {
    try {
        const snapshot = await getDocs(collection(db, 'classes'));
        const clasesBelleza = [];

        snapshot.forEach(doc => {
            const clase = { id: doc.id, ...doc.data() };
            if (clase.programa === 'Belleza Integral') {
                clasesBelleza.push({
                    id: clase.id,
                    titulo: clase.titulo,
                    fecha: clase.fechaCreacion ? new Date(clase.fechaCreacion).toLocaleDateString('es-ES') : 'Sin fecha',
                    contenidoLength: clase.contenido ? clase.contenido.length : 0,
                    hasContenido: !!clase.contenido,
                    hasChunks: clase.hasChunks || false
                });
            }
        });

        // Ordenar por fecha descendente
        clasesBelleza.sort((a, b) => {
            if (!a.fecha || a.fecha === 'Sin fecha') return 1;
            if (!b.fecha || b.fecha === 'Sin fecha') return -1;
            return new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-'));
        });

        console.log('Clases de Belleza Integral encontradas:', clasesBelleza.length);
        console.table(clasesBelleza.slice(0, 10)); // Mostrar las 10 más recientes

        // Revisar el contenido de las últimas 4 clases
        console.log('\n=== REVISANDO CONTENIDO DE LAS ÚLTIMAS 4 CLASES ===');

        for (let i = 0; i < Math.min(4, clasesBelleza.length); i++) {
            const clase = clasesBelleza[i];
            console.log(`\n--- CLASE ${i + 1}: ${clase.titulo} ---`);
            console.log('ID:', clase.id);

            // Obtener el documento completo
            const docRef = doc(db, 'classes', clase.id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                let contenido = data.contenido;

                if (data.hasChunks) {
                    console.log('Esta clase tiene chunks, cargando contenido...');
                    contenido = await loadContentFromChunks(data.id);
                }

                if (contenido) {
                    // Buscar imágenes en el contenido
                    const imgRegex = /<img[^>]+src="([^"]+)"/g;
                    const images = [];
                    let match;
                    while ((match = imgRegex.exec(contenido)) !== null) {
                        images.push(match[1]);
                    }

                    console.log('Imágenes encontradas:', images.length);
                    images.forEach((src, index) => {
                        console.log(`  Imagen ${index + 1}:`, src.substring(0, 100) + (src.length > 100 ? '...' : ''));
                        if (src.includes('data:image/svg+xml')) {
                            console.log('  ❌ Esta imagen es un SVG placeholder (imagen rota)');
                        } else if (src.includes('data:image/')) {
                            console.log('  ✅ Esta imagen está en base64');
                        } else {
                            console.log('  ⚠️  Esta imagen es una URL externa');
                        }
                    });

                    // Mostrar un extracto del contenido
                    const extracto = contenido.replace(/<[^>]*>/g, '').substring(0, 200);
                    console.log('Extracto del contenido:', extracto + (contenido.length > 200 ? '...' : ''));

                } else {
                    console.log('❌ No hay contenido');
                }
            } else {
                console.log('❌ No se pudo cargar el documento');
            }
        }

        return clasesBelleza;
    } catch (error) {
        console.error('Error revisando clases:', error);
    }
}

// Función auxiliar para cargar contenido desde chunks (copiada del código)
async function loadContentFromChunks(claseId) {
    try {
        const chunksQuery = query(collection(db, 'class_chunks'), where('claseId', '==', claseId));
        const chunksSnapshot = await getDocs(chunksQuery);

        if (chunksSnapshot.empty) {
            return null;
        }

        const chunks = [];
        chunksSnapshot.forEach(doc => {
            chunks.push({
                content: doc.data().content,
                chunkIndex: doc.data().chunkIndex || 0
            });
        });

        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
        return chunks.map(chunk => chunk.content).join('');
    } catch (error) {
        console.error('Error loading content from chunks:', error);
        return null;
    }
}

// Ejecutar la función
revisarContenidoClasesBelleza();