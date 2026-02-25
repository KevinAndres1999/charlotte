/**
 * Módulo de Materiales - Charlotte Admin
 * Funciones relacionadas con gestión de materiales
 */

export default {
    name: 'materiales',
    
    init: function() {
        console.log('Materiales module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        if (typeof window.loadMaterialesList !== 'function') {
            window.loadMaterialesList = this.loadMaterialesList;
        }
        if (typeof window.loadRecursosList !== 'function') {
            window.loadRecursosList = this.loadRecursosList;
        }
        if (typeof window.loadMaterialPreview !== 'function') {
            window.loadMaterialPreview = this.loadMaterialPreview;
        }
        if (typeof window.loadRecursoPreview !== 'function') {
            window.loadRecursoPreview = this.loadRecursoPreview;
        }
        if (typeof window.viewMaterial !== 'function') {
            window.viewMaterial = this.viewMaterial;
        }
        console.log('✅ Funciones de Materiales expuestas al ámbito global');
    },
    
    // Cargar lista de materiales
    loadMaterialesList: async function() {
        if (typeof loadMaterialesList === 'function') {
            return await loadMaterialesList();
        }
    },
    
    // Cargar lista de recursos
    loadRecursosList: async function() {
        if (typeof loadRecursosList === 'function') {
            return await loadRecursosList();
        }
    },
    
    // Ver material
    view: async function(materialId) {
        if (typeof viewMaterial === 'function') {
            await viewMaterial(materialId);
        }
    },
    
    // Preview de material
    loadMaterialPreview: async function(materialId) {
        if (typeof loadMaterialPreview === 'function') {
            await loadMaterialPreview(materialId);
        }
    },
    
    // Preview de recurso
    loadRecursoPreview: async function(recursoId, tipo) {
        if (typeof loadRecursoPreview === 'function') {
            await loadRecursoPreview(recursoId, tipo);
        }
    }
};
