/**
 * Módulo de Pagos - Charlotte Admin
 * Funciones relacionadas con gestión de pagos y cobros
 */

export default {
    name: 'pagos',
    
    init: function() {
        console.log('Pagos module initialized');
    },
    
    // Inicializar sección de cobros
    initSection: function() {
        if (typeof initCobrosSection === 'function') {
            initCobrosSection();
        }
    },
    
    // Cambiar sede
    cambiarSede: function(sede) {
        if (typeof cambiarSedeCobros === 'function') {
            cambiarSedeCobros(sede);
        }
    },
    
    // Cambiar horario
    cambiarHorario: function(horario) {
        if (typeof cambiarHorarioCobros === 'function') {
            cambiarHorarioCobros(horario);
        }
    },
    
    // Cambiar programa
    cambiarPrograma: function(programa) {
        if (typeof cambiarProgramaCobros === 'function') {
            cambiarProgramaCobros(programa);
        }
    },
    
    // Cargar estudiantes
    cargarEstudiantes: async function() {
        if (typeof cargarEstudiantesCobros === 'function') {
            return await cargarEstudiantesCobros();
        }
    },
    
    // Cobrar individual
    cobrarIndividual: async function(userId) {
        if (typeof cobrarIndividual === 'function') {
            await cobrarIndividual(userId);
        }
    },
    
    // Cobrar seleccionados
    cobrarSeleccionados: async function() {
        if (typeof cobrarSeleccionados === 'function') {
            await cobrarSeleccionados();
        }
    },
    
    // Marcar como pendiente
    marcarPendiente: async function(userId) {
        if (typeof marcarPendiente === 'function') {
            await marcarPendiente(userId);
        }
    },
    
    // Ver historial de pagos
    verHistorial: async function(userId) {
        if (typeof verHistorialPagos === 'function') {
            await verHistorialPagos(userId);
        }
    },
    
    // Exportar cobros del día
    exportarDelDia: function() {
        if (typeof exportarCobrosDelDia === 'function') {
            exportarCobrosDelDia();
        }
    }
};
