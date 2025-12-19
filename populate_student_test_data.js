// Script para poblar datos de prueba en Firestore para el dashboard del estudiante
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
    authDomain: "charlotte-a0d47.firebaseapp.com",
    projectId: "charlotte-a0d47",
    storageBucket: "charlotte-a0d47.firebasestorage.app",
    messagingSenderId: "971007838036",
    appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function populateStudentData() {
    try {
        console.log('Agregando datos de prueba para estudiante...');

        // Clases de ejemplo
        const clasesData = [
            {
                titulo: 'Introducción a la Panadería',
                descripcion: 'Fundamentos básicos de la panadería artesanal',
                programa: 'panaderia',
                fecha: new Date('2024-01-15'),
                duracion: '2 horas',
                instructor: 'Chef María González'
            },
            {
                titulo: 'Técnicas de Amasado',
                descripcion: 'Aprende las técnicas correctas de amasado para diferentes tipos de masa',
                programa: 'panaderia',
                fecha: new Date('2024-01-22'),
                duracion: '3 horas',
                instructor: 'Chef Carlos Rodríguez'
            },
            {
                titulo: 'Decoración Profesional',
                descripcion: 'Técnicas avanzadas de decoración para pasteles y tortas',
                programa: 'belleza',
                fecha: new Date('2024-01-20'),
                duracion: '4 horas',
                instructor: 'Chef Ana López'
            }
        ];

        for (const clase of clasesData) {
            await addDoc(collection(db, 'classes'), clase);
            console.log('Clase agregada:', clase.titulo);
        }

        // Videos de ejemplo
        const videosData = [
            {
                titulo: 'Cómo hacer pan integral',
                descripcion: 'Tutorial paso a paso para elaborar pan integral saludable',
                programa: 'panaderia',
                url: 'https://www.youtube.com/watch?v=example1',
                duracion: '15 minutos',
                categoria: 'panes-basicos'
            },
            {
                titulo: 'Decoración con buttercream',
                descripcion: 'Técnicas profesionales de decoración con buttercream',
                programa: 'belleza',
                url: 'https://www.youtube.com/watch?v=example2',
                duracion: '20 minutos',
                categoria: 'decoracion'
            },
            {
                titulo: 'Masas para pizza',
                descripcion: 'Receta y técnicas para masa de pizza perfecta',
                programa: 'panaderia',
                url: 'https://www.youtube.com/watch?v=example3',
                duracion: '12 minutos',
                categoria: 'panes-especiales'
            }
        ];

        for (const video of videosData) {
            await addDoc(collection(db, 'content'), video);
            console.log('Video agregado:', video.titulo);
        }

        // Actividades de ejemplo
        const actividadesData = [
            {
                titulo: 'Práctica de Amasado',
                descripcion: 'Ejercicio práctico de técnicas de amasado con diferentes tipos de harina',
                programa: 'panaderia',
                tipo: 'practica',
                fechaEntrega: new Date('2024-02-01'),
                instrucciones: 'Prepara una masa de pan integral siguiendo los pasos del video tutorial'
            },
            {
                titulo: 'Proyecto de Decoración',
                descripcion: 'Crea un diseño original para un pastel de cumpleaños',
                programa: 'belleza',
                tipo: 'proyecto',
                fechaEntrega: new Date('2024-02-05'),
                instrucciones: 'Utiliza las técnicas aprendidas para decorar un pastel temático'
            },
            {
                titulo: 'Análisis de Recetas',
                descripcion: 'Analiza y modifica una receta tradicional de pan',
                programa: 'panaderia',
                tipo: 'teorica',
                fechaEntrega: new Date('2024-01-30'),
                instrucciones: 'Estudia los ingredientes y proporciones de la receta proporcionada'
            }
        ];

        for (const actividad of actividadesData) {
            await addDoc(collection(db, 'activities'), actividad);
            console.log('Actividad agregada:', actividad.titulo);
        }

        // Materiales de ejemplo
        const materialesData = [
            {
                titulo: 'Guía de Ingredientes',
                descripcion: 'Lista completa de ingredientes para panadería con especificaciones técnicas',
                programa: 'panaderia',
                tipo: 'pdf',
                url: 'https://drive.google.com/example-ingredientes.pdf',
                tamano: '2.5 MB'
            },
            {
                titulo: 'Tabla de Conversiones',
                descripcion: 'Tabla de equivalencias y conversiones métricas para recetas',
                programa: 'belleza',
                tipo: 'xlsx',
                url: 'https://docs.google.com/spreadsheets/example-conversiones',
                tamano: '150 KB'
            },
            {
                titulo: 'Manual de Técnicas',
                descripcion: 'Manual completo de técnicas de panadería y pastelería',
                programa: 'panaderia',
                tipo: 'pdf',
                url: 'https://drive.google.com/example-manual.pdf',
                tamano: '15 MB'
            }
        ];

        for (const material of materialesData) {
            await addDoc(collection(db, 'materials'), material);
            console.log('Material agregado:', material.titulo);
        }

        // Cuestionarios de ejemplo
        const cuestionariosData = [
            {
                titulo: 'Evaluación de Fundamentos',
                descripcion: 'Cuestionario sobre conceptos básicos de panadería',
                programa: 'panaderia',
                preguntas: [
                    {
                        pregunta: '¿Cuál es la temperatura ideal para el levado de la masa?',
                        opciones: ['20-25°C', '30-35°C', '40-45°C', '15-20°C'],
                        respuestaCorrecta: 0
                    },
                    {
                        pregunta: '¿Qué tipo de harina se usa para pan integral?',
                        opciones: ['Harina 000', 'Harina 0000', 'Harina integral', 'Harina de maíz'],
                        respuestaCorrecta: 2
                    }
                ],
                tiempoLimite: 30,
                fechaCreacion: new Date()
            },
            {
                titulo: 'Técnicas de Decoración',
                descripcion: 'Evaluación de conocimientos sobre decoración profesional',
                programa: 'belleza',
                preguntas: [
                    {
                        pregunta: '¿Cuál es la consistencia ideal del buttercream para decoración?',
                        opciones: ['Muy líquido', 'Como mayonesa', 'Como mantequilla', 'Como crema chantilly'],
                        respuestaCorrecta: 1
                    }
                ],
                tiempoLimite: 20,
                fechaCreacion: new Date()
            }
        ];

        for (const cuestionario of cuestionariosData) {
            await addDoc(collection(db, 'cuestionarios'), cuestionario);
            console.log('Cuestionario agregado:', cuestionario.titulo);
        }

        // Evaluaciones de ejemplo
        const evaluacionesData = [
            {
                titulo: 'Proyecto Final Panadería',
                descripcion: 'Evaluación final del módulo de panadería básica',
                programa: 'panaderia',
                tipo: 'proyecto',
                fechaEntrega: new Date('2024-03-01'),
                criterios: ['Técnica', 'Presentación', 'Sabor', 'Creatividad'],
                peso: 40
            },
            {
                titulo: 'Examen Teórico Belleza',
                descripcion: 'Evaluación teórica de técnicas de belleza y decoración',
                programa: 'belleza',
                tipo: 'examen',
                fechaEntrega: new Date('2024-02-15'),
                criterios: ['Conocimiento teórico', 'Aplicación práctica'],
                peso: 30
            }
        ];

        for (const evaluacion of evaluacionesData) {
            await addDoc(collection(db, 'evaluaciones'), evaluacion);
            console.log('Evaluación agregada:', evaluacion.titulo);
        }

        console.log('¡Datos de prueba para estudiante agregados exitosamente!');

    } catch (error) {
        console.error('Error agregando datos de prueba:', error);
    }
}

populateStudentData();