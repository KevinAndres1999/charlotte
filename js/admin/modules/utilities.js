/**
 * Módulo de Utilidades - Charlotte Admin
 * Funciones utilitarias comunes
 */

export default {
    name: 'utilities',
    
    init: function() {
        console.log('Utilities module initialized');
        // Exponer funciones en el ámbito global para compatibilidad
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        // Solo exponer si no existen ya
        if (typeof window.showNotification !== 'function') {
            window.showNotification = this.showNotification;
        }
        if (typeof window.stripHtml !== 'function') {
            window.stripHtml = this.stripHtml;
        }
        if (typeof window.showToast !== 'function') {
            window.showToast = this.showToast;
        }
        if (typeof window.closeContentPreview !== 'function') {
            window.closeContentPreview = this.closeContentPreview;
        }
        if (typeof window.volverAActividades !== 'function') {
            window.volverAActividades = this.volverAActividades;
        }
        if (typeof window.volverACuestionarios !== 'function') {
            window.volverACuestionarios = this.volverACuestionarios;
        }
    },
    
    // Función de notificación global
    showNotification: function(message, type = 'info') {
        // Eliminar notificación anterior si existe
        const existingNotification = document.querySelector('.admin-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const colors = {
            success: { bg: '#10b981', icon: 'check-circle' },
            error: { bg: '#ef4444', icon: 'times-circle' },
            warning: { bg: '#f59e0b', icon: 'exclamation-triangle' },
            info: { bg: '#3b82f6', icon: 'info-circle' }
        };
        
        const config = colors[type] || colors.info;
        
        const notification = document.createElement('div');
        notification.className = 'admin-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${config.bg};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 500;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${config.icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-cerrar después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    // Quitar HTML de un string
    stripHtml: function(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    },
    
    // Cerrar modal de vista previa de contenido
    closeContentPreview: function() {
        const modal = document.getElementById('contentPreviewModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Volver al grid de actividades
    volverAActividades: function() {
        const grid = document.getElementById('actividadesGrid');
        if (grid) {
            grid.style.display = 'block';
        }
    },
    
    // Volver al grid de cuestionarios
    volverACuestionarios: function() {
        const grid = document.getElementById('cuestionariosGrid');
        if (grid) {
            grid.style.display = 'block';
        }
    },
    
    // Mostrar toast
    showToast: function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    },
    
    // Cerrar modal genérico
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Formatear fecha de proyecto
    formatProjectDate: function(dateValue) {
        if (!dateValue) return 'N/A';
        try {
            let date;
            // Si es un Firestore Timestamp
            if (dateValue.toDate && typeof dateValue.toDate === 'function') {
                date = dateValue.toDate();
            }
            // Si es un objeto con seconds (Timestamp serializado)
            else if (dateValue.seconds) {
                date = new Date(dateValue.seconds * 1000);
            }
            // Si es un string ISO o número
            else {
                date = new Date(dateValue);
            }
            
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('es-ES');
        } catch (e) {
            console.warn('Error formatting date:', e);
            return 'N/A';
        }
    },
    
    // Actualizar contador de caracteres
    updateCharCount: function() {
        const textarea = document.getElementById('autoContentText');
        const charCount = document.getElementById('charCount');
        const charWarning = document.getElementById('charWarning');
        if (!textarea || !charCount) return;
        
        const count = textarea.value.length;
        charCount.textContent = count.toLocaleString();

        if (count > 12000) {
            if (charWarning) charWarning.style.display = 'inline';
            charCount.style.color = '#dc2626';
        } else if (count > 10000) {
            if (charWarning) charWarning.style.display = 'none';
            charCount.style.color = '#d97706';
        } else {
            if (charWarning) charWarning.style.display = 'none';
            charCount.style.color = '#64748b';
        }
    },
    
    // Mostrar notificación (alias para compatibilidad)
    showToast: function(message, type = 'info') {
        this.showNotification(message, type);
    },
    
    // Inicializar editor
    initializeEditor: function() {
        if (typeof initializeClaseEditor === 'function') {
            initializeClaseEditor();
        }
    },
    
    // Poblar select de módulos
    populateModulo: function(moduloSelectId, programaSelectId) {
        if (typeof populateModuloSelect === 'function') {
            populateModuloSelect(moduloSelectId, programaSelectId);
        }
    },
    
    // Obtener nombre de módulo
    getModuloName: function(moduloKey, programa = null) {
        if (typeof getModuloName === 'function') {
            return getModuloName(moduloKey, programa);
        }
    },
    
    // Filtrar usuarios
    filterUsuarios: function() {
        if (typeof filterUsuarios === 'function') {
            filterUsuarios();
        }
    },
    
    // Filtrar clases
    filterClases: function() {
        if (typeof filtrarClases === 'function') {
            filtrarClases();
        }
    },
    
    // Limpiar filtros de clases
    limpiarFiltrosClases: function() {
        if (typeof limpiarFiltrosClases === 'function') {
            limpiarFiltrosClases();
        }
    }
};
