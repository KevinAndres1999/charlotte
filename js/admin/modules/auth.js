/**
 * Módulo de Autenticación - Charlotte Admin
 * Funciones relacionadas con login, logout y gestión de usuarios
 */

export default {
    name: 'auth',
    
    // Inicializar eventos de autenticación
    init: function() {
        console.log('Auth module initialized');
        this.exposeToGlobal();
    },
    
    // Exponer funciones al ámbito global
    exposeToGlobal: function() {
        if (typeof window.logout !== 'function') {
            window.logout = this.logout;
        }
    },
    
    // Función de logout
    logout: function() {
        sessionStorage.clear();
        window.location.href = 'login.html';
    },
    
    // Verificar sesión
    checkSession: function() {
        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return false;
        }
        return JSON.parse(currentUser);
    },
    
    // Verificar rol de admin
    isAdmin: function() {
        const user = this.checkSession();
        return user && user.role === 'admin';
    }
};
