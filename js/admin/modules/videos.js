/**
 * Módulo de Videos - Charlotte Admin
 * Funciones relacionadas con gestión de videos
 */

export default {
    name: 'videos',
    
    init: function() {
        console.log('Videos module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        if (typeof window.loadVideosList !== 'function') {
            window.loadVideosList = this.loadVideosList;
        }
        if (typeof window.loadVideoPreview !== 'function') {
            window.loadVideoPreview = this.loadVideoPreview;
        }
        if (typeof window.viewVideo !== 'function') {
            window.viewVideo = this.viewVideo;
        }
        console.log('✅ Funciones de Videos expuestas al ámbito global');
    },
    
    // Cargar lista de videos
    loadVideosList: async function() {
        if (typeof loadVideosList === 'function') {
            return await loadVideosList();
        }
    },
    
    // Ver video
    view: async function(videoId) {
        if (typeof viewVideo === 'function') {
            await viewVideo(videoId);
        }
    },
    
    // Preview de video
    loadVideoPreview: async function(videoId) {
        if (typeof loadVideoPreview === 'function') {
            await loadVideoPreview(videoId);
        }
    }
};
