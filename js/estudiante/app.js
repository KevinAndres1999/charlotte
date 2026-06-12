import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, addDoc, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { init as initForos } from './modules/foros-module.js';
import { init as initProyecto } from './modules/proyecto-module.js';

// =================== CONFIGURACIÓN ===================
try {
    if (!window.FIREBASE_CONFIG) {
        throw new Error('Firebase config not found');
    }
    
    const firebaseConfig = window.FIREBASE_CONFIG;
    console.log('Initializing Firebase with config:', firebaseConfig);
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    window.db = db;
    const auth = getAuth(app);
    
    // Asignar funciones globales para compatibilidad
    window.db = db;
    window.getDocs = getDocs;
    window.collection = collection;
    window.query = query;
    window.where = where;
    window.doc = doc;
    window.getDoc = getDoc;
    window.setDoc = setDoc;
    window.updateDoc = updateDoc;
    window.addDoc = addDoc;
    
    // === Inicializar módulos ===
    initForos(db);
    initProyecto(db);
    
    console.log('Firebase initialized successfully');

    // =================== FUNCIÓN HELPER PARA OBTENER API KEY ===================
    // Ahora usa el SDK de Firebase normal ya que las reglas permiten lectura de config
    async function fetchApiKeyFromFirebase() {
        try {
            if (!window.db) {
                console.warn('Firebase no disponible');
                return null;
            }
            
            const configDoc = await window.getDoc(window.doc(window.db, 'config', 'openrouter'));
            console.log('📡 Respuesta de config/openrouter:', configDoc);
            
            if (configDoc && configDoc.exists && configDoc.exists()) {
                const data = configDoc.data();
                console.log('📄 Datos del documento:', data);
                if (data && data.apiKey) {
                    return data.apiKey;
                }
            }
            return null;
        } catch (e) {
            console.error('Error obteniendo API key:', e);
            return null;
        }
    }

    // Cache para la API key
    let cachedApiKey = null;
    let apiKeyCacheTime = 0;
    const API_KEY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    async function getOpenRouterApiKey() {
        const now = Date.now();
        
        // Verificar cache
        if (cachedApiKey && (now - apiKeyCacheTime) < API_KEY_CACHE_DURATION) {
            return cachedApiKey;
        }
        
        // 1. Primero intentar desde cookie
        const cookieMatch = document.cookie.match(/openrouter_api_key=([^;]+)/);
        if (cookieMatch && cookieMatch[1] && !cookieMatch[1].startsWith('sk-or-v1-fake')) {
            cachedApiKey = cookieMatch[1];
            apiKeyCacheTime = now;
            return cachedApiKey;
        }
        // 2. Luego intentar desde localStorage
        const localKey = localStorage.getItem('openrouter_api_key');
        if (localKey && !localKey.startsWith('sk-or-v1-fake')) {
            cachedApiKey = localKey;
            apiKeyCacheTime = now;
            return cachedApiKey;
        }
        // 3. Luego desde window
        if (window.OPENROUTER_API_KEY && !window.OPENROUTER_API_KEY.startsWith('sk-or-v1-fake')) {
            cachedApiKey = window.OPENROUTER_API_KEY;
            apiKeyCacheTime = now;
            return cachedApiKey;
        }
        // 4. Finalmente intentar desde Firebase SDK
        const firebaseKey = await fetchApiKeyFromFirebase();
        if (firebaseKey) {
            cachedApiKey = firebaseKey;
            apiKeyCacheTime = now;
            console.log('✅ API key obtenida desde Firebase');
        }
        return cachedApiKey || '';
    }
    
    // Exponer función globally
    window.getOpenRouterApiKey = getOpenRouterApiKey;

    // =================== SISTEMA DE OPTIMIZACIÓN DE CONSULTAS ===================
    class FirebaseQueryOptimizer {
      constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
      }

      // Método para consultas con cache
      async queryWithCache(collectionName, queryConstraints = [], options = {}) {
        const cacheKey = this.generateCacheKey(collectionName, queryConstraints);
        const cached = this.getFromCache(cacheKey);

        if (cached && !options.forceRefresh) {
          return cached;
        }

        try {
          let queryRef = collection(db, collectionName);

          // Aplicar constraints
          if (queryConstraints.length > 0) {
            queryRef = query(queryRef, ...queryConstraints);
          }

          // Aplicar límite por defecto si no se especifica
          if (!queryConstraints.some(c => c.type === 'limit') && !options.noLimit) {
            queryRef = query(queryRef, limit(50));
          }

          const snapshot = await getDocs(queryRef);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Cachear resultado
          this.setCache(cacheKey, data);

          return data;
        } catch (error) {
          console.error(`Error querying ${collectionName}:`, error);
          return []; // Devolver vacío en lugar de relanzar (evita que falle todo el dashboard)
        }
      }

      // Método para consultas paralelas
      async parallelQueries(queries) {
        const promises = queries.map(({ collection: collectionName, constraints, options }) =>
          this.queryWithCache(collectionName, constraints, options)
        );

        // Promise.allSettled: si una query falla, las demás siguen adelante
        const results = await Promise.allSettled(promises);
        return results.map((r, i) => {
          if (r.status === 'fulfilled') return r.value;
          console.warn(`Query ${queries[i]?.collection} falló:`, r.reason);
          return [];
        });
      }

      // Utilidades de cache
      generateCacheKey(collectionName, constraints) {
        const constraintsStr = constraints.map(c => JSON.stringify(c)).join('|');
        return `${collectionName}:${constraintsStr}`;
      }

      getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
        this.cache.delete(key);
        return null;
      }

      setCache(key, data) {
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        });
      }

      clearCache() {
        this.cache.clear();
      }
    }

    // Crear instancia global del optimizador
    window.firebaseOptimizer = new FirebaseQueryOptimizer();

    // Función helper para consultas optimizadas
    window.queryOptimized = (collectionName, constraints, options) =>
      window.firebaseOptimizer.queryWithCache(collectionName, constraints, options);

    // Función helper para consultas paralelas
    window.parallelQueries = (queries) =>
      window.firebaseOptimizer.parallelQueries(queries);

    // =================== FIN SISTEMA DE OPTIMIZACIÓN DE CONSULTAS ===================

    // Variable global para el ID de la clase actual en el viewer
    let currentClaseId = null;
    let currentClaseData = null; // Datos completos de la clase abierta (fallback cuando filteredClases está vacío)

