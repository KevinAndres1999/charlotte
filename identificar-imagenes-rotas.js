// Script para identificar clases con imágenes rotas
// Ejecutar en la consola del navegador en admin.html

async function identificarClasesConImagenesRotas() {
    try {
        const snapshot = await getDocs(collection(db, 'classes'));
        const clasesConImagenesRotas = [];

        snapshot.forEach(doc => {
            const clase = { id: doc.id, ...doc.data() };
            // Buscar diferentes placeholders de imágenes rotas/removidas
            const placeholders = [
                'Imagen removida',
                'Imagen muy grande',
                'data:image/svg+xml;base64,PHN2Zy', // SVG placeholder
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCI' // SVG específico
            ];

            const tieneImagenRota = placeholders.some(placeholder =>
                clase.contenido && clase.contenido.includes(placeholder)
            );

            if (tieneImagenRota) {
                clasesConImagenesRotas.push({
                    id: clase.id,
                    titulo: clase.titulo,
                    programa: clase.programa,
                    modulo: clase.modulo,
                    fecha: clase.fechaCreacion ? new Date(clase.fechaCreacion).toLocaleDateString('es-ES') : 'Sin fecha'
                });
            }
        });

        console.log('Clases con imágenes rotas encontradas:', clasesConImagenesRotas.length);
        console.table(clasesConImagenesRotas);

        // También mostrar las últimas 4 clases para comparación
        const todasLasClases = [];
        snapshot.forEach(doc => {
            const clase = { id: doc.id, ...doc.data() };
            todasLasClases.push({
                id: clase.id,
                titulo: clase.titulo,
                programa: clase.programa,
                fecha: clase.fechaCreacion ? new Date(clase.fechaCreacion).toLocaleDateString('es-ES') : 'Sin fecha'
            });
        });

        // Ordenar por fecha descendente
        todasLasClases.sort((a, b) => {
            if (!a.fecha || a.fecha === 'Sin fecha') return 1;
            if (!b.fecha || b.fecha === 'Sin fecha') return -1;
            return new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-'));
        });

        console.log('\nÚltimas 4 clases subidas:');
        console.table(todasLasClases.slice(0, 4));

        return clasesConImagenesRotas;
    } catch (error) {
        console.error('Error identificando clases:', error);
    }
}

// Ejecutar la función
identificarClasesConImagenesRotas();