// admin/videos.js
// Lógica para subir y listar videos en Firestore

document.addEventListener('DOMContentLoaded', () => {
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
    // Usar proxy backend en lugar de Firebase client si está disponible
    const db = window.firebase && window.firebase.firestore ? window.firebase.firestore() : null;

    const form = document.getElementById('form-video');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const video = {
                titulo: form.titulo.value,
                enlace: form.enlace.value,
                descripcion: form.descripcion.value,
                programa: form.programa.value,
                fechaCreacion: new Date().toISOString()
            };
            try {
                if (typeof proxyPostCollection === 'function') {
                    await proxyPostCollection('videos', video);
                } else if (db) {
                    await db.collection('videos').add(video);
                } else {
                    throw new Error('No hay método para subir video');
                }
                form.reset();
                await loadVideos();
                alert('Video subido exitosamente');
            } catch (error) {
                console.error('Error subiendo video', error);
                alert('Error al subir el video');
            }
        });
    }

    window.loadVideos = async function() {
        const container = document.getElementById('videos-list');
        if (!container) return;
            try {
            let videos = [];
            if (typeof proxyGetCollection === 'function') {
                videos = await proxyGetCollection('videos');
            } else if (db) {
                const snapshot = await db.collection('videos').orderBy('fechaCreacion', 'desc').get();
                snapshot.forEach(doc => videos.push({ id: doc.id, ...doc.data() }));
            }
            if (videos.length === 0) {
                container.innerHTML = '<div class="content-item"><div class="content-info"><h5>No hay videos subidos</h5><p>Los videos que subas aparecerán aquí</p></div></div>';
                return;
            }
            container.innerHTML = videos.map(video => `
                <div class="content-item">
                    <div class="content-info">
                        <h5>${video.titulo}</h5>
                        <p>${video.programa} • Publicado: ${video.fechaCreacion?.split('T')[0]}</p>
                        <p style="color:#64748b;">${video.descripcion || ''}</p>
                        <a href="${video.enlace}" target="_blank" class="btn-view"><i class="fas fa-play"></i> Ver Video</a>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<div class="content-item"><div class="content-info"><h5>Error al cargar videos</h5><p>Intenta recargar la página</p></div></div>';
        }
    };

    window.loadVideos();
});
