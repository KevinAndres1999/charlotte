// Script para forzar actualización de cache y service worker
(function() {
    // Forzar recarga de página si hay parámetros de bypass cache
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('refresh')) {
        // Limpiar localStorage y sessionStorage
        localStorage.clear();
        sessionStorage.clear();

        // Limpiar caches
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }

        // Recargar sin parámetros
        const newUrl = window.location.pathname + window.location.hash;
        window.location.replace(newUrl);
        return;
    }

    // Verificar service worker updates inmediatamente
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                registration.update();
            });
        });
    }

    // Agregar listener para key combination Ctrl+F5 o Cmd+Shift+R
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'F5') {
            e.preventDefault();
            window.location.href = window.location.pathname + '?refresh=true' + window.location.hash;
        }
    });

    // Interceptar clicks en enlaces para forzar recarga si es necesario
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href && link.href.includes(window.location.origin)) {
            // Forzar validación de cache para navegación interna
            const img = new Image();
            img.src = link.href + '?_t=' + Date.now();
        }
    });

    console.log('🔄 Cache refresh system initialized');
})();