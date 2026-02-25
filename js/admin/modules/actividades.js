/**
 * Módulo de Actividades - Charlotte Admin
 * Funciones relacionadas con gestión de actividades
 */

export default {
    name: 'actividades',
    
    init: function() {
        console.log('Actividades module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        if (typeof window.loadActividadesList !== 'function') {
            window.loadActividadesList = this.loadActividadesList;
        }
        if (typeof window.loadActividades !== 'function') {
            window.loadActividades = this.loadActividades;
        }
        if (typeof window.loadEntregasViewer !== 'function') {
            window.loadEntregasViewer = this.loadEntregasViewer;
        }
        if (typeof window.loadEntregasDeActividad !== 'function') {
            window.loadEntregasDeActividad = this.loadEntregasDeActividad;
        }
        if (typeof window.loadEntregaDetail !== 'function') {
            window.loadEntregaDetail = this.loadEntregaDetail;
        }
        if (typeof window.eliminarActividadDesdeGestion !== 'function') {
            window.eliminarActividadDesdeGestion = this.eliminarActividadDesdeGestion;
        }
        if (typeof window.guardarEdicionActividad !== 'function') {
            window.guardarEdicionActividad = this.guardarEdicionActividad;
        }
        if (typeof window.guardarCalificacion !== 'function') {
            window.guardarCalificacion = this.guardarCalificacion;
        }
        console.log('✅ Funciones de Actividades expuestas al ámbito global');
    },
    
    // Cargar lista de actividades
    loadActividadesList: async function(selectedModulo = null) {
        if (typeof loadActividadesList === 'function') {
            return await loadActividadesList(selectedModulo);
        }
    },
    
    // Cargar actividades
    loadActividades: async function() {
        if (typeof loadActividades === 'function') {
            return await loadActividades();
        }
    },
    
    // Cargar actividades interactivas
    loadInteractivas: async function() {
        if (typeof cargarActividadesInteractivas === 'function') {
            return await cargarActividadesInteractivas();
        }
    },
    
    // Ver actividad interactiva
    viewInteractiva: async function(actividadId) {
        if (typeof verActividadInteractiva === 'function') {
            await verActividadInteractiva(actividadId);
        }
    },
    
    // Editar actividad interactiva
    editInteractiva: function(actividadId) {
        if (typeof editarActividadInteractiva === 'function') {
            editarActividadInteractiva(actividadId);
        }
    },
    
    // Eliminar actividad interactiva
    deleteInteractiva: async function(actividadId) {
        if (typeof eliminarActividadInteractiva === 'function') {
            await eliminarActividadInteractiva(actividadId);
        }
    },
    
    // Generar actividad con IA
    generarIA: async function() {
        if (typeof generarActividadConIA === 'function') {
            await generarActividadConIA();
        }
    },
    
    // Guardar actividad generada
    guardarGenerada: async function() {
        if (typeof guardarActividadInteractiva === 'function') {
            await guardarActividadInteractiva();
        }
    },
    
    // Mostrar selector de módulo
    showModuloSelector: function() {
        if (typeof showModuloSelectorActividades === 'function') {
            showModuloSelectorActividades();
        }
    }
};
