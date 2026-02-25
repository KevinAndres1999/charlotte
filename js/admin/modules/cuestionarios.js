/**
 * Módulo de Cuestionarios y Evaluaciones - Charlotte Admin
 * Funciones relacionadas con gestión de cuestionarios y evaluaciones
 */

export default {
    name: 'cuestionarios',
    
    init: function() {
        console.log('Cuestionarios module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        // Funciones principales de Cuestionarios desde admin.html
        if (typeof window.loadCuestionariosList !== 'function') {
            window.loadCuestionariosList = this.loadCuestionariosList;
        }
        if (typeof window.loadCuestionariosManager !== 'function') {
            window.loadCuestionariosManager = this.loadCuestionariosManager;
        }
        if (typeof window.loadCuestionarioPreview !== 'function') {
            window.loadCuestionarioPreview = this.loadCuestionarioPreview;
        }
        if (typeof window.viewCuestionario !== 'function') {
            window.viewCuestionario = this.viewCuestionario;
        }
        if (typeof window.eliminarCuestionario !== 'function') {
            window.eliminarCuestionario = this.eliminarCuestionario;
        }
        if (typeof window.editarCuestionario !== 'function') {
            window.editarCuestionario = this.editarCuestionario;
        }
        if (typeof window.guardarEdicionCuestionario !== 'function') {
            window.guardarEdicionCuestionario = this.guardarEdicionCuestionario;
        }
        if (typeof window.duplicarCuestionario !== 'function') {
            window.duplicarCuestionario = this.duplicarCuestionario;
        }
        if (typeof window.exportarCuestionario !== 'function') {
            window.exportarCuestionario = this.exportarCuestionario;
        }
        if (typeof window.loadCuestionariosForSelection !== 'function') {
            window.loadCuestionariosForSelection = this.loadCuestionariosForSelection;
        }
        if (typeof window.loadCuestionariosForAuto !== 'function') {
            window.loadCuestionariosForAuto = this.loadCuestionariosForAuto;
        }
        if (typeof window.recargarCuestionarios !== 'function') {
            window.recargarCuestionarios = this.recargarCuestionarios;
        }
        if (typeof window.exportarCuestionarios !== 'function') {
            window.exportarCuestionarios = this.exportarCuestionarios;
        }
        if (typeof window.filtrarResultadosCuestionarios !== 'function') {
            window.filtrarResultadosCuestionarios = this.filtrarResultadosCuestionarios;
        }
        if (typeof window.loadResultadosCuestionarios !== 'function') {
            window.loadResultadosCuestionarios = this.loadResultadosCuestionarios;
        }
        console.log('✅ Funciones de Cuestionarios expuestas al ámbito global');
    },
    
    // Recargar cuestionarios
    recargarCuestionarios: function() {
        if (typeof loadCuestionariosManager === 'function') {
            loadCuestionariosManager();
        }
    },
    
    // Exportar todos los cuestionarios
    exportarCuestionarios: function() {
        if (typeof showToast === 'function') {
            showToast('Función de exportación próximamente disponible', 'info');
        } else {
            alert('Función de exportación próximamente disponible');
        }
    },
    
    // Filtrar resultados de cuestionarios
    filtrarResultadosCuestionarios: function() {
        if (typeof loadResultadosCuestionarios === 'function') {
            loadResultadosCuestionarios();
        }
    },
    
    // Cargar lista de cuestionarios
    loadList: async function() {
        if (typeof loadCuestionariosList === 'function') {
            return await loadCuestionariosList();
        }
    },
    
    // Cargar manager de cuestionarios
    loadManager: async function() {
        if (typeof loadCuestionariosManager === 'function') {
            return await loadCuestionariosManager();
        }
    },
    
    // Ver cuestionario
    view: async function(cuestionarioId) {
        if (typeof viewCuestionario === 'function') {
            await viewCuestionario(cuestionarioId);
        }
    },
    
    // Cargar preview de cuestionario
    loadPreview: async function(cuestionarioId) {
        if (typeof loadCuestionarioPreview === 'function') {
            await loadCuestionarioPreview(cuestionarioId);
        }
    },
    
    // Eliminar cuestionario
    delete: async function(cuestionarioId, tipo = 'cuestionario') {
        if (typeof eliminarCuestionario === 'function') {
            await eliminarCuestionario(cuestionarioId, tipo);
        }
    },
    
    // Duplicar cuestionario
    duplicate: async function(cuestionarioId, tipo) {
        if (typeof duplicarCuestionario === 'function') {
            await duplicarCuestionario(cuestionarioId, tipo);
        }
    },
    
    // Exportar cuestionario
    export: async function(cuestionarioId, tipo) {
        if (typeof exportarCuestionario === 'function') {
            await exportarCuestionario(cuestionarioId, tipo);
        }
    },
    
    // Cargar resultados
    loadResultados: async function() {
        if (typeof loadResultadosCuestionarios === 'function') {
            return await loadResultadosCuestionarios();
        }
    },
    
    // Ver detalle de respuesta
    verDetalleRespuesta: async function(respuestaId) {
        if (typeof verDetalleRespuestaCuestionario === 'function') {
            await verDetalleRespuestaCuestionario(respuestaId);
        }
    }
};
