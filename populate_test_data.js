// Script para poblar datos de prueba en Firestore para recursos premium
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function populateTestData() {
    try {
        console.log('Agregando datos de prueba...');

        // Fotos de ejemplo
        const fotosData = [
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
            },
            {
                titulo: 'Cupcakes de Vainilla',
                descripcion: 'Cupcakes decorados con buttercream y toppings variados.',
                url: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=400',
                categoria: 'pasteleria'
            }
        ];

        for (const foto of fotosData) {
            await addDoc(collection(db, 'fotos'), foto);
            console.log('Foto agregada:', foto.titulo);
        }

        // Recursos de ejemplo
        const recursosData = [
            {
                titulo: 'Recetario Digital Completo',
                descripcion: 'Accede a nuestro recetario digital con más de 200 recetas profesionales de panadería y pastelería.',
                url: 'https://drive.google.com/example-recetario',
                icono: 'book',
                categoria: 'recetas'
            },
            {
                titulo: 'Videos Tutoriales Premium',
                descripcion: 'Biblioteca completa de videos tutoriales con técnicas avanzadas de decoración y horneado.',
                url: 'https://youtube.com/playlist/example',
                icono: 'video',
                categoria: 'videos'
            },
            {
                titulo: 'Guía de Proveedores',
                descripcion: 'Directorio de proveedores confiables para ingredientes y equipos de calidad profesional.',
                url: 'https://docs.google.com/document/example-proveedores',
                icono: 'store',
                categoria: 'proveedores'
            },
            {
                titulo: 'Plantillas de Costos',
                descripcion: 'Hojas de cálculo para calcular costos de producción y precios de venta.',
                url: 'https://docs.google.com/spreadsheets/example-costos',
                icono: 'calculator',
                categoria: 'negocio'
            }
        ];

        for (const recurso of recursosData) {
            await addDoc(collection(db, 'recursos'), recurso);
            console.log('Recurso agregado:', recurso.titulo);
        }

        // Contactos de ejemplo
        const contactosData = [
            {
                nombre: 'María González',
                rol: 'Chef Pastelera Senior',
                email: 'maria.gonzalez@charlotte.edu',
                telefono: '+57 300 123 4567',
                especialidad: 'Decoración Profesional',
                ubicacion: 'Bogotá'
            },
            {
                nombre: 'Carlos Rodríguez',
                rol: 'Chef Panadero Maestro',
                email: 'carlos.rodriguez@charlotte.edu',
                telefono: '+57 300 234 5678',
                especialidad: 'Pan Artesanal',
                ubicacion: 'Medellín'
            },
            {
                nombre: 'Ana López',
                rol: 'Consultora de Negocios',
                email: 'ana.lopez@charlotte.edu',
                telefono: '+57 300 345 6789',
                especialidad: 'Emprendimiento Gastronómico',
                ubicacion: 'Cali'
            }
        ];

        for (const contacto of contactosData) {
            await addDoc(collection(db, 'contactos'), contacto);
            console.log('Contacto agregado:', contacto.nombre);
        }

        console.log('¡Datos de prueba agregados exitosamente!');

    } catch (error) {
        console.error('Error agregando datos de prueba:', error);
    }
}

populateTestData();