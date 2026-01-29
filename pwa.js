// Funcionalidades PWA para Charlotte
class CharlottePWA {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }

    init() {
        this.setupInstallPrompt();
        this.setupNetworkStatus();
        this.setupPushNotifications();
        this.setupServiceWorkerUpdates();
    }

    // Manejar el prompt de instalación
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA: beforeinstallprompt event fired');
            e.preventDefault();
            this.deferredPrompt = e;

            // Mostrar botón de instalación si existe
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', (e) => {
            console.log('PWA: App instalada exitosamente');
            this.deferredPrompt = null;
            this.hideInstallButton();
        });
    }

    // Mostrar botón de instalación
    showInstallButton() {
        const installButton = document.getElementById('pwa-install-btn');
        if (installButton) {
            installButton.style.display = 'block';
            installButton.addEventListener('click', () => this.installPWA());
        }
    }

    // Ocultar botón de instalación
    hideInstallButton() {
        const installButton = document.getElementById('pwa-install-btn');
        if (installButton) {
            installButton.style.display = 'none';
        }
    }

    // Instalar PWA
    async installPWA() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;

        console.log(`PWA: Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);
        this.deferredPrompt = null;
        this.hideInstallButton();
    }

    // Monitorear estado de conexión
    setupNetworkStatus() {
        const updateOnlineStatus = () => {
            const isOnline = navigator.onLine;
            console.log(`PWA: Conexión ${isOnline ? 'online' : 'offline'}`);

            // Mostrar indicador de conexión
            this.showNetworkStatus(isOnline);

            // Si vuelve online, sincronizar datos pendientes
            if (isOnline) {
                this.syncPendingData();
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Estado inicial
        updateOnlineStatus();
    }

    // Mostrar estado de conexión
    showNetworkStatus(isOnline) {
        let statusElement = document.getElementById('network-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'network-status';
            statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 8px;
                font-weight: 500;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusElement);
        }

        if (isOnline) {
            statusElement.textContent = '🟢 Online';
            statusElement.style.background = '#dcfce7';
            statusElement.style.color = '#166534';
            statusElement.style.border = '1px solid #bbf7d0';

            // Ocultar después de 3 segundos
            setTimeout(() => {
                statusElement.style.opacity = '0';
                setTimeout(() => statusElement.remove(), 300);
            }, 3000);
        } else {
            statusElement.textContent = '🔴 Offline - Modo limitado';
            statusElement.style.background = '#fef2f2';
            statusElement.style.color = '#991b1b';
            statusElement.style.border = '1px solid #fecaca';
            statusElement.style.opacity = '1';
        }
    }

    // Configurar push notifications
    setupPushNotifications() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('PWA: Push notifications no soportadas');
            return;
        }

        // Verificar si ya tenemos permiso
        if (Notification.permission === 'granted') {
            this.registerForPush();
        }
    }

    // Registrar para push notifications
    async registerForPush() {
        try {
            // Verificar si tenemos una clave VAPID válida
            const vapidKey = 'YOUR_PUBLIC_VAPID_KEY';
            if (vapidKey === 'YOUR_PUBLIC_VAPID_KEY') {
                console.log('PWA: VAPID key not configured, skipping push registration');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
            });

            console.log('PWA: Push subscription:', subscription);

            // Aquí enviarías la subscription al servidor
            // await this.sendSubscriptionToServer(subscription);

        } catch (error) {
            console.error('PWA: Error registrando push:', error);
        }
    }

    // Convertir VAPID key
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Sincronizar datos pendientes cuando vuelve la conexión
    async syncPendingData() {
        console.log('PWA: Sincronizando datos pendientes...');

        // Aquí implementarías la lógica para sincronizar datos pendientes
        // Por ejemplo, enviar entregas guardadas localmente, etc.

        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('background-sync');
        }
    }

    // Verificar si está instalado como PWA
    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // Obtener información del service worker
    async getServiceWorkerInfo() {
        if (!('serviceWorker' in navigator)) return null;

        const registration = await navigator.serviceWorker.ready;
        const controller = navigator.serviceWorker.controller;

        return {
            state: registration.active?.state,
            scope: registration.scope,
            hasController: !!controller,
            version: controller ? await this.getWorkerVersion(controller) : null
        };
    }

    // Obtener versión del worker
    async getWorkerVersion(controller) {
        return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => resolve(event.data.version);
            controller.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
        });
    }
}

// Función para mostrar notificación push desde el cliente
function showPushNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        return new Notification(title, {
            icon: '/manifest.json',
            badge: '/manifest.json',
            ...options
        });
    }
    return null;
}

// Función para solicitar permiso de notificaciones
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Notificaciones no soportadas');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.log('Permiso de notificaciones denegado');
        return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

// Manejar actualizaciones del Service Worker
setupServiceWorkerUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('PWA: Service Worker registrado');

                // Verificar actualizaciones cada vez que se carga la página
                registration.update();

                // Escuchar por nuevas versiones
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Nueva versión disponible
                                this.showUpdateNotification();
                            }
                        });
                    }
                });

                // Si ya hay un service worker esperando, mostrar notificación
                if (registration.waiting) {
                    this.showUpdateNotification();
                }
            })
            .catch((error) => {
                console.error('PWA: Error registrando Service Worker:', error);
            });

        // Escuchar mensajes del service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                this.showUpdateNotification();
            }
        });
    }
}

// Mostrar notificación de actualización
showUpdateNotification() {
    // Crear notificación toast
    const toast = document.createElement('div');
    toast.id = 'sw-update-toast';
    toast.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 400px;
            text-align: center;
        ">
            <div style="font-weight: 600; margin-bottom: 8px;">🎉 Actualización Disponible</div>
            <div style="font-size: 14px; margin-bottom: 12px; opacity: 0.9;">
                Hay una nueva versión disponible. Haz clic para actualizar.
            </div>
            <button id="update-btn" style="
                background: white;
                color: #10b981;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                margin-right: 8px;
            ">Actualizar</button>
            <button id="dismiss-btn" style="
                background: transparent;
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
            ">Después</button>
        </div>
    `;

    document.body.appendChild(toast);

    // Event listeners
    document.getElementById('update-btn').addEventListener('click', () => {
        this.updateServiceWorker();
        toast.remove();
    });

    document.getElementById('dismiss-btn').addEventListener('click', () => {
        toast.remove();
    });

    // Auto-remover después de 10 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 10000);
}

// Actualizar Service Worker
updateServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        });

        // Recargar la página después de un breve delay
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}

// Inicializar PWA cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.charlottePWA = new CharlottePWA();
});

// Exportar funciones globales
window.showPushNotification = showPushNotification;
window.requestNotificationPermission = requestNotificationPermission;