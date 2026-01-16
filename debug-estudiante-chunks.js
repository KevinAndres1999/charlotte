// Script de debug para estudiante.html - verificar carga de clases con chunks
// Ejecutar en estudiante.html

function debugLoadClaseDetail() {
    // Sobrescribir la función loadClaseDetail para agregar logging
    const originalLoadClaseDetail = window.loadClaseDetail;

    window.loadClaseDetail = async function(id) {
        console.log('🔍 DEBUG: loadClaseDetail llamado con ID:', id);

        try {
            const docRef = doc(db, 'classes', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const clase = docSnap.data();
                console.log('📄 Clase encontrada:', clase.titulo);
                console.log('📦 hasChunks:', clase.hasChunks);
                console.log('📝 contenido length:', clase.contenido ? clase.contenido.length : 0);

                // Cargar contenido (desde chunks si es necesario)
                let content = clase.contenido;
                console.log('📖 Contenido inicial:', content ? `${content.length} caracteres` : 'null/undefined');

                if (clase.hasChunks) {
                    console.log('🔄 Cargando desde chunks...');
                    try {
                        content = await loadContentFromChunks(id);
                        console.log('✅ Contenido desde chunks:', content ? `${content.length} caracteres` : 'null');
                    } catch (chunkError) {
                        console.error('❌ Error cargando chunks:', chunkError);
                        content = null;
                    }
                } else {
                    console.log('📝 Usando contenido directo (no chunks)');
                }

                // Verificar resultado final
                const finalContent = content || 'No hay contenido disponible para esta clase.';
                console.log('🎯 Contenido final que se mostrará:', finalContent.substring(0, 100) + '...');

                // Actualizar contenido
                const contentElement = document.getElementById('clase-viewer-content');
                if (contentElement) {
                    contentElement.innerHTML = finalContent;
                    console.log('✅ Contenido actualizado en DOM');
                } else {
                    console.error('❌ No se encontró elemento clase-viewer-content');
                }

            } else {
                console.error('❌ Clase no encontrada en Firestore');
            }

        } catch (error) {
            console.error('❌ Error en loadClaseDetail:', error);
        }

        // Llamar a la función original para que siga funcionando normalmente
        return originalLoadClaseDetail.call(this, id);
    };

    console.log('🐛 Debug activado - loadClaseDetail ahora tiene logging detallado');
}

// Activar debug
debugLoadClaseDetail();