// =================== FUNCIONES GLOBALES ===================
// Definidas más abajo en el archivo

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser || currentUser.role !== 'student') {
        window.location.href = 'login.html';
    } else {
        // Usuario válido, cargar datos iniciales
        updateDashboard();
        
        // Inicializar cache de reintentos
        initializeReintentosCache();
        
        // Inicializar sistema de notificaciones después de que Firebase esté listo
        setTimeout(() => {
            if (window.initializeNotifications) {
                window.initializeNotifications();
            }
        }, 1000); // Pequeño delay para asegurar que Firebase esté completamente inicializado
    }
});

// Limpiar historial para evitar volver a login con botón atrás
if (window.history && window.history.pushState) {
    // Reemplazar la entrada actual del historial para que no vuelva a login
    window.history.replaceState({page: 'estudiante', section: 'dashboard'}, 'Dashboard', 'estudiante.html');
}

// Interceptar el botón atrás del navegador
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.section) {
        // Si estamos volviendo desde clase-viewer, necesitamos manejar especial
        if (document.querySelector('.section[id="clase-viewer"]').classList.contains('active')) {
            // Ocultar clase-viewer y mostrar la sección anterior
            document.querySelector('.section[id="clase-viewer"]').classList.remove('active');
            document.querySelector('.nav-item[data-section="clase-viewer"]').style.display = 'none';
        }
        
        // Ir a la sección guardada en el estado
        showSectionV2(event.state.section, true);
        
        // Si es la sección de clases o actividades y hay un módulo específico, cargarlo
        if ((event.state.section === 'clases' || event.state.section === 'actividades') && event.state.modulo !== undefined) {
            if (event.state.modulo === null) {
                // Mostrar selector de módulos
                if (event.state.section === 'clases') {
                    window.loadClases();
                } else {
                    window.loadActividades();
                }
            } else {
                // Cargar el módulo específico
                if (event.state.section === 'clases') {
                    window.loadClases(event.state.modulo);
                } else {
                    window.loadActividades(event.state.modulo);
                }
            }
        }
    } else {
        // Si no hay estado, verificar si estamos en clase-viewer
        if (document.querySelector('.section[id="clase-viewer"]').classList.contains('active')) {
            // Volver a la sección de clases
            document.querySelector('.section[id="clase-viewer"]').classList.remove('active');
            document.querySelector('.nav-item[data-section="clase-viewer"]').style.display = 'none';
            showSectionV2('clases', true);
            window.loadClases();
        } else {
            // Por defecto, ir al dashboard
            showSectionV2('dashboard');
        }
    }
});

// Restaurar la sección activa al recargar la página
const savedSection = sessionStorage.getItem('activeSection');
if (savedSection) {
    // Esperar a que el DOM esté listo antes de restaurar la sección
    window.addEventListener('DOMContentLoaded', () => {
        if (savedSection === 'clase-viewer') {
            // Si estábamos en clase-viewer, restaurar la clase específica
            const savedClaseId = sessionStorage.getItem('currentClaseId');
            if (savedClaseId) {
                loadClaseDetail(savedClaseId);
            } else {
                // Si no hay clase guardada, ir a clases
                showSectionV2('clases');
                window.loadClases();
            }
        } else {
            showSectionV2(savedSection);
        }
    });
} else {
    // Si no hay sección guardada, establecer dashboard por defecto
    sessionStorage.setItem('activeSection', 'dashboard');
}

// Función para volver desde el viewer de clase
function volverDesdeClaseViewer() {
    // Ocultar clase-viewer
    document.querySelector('.section[id="clase-viewer"]').classList.remove('active');
    document.querySelector('.nav-item[data-section="clase-viewer"]').style.display = 'none';
    
    // Determinar a qué sección volver (clases por defecto)
    const sectionToReturn = sessionStorage.getItem('activeSection') || 'clases';
    
    // Usar history.back() para simular el botón atrás del navegador
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Si no hay historial, ir directamente a clases
        showSectionV2('clases');
        window.loadClases();
    }
}
function getVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
}

function loadStudentInfo() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    // Cargar API key de OpenRouter de forma segura
    if (typeof loadOpenRouterKey === 'function') {
        loadOpenRouterKey();
    }

    const userNameEl = document.getElementById('userName');
    const studentNameEl = document.getElementById('studentName');
    const programBadgeEl = document.getElementById('programBadge');
    const userEmailEl = document.getElementById('userEmail');
    const userProgramEl = document.getElementById('userProgram');
    const userSedeEl = document.getElementById('userSede');
    const welcomeNameEl = document.getElementById('welcomeName');
    
    if (userNameEl) userNameEl.textContent = currentUser.name;
    if (studentNameEl) studentNameEl.textContent = currentUser.name;
    if (programBadgeEl) programBadgeEl.textContent = currentUser.programa;
    if (userEmailEl) userEmailEl.textContent = currentUser.email;
    if (userProgramEl) userProgramEl.textContent = currentUser.programa;
    if (userSedeEl) userSedeEl.textContent = currentUser.sede;
    if (welcomeNameEl) welcomeNameEl.textContent = currentUser.name;
}

function filterByUserAccess(items, reintentosDisponibles = []) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        console.log('❌ filterByUserAccess: No hay usuario logueado');
        return [];
    }

    console.log('🔍 filterByUserAccess: Usuario actual:', currentUser);
    console.log('🔍 filterByUserAccess: Items totales:', items.length);
    console.log('🎯 Reintentos disponibles:', reintentosDisponibles.length);

    const filtered = items.filter(item => {
        console.log('🔍 Evaluando item:', item.id, item.titulo || item.nombre);
        const itemPrograma = normalizeVisibilityValue(item.programa);
        const userPrograma = normalizeVisibilityValue(currentUser.programa);
        console.log('🔍 Programa - Item:', itemPrograma, 'Usuario:', userPrograma);

        if (!itemPrograma || itemPrograma !== userPrograma) {
            console.log('❌ Rechazado por programa diferente');
            return false;
        }

        // Filtrar por visiblePara (control granular del admin: "Sede-Horario")
        if (item.visiblePara && Array.isArray(item.visiblePara) && item.visiblePara.length > 0) {
            const userSede = normalizeVisibilityValue(currentUser.sede);
            const userHorario = normalizeVisibilityValue(currentUser.horario);
            const visibleParaNormalizado = item.visiblePara.map(normalizeVisibilityValue);
            const claveCompleta = userSede && userHorario ? `${userSede}-${userHorario}` : '';
            const coincideCompleto = claveCompleta ? visibleParaNormalizado.includes(claveCompleta) : false;
            const coincidePorSede = userSede ? visibleParaNormalizado.some(valor => valor.startsWith(`${userSede}-`)) : false;

            console.log('🔍 visiblePara:', item.visiblePara, '| Clave usuario:', claveCompleta || '(sin horario)');
            if (!coincideCompleto && !(coincidePorSede && !userHorario)) {
                console.log('❌ Rechazado por visiblePara');
                return false;
            }
        }
        // Compatibilidad con sistema anterior (sedes y horarios separados, sin visiblePara)
        else {
            console.log('🔍 Usando sistema anterior (sedes/horarios separados)');

            // Filtrar por sede: si la clase tiene sedes definidas, el estudiante debe tener una que coincida
            if (item.sedes && Array.isArray(item.sedes) && item.sedes.length > 0) {
                const userSede = normalizeVisibilityValue(currentUser.sede);
                const sedesNormalizadas = item.sedes.map(normalizeVisibilityValue);
                console.log('🔍 Sedes del item:', item.sedes, 'Sede usuario:', userSede || '(sin sede)');
                if (!userSede || !sedesNormalizadas.includes(userSede)) {
                    console.log('❌ Rechazado por sede no incluida');
                    return false;
                }
            }

            // Filtrar por horario: si la clase tiene horarios definidos, el estudiante debe tener uno que coincida
            if (item.horarios && Array.isArray(item.horarios) && item.horarios.length > 0) {
                const userHorario = normalizeVisibilityValue(currentUser.horario);
                const horariosNormalizados = item.horarios.map(normalizeVisibilityValue);
                console.log('🔍 Horarios del item:', item.horarios, 'Horario usuario:', userHorario || '(sin horario)');
                if (userHorario && !horariosNormalizados.includes(userHorario)) {
                    console.log('❌ Rechazado por horario no incluido');
                    return false;
                }
            }
        }
