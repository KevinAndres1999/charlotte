// estudiante/videos.js
// Lógica para ver videos subidos por el admin

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
    const db = window.firebase.firestore();

    async function loadVideos() {
        const container = document.getElementById('videos-list');
        if (!container) return;
        try {
            const snapshot = await db.collection('videos').orderBy('fechaCreacion', 'desc').get();
            const videos = [];
            snapshot.forEach(doc => videos.push({ id: doc.id, ...doc.data() }));
            if (videos.length === 0) {
                container.innerHTML = '<div class="content-item"><div class="content-info"><h5>No hay videos publicados</h5><p>Cuando el administrador publique videos aparecerán aquí</p></div></div>';
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
    }

    loadVideos();
});
