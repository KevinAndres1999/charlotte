/**
 * Módulo de Clases - Charlotte Admin
 * Funciones relacionadas con gestión de clases
 */

export default {
    name: 'clases',
    
    init: function() {
        console.log('Clases module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        if (typeof window.getModuloName !== 'function') {
            window.getModuloName = this.getModuloName;
        }
        if (typeof window.mostrarModoClase !== 'function') {
            window.mostrarModoClase = this.mostrarModoClase;
        }
        // Exponer funciones placeholder
        if (typeof window.marcarComoRevisada !== 'function') {
            window.marcarComoRevisada = this.marcarComoRevisada;
        }
        if (typeof window.descargarEntrega !== 'function') {
            window.descargarEntrega = this.descargarEntrega;
        }
        if (typeof window.contactarEstudiante !== 'function') {
            window.contactarEstudiante = this.contactarEstudiante;
        }
        if (typeof window.marcarRespuestaComoRevisada !== 'function') {
            window.marcarRespuestaComoRevisada = this.marcarRespuestaComoRevisada;
        }
        if (typeof window.descargarRespuestas !== 'function') {
            window.descargarRespuestas = this.descargarRespuestas;
        }
        if (typeof window.contactarEstudianteRespuesta !== 'function') {
            window.contactarEstudianteRespuesta = this.contactarEstudianteRespuesta;
        }
        // Funciones del visor de clases
        if (typeof window.printClaseFromViewer !== 'function') {
            window.printClaseFromViewer = this.printClaseFromViewer;
        }
        if (typeof window.shareClaseFromViewer !== 'function') {
            window.shareClaseFromViewer = this.shareClaseFromViewer;
        }
        if (typeof window.toggleBookmarkFromViewer !== 'function') {
            window.toggleBookmarkFromViewer = this.toggleBookmarkFromViewer;
        }
        if (typeof window.downloadClaseFromViewer !== 'function') {
            window.downloadClaseFromViewer = this.downloadClaseFromViewer;
        }
        // Funciones de Clases desde admin.html
        if (typeof window.loadClasesList !== 'function') {
            window.loadClasesList = this.loadClasesList;
        }
        if (typeof window.loadActividadesList !== 'function') {
            window.loadActividadesList = this.loadActividadesList;
        }
        if (typeof window.filtrarClases !== 'function') {
            window.filtrarClases = this.filtrarClases;
        }
        if (typeof window.limpiarFiltrosClases !== 'function') {
            window.limpiarFiltrosClases = this.limpiarFiltrosClases;
        }
        if (typeof window.renderClasesFiltradasNuevo !== 'function') {
            window.renderClasesFiltradasNuevo = this.renderClasesFiltradasNuevo;
        }
        if (typeof window.mostrarResumenClases !== 'function') {
            window.mostrarResumenClases = this.mostrarResumenClases;
        }
        console.log('✅ Funciones de Clases expuestas al ámbito global');
    },
    
    // Mostrar modo de clase (manual o IA)
    mostrarModoClase: function(modo) {
        const seccionManual = document.getElementById('claseManualSection');
        const seccionIA = document.getElementById('claseIASection');
        const btnManual = document.getElementById('btnClaseManual');
        const btnIA = document.getElementById('btnClaseIA');
        
        if (!seccionManual || !seccionIA) return;

        if (modo === 'manual') {
            seccionManual.style.display = 'block';
            seccionIA.style.display = 'none';
            if (btnManual) {
                btnManual.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                btnManual.style.color = 'white';
            }
            if (btnIA) {
                btnIA.style.background = 'white';
                btnIA.style.color = '#10b981';
            }
        } else {
            seccionManual.style.display = 'none';
            seccionIA.style.display = 'block';
            if (btnManual) {
                btnManual.style.background = 'white';
                btnManual.style.color = '#667eea';
            }
            if (btnIA) {
                btnIA.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                btnIA.style.color = 'white';
            }
        }
    },
    
    // Obtener nombre del módulo
    getModuloName: function(moduloKey, programa = null) {
        // Si no se especifica programa, intentar obtenerlo del filtro
        if (!programa) {
            const filter = document.getElementById('filterProgramaClases');
            if (filter) {
                programa = filter.value;
            }
        }
        
        const modulos = {
            'Panadería y Pastelería': {
                'modulo1': 'Módulo 1: Panadería',
                'modulo2': 'Módulo 2: Galletaría',
                'modulo3': 'Módulo 3: Pastelería',
                'modulo4': 'Módulo 4: Repostería'
            },
            'Belleza Integral': {
                'modulo1': 'Módulo 1: Diseño de Mirada',
                'modulo2': 'Módulo 2: Maquillaje',
                'modulo3': 'Módulo 3: Estilismo',
                'modulo4': 'Módulo 4: Nails Designer'
            },
            'Asesoría Técnica': {
                'modulo1': 'Módulo 1: Fundamentos',
                'modulo2': 'Módulo 2: Estrategias',
                'modulo3': 'Módulo 3: Gestión',
                'modulo4': 'Módulo 4: Especialización'
            }
        };
        
        const programaModulos = modulos[programa] || modulos['Panadería y Pastelería'];
        return programaModulos[moduloKey] || moduloKey;
    },
    
    // Cargar lista de clases
    loadList: async function(selectedModulo = null) {
        if (typeof loadClasesList === 'function') {
            return await loadClasesList(selectedModulo);
        }
    },
    
    // Ver clase
    view: async function(claseId) {
        if (typeof viewClase === 'function') {
            await viewClase(claseId);
        }
    },
    
    // Editar clase
    edit: async function(claseId) {
        if (typeof editClase === 'function') {
            await editClase(claseId);
        }
    },
    
    // Cancelar edición
    cancelEdit: function() {
        if (typeof cancelClaseEdit === 'function') {
            cancelClaseEdit();
        }
    },
    
    // Preview de clase
    loadPreview: async function(claseId) {
        if (typeof loadClasePreview === 'function') {
            await loadClasePreview(claseId);
        }
    },
    
    // Guardar contenido en chunks
    saveInChunks: async function(claseId, content) {
        if (typeof saveContentInChunks === 'function') {
            await saveContentInChunks(claseId, content);
        }
    },
    
    // Cargar contenido desde chunks
    loadFromChunks: async function(claseId) {
        if (typeof loadContentFromChunks === 'function') {
            return await loadContentFromChunks(claseId);
        }
    },
    
    // ==================== FUNCIONES PLACEHOLDER ====================
    // Estas funciones están migradas desde admin.html
    
    // Placeholder: Marcar entrega como revisada
    marcarComoRevisada: function() {
        if (typeof showToast === 'function') {
            showToast('Función próximamente disponible', 'info');
        } else {
            alert('Función próximamente disponible');
        }
    },
    
    // Placeholder: Descargar entrega
    descargarEntrega: function() {
        if (typeof showToast === 'function') {
            showToast('Función próximamente disponible', 'info');
        } else {
            alert('Función próximamente disponible');
        }
    },
    
    // Placeholder: Contactar estudiante
    contactarEstudiante: function() {
        if (typeof showToast === 'function') {
            showToast('Función próximamente disponible', 'info');
        } else {
            alert('Función próximamente disponible');
        }
    },
    
    // Placeholder: Marcar respuesta como revisada
    marcarRespuestaComoRevisada: function() {
        if (typeof showToast === 'function') {
            showToast('Función próximamente disponible', 'info');
        } else {
            alert('Función próximamente disponible');
        }
    },
    
    // Placeholder: Descargar respuestas
    descargarRespuestas: function() {
        if (typeof showToast === 'function') {
            showToast('Función próximamente disponible', 'info');
        } else {
            alert('Función próximamente disponible');
        }
    },
    
    // Placeholder: Contactar estudiante por respuesta
    contactarEstudianteRespuesta: function() {
        if (typeof showToast === 'function') {
            showToast('Función próximamente disponible', 'info');
        } else {
            alert('Función próximamente disponible');
        }
    },
    
    // Placeholder: Cancelar edición de clase
    cancelClaseEdit: function() {
        // Esta función ya existe en admin.html
        // Se mantiene aquí para referencia
        if (typeof cancelClaseEdit === 'function') {
            cancelClaseEdit();
        }
    },
    
    // Imprimir clase desde el visor
    printClaseFromViewer: function() {
        window.print();
    },
    
    // Compartir clase desde el visor
    shareClaseFromViewer: function() {
        const claseTitle = document.getElementById('clase-viewer-title')?.textContent || 'Clase';
        const url = window.location.href;
        const shareText = `Mira esta clase: "${claseTitle}" en la plataforma ECE CHARLOTTE`;

        if (navigator.share) {
            navigator.share({
                title: claseTitle,
                text: shareText,
                url: url
            });
        } else {
            // Fallback para navegadores que no soportan Web Share API
            const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`;
            window.open(shareUrl, '_blank');
        }
    },
    
    // Toggle bookmark desde el visor
    toggleBookmarkFromViewer: function() {
        if (typeof showToast === 'function') {
            showToast('Función no disponible para administradores', 'info');
        } else {
            alert('Función no disponible para administradores');
        }
    },
    
    // Descargar clase desde el visor
    downloadClaseFromViewer: function() {
        const claseTitle = document.getElementById('clase-viewer-title')?.textContent || 'clase';
        const contentElement = document.getElementById('clase-viewer-content');
        
        if (!contentElement) {
            if (typeof showToast === 'function') {
                showToast('No se pudo obtener el contenido', 'error');
            }
            return;
        }
        
        const content = contentElement.innerHTML;
        
        const blob = new Blob([
            `<!DOCTYPE html>
            <html>
            <head>
                <title>${claseTitle}</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                    h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
                    img { max-width: 100%; height: auto; }
                    .video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; }
                    .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
                </style>
            </head>
            <body>
                <h1>${claseTitle}</h1>
                ${content}
            </body>
            </html>`
        ], { type: 'text/html' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${claseTitle.replace(/[^a-z0-9]/gi, '_')}.html`;
        link.click();
        URL.revokeObjectURL(link.href);
    }
};
