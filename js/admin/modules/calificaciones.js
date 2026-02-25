/**
 * Módulo de Calificaciones - Charlotte Admin
 * Funciones relacionadas con gestión de calificaciones
 */

export default {
    name: 'calificaciones',
    
    init: function() {
        console.log('Calificaciones module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        if (typeof window.resetCalificacion !== 'function') {
            window.resetCalificacion = this.resetCalificacion;
        }
        if (typeof window.resetCalificacionRespuesta !== 'function') {
            window.resetCalificacionRespuesta = this.resetCalificacionRespuesta;
        }
        if (typeof window.resetCalificacionesFilters !== 'function') {
            window.resetCalificacionesFilters = this.resetCalificacionesFilters;
        }
    },
    
    // Resetear calificación
    resetCalificacion: function() {
        const input = document.getElementById('calificacionInput');
        if (input) {
            input.value = '';
        }
    },
    
    // Resetear calificación de respuesta
    resetCalificacionRespuesta: function() {
        const input = document.getElementById('respuestaCalificacionInput');
        if (input) {
            input.value = '';
        }
    },
    
    // Resetear filtros de calificaciones
    resetCalificacionesFilters: function() {
        const select = document.getElementById('califPrograma');
        if (select) {
            select.value = '';
        }
    },
    
    // Cargar lista de calificaciones
    loadList: async function() {
        if (typeof loadCalificacionesList === 'function') {
            return await loadCalificacionesList();
        }
    },
    
    // Actualizar calificación de módulo
    updateModulo: async function(estudianteId, moduloNum, componente, valor) {
        if (typeof updateModuloGrade === 'function') {
            await updateModuloGrade(estudianteId, moduloNum, componente, valor);
        }
    },
    
    // Calcular nota de evaluaciones
    calculateEvaluaciones: async function(estudianteId) {
        if (typeof calculateEvaluacionesGrade === 'function') {
            return await calculateEvaluacionesGrade(estudianteId);
        }
    },
    
    // Calcular nota de actividades
    calculateActividades: async function(estudianteId) {
        if (typeof calculateActividadesGrade === 'function') {
            return await calculateActividadesGrade(estudianteId);
        }
    },
    
    // Obtener nota de práctica
    getPractica: async function(estudianteId) {
        if (typeof getPracticaGrade === 'function') {
            return await getPracticaGrade(estudianteId);
        }
    },
    
    // Actualizar nota de práctica
    updatePractica: async function(estudianteId, nota) {
        if (typeof updatePracticaGrade === 'function') {
            await updatePracticaGrade(estudianteId, nota);
        }
    },
    
    // Filtrar calificaciones
    filter: function() {
        if (typeof filterCalificaciones === 'function') {
            filterCalificaciones();
        }
    },
    
    // Resetear filtros
    resetFilters: function() {
        if (typeof resetCalificacionesFilters === 'function') {
            resetCalificacionesFilters();
        }
    }
};
