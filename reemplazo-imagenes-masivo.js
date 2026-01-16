// Script para reemplazar imágenes rotas masivamente
// Ejecutar en admin.html

async function reemplazarImagenesRotasMasivo() {
    try {
        console.log('🔍 Buscando clases con imágenes rotas...');

        const snapshot = await db.collection('classes').get();
        const clasesConRotas = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.programa === 'Belleza Integral' && data.contenido) {
                // Buscar imágenes SVG rotas
                const svgMatches = data.contenido.match(/<img[^>]+src="data:image\/svg\+xml[^"]*[^>]*>/g);
                if (svgMatches && svgMatches.length > 0) {
                    clasesConRotas.push({
                        id: doc.id,
                        titulo: data.titulo,
                        contenido: data.contenido,
                        imagenesRotas: svgMatches.length,
                        svgMatches: svgMatches
                    });
                }
            }
        });

        console.log(`📊 Encontradas ${clasesConRotas.length} clases con imágenes rotas`);

        if (clasesConRotas.length === 0) {
            console.log('🎉 ¡No hay clases con imágenes rotas!');
            return;
        }

        // Mostrar resumen
        console.log('\n📋 CLASES QUE NECESITAN IMÁGENES:');
        clasesConRotas.forEach((clase, index) => {
            console.log(`${index + 1}. ${clase.titulo} - ${clase.imagenesRotas} imágenes rotas`);
        });

        // Crear interfaz para reemplazo masivo
        crearInterfazReemplazo(clasesConRotas);

        return clasesConRotas;

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function crearInterfazReemplazo(clasesConRotas) {
    // Crear modal para reemplazo masivo
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
        align-items: center; justify-content: center; font-family: Arial, sans-serif;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 800px; max-height: 80vh; overflow-y: auto; width: 90%;">
            <h2 style="margin: 0 0 20px 0; color: #1e3a8a;">🔧 Reemplazo Masivo de Imágenes Rotas</h2>
            <p style="margin: 0 0 20px 0; color: #64748b;">Se encontraron ${clasesConRotas.length} clases con imágenes rotas. Sube las imágenes correctas para reemplazarlas.</p>

            <div id="clases-lista" style="margin-bottom: 20px; max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 5px; padding: 10px;">
                ${clasesConRotas.map((clase, index) => `
                    <div style="margin-bottom: 10px; padding: 10px; background: #f8fafc; border-radius: 5px;">
                        <strong>${index + 1}. ${clase.titulo}</strong>
                        <br><small style="color: #6b7280;">${clase.imagenesRotas} imágenes rotas</small>
                        <div style="margin-top: 10px;">
                            <input type="file" id="file-${clase.id}" multiple accept="image/*" style="margin-bottom: 5px;">
                            <button onclick="procesarImagenesClase('${clase.id}')" style="background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Procesar Imágenes</button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Cancelar</button>
                <button onclick="location.reload()" style="background: #f59e0b; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Recargar Página</button>
                <button onclick="reemplazarTodasImagenes()" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Reemplazar Todas</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Hacer funciones globales para que funcionen los onclick
    window.procesarImagenesClase = async function(claseId) {
        const fileInput = document.getElementById(`file-${claseId}`);
        const files = fileInput.files;

        if (files.length === 0) {
            alert('Selecciona al menos una imagen');
            return;
        }

        console.log(`📤 Procesando ${files.length} imágenes para clase ${claseId}`);

        // Convertir archivos a base64
        const imagenesBase64 = [];
        for (let file of files) {
            const base64 = await fileToBase64(file);
            imagenesBase64.push(base64);
        }

        // Guardar en variable global para usar después
        if (!window.imagenesPorClase) window.imagenesPorClase = {};
        window.imagenesPorClase[claseId] = imagenesBase64;

        alert(`✅ ${files.length} imágenes procesadas para esta clase`);
    };

    window.reemplazarTodasImagenes = async function() {
        if (!window.imagenesPorClase || Object.keys(window.imagenesPorClase).length === 0) {
            alert('No hay imágenes procesadas. Procesa las imágenes de al menos una clase primero.');
            return;
        }

        const confirmacion = confirm(`¿Estás seguro de reemplazar las imágenes rotas en ${Object.keys(window.imagenesPorClase).length} clases?`);
        if (!confirmacion) return;

        console.log('🔄 Iniciando reemplazo masivo...');
        console.log('Clases a procesar:', Object.keys(window.imagenesPorClase));

        let procesadas = 0;
        let errores = 0;
        const resultados = [];

        for (const claseId of Object.keys(window.imagenesPorClase)) {
            try {
                console.log(`🔄 Procesando clase ${claseId}...`);
                const resultado = await reemplazarImagenesEnClase(claseId, window.imagenesPorClase[claseId]);
                procesadas++;
                resultados.push({ claseId, status: 'success', detalle: resultado });
                console.log(`✅ Clase ${claseId} actualizada correctamente`);
            } catch (error) {
                errores++;
                resultados.push({ claseId, status: 'error', error: error.message });
                console.error(`❌ Error en clase ${claseId}:`, error);
            }
        }

        // Mostrar resumen detallado
        console.log('\n📊 RESUMEN DEL REEMPLAZO MASIVO:');
        console.log(`✅ Clases actualizadas: ${procesadas}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`📋 Total procesadas: ${procesadas + errores}`);

        console.log('\n📋 DETALLE POR CLASE:');
        resultados.forEach(resultado => {
            if (resultado.status === 'success') {
                console.log(`✅ ${resultado.claseId}: ${resultado.detalle}`);
            } else {
                console.log(`❌ ${resultado.claseId}: ${resultado.error}`);
            }
        });

        // Mostrar alert con resumen
        const mensaje = `¡Completado!\n✅ Actualizadas: ${procesadas}\n❌ Errores: ${errores}\n\nRevisa la consola para más detalles.`;
        alert(mensaje);

        // No recargar automáticamente - dejar que el usuario vea los resultados
        // modal.remove();
        // location.reload();
    };
}

