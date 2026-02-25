/**
 * Módulo de Navegación - Charlotte Admin
 * Funciones relacionadas con navegación y secciones
 */

export default {
    name: 'navigation',
    
    init: function() {
        console.log('Navigation module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        if (typeof window.toggleMobileMenu !== 'function') {
            window.toggleMobileMenu = this.toggleMobileMenu;
        }
        if (typeof window.showSection !== 'function') {
            window.showSection = this.showSection;
        }
    },
    
    // Toggle menú móvil
    toggleMobileMenu: function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    },
    
    // Mostrar sección
    showSection: function(sectionId) {
        // Guardar la sección activa en sessionStorage
        sessionStorage.setItem('activeSection', sectionId);
        
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Mostrar la sección seleccionada
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        // Actualizar navegación activa
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            }
        });
    },
    
    // Obtener sección activa
    getActiveSection: function() {
        const activeNav = document.querySelector('.nav-item.active');
        return activeNav ? activeNav.dataset.section : null;
    }
};
