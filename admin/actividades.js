// admin/actividades.js
// Lógica para subir y listar actividades en Firestore

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Firebase si no está inicializado
    if (!window.firebase || !window.firebase.apps?.length) {
        const firebaseConfig = {
            apiKey: "AIzaSyCBpoxr8yhAfCVqP00b6DKtMA0JWljlMMA",
            authDomain: "charlotte-babda.firebaseapp.com",
            projectId: "charlotte-babda",
            storageBucket: "charlotte-babda.firebasestorage.app",
            messagingSenderId: "486360806502",
            appId: "1:486360806502:web:d82fb7f351b8fe4587a9a7"
        };
        window.firebase.initializeApp(firebaseConfig);
    }
    const db = window.firebase.firestore();

    // Subida de actividad
    const form = document.getElementById('form-actividad');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const actividad = {
                titulo: form.titulo.value,
                instrucciones: form.instrucciones.value,
                fecha: form.fecha.value,
                programa: form.programa.value,
                fechaCreacion: new Date().toISOString()
            };
            try {
                await db.collection('actividades').add(actividad);
                form.reset();
                await loadActividades();
                alert('Actividad guardada exitosamente');
            } catch (error) {
                alert('Error al guardar la actividad');
            }
        });
    }

    // Listado de actividades
    window.loadActividades = async function() {
        const container = document.getElementById('actividades-list');
        if (!container) return;
        try {
            const snapshot = await db.collection('actividades').orderBy('fechaCreacion', 'desc').get();
            const actividades = [];
            snapshot.forEach(doc => actividades.push({ id: doc.id, ...doc.data() }));
            if (actividades.length === 0) {
                container.innerHTML = '<div class="content-item"><div class="content-info"><h5>No hay actividades creadas</h5><p>Las actividades que crees aparecerán aquí</p></div></div>';
                return;
            }
            container.innerHTML = actividades.map(actividad => `
                <div class="content-item">
                    <div class="content-info">
                        <h5>${actividad.titulo}</h5>
                        <p>${actividad.programa} • Entrega: ${actividad.fecha || 'Sin fecha'} • Creada: ${actividad.fechaCreacion?.split('T')[0]}</p>
                        <p style="color:#64748b;">${actividad.instrucciones || ''}</p>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<div class="content-item"><div class="content-info"><h5>Error al cargar actividades</h5><p>Intenta recargar la página</p></div></div>';
        }
    };

    // Cargar actividades al iniciar
    window.loadActividades();
});