async function reemplazarImagenesEnClase(claseId, imagenesBase64) {
    const docRef = db.collection('classes').doc(claseId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        throw new Error('Clase no encontrada');
    }

    const data = docSnap.data();
    let contenido = data.contenido;
    let reemplazos = 0;

    console.log(`📝 Procesando clase ${claseId} - Contenido original: ${contenido.length} caracteres`);

    // Contar imágenes SVG antes del reemplazo
    const svgAntes = (contenido.match(/<img[^>]+src="data:image\/svg\+xml[^"]*"[^>]*>/g) || []).length;
    console.log(`🔍 Imágenes SVG encontradas: ${svgAntes}`);

    // Reemplazar cada imagen SVG con una imagen base64
    contenido = contenido.replace(/<img[^>]+src="data:image\/svg\+xml[^"]*"[^>]*>/g, (match) => {
        if (reemplazos < imagenesBase64.length) {
            const nuevaImagen = `<img src="${imagenesBase64[reemplazos]}" style="max-width: 100%; height: auto;">`;
            reemplazos++;
            console.log(`🔄 Reemplazando imagen ${reemplazos}/${imagenesBase64.length}`);
            return nuevaImagen;
        }
        return match; // Si no hay más imágenes, dejar la original
    });

    // Contar imágenes SVG después del reemplazo
    const svgDespues = (contenido.match(/<img[^>]+src="data:image\/svg\+xml[^"]*"[^>]*>/g) || []).length;
    const reemplazadas = svgAntes - svgDespues;

    console.log(`✅ Reemplazadas ${reemplazadas} imágenes SVG`);

    // Verificar tamaño del contenido
    const contenidoBytes = new Blob([contenido]).size;
    console.log(`📏 Tamaño del contenido: ${contenidoBytes} bytes`);

    const MAX_FIRESTORE_SIZE = 1048487; // ~1MB límite de Firestore

    if (contenidoBytes > MAX_FIRESTORE_SIZE) {
        console.log('⚠️ Contenido demasiado grande, dividiendo en chunks...');

        // Dividir en chunks
        const chunks = dividirEnChunks(contenido, 500000); // Chunks de ~500KB
        console.log(`📦 Dividido en ${chunks.length} chunks`);

        try {
            // Guardar chunks en colección separada usando batch
            const chunksCollection = db.collection('class_chunks');
            const batch = db.batch();

            // Crear IDs predecibles para los chunks
            const chunkRefs = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunkRef = chunksCollection.doc(`${claseId}_chunk_${i}`);
                chunkRefs.push(chunkRef);
                batch.set(chunkRef, {
                    claseId: claseId,
                    chunkIndex: i,
                    content: chunks[i],
                    createdAt: new Date()
                });
            }

            // Actualizar documento principal
            batch.update(docRef, {
                contenido: '', // Limpiar contenido principal
                hasChunks: true,
                totalChunks: chunks.length,
                fechaActualizacion: new Date()
            });

            // Ejecutar todo el batch
            await batch.commit();
            console.log('✅ Todos los chunks y documento principal guardados correctamente');

            return `Reemplazadas ${reemplazadas} imágenes - Contenido dividido en ${chunks.length} chunks (${contenidoBytes} bytes)`;
        } catch (chunkError) {
            console.error('❌ Error guardando chunks:', chunkError);
            // Si falla guardar chunks, intentar guardar el contenido normal
            console.log('⚠️ Intentando guardar contenido normal...');
            await docRef.update({
                contenido: contenido,
                hasChunks: false,
                fechaActualizacion: new Date()
            });
            return `Reemplazadas ${reemplazadas} imágenes - Error en chunks, guardado como contenido normal`;
        }
    } else {
        // Contenido normal, actualizar directamente
        await docRef.update({
            contenido: contenido,
            hasChunks: false,
            fechaActualizacion: new Date()
        });

        return `Reemplazadas ${reemplazadas} imágenes (${svgAntes} → ${svgDespues} SVG restantes)`;
    }
}

function dividirEnChunks(texto, tamanoMaximo) {
    const chunks = [];
    let inicio = 0;

    while (inicio < texto.length) {
        let fin = inicio + tamanoMaximo;

        // Intentar cortar en un lugar seguro (después de una etiqueta de cierre)
        if (fin < texto.length) {
            // Buscar el último '</p>' o '</div>' antes del límite
            const ultimoParrafo = texto.lastIndexOf('</p>', fin);
            const ultimoDiv = texto.lastIndexOf('</div>', fin);

            if (ultimoParrafo > inicio && ultimoParrafo > ultimoDiv) {
                fin = ultimoParrafo + 4; // +4 para incluir '</p>'
            } else if (ultimoDiv > inicio) {
                fin = ultimoDiv + 6; // +6 para incluir '</div>'
            }
            // Si no encuentra, corta en el límite
        }

        const chunk = texto.substring(inicio, fin);
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        inicio = fin;
    }

    return chunks;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Ejecutar
reemplazarImagenesRotasMasivo();