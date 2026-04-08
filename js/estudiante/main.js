/**
 * Charlotte Estudiante - Módulo Principal
 * 
 * Este archivo carga los módulos de forma dinámica para el portal de estudiantes.
 * La arquitectura modular permite cargar solo lo necesario y facilita el mantenimiento.
 */

window.ESTUDIANTE_CONFIG = {
    version: '2.0.0',
    modulesLoaded: false,
    modules: {},
    hybridMode: true
};

// Función para cargar módulos dinámicamente
window.loadEstudianteModule = async function(moduleName) {
    if (window.ESTUDIANTE_CONFIG.modules[moduleName]) {
        console.log(`Módulo ${moduleName} ya cargado`);
        return window.ESTUDIANTE_CONFIG.modules[moduleName];
    }
    
    try {
        const module = await import(`./modules/${moduleName}.js`);
        window.ESTUDIANTE_CONFIG.modules[moduleName] = module.default;
        console.log(`Módulo ${moduleName} cargado exitosamente`);
        return module.default;
    } catch (error) {
        console.warn(`Módulo ${moduleName} no disponible o con errores:`, error.message);
        return null;
    }
};

// Función para verificar si una función existe
window.estudianteHasFunction = function(functionName) {
    return typeof window[functionName] === 'function';
};

// Obtener información del sistema
window.getEstudianteInfo = function() {
    return {
        version: window.ESTUDIANTE_CONFIG.version,
        hybridMode: window.ESTUDIANTE_CONFIG.hybridMode,
        modulesLoaded: Object.keys(window.ESTUDIANTE_CONFIG.modules).length,
        globalFunctions: Object.keys(window).filter(k => typeof window[k] === 'function').length
    };
};

// Inicialización — los módulos reales se cargan desde app.js (foros-module.js, proyecto-module.js)
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Charlotte Estudiante - Sistema Híbrido v2.0');
    window.ESTUDIANTE_CONFIG.modulesLoaded = true;
});

// Exportar para uso global
window.CharlotteEstudiante = {
    loadModule: window.loadEstudianteModule,
    hasFunction: window.estudianteHasFunction,
    getInfo: window.getEstudianteInfo,
    config: window.ESTUDIANTE_CONFIG
};

console.log('✅ Sistema de módulos estudiante cargado');
