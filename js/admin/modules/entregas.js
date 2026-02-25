/**
 * Módulo de Entregas - Charlotte Admin
 * Funciones relacionadas con gestión de entregas
 */

export default {
    name: 'entregas',
    
    init: function() {
        console.log('Entregas module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        if (typeof window.closeEntregaModal !== 'function') {
            window.closeEntregaModal = this.closeEntregaModal;
        }
    },
    
    // Cerrar modal de entrega
    closeEntregaModal: function() {
        const modal = document.getElementById('entregaModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Cargar lista de entregas
    loadList: async function() {
        if (typeof loadEntregas === 'function') {
            return await loadEntregas();
        }
    },
    
    // Ver detalle de entrega
    viewDetail: async function(entregaId, calificar = false) {
        if (typeof viewEntregaDetail === 'function') {
            await viewEntregaDetail(entregaId, calificar);
        }
    },
    
    // Calificar entrega
    calificar: async function(event, entregaId) {
        if (typeof calificarEntrega === 'function') {
            await calificarEntrega(event, entregaId);
        }
    },
    
    // Guardar calificación
    guardarCalificacion: async function() {
        if (typeof guardarCalificacion === 'function') {
            await guardarCalificacion();
        }
    },
    
    // Cargar actividades
    loadActividades: async function() {
        if (typeof loadActividades === 'function') {
            return await loadActividades();
        }
    },
    
    // Cargar entregas de actividad
    loadDeActividad: async function(actividadId) {
        if (typeof loadEntregasDeActividad === 'function') {
            return await loadEntregasDeActividad(actividadId);
        }
    },
    
    // Siguiente entrega
    next: function() {
        if (typeof nextEntrega === 'function') {
            nextEntrega();
        }
    },
    
    // Entrega anterior
    prev: function() {
        if (typeof prevEntrega === 'function') {
            prevEntrega();
        }
    },
    
    // Volver a entregas
    back: function() {
        if (typeof backToEntregas === 'function') {
            backToEntregas();
        }
    }
};
