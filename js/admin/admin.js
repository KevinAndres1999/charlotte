/**
 * Charlotte Admin - Módulo Principal
 * 
 * Este archivo carga los módulos de forma dinámica.
 * La arquitectura modular permite cargar solo lo necesario y facilita el mantenimiento.
 * 
 * NOTA: Las funciones principales están en admin.html (script inline).
 * Este módulo proporciona funcionalidad adicional de cargalazy de módulos.
 */

// Configuración global del admin
window.ADMIN_CONFIG = {
    version: '1.3.0',
    modulesLoaded: false,
    modules: {},
    // Indica que el sistema híbrido está activo
    hybridMode: true
};

// Función para cargar módulos dinámicamente (bajo demanda)
window.loadAdminModule = async function(moduleName) {
    if (window.ADMIN_CONFIG.modules[moduleName]) {
        console.log(`Módulo ${moduleName} ya cargado`);
        return window.ADMIN_CONFIG.modules[moduleName];
    }
    
    try {
        // Cargar el módulo dinámicamente
        const module = await import(`./modules/${moduleName}.js`);
        window.ADMIN_CONFIG.modules[moduleName] = module.default;
        console.log(`Módulo ${moduleName} cargado exitosamente`);
        return module.default;
    } catch (error) {
        console.warn(`Módulo ${moduleName} no disponible o con errores:`, error.message);
        return null;
    }
};

// Función para verificar si una función existe en el ámbito global
window.adminHasFunction = function(functionName) {
    return typeof window[functionName] === 'function' || typeof eval(functionName) === 'function';
};

// Función para obtener información del sistema
window.getAdminInfo = function() {
    return {
        version: window.ADMIN_CONFIG.version,
        hybridMode: window.ADMIN_CONFIG.hybridMode,
        modulesLoaded: Object.keys(window.ADMIN_CONFIG.modules).length,
        globalFunctions: Object.keys(window).filter(k => typeof window[k] === 'function').length
    };
};

// Inicialización - carga módulos solo si es necesario
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Charlotte Admin - Sistema Híbrido');
    console.log('   Funciones globales: ', window.getAdminInfo().globalFunctions);
    console.log('   Módulos ES6: disponibles bajo demanda');
    
    // Cargar módulos básicos para exponer funciones globales
    await Promise.all([
        loadAdminModule('dashboard'),
        loadAdminModule('usuarios'),
        loadAdminModule('cobros'),
        loadAdminModule('utilities'),
        loadAdminModule('navigation'),
        loadAdminModule('auth'),
        loadAdminModule('clases'),
        loadAdminModule('videos'),
        loadAdminModule('materiales'),
        loadAdminModule('actividades'),
        loadAdminModule('calificaciones'),
        loadAdminModule('cuestionarios'),
        loadAdminModule('evaluaciones'),
        loadAdminModule('entregas'),
        loadAdminModule('proyectos'),
        loadAdminModule('foros'),
        loadAdminModule('gamificacion')
    ]);
    
    window.ADMIN_CONFIG.modulesLoaded = true;
});

// Exportar para uso global
window.CharlotteAdmin = {
    loadModule: window.loadAdminModule,
    hasFunction: window.adminHasFunction,
    getInfo: window.getAdminInfo,
    config: window.ADMIN_CONFIG
};

console.log('✅ Sistema de módulos admin cargado');
