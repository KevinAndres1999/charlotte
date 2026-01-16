// Script para identificar clases con imágenes rotas
// Ejecutar en la consola del navegador en admin.html

async function identificarClasesConImagenesRotas() {
    try {
        const snapshot = await getDocs(collection(db, 'classes'));
        const clasesConImagenesRotas = [];

        snapshot.forEach(doc => {
            const clase = { id: doc.id, ...doc.data() };
            // Buscar el placeholder de imagen removida en el contenido
            if (clase.contenido && clase.contenido.includes('Imagen removida')) {
                clasesConImagenesRotas.push({
                    id: clase.id,
                    titulo: clase.titulo,
                    programa: clase.programa,
                    modulo: clase.modulo
                });
            }
        });

        console.log('Clases con imágenes rotas encontradas:', clasesConImagenesRotas.length);
        console.table(clasesConImagenesRotas);

        return clasesConImagenesRotas;
    } catch (error) {
        console.error('Error identificando clases:', error);
    }
}

// Ejecutar la función
identificarClasesConImagenesRotas();