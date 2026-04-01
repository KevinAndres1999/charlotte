// ============================================
// CONFIGURACIÓN DE ENTORNO
// Detecta automáticamente si estamos en desarrollo o producción
// ============================================

const CONFIG = {
  // Backend URL - Cambiar en producción
  BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://charlotte-video-server.onrender.com', // TODO: Cambiar por tu URL de producción
  
  // API Base URL
  get API_BASE() {
    return `${this.BACKEND_URL}/api`;
  },

  // Entorno actual
  get isProduction() {
    return window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  },

  get isDevelopment() {
    return !this.isProduction;
  }
};

// Exportar configuración global
window.APP_CONFIG = CONFIG;

// Log de configuración (solo en desarrollo)
if (CONFIG.isDevelopment) {
  console.log('🔧 Configuración de la aplicación:', {
    entorno: 'Desarrollo',
    backendURL: CONFIG.BACKEND_URL,
    apiBase: CONFIG.API_BASE
  });
} else {
  console.log('🚀 Modo producción activado');
}
