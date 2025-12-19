// Script para agregar datos de prueba desde el navegador
// Ejecutar en la consola del navegador en estudiante.html

async function addTestData() {
    try {
        // Fotos de ejemplo
        const fotos = [
            {
                titulo: 'Tarta de Chocolate Artesanal',
                descripcion: 'Tarta de chocolate con decoración profesional realizada por estudiante avanzado.',
                url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
                categoria: 'pasteleria'
            },
            {
                titulo: 'Pan Artesanal de Centeno',
                descripcion: 'Pan de centeno con semillas, horneado a la manera tradicional.',
                url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
                categoria: 'panaderia'
            }
        ];

        for (const foto of fotos) {
            await addDoc(collection(db, 'fotos'), foto);
            console.log('Foto agregada:', foto.titulo);
        }

        // Recursos de ejemplo
        const recursos = [
            {
                titulo: 'Recetario Digital Completo',
                descripcion: 'Accede a nuestro recetario digital con más de 200 recetas profesionales.',
                url: 'https://example.com/recetario',
                icono: 'book',
                categoria: 'recetas'
            },
            {
                titulo: 'Videos Tutoriales Premium',
                descripcion: 'Biblioteca completa de videos tutoriales con técnicas avanzadas.',
                url: 'https://example.com/videos',
                icono: 'video',
                categoria: 'videos'
            }
        ];

        for (const recurso of recursos) {
            await addDoc(collection(db, 'recursos'), recurso);
            console.log('Recurso agregado:', recurso.titulo);
        }

        // Contactos de ejemplo
        const contactos = [
            {
                nombre: 'María González',
                rol: 'Chef Pastelera Senior',
                email: 'maria.gonzalez@charlotte.edu',
                telefono: '+57 300 123 4567',
                especialidad: 'Decoración Profesional'
            },
            {
                nombre: 'Carlos Rodríguez',
                rol: 'Chef Panadero Maestro',
                email: 'carlos.rodriguez@charlotte.edu',
                telefono: '+57 300 234 5678',
                especialidad: 'Pan Artesanal'
            }
        ];

        for (const contacto of contactos) {
            await addDoc(collection(db, 'contactos'), contacto);
            console.log('Contacto agregado:', contacto.nombre);
        }

        console.log('Datos de prueba agregados exitosamente');
        // Recargar recursos
        loadRecursos();

    } catch (error) {
        console.error('Error:', error);
    }
}

// Para ejecutar: addTestData()