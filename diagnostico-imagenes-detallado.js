// Script de diagnóstico detallado para imágenes rotas
// Ejecutar en admin.html

async function diagnosticarImagenesRotas() {
    try {
        console.log('🔍 DIAGNÓSTICO DETALLADO: Buscando imágenes rotas...');

        const snapshot = await getDocs(collection(db, 'classes'));
        console.log(`📊 Total de clases en BD: ${snapshot.size}`);

        let totalClasesBelleza = 0;
        let clasesConContenido = 0;
        let clasesConChunks = 0;
        let clasesConImagenes = 0;
        let clasesConSVG = 0;
        let detalleClases = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const clase = { id: doc.id, ...data };

            // Solo procesar clases de belleza
            if (data.programa === 'Belleza Integral') {
                totalClasesBelleza++;
                console.log(`\n📖 Revisando: ${data.titulo} (ID: ${doc.id})`);

                let contenido = data.contenido;
                let tieneChunks = false;

                // Verificar si tiene chunks
                if (data.hasChunks) {
                    console.log('  📦 Tiene chunks - intentando cargar...');
                    clasesConChunks++;
                    tieneChunks = true;
                }

                // Si tiene contenido directo
                if (contenido) {
                    clasesConContenido++;
                    console.log(`  📝 Contenido directo: ${contenido.length} caracteres`);
                }

                // Buscar imágenes en el contenido
                if (contenido) {
                    const allImages = contenido.match(/<img[^>]+src="[^"]*"[^>]*>/g) || [];
                    const svgImages = contenido.match(/<img[^>]+src="data:image\/svg\+xml[^"]*"[^>]*>/g) || [];
                    const base64Images = contenido.match(/<img[^>]+src="data:image\/[^;]+;base64,[^"]*"[^>]*>/g) || [];

                    console.log(`  🖼️  Total imágenes: ${allImages.length}`);
                    console.log(`  ❌ Imágenes SVG (rotas): ${svgImages.length}`);
                    console.log(`  ✅ Imágenes Base64: ${base64Images.length}`);

                    if (allImages.length > 0) {
                        clasesConImagenes++;
                    }

                    if (svgImages.length > 0) {
                        clasesConSVG++;
                        console.log('  🚨 ¡TIENE IMÁGENES ROTAS!');
                    }

                    detalleClases.push({
                        titulo: data.titulo,
                        id: doc.id,
                        modulo: data.modulo,
                        tieneContenido: !!contenido,
                        tieneChunks: tieneChunks,
                        totalImagenes: allImages.length,
                        imagenesSVG: svgImages.length,
                        imagenesBase64: base64Images.length,
                        contenidoLength: contenido ? contenido.length : 0
                    });
                } else {
                    console.log('  ⚠️  Sin contenido');
                    detalleClases.push({
                        titulo: data.titulo,
                        id: doc.id,
                        modulo: data.modulo,
                        tieneContenido: false,
                        tieneChunks: tieneChunks,
                        totalImagenes: 0,
                        imagenesSVG: 0,
                        imagenesBase64: 0,
                        contenidoLength: 0
                    });
                }
            }
        });

        // Resumen final
        console.log('\n📊 RESUMEN FINAL:');
        console.log(`🎨 Total clases de Belleza: ${totalClasesBelleza}`);
        console.log(`📝 Con contenido directo: ${clasesConContenido}`);
        console.log(`📦 Con chunks: ${clasesConChunks}`);
        console.log(`🖼️  Con imágenes: ${clasesConImagenes}`);
        console.log(`❌ Con imágenes SVG rotas: ${clasesConSVG}`);

        console.log('\n📋 DETALLE DE TODAS LAS CLASES:');
        detalleClases.forEach((clase, index) => {
            const status = clase.imagenesSVG > 0 ? '❌ ROTAS' :
                          clase.totalImagenes > 0 ? '✅ OK' : '📝 SIN IMÁGENES';
            console.log(`${index + 1}. ${clase.titulo} (${clase.modulo}) - ${status} - IMG: ${clase.totalImagenes} - SVG: ${clase.imagenesSVG}`);
        });

        if (clasesConSVG === 0) {
            console.log('\n🎉 ¡EXCELENTE! No hay clases con imágenes rotas.');
            console.log('💡 Si antes había imágenes rotas, significa que ya fueron corregidas.');
        } else {
            console.log(`\n🚨 HAY ${clasesConSVG} CLASES CON IMÁGENES ROTAS QUE NECESITAN ATENCIÓN.`);
        }

        return {
            totalClasesBelleza,
            clasesConContenido,
            clasesConChunks,
            clasesConImagenes,
            clasesConSVG,
            detalleClases
        };

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        console.error('Stack:', error.stack);
    }
}

// Ejecutar diagnóstico
diagnosticarImagenesRotas();