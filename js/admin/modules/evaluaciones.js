/**
 * Módulo de Evaluaciones - Charlotte Admin
 * Funciones relacionadas con gestión de evaluaciones
 */

export default {
    name: 'evaluaciones',
    
    init: function() {
        console.log('Evaluaciones module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        // Funciones principales de Evaluaciones desde admin.html
        if (typeof window.loadEvaluacionesList !== 'function') {
            window.loadEvaluacionesList = this.loadEvaluacionesList;
        }
        if (typeof window.loadEvaluacionesManager !== 'function') {
            window.loadEvaluacionesManager = this.loadEvaluacionesManager;
        }
        if (typeof window.loadEvaluacionPreview !== 'function') {
            window.loadEvaluacionPreview = this.loadEvaluacionPreview;
        }
        if (typeof window.verDetalleEvaluacion !== 'function') {
            window.verDetalleEvaluacion = this.verDetalleEvaluacion;
        }
        if (typeof window.eliminarEvaluacion !== 'function') {
            window.eliminarEvaluacion = this.eliminarEvaluacion;
        }
        if (typeof window.editarEvaluacion !== 'function') {
            window.editarEvaluacion = this.editarEvaluacion;
        }
        if (typeof window.guardarEdicionEvaluacion !== 'function') {
            window.guardarEdicionEvaluacion = this.guardarEdicionEvaluacion;
        }
        if (typeof window.duplicarEvaluacion !== 'function') {
            window.duplicarEvaluacion = this.duplicarEvaluacion;
        }
        if (typeof window.loadResultadosEvaluaciones !== 'function') {
            window.loadResultadosEvaluaciones = this.loadResultadosEvaluaciones;
        }
        if (typeof window.loadEvaluacionesForNoRespondidos !== 'function') {
            window.loadEvaluacionesForNoRespondidos = this.loadEvaluacionesForNoRespondidos;
        }
        if (typeof window.loadNoRespondidosEvaluaciones !== 'function') {
            window.loadNoRespondidosEvaluaciones = this.loadNoRespondidosEvaluaciones;
        }
        if (typeof window.recargarEvaluaciones !== 'function') {
            window.recargarEvaluaciones = this.recargarEvaluaciones;
        }
        if (typeof window.closeEvaluacionPreview !== 'function') {
            window.closeEvaluacionPreview = this.closeEvaluacionPreview;
        }
        if (typeof window.editEvaluacionPreview !== 'function') {
            window.editEvaluacionPreview = this.editEvaluacionPreview;
        }
        if (typeof window.filtrarResultadosEvaluaciones !== 'function') {
            window.filtrarResultadosEvaluaciones = this.filtrarResultadosEvaluaciones;
        }
        console.log('✅ Funciones de Evaluaciones expuestas al ámbito global');
    },
    
    // Recargar evaluaciones
    recargarEvaluaciones: function() {
        if (typeof loadEvaluacionesManager === 'function') {
            loadEvaluacionesManager();
        }
    },
    
    // Cerrar preview de evaluación
    closeEvaluacionPreview: function() {
        const modal = document.getElementById('evaluacionPreviewModal');
        if (modal) {
            modal.style.display = 'none';
        }
        // Limpiar datos globales si existen
        if (typeof evaluacionPreviewData !== 'undefined') {
            evaluacionPreviewData = null;
        }
    },
    
    // Editar preview de evaluación
    editEvaluacionPreview: function() {
        this.closeEvaluacionPreview();
    },
    
    // Filtrar resultados de evaluaciones
    filtrarResultadosEvaluaciones: function() {
        if (typeof loadResultadosEvaluaciones === 'function') {
            loadResultadosEvaluaciones();
        }
    },
    
    // Cargar lista de evaluaciones
    loadList: async function() {
        if (typeof loadEvaluacionesManager === 'function') {
            return await loadEvaluacionesManager();
        }
    },
    
    // Ver evaluación
    view: async function(evaluacionId) {
        if (typeof viewEvaluacion === 'function') {
            await viewEvaluacion(evaluacionId);
        }
    },
    
    // Preview de evaluación
    loadPreview: async function(evaluacionId) {
        if (typeof loadEvaluacionPreview === 'function') {
            await loadEvaluacionPreview(evaluacionId);
        }
    },
    
    // Publicar evaluación
    publish: async function() {
        if (typeof publishEvaluacionPreview === 'function') {
            await publishEvaluacionPreview();
        }
    },
    
    // Cargar resultados
    loadResultados: async function() {
        if (typeof loadResultadosEvaluaciones === 'function') {
            return await loadResultadosEvaluaciones();
        }
    },
    
    // Ver detalle de respuesta
    verDetalleRespuesta: async function(respuestaId) {
        if (typeof verDetalleRespuestaEvaluacion === 'function') {
            await verDetalleRespuestaEvaluacion(respuestaId);
        }
    },
    
    // Permitir reintento
    permitirReintento: async function(respuestaId, estudianteId, evaluacionId) {
        if (typeof permitirReintentoEvaluacion === 'function') {
            await permitirReintentoEvaluacion(respuestaId, estudianteId, evaluacionId);
        }
    }
};
