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
          throw error;
        }
      }

      // Método para consultas paralelas
      async parallelQueries(queries) {
        const promises = queries.map(({ collection: collectionName, constraints, options }) =>
          this.queryWithCache(collectionName, constraints, options)
        );

        try {
          const results = await Promise.all(promises);
          return results;
        } catch (error) {
          console.error('Error in parallel queries:', error);
          throw error;
        }
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

        // PRIMERO: Verificar si hay reintento concedido para este item (caso especial)
        const reintentoValido = reintentosDisponibles.find(reintento => {
            const esParaEsteItem = reintento.evaluacionId === item.id || reintento.cuestionarioId === item.id;
            if (!esParaEsteItem) return false;
            
            // Verificar si el reintento tiene fecha de expiración
            if (reintento.fechaExpiracion) {
                const ahora = new Date();
                const fechaExpiracion = new Date(reintento.fechaExpiracion);
                if (ahora > fechaExpiracion) {
                    console.log('⏰ Reintento expirado:', reintento.fechaExpiracion);
                    return false;
                }
            }
            
            // Verificar si tiene días de validez desde la creación
            if (reintento.diasValidez && reintento.fechaCreacion) {
                const fechaCreacion = new Date(reintento.fechaCreacion);
                const ahora = new Date();
                const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));
                if (diasTranscurridos > reintento.diasValidez) {
                    console.log('⏰ Reintento expirado por días de validez:', reintento.diasValidez, 'días transcurridos:', diasTranscurridos);
                    return false;
                }
            }
            
            return true;
        });
        
        if (reintentoValido) {
            console.log('🎯 Item aprobado por reintento concedido (caso especial)');
            return true;
        }

        // SEGUNDO: Aplicar restricciones normales si no hay reintento
        // Filtrar por programa
        const itemPrograma = (item.programa || '').toString().toLowerCase().trim();
        const userPrograma = (currentUser.programa || '').toString().toLowerCase().trim();
        console.log('🔍 Programa - Item:', itemPrograma, 'Usuario:', userPrograma);

        if (!itemPrograma || itemPrograma !== userPrograma) {
            console.log('❌ Rechazado por programa diferente');
            return false;
        }

        // Filtrar por combinaciones permitidas (nuevo sistema)
        if (item.combinacionesPermitidas && Array.isArray(item.combinacionesPermitidas) && item.combinacionesPermitidas.length > 0) {
            const userSede = (currentUser.sede || '').toString().trim();
            const userHorario = (currentUser.horario || '').toString().trim();
            console.log('🔍 Combinaciones permitidas:', item.combinacionesPermitidas);
            console.log('🔍 Usuario - Sede:', userSede, 'Horario:', userHorario);

            const combinacionPermitida = item.combinacionesPermitidas.some(combo => {
                const match = combo.sede === userSede && combo.horario === userHorario;
                console.log('🔍 Comparando combo:', combo, 'Match:', match);
                return match;
            });

            if (!combinacionPermitida) {
                console.log('❌ Rechazado por combinación no permitida');
                return false;
            }
        }
        // Compatibilidad con sistema anterior (sedes y horarios separados)
        else {
            console.log('🔍 Usando sistema anterior (sedes/horarios separados)');

            // Filtrar por sede (solo si el item tiene sedes definidas)
            if (item.sedes && Array.isArray(item.sedes) && item.sedes.length > 0) {
                const userSede = (currentUser.sede || '').toString().trim();
                console.log('🔍 Sedes del item:', item.sedes, 'Sede usuario:', userSede);
                if (!userSede || !item.sedes.includes(userSede)) {
                    console.log('❌ Rechazado por sede no incluida');
                    return false;
                }
            }

            // Filtrar por horario (solo si el item tiene horarios definidos)
            if (item.horarios && Array.isArray(item.horarios) && item.horarios.length > 0) {
                const userHorario = (currentUser.horario || '').toString().trim();
                console.log('🔍 Horarios del item:', item.horarios, 'Horario usuario:', userHorario);
                if (!userHorario || !item.horarios.includes(userHorario)) {
                    console.log('❌ Rechazado por horario no incluido');
                    return false;
                }
            }
        }

        // Filtrar por fechas de disponibilidad
        const now = new Date();
        if (item.fechaInicio && new Date(item.fechaInicio) > now) {
            console.log('❌ Rechazado por fecha de inicio futura');
            return false;
        }
        if (item.fechaFin && new Date(item.fechaFin) < now) {
            console.log('❌ Rechazado por fecha de fin pasada');
            return false;
        }

        console.log('✅ Item aprobado por restricciones normales');
        return true;
    });

    console.log('📊 Resultado filtrado:', filtered.length, 'de', items.length);

    // 🔥 RESPALDO TEMPORAL: Si no hay items filtrados, mostrar todos los del programa correcto
    // Esto permite acceso mientras se diagnostica el problema de permisos
    if (filtered.length === 0 && items.length > 0) {
        console.log('🚨 RESPALDO ACTIVADO: Mostrando todos los items del programa por falta de permisos específicos');

        const respaldoFiltered = items.filter(item => {
            const itemPrograma = (item.programa || '').toString().toLowerCase().trim();
            const userPrograma = (currentUser.programa || '').toString().toLowerCase().trim();
            return itemPrograma && itemPrograma === userPrograma;
        });

        console.log('📊 Items con respaldo:', respaldoFiltered.length);
        return respaldoFiltered;
    }

    return filtered;
}

async function loadDashboardStats() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    try {
        if (!currentUser.programa) {
            // Si no tiene programa asignado, mostrar 0
            const elements = ['totalClases', 'totalVideos', 'totalActividades', 'totalMateriales', 'totalCuestionarios', 'totalEvaluaciones',
                            'progressClasesPercent', 'progressVideosPercent', 'progressActividadesPercent', 'progressMaterialesPercent', 'progressCuestionariosPercent', 'progressEvaluacionesPercent',
                            'progressClasesText', 'progressVideosText', 'progressActividadesText', 'progressMaterialesText', 'progressCuestionariosText', 'progressEvaluacionesText'];
            elements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = id.startsWith('progress') && id.endsWith('Percent') ? '0%' : (id.startsWith('progress') && id.endsWith('Text') ? 'No hay contenido disponible' : '0');
            });
            return;
        }

        // Obtener completados desde localStorage (usando el sistema existente)
        function isCompleted(type, id) {
            const suffix = type === 'video' ? 'watched' : 'completed';
            return localStorage.getItem(`${type}-${id}-${suffix}`) === 'true';
        }

        // Función helper para filtrar items por sede y horario
        function shouldIncludeItem(itemData) {
            // Verificar sede
            if (itemData.sedes && Array.isArray(itemData.sedes) && itemData.sedes.length > 0) {
                if (!itemData.sedes.includes(currentUser.sede)) return false;
            }

            // Verificar horario
            if (itemData.horarios && Array.isArray(itemData.horarios) && itemData.horarios.length > 0) {
                if (!itemData.horarios.includes(currentUser.horario)) return false;
            }

            return true;
        }

        // Función helper para actualizar progreso
        function updateProgress(type, total, completed, totalEl, percentEl, textEl, fillEl) {
            if (totalEl) totalEl.textContent = total;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            if (percentEl) percentEl.textContent = `${percent}%`;
            if (textEl) textEl.textContent = total > 0 ? `Hay ${total} ${type.toLowerCase()}, has completado ${completed}` : `No hay ${type.toLowerCase()} disponibles`;

            // Actualizar círculo de progreso
            const circumference = 2 * Math.PI * 30; // r=30
            const dashArray = `${(completed / Math.max(total, 1)) * circumference}, ${circumference}`;
            if (fillEl) fillEl.style.strokeDasharray = dashArray;
        }

        // ===== CONSULTAS OPTIMIZADAS EN PARALELO =====
        const queries = [
            {
                collection: 'classes',
                constraints: [where('programa', '==', currentUser.programa)],
                options: { noLimit: false }
            },
            {
                collection: 'content',
                constraints: [where('programa', '==', currentUser.programa)],
                options: { noLimit: false }
            },
            {
                collection: 'activities',
                constraints: [where('programa', '==', currentUser.programa)],
                options: { noLimit: false }
            },
            {
                collection: 'materials',
                constraints: [where('programa', '==', currentUser.programa)],
                options: { noLimit: false }
            },
            {
                collection: 'cuestionarios',
                constraints: [where('programa', '==', currentUser.programa)],
                options: { noLimit: false }
            },
            {
                collection: 'evaluaciones',
                constraints: [where('programa', '==', currentUser.programa)],
                options: { noLimit: false }
            }
        ];

        // Ejecutar todas las consultas en paralelo
        let clasesData = [], videosData = [], actividadesData = [], materialesData = [], cuestionariosData = [], evaluacionesData = [];
        try {
            [clasesData, videosData, actividadesData, materialesData, cuestionariosData, evaluacionesData] =
                await window.parallelQueries(queries);
        } catch (error) {
            console.warn('Error loading dashboard stats, using cached/empty data:', error);
            // Usar datos vacíos si falla la conexión
        }

        // Procesar clases
        let filteredClasesCount = 0;
        let completedClasesCount = 0;
        clasesData.forEach(item => {
            if (shouldIncludeItem(item)) {
                filteredClasesCount++;
                if (isCompleted('clase', item.id)) {
                    completedClasesCount++;
                }
            }
        });

        updateProgress('Clases', filteredClasesCount, completedClasesCount,
                      document.getElementById('totalClases'),
                      document.getElementById('progressClasesPercent'),
                      document.getElementById('progressClasesText'),
                      document.getElementById('progressClasesFill'));

        // Procesar videos
        let filteredVideosCount = 0;
        let completedVideosCount = 0;
        videosData.forEach(item => {
            if (shouldIncludeItem(item)) {
                filteredVideosCount++;
                if (isCompleted('video', item.id)) {
                    completedVideosCount++;
                }
            }
        });

        updateProgress('Videos', filteredVideosCount, completedVideosCount,
                      document.getElementById('totalVideos'),
                      document.getElementById('progressVideosPercent'),
                      document.getElementById('progressVideosText'),
                      document.getElementById('progressVideosFill'));

        // Procesar actividades
        let filteredActividadesCount = 0;
        let completedActividadesCount = 0;
        actividadesData.forEach(item => {
            if (shouldIncludeItem(item)) {
                filteredActividadesCount++;
                if (isCompleted('actividad', item.id)) {
                    completedActividadesCount++;
                }
            }
        });

        updateProgress('Actividades', filteredActividadesCount, completedActividadesCount,
                      document.getElementById('totalActividades'),
                      document.getElementById('progressActividadesPercent'),
                      document.getElementById('progressActividadesText'),
                      document.getElementById('progressActividadesFill'));

        // Procesar materiales
        let filteredMaterialesCount = 0;
        let completedMaterialesCount = 0;
        materialesData.forEach(item => {
            if (shouldIncludeItem(item)) {
                filteredMaterialesCount++;
                if (isCompleted('material', item.id)) {
                    completedMaterialesCount++;
                }
            }
        });

        updateProgress('Materiales', filteredMaterialesCount, completedMaterialesCount,
                      document.getElementById('totalMateriales'),
                      document.getElementById('progressMaterialesPercent'),
                      document.getElementById('progressMaterialesText'),
                      document.getElementById('progressMaterialesFill'));

        // Procesar cuestionarios
        let filteredCuestionariosCount = 0;
        let completedCuestionariosCount = 0;
        cuestionariosData.forEach(item => {
            if (shouldIncludeItem(item)) {
                filteredCuestionariosCount++;
                if (isCompleted('cuestionario', item.id)) {
                    completedCuestionariosCount++;
                }
            }
        });

        updateProgress('Cuestionarios', filteredCuestionariosCount, completedCuestionariosCount,
                      document.getElementById('totalCuestionarios'),
                      document.getElementById('progressCuestionariosPercent'),
                      document.getElementById('progressCuestionariosText'),
                      document.getElementById('progressCuestionariosFill'));

        // Procesar evaluaciones
        let filteredEvaluacionesCount = 0;
        let completedEvaluacionesCount = 0;
        evaluacionesData.forEach(item => {
            if (shouldIncludeItem(item)) {
                filteredEvaluacionesCount++;
                if (isCompleted('evaluacion', item.id)) {
                    completedEvaluacionesCount++;
                }
            }
        });

        updateProgress('Evaluaciones', filteredEvaluacionesCount, completedEvaluacionesCount,
                      document.getElementById('totalEvaluaciones'),
                      document.getElementById('progressEvaluacionesPercent'),
                      document.getElementById('progressEvaluacionesText'),
                      document.getElementById('progressEvaluacionesFill'));

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

function showSectionV2(sectionId, noPush = false) {
    if (!sectionId) {
        console.error('showSection called with null or undefined sectionId');
        return;
    }
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    } else {
        console.error('Section not found:', sectionId);
        return; // Exit if section not found
    }
    
    // Guardar la sección actual en sessionStorage para mantenerla al recargar
    sessionStorage.setItem('activeSection', sectionId);
    
    // Agregar al historial del navegador para control de navegación
    if (!noPush && window.history && window.history.pushState) {
        if (sectionId === 'clases' || sectionId === 'actividades') {
            window.history.pushState({page: 'estudiante', section: sectionId, modulo: null}, sectionId, 'estudiante.html');
        } else {
            window.history.pushState({page: 'estudiante', section: sectionId}, sectionId, 'estudiante.html');
        }
    }
    
    // Marcar el nav-item correspondiente como activo
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        if (sidebar) sidebar.classList.remove('open');
        if (menuToggle) menuToggle.classList.remove('open');
    }
    if (sectionId === 'evaluaciones') {
        loadEvaluaciones();
    } else if (sectionId === 'videos') {
        loadVideos();
    } else if (sectionId === 'actividades') {
        window.loadActividades();
    } else if (sectionId === 'cuestionarios') {
        loadCuestionarios();
    } else if (sectionId === 'materiales') {
        loadMateriales();
    } else if (sectionId === 'clases') {
        window.loadClases();
    } else if (sectionId === 'calificaciones') {
        loadCalificaciones();
    } else if (sectionId === 'recursos') {
        loadRecursos();
    } else if (sectionId === 'quizzes') {
        loadQuizzesList();
    } else if (sectionId === 'foros') {        
        window.loadForosList?.();
    } else if (sectionId === 'gamificacion') {
        loadGamificacionStats();
    } else if (sectionId === 'proyecto') {
        // Inicializar el sistema de proyectos
        window.initProjectWizard?.();
    }
}

window.showSection = showSectionV2;

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuToggle');
    if (sidebar) sidebar.classList.toggle('open');
    if (menuBtn) menuBtn.classList.toggle('open');
}

function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('activeSection');
    window.location.href = 'login.html';
}

// Exponer funciones globales
window.toggleMenu = toggleMenu;
window.logout = logout;

// Agregar event listeners después de que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    try {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', toggleMenu);
        }

        // Event listeners para navegación
        const navItems = document.querySelectorAll('.nav-item[data-section]');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                const sectionId = this.getAttribute('data-section');
                if (typeof showSection === 'function') {
                    showSectionV2(sectionId);
                }
            });
        });

        const statCards = document.querySelectorAll('.stat-card[data-section]');
        statCards.forEach(card => {
            card.addEventListener('click', function() {
                const sectionId = this.getAttribute('data-section');
                if (typeof showSection === 'function') {
                    showSectionV2(sectionId);
                }
            });
        });

        const quickLinks = document.querySelectorAll('.quick-link[data-section]');
        quickLinks.forEach(link => {
            link.addEventListener('click', function() {
                const sectionId = this.getAttribute('data-section');
                if (typeof showSection === 'function') {
                    showSectionV2(sectionId);
                }
            });
        });

        // Event listener para el botón volver a módulos
        const volverBtn = document.querySelector('button[onclick*="volverAModulos"]');
        if (volverBtn) {
            volverBtn.removeAttribute('onclick');
            volverBtn.addEventListener('click', volverAModulos);
        }

        // Event listener para el botón volver a módulos de actividades
        const volverActividadesBtn = document.querySelector('button[onclick*="volverAModulosActividades"]');
        if (volverActividadesBtn) {
            volverActividadesBtn.removeAttribute('onclick');
            volverActividadesBtn.addEventListener('click', volverAModulosActividades);
        }

        // Cargar datos iniciales
        updateDashboard();
        
        // Cargar secciones que deberían estar disponibles inicialmente
        window.loadClases();
        loadVideos();
        window.loadActividades();
        loadMateriales();
        loadCuestionarios();
        
        // Mostrar sección inicial (dashboard)
        showSectionV2('dashboard');

    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
    }
});

// Sistema básico de notificaciones
function initializeNotifications() {
    // Verificar si hay notificaciones pendientes al cargar
    checkForNewContent();

    // Verificar cada 5 minutos por nuevo contenido
    setInterval(checkForNewContent, 300000);
}

async function checkForNewContent() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser || !currentUser.programa) return;

        const lastCheck = localStorage.getItem('lastNotificationCheck') || '0';
        const currentTime = Date.now();

        // Solo verificar si han pasado al menos 5 minutos
        if (currentTime - parseInt(lastCheck) < 300000) return;

        // Verificar conectividad antes de consultar
        if (!navigator.onLine) {
            console.log('Offline: skipping content check');
            return;
        }

        // Agregar filtro por programa para reducir la cantidad de datos
        const q = query(collection(db, 'classes'), where('programa', '==', currentUser.programa));
        const snapshot = await getDocs(q);
        let newContentCount = 0;

        snapshot.forEach(doc => {
            try {
                const clase = doc.data();
                
                // Validar que los datos necesarios existan
                if (!clase || typeof clase !== 'object') return;
                
                // Manejar diferentes formatos de fecha
                let claseDate;
                if (clase.fechaCreacion && clase.fechaCreacion.seconds) {
                    claseDate = new Date(clase.fechaCreacion.seconds * 1000);
                } else if (clase.fechaCreacion && typeof clase.fechaCreacion === 'string') {
                    claseDate = new Date(clase.fechaCreacion);
                } else if (clase.fechaCreacion && clase.fechaCreacion.toDate) {
                    claseDate = clase.fechaCreacion.toDate();
                } else {
                    claseDate = new Date(doc.updateTime ? doc.updateTime.seconds * 1000 : Date.now());
                }

                // Verificar que la fecha sea válida
                if (isNaN(claseDate.getTime())) {
                    claseDate = new Date();
                }

                // Verificar si es nuevo contenido
                if (claseDate.getTime() > parseInt(lastCheck)) {
                    newContentCount++;
                }
            } catch (docError) {
                console.warn('Error procesando documento de clase:', docError);
                // Continuar con el siguiente documento
            }
        });

        if (newContentCount > 0) {
            showNotification(`¡${newContentCount} nuevo${newContentCount > 1 ? 's' : ''} contenido${newContentCount > 1 ? 's' : ''} disponible${newContentCount > 1 ? 's' : ''} en tu programa!`, 'info');
        }

        localStorage.setItem('lastNotificationCheck', currentTime.toString());
        
    } catch (error) {
        console.error('Error checking for new content:', error);
        // No mostrar error al usuario, solo log
    }
}

function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Agregar al DOM
    document.body.appendChild(notification);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Exponer funciones globalmente
window.initializeNotifications = initializeNotifications;
window.checkForNewContent = checkForNewContent;
window.showNotification = showNotification;

let allCuestionarios = [];
let allEvaluaciones = [];
let preguntasOriginalesMap = new Map(); // Mapa global de preguntas originales

// Función para recalcular calificación (igual que admin.html)
function recalcularCalificacion(respuestas, preguntas) {
    if (!respuestas || !preguntas || preguntas.length === 0) {
        return null;
    }
    
    let correctas = 0;
    preguntas.forEach((pregunta, idx) => {
        const respuestaEstudiante = respuestas[idx];
        const textoPregunta = (pregunta.texto || pregunta.pregunta || '').trim().toLowerCase();
        
        // Buscar respuesta correcta: primero en la pregunta, luego en el mapa global
        let respuestaCorrectaIdx = pregunta.respuesta !== undefined ? pregunta.respuesta : 
                                   (pregunta.correcta !== undefined ? pregunta.correcta : null);
        
        if (respuestaCorrectaIdx === null || respuestaCorrectaIdx === undefined) {
            const preguntaOriginal = preguntasOriginalesMap.get(textoPregunta);
            if (preguntaOriginal) {
                respuestaCorrectaIdx = preguntaOriginal.correcta;
            }
        }
        
        
        if (respuestaEstudiante === respuestaCorrectaIdx) {
            correctas++;
        }
    });
    
    const resultado = Math.round((correctas / preguntas.length) * 100);
    return resultado;
}

// Función para cargar el mapa de preguntas originales
async function cargarPreguntasOriginales() {
    if (preguntasOriginalesMap.size > 0) return; // Ya está cargado
    
    try {
        // Cargar preguntas de cuestionarios
        const cuestionariosSnapshot = await getDocs(collection(db, 'cuestionarios'));
        cuestionariosSnapshot.forEach(docSnap => {
            const cuest = docSnap.data();
            if (cuest.preguntas && Array.isArray(cuest.preguntas)) {
                cuest.preguntas.forEach(p => {
                    const texto = (p.texto || p.pregunta || '').trim().toLowerCase();
                    if (texto) {
                        preguntasOriginalesMap.set(texto, {
                            opciones: p.opciones || [],
                            correcta: p.correcta !== undefined ? p.correcta : (p.respuesta !== undefined ? p.respuesta : null)
                        });
                    }
                });
            }
        });
        
        // También cargar preguntas de evaluaciones
        const evaluacionesSnapshot = await getDocs(collection(db, 'evaluaciones'));
        evaluacionesSnapshot.forEach(docSnap => {
            const eval_ = docSnap.data();
            if (eval_.preguntas && Array.isArray(eval_.preguntas)) {
                eval_.preguntas.forEach(p => {
                    const texto = (p.texto || p.pregunta || '').trim().toLowerCase();
                    if (texto && !preguntasOriginalesMap.has(texto)) {
                        preguntasOriginalesMap.set(texto, {
                            opciones: p.opciones || [],
                            correcta: p.correcta !== undefined ? p.correcta : (p.respuesta !== undefined ? p.respuesta : null)
                        });
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('Error cargando preguntas originales:', error);
    }
}

// Variable global para almacenar reintentos disponibles
let reintentosCache = [];

// Función para inicializar cache de reintentos al cargar la página
async function initializeReintentosCache() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (currentUser && currentUser.email) {
        await getReintentosDisponibles(currentUser.email);
        console.log('🎯 Cache de reintentos inicializada:', reintentosCache.length, 'reintentos');
    }
}

// Función helper para obtener reintentos disponibles
async function getReintentosDisponibles(email) {
    try {
        const reintentosQuery = query(
            collection(db, 'reintentosEvaluaciones'), 
            where('estudianteId', '==', email)
        );
        const reintentosSnapshot = await getDocs(reintentosQuery);
        const ahora = new Date();
        
        reintentosCache = reintentosSnapshot.docs
            .map(doc => doc.data())
            .filter(reintento => {
                // Filtrar por usado
                if (reintento.usado === true) return false;
                if (reintento.usado === undefined) return true; // Considerar undefined como no usado
                
                // Verificar fecha de expiración
                if (reintento.fechaExpiracion) {
                    const fechaExpiracion = new Date(reintento.fechaExpiracion);
                    if (ahora > fechaExpiracion) return false;
                }
                
                // Verificar días de validez
                if (reintento.diasValidez && reintento.fechaCreacion) {
                    const fechaCreacion = new Date(reintento.fechaCreacion);
                    const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));
                    if (diasTranscurridos > reintento.diasValidez) return false;
                }
                
                return true;
            });
        return reintentosCache;
    } catch (error) {
        console.log('Error obteniendo reintentos:', error);
        return [];
    }
}

// Función para obtener reintentos de cache (síncrona)
function getReintentosFromCache() {
    return reintentosCache;
}

async function loadCuestionarios() {
    const container = document.getElementById('cuestionariosContainer');
    if (!container) return;

    try {
        // Cargar preguntas originales primero
        await cargarPreguntasOriginales();
        
        const snapshot = await getDocs(collection(db, 'cuestionarios'));
        allCuestionarios = [];
        snapshot.forEach(doc => {
            const cuestionario = { id: doc.id, ...doc.data() };
            // Agregar campos calculados
            cuestionario.isCompleted = false; // Se actualizará con respuestas
            cuestionario.progress = 0;
            allCuestionarios.push(cuestionario);
        });

        // Cargar estado de respuestas con listener en tiempo real
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (currentUser) {
            // Obtener reintentos disponibles para este estudiante
            const reintentosDisponibles = await getReintentosDisponibles(currentUser.email);
            
            const respuestasQuery = query(collection(db, 'respuestasCuestionarios'), where('estudianteId', '==', currentUser.email));
            onSnapshot(respuestasQuery, (snapshot) => {
                const respuestasMap = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const clave = `${data.estudianteId}_${data.cuestionarioId}`;
                    if (!respuestasMap[clave]) respuestasMap[clave] = [];
                    respuestasMap[clave].push(data);
                });
                allCuestionarios.forEach(cuestionario => {
                    const clave = `${currentUser.email}_${cuestionario.id}`;
                    const misRespuestas = respuestasMap[clave] || [];
                    cuestionario.intentosRealizados = misRespuestas.length;
                    if (misRespuestas.length > 0) {
                        cuestionario.isCompleted = true;
                        cuestionario.respuestas = misRespuestas;
                        cuestionario.progress = 100;
                        
                        // PRE-CALCULAR la calificación usando el mismo método que admin.html
                        const ultimaRespuesta = misRespuestas[misRespuestas.length - 1];
                        if (ultimaRespuesta.respuestas && cuestionario.preguntas) {
                            cuestionario.calificacionRecalculada = recalcularCalificacion(ultimaRespuesta.respuestas, cuestionario.preguntas);
                        }
                    } else {
                        cuestionario.isCompleted = false;
                        cuestionario.respuestas = null;
                        cuestionario.calificacionRecalculada = null;
                    }
                });
        
        const filtered = filterByUserAccess(allCuestionarios, reintentosDisponibles);
                filteredCuestionarios = filtered;
                sortCuestionarios();
                updateCuestionariosStats();
                renderCuestionarios();
            }, (error) => {
                console.error('Error listening respuestas:', error);
            });
        }
    } catch (error) {
        console.error('Error al cargar cuestionarios:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>Error al cargar cuestionarios</h3><p>Intenta recargar la página</p></div>';
    }
}

function sortCuestionarios() {
    filteredCuestionarios.sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
}

function updateCuestionariosStats() {
    // Opcional: agregar estadísticas
}

function renderCuestionarios() {
    
    const container = document.getElementById('cuestionariosContainer');
    if (!container) {
        console.log('Container cuestionariosContainer not found');
        return;
    }

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-times"></i><h3>Acceso requerido</h3><p>Inicia sesión para ver los cuestionarios disponibles.</p></div>';
        return;
    }

    const ahora = new Date();
    container.className = `clases-container ${currentCuestionariosViewMode}-view`;

    container.innerHTML = filteredCuestionarios.map((cuestionario, index) => {
        
        const fecha = cuestionario.fechaRegistro ? new Date(cuestionario.fechaRegistro).toLocaleDateString('es-ES') : 'Sin fecha';
        const fechaLimite = cuestionario.fechaLimite ? new Date(cuestionario.fechaLimite) : null;
        const fechaInicio = cuestionario.fechaInicio ? new Date(cuestionario.fechaInicio) : null;
        const fechaFin = cuestionario.fechaFin ? new Date(cuestionario.fechaFin) : null;
        const ahora = new Date();
        const vencido = fechaLimite && ahora > fechaLimite;
        const disponible = (!fechaInicio || ahora >= fechaInicio) && (!fechaFin || ahora <= fechaFin);
        const isNew = cuestionario.fechaRegistro && (new Date() - new Date(cuestionario.fechaRegistro)) < (7 * 24 * 60 * 60 * 1000); // 7 días
        const intentosRealizados = cuestionario.intentosRealizados || 0;
        const maxIntentos = cuestionario.intentosMaximos || cuestionario.numeroIntentos || cuestionario.intentos || 1;
        const intentosRestantes = maxIntentos - intentosRealizados;
        
        // Verificar si hay reintento válido para este cuestionario
        const reintentosDisponibles = getReintentosFromCache();
        const tieneReintentoValido = reintentosDisponibles.some(reintento => {
            if (reintento.cuestionarioId !== cuestionario.id) return false;
            
            // Verificar expiración
            if (reintento.fechaExpiracion) {
                const fechaExpiracion = new Date(reintento.fechaExpiracion);
                if (ahora > fechaExpiracion) return false;
            }
            if (reintento.diasValidez && reintento.fechaCreacion) {
                const fechaCreacion = new Date(reintento.fechaCreacion);
                const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));
                if (diasTranscurridos > reintento.diasValidez) return false;
            }
            return true;
        });
        
        const puedeResponder = (disponible || tieneReintentoValido) && !vencido && (intentosRestantes > 0 || tieneReintentoValido);
        const isCompleted = intentosRealizados > 0;
        const progress = isCompleted ? 100 : 0;

        const lapsoDisponibilidad = fechaInicio && fechaFin ? `Disponible del ${fechaInicio.toLocaleString('es-ES')} al ${fechaFin.toLocaleString('es-ES')}` : '';

        return `
        <div class="clase-card ${currentCuestionariosViewMode === 'list' ? 'list-view' : ''} ${isCompleted ? 'completed' : ''} ${vencido ? 'vencido' : ''} ${isNew ? 'new' : ''}" data-id="${cuestionario.id}">
            <div class="clase-header">
                <div class="clase-title">
                    <i class="fas fa-question-circle"></i> ${cuestionario.titulo}
                </div>
                <div class="clase-meta">
                    <div class="meta-item"><i class="fas fa-calendar"></i> ${fecha}</div>
                    <div class="meta-item"><i class="fas fa-clock"></i> ${cuestionario.tiempoLimite ? `${cuestionario.tiempoLimite} min` : 'Sin límite'}</div>
                </div>
            </div>
            <div class="clase-content">
                <div class="clase-description">
                    ${cuestionario.descripcion || 'Sin descripción'}
                    ${lapsoDisponibilidad ? `<br><small style="color: #64748b;"><i class="fas fa-calendar-check"></i> ${lapsoDisponibilidad}</small>` : ''}
                </div>
                <div class="clase-stats">
                    <div class="stat-item">
                        <i class="fas fa-list"></i> ${cuestionario.preguntas?.length || 0} preguntas
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-redo"></i> ${intentosRealizados}/${Math.max(cuestionario.intentosMaximos || cuestionario.numeroIntentos || cuestionario.intentos || 1, intentosRealizados)} intentos
                    </div>
                </div>
                ${fechaLimite ? `<div class="clase-deadline ${vencido ? 'expired' : ''}">
                    <i class="fas fa-calendar-alt"></i> Límite: ${fechaLimite.toLocaleDateString('es-ES')}
                    ${vencido ? ' <strong>(VENCIDO)</strong>' : ''}
                </div>` : ''}
                <div class="clase-actions">
                    <button class="btn-primary-clase" onclick="verificarPagosYAcceder('${cuestionario.id.replace(/'/g, '\\\'')}', 'cuestionario')" ${!puedeResponder ? 'disabled' : ''}>
                        <i class="fas fa-play"></i> ${!disponible && !tieneReintentoValido ? 'No disponible en este momento' : isCompleted && !puedeResponder ? 'Ya has realizado todos los intentos posibles' : isCompleted ? 'Revisar Respuesta' : tieneReintentoValido ? 'Reintentar Cuestionario' : 'Responder Cuestionario'}
                    </button>
                    ${isCompleted ? `<button class="btn-eye-clase" onclick="mostrarRespuestasModal('${cuestionario.id.replace(/'/g, '\\\'')}', 'cuestionario')" title="Ver respuestas detalladas">
                        <i class="fas fa-eye"></i>
                    </button>` : ''}
                </div>
                ${cuestionario.respuestas && cuestionario.respuestas.length > 0 ? `
                <div class="clase-calificacion">
                    <div class="calificacion-badge">
                        <i class="fas fa-star"></i> Calificación: ${cuestionario.calificacionRecalculada !== null && cuestionario.calificacionRecalculada !== undefined ? cuestionario.calificacionRecalculada + '%' : 'Pendiente'}
                    </div>
                </div>
                ` : ''}
                <div class="clase-progress">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    if (filteredCuestionarios.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No hay cuestionarios disponibles</h3><p>No se encontraron cuestionarios que coincidan con tu búsqueda.</p></div>';
    } else {
    }
}

function sortEvaluaciones() {
    filteredEvaluaciones.sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
}

function updateEvaluacionesStats() {
    // Opcional: agregar estadísticas
}

function renderEvaluaciones() {
    const container = document.getElementById('evaluacionesList');
    if (!container) return;

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-times"></i><h3>Acceso requerido</h3><p>Inicia sesión para ver las evaluaciones disponibles.</p></div>';
        return;
    }

    const ahora = new Date();
    container.className = `clases-container ${currentEvaluacionesViewMode || 'grid'}-view`;

    container.innerHTML = filteredEvaluaciones.map(evaluacion => {
        const fecha = evaluacion.fechaRegistro ? new Date(evaluacion.fechaRegistro).toLocaleDateString('es-ES') : 'Sin fecha';
        const fechaLimite = evaluacion.fechaFin ? new Date(evaluacion.fechaFin) : null;
        const fechaInicio = evaluacion.fechaInicio ? new Date(evaluacion.fechaInicio) : null;
        const fechaFin = evaluacion.fechaFin ? new Date(evaluacion.fechaFin) : null;
        const ahora = new Date();
        const vencido = fechaLimite && ahora > fechaLimite;
        const disponible = (!fechaInicio || ahora >= fechaInicio) && (!fechaFin || ahora <= fechaFin);
        const isNew = evaluacion.fechaRegistro && (new Date() - new Date(evaluacion.fechaRegistro)) < (7 * 24 * 60 * 60 * 1000); // 7 días
        const intentosRealizados = evaluacion.intentosRealizados || 0;
        const maxIntentos = evaluacion.intentosMaximos || evaluacion.numeroIntentos || evaluacion.intentos || 1; // Evaluaciones pueden tener múltiples intentos
        const intentosRestantes = maxIntentos - intentosRealizados;
        const tieneReintentoPermitido = evaluacion.reintentoPermitido === true;
        const puedeResponder = disponible && !vencido && (intentosRestantes > 0 || tieneReintentoPermitido);
        const isCompleted = intentosRealizados > 0 && !tieneReintentoPermitido;
        const progress = isCompleted ? 100 : 0;

        const lapsoDisponibilidad = fechaInicio && fechaFin ? `Disponible del ${fechaInicio.toLocaleString('es-ES')} al ${fechaFin.toLocaleString('es-ES')}` : '';

        return `
        <div class="clase-card ${currentEvaluacionesViewMode === 'list' ? 'list-view' : ''} ${isCompleted ? 'completed' : ''} ${vencido ? 'vencido' : ''} ${isNew ? 'new' : ''}" data-id="${evaluacion.id}">
            <div class="clase-header">
                <div class="clase-title">
                    <i class="fas fa-clipboard-check"></i> ${evaluacion.titulo}
                </div>
                <div class="clase-meta">
                    <div class="meta-item"><i class="fas fa-calendar"></i> ${fecha}</div>
                    <div class="meta-item"><i class="fas fa-clock"></i> ${evaluacion.tiempoLimite ? `${evaluacion.tiempoLimite} min` : 'Sin límite'}</div>
                </div>
            </div>
            <div class="clase-content">
                <div class="clase-description">
                    ${evaluacion.descripcion || 'Sin descripción'}
                    ${lapsoDisponibilidad ? `<br><small style="color: #64748b;"><i class="fas fa-calendar-check"></i> ${lapsoDisponibilidad}</small>` : ''}
                </div>
                <div class="clase-stats">
                    <div class="stat-item">
                        <i class="fas fa-list"></i> ${evaluacion.preguntas?.length || 0} preguntas
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-redo"></i> ${intentosRealizados}/${Math.max(maxIntentos, intentosRealizados)} intentos
                    </div>
                </div>
                ${fechaLimite ? `<div class="clase-deadline ${vencido ? 'expired' : ''}">
                    <i class="fas fa-calendar-alt"></i> Límite: ${fechaLimite.toLocaleDateString('es-ES')}
                    ${vencido ? ' <strong>(VENCIDO)</strong>' : ''}
                </div>` : ''}
                <div class="clase-actions">
                    <button class="btn-primary-clase" onclick="verificarPagosYAcceder('${evaluacion.id.replace(/'/g, '\\\'')}', 'evaluacion')" ${!puedeResponder ? 'disabled' : ''}>
                        <i class="fas fa-play"></i> ${!disponible ? 'No disponible en este momento' : tieneReintentoPermitido ? 'Reintentar Evaluación' : isCompleted && !puedeResponder ? 'Ya has realizado la evaluación' : isCompleted ? 'Revisar Respuesta' : 'Responder Evaluación'}
                    </button>
                    ${isCompleted && !tieneReintentoPermitido ? `<button class="btn-eye-clase" onclick="verRespuestasCuestionario('${evaluacion.id.replace(/'/g, '\\\'')}', 'evaluacion')" title="Ver respuestas detalladas">
                        <i class="fas fa-eye"></i>
                    </button>` : ''}
                </div>
                ${(evaluacion.respuestas && evaluacion.respuestas.length > 0 && !tieneReintentoPermitido) ? `
                <div class="clase-calificacion">
                    <div class="calificacion-badge">
                        <i class="fas fa-star"></i> Calificación: ${evaluacion.calificacionRecalculada !== null && evaluacion.calificacionRecalculada !== undefined ? evaluacion.calificacionRecalculada + '%' : 'Pendiente'}
                    </div>
                </div>
                ` : ''}
                ${tieneReintentoPermitido ? `
                <div class="clase-calificacion">
                    <div class="calificacion-badge reintento">
                        <i class="fas fa-redo"></i> Reintento permitido por el administrador
                    </div>
                </div>
                ` : ''}
                <div class="clase-progress">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    if (filteredEvaluaciones.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No hay evaluaciones disponibles</h3><p>No se encontraron evaluaciones que coincidan con tu búsqueda.</p></div>';
    }
}

// =================== FUNCIONES PARA VER RESPUESTAS DETALLADAS ===================
// Función wrapper para manejar llamadas desde HTML onclick
window.mostrarRespuestasModal = function(cuestionarioId, tipo) {
    verRespuestasCuestionario(cuestionarioId, tipo).catch(error => {
        console.error('Error al mostrar respuestas:', error);
        alert('Error al cargar las respuestas detalladas: ' + error.message);
    });
};

// Exponer también verRespuestasCuestionario para evaluaciones
window.verRespuestasCuestionario = verRespuestasCuestionario;

async function verRespuestasCuestionario(cuestionarioId, tipo) {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
            alert('Usuario no autenticado');
            return;
        }

        // Obtener las respuestas del estudiante
        const collectionName = tipo === 'cuestionario' ? 'respuestasCuestionarios' : 'respuestasEvaluaciones';
        // Para evaluaciones, buscar por evaluacionId; para cuestionarios, buscar por cuestionarioId
        const campoId = tipo === 'evaluacion' ? 'evaluacionId' : 'cuestionarioId';
        const respuestasQuery = query(
            collection(db, collectionName), 
            where('estudianteId', '==', currentUser.email),
            where(campoId, '==', cuestionarioId)
        );
        const respuestasSnapshot = await getDocs(respuestasQuery);
        
        if (respuestasSnapshot.empty) {
            alert('No se encontraron respuestas para este ' + (tipo === 'cuestionario' ? 'cuestionario' : 'evaluación'));
            return;
        }
        
        // Tomar la respuesta más reciente
        const respuestaDoc = respuestasSnapshot.docs[0];
        const respuestaData = respuestaDoc.data();
        
        // Obtener el cuestionario/evaluación
        const cuestionarioRef = await getDoc(doc(db, tipo === 'cuestionario' ? 'cuestionarios' : 'evaluaciones', cuestionarioId));
        if (!cuestionarioRef.exists()) {
            alert('Cuestionario no encontrado');
            return;
        }
        
        const cuestionarioData = cuestionarioRef.data();
        
        // RECALCULAR las respuestas usando el MISMO MÉTODO que admin.html
        let preguntasRecalculadas = [];
        let correctasCount = 0;
        
        // Cargar TODOS los cuestionarios para buscar respuestas correctas por texto de pregunta
        const cuestionariosSnapshot = await getDocs(collection(db, 'cuestionarios'));
        const todasLasPreguntasCuestionarios = [];
        cuestionariosSnapshot.forEach(docSnap => {
            const cuest = docSnap.data();
            if (cuest.preguntas && Array.isArray(cuest.preguntas)) {
                cuest.preguntas.forEach(p => {
                    todasLasPreguntasCuestionarios.push({
                        texto: (p.texto || p.pregunta || '').trim().toLowerCase(),
                        opciones: p.opciones || [],
                        correcta: p.correcta !== undefined ? p.correcta : (p.respuesta !== undefined ? p.respuesta : null)
                    });
                });
            }
        });
        
        if (cuestionarioData.preguntas && cuestionarioData.preguntas.length > 0 && respuestaData.respuestas) {
            cuestionarioData.preguntas.forEach((pregunta, index) => {
                const textoPregunta = (pregunta.texto || pregunta.pregunta || '').trim().toLowerCase();
                
                // Buscar la respuesta correcta: primero en la pregunta, luego en cuestionarios
                let respuestaCorrectaIdx = pregunta.respuesta !== undefined ? pregunta.respuesta : 
                                           (pregunta.correcta !== undefined ? pregunta.correcta : null);
                
                // Si no encontramos la respuesta en la evaluación, buscar en cuestionarios
                if (respuestaCorrectaIdx === null || respuestaCorrectaIdx === undefined) {
                    const preguntaEnCuestionario = todasLasPreguntasCuestionarios.find(p => p.texto === textoPregunta);
                    if (preguntaEnCuestionario) {
                        respuestaCorrectaIdx = preguntaEnCuestionario.correcta;
                    }
                }
                
                const respuestaEstudianteIdx = respuestaData.respuestas[index];
                
                // Comparar índices para determinar si es correcta (igual que admin)
                const esCorrecta = respuestaEstudianteIdx === respuestaCorrectaIdx;
                
                if (esCorrecta) {
                    correctasCount++;
                }
                
                // Obtener textos de las respuestas
                let textoRespuestaEstudiante = 'Sin respuesta';
                let textoRespuestaCorrecta = 'Sin respuesta correcta';
                
                if (pregunta.opciones && Array.isArray(pregunta.opciones)) {
                    textoRespuestaEstudiante = (respuestaEstudianteIdx !== undefined && respuestaEstudianteIdx !== null && pregunta.opciones[respuestaEstudianteIdx]) 
                        ? pregunta.opciones[respuestaEstudianteIdx] 
                        : 'Sin respuesta';
                    textoRespuestaCorrecta = (respuestaCorrectaIdx !== undefined && respuestaCorrectaIdx !== null && pregunta.opciones[respuestaCorrectaIdx]) 
                        ? pregunta.opciones[respuestaCorrectaIdx] 
                        : 'Sin respuesta correcta';
                }
                
                preguntasRecalculadas.push({
                    pregunta: pregunta.texto || pregunta.pregunta || `Pregunta ${index + 1}`,
                    opciones: pregunta.opciones || [],
                    respuestaEstudiante: textoRespuestaEstudiante,
                    respuestaEstudianteIdx: respuestaEstudianteIdx,
                    respuestaCorrecta: textoRespuestaCorrecta,
                    respuestaCorrectaIdx: respuestaCorrectaIdx,
                    correcta: esCorrecta
                });
            });
        } else if (respuestaData.preguntasDetalladas && respuestaData.preguntasDetalladas.length > 0) {
            // Fallback a preguntasDetalladas si existen
            preguntasRecalculadas = respuestaData.preguntasDetalladas;
            correctasCount = preguntasRecalculadas.filter(p => p.correcta === true).length;
        }
        
        const calificacionRecalculada = preguntasRecalculadas.length > 0 
            ? Math.round((correctasCount / preguntasRecalculadas.length) * 100) 
            : 0;
        
        // Generar HTML de las preguntas
        function generarHTMLPregunta(pregunta, index) {
            const esCorrecta = pregunta.correcta;
            const statusIcon = esCorrecta === true ? '✅' : '❌';
            const statusText = esCorrecta === true ? 'Correcta' : 'Incorrecta';
            const bgPregunta = esCorrecta ? '#f0fdf4' : '#fef2f2';
            const borderPregunta = esCorrecta ? '#10b981' : '#ef4444';
            const colorStatus = esCorrecta ? '#10b981' : '#ef4444';
            
            let opcionesHTML = '';
            if (pregunta.opciones && pregunta.opciones.length > 0) {
                opcionesHTML = '<div style="display: grid; gap: 0.5rem;">';
                pregunta.opciones.forEach((opcion, opIdx) => {
                    // Comparar directamente como lo hace el admin (sin parseInt)
                    const esRespuestaEstudiante = opIdx === pregunta.respuestaEstudianteIdx;
                    const esRespuestaCorrecta = opIdx === pregunta.respuestaCorrectaIdx;
                    let bgColor = '#f8fafc';
                    let borderColor = '#e2e8f0';
                    let label = '';
                    
                    if (esRespuestaCorrecta && esRespuestaEstudiante) {
                        bgColor = '#d1fae5';
                        borderColor = '#10b981';
                        label = '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">✓ TU RESPUESTA (CORRECTA)</span>';
                    } else if (esRespuestaEstudiante && !esCorrecta) {
                        bgColor = '#fee2e2';
                        borderColor = '#ef4444';
                        label = '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">✗ TU RESPUESTA</span>';
                    } else if (esRespuestaCorrecta) {
                        bgColor = '#d1fae5';
                        borderColor = '#10b981';
                        label = '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">✓ CORRECTA</span>';
                    }
                    
                    opcionesHTML += '<div style="background: ' + bgColor + '; border: 2px solid ' + borderColor + '; padding: 0.75rem; border-radius: 6px;">' +
                        '<span style="font-weight: 500;">' + String.fromCharCode(65 + opIdx) + '.</span> ' + opcion + ' ' + label +
                    '</div>';
                });
                opcionesHTML += '</div>';
            } else {
                opcionesHTML = '<div style="display: grid; gap: 0.5rem;">' +
                    '<div style="background: #fee2e2; border: 2px solid #ef4444; padding: 0.75rem; border-radius: 6px;">' +
                        '<strong>Tu respuesta:</strong> ' + (pregunta.respuestaEstudiante || 'Sin respuesta') +
                    '</div>' +
                    '<div style="background: #d1fae5; border: 2px solid #10b981; padding: 0.75rem; border-radius: 6px;">' +
                        '<strong>Respuesta correcta:</strong> ' + (pregunta.respuestaCorrecta || 'Sin respuesta correcta') +
                    '</div>' +
                '</div>';
            }
            
            return '<div class="respuesta-item" style="background: ' + bgPregunta + '; border-left: 4px solid ' + borderPregunta + '; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">' +
                '<div class="respuesta-header" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">' +
                    '<h4 style="margin: 0; color: #1e3a8a;">Pregunta ' + (index + 1) + '</h4>' +
                    '<span style="font-weight: bold; color: ' + colorStatus + ';">' + statusIcon + ' ' + statusText + '</span>' +
                '</div>' +
                '<div class="respuesta-content">' +
                    '<p style="font-weight: 500; color: #374151; margin-bottom: 1rem;">' + pregunta.pregunta + '</p>' +
                    opcionesHTML +
                '</div>' +
            '</div>';
        }
        
        const preguntasHTML = preguntasRecalculadas.length > 0 
            ? preguntasRecalculadas.map((p, i) => generarHTMLPregunta(p, i)).join('')
            : '<p style="text-align: center; color: #64748b; padding: 2rem;">No hay respuestas disponibles para mostrar</p>';
        
        // Crear el modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content respuestas-modal">
                <div class="modal-header">
                    <h2><i class="fas fa-eye"></i> ${cuestionarioData.titulo || 'Cuestionario'} - Revisión de Respuestas</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: center;">
                        <h3 style="margin: 0;">Calificación: ${calificacionRecalculada}%</h3>
                        <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">${correctasCount} de ${preguntasRecalculadas.length} respuestas correctas</p>
                    </div>
                    <div class="respuestas-container">
                        ${preguntasHTML}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        try {
            // Forzar estilos del modal para asegurar visibilidad
            modal.style.display = 'flex';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.background = 'rgba(0, 0, 0, 0.7)';
            modal.style.zIndex = '10000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            
            // Verificar nuevamente después de forzar estilos
            setTimeout(() => {
                const modalAfterForce = document.querySelector('.modal-overlay');
                if (modalAfterForce) {
                    // Logs de verificación silenciosos (solo en desarrollo)
                }
            }, 100);
        } catch (error) {
            console.error('Error in modal styling:', error);
        }
        
        // Prevenir scroll del body cuando el modal está abierto
        document.body.style.overflow = 'hidden';
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });
        
    } catch (error) {
        console.error('Error al cargar respuestas detalladas:', error);
        alert('Error al cargar las respuestas detalladas');
    }
}

async function loadVideos() {
    const container = document.getElementById('videosContainer');
    if (!container) return;

    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser || !currentUser.programa) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Usuario no válido</h3><p>Inicia sesión nuevamente</p></div>';
            return;
        }

        // Usar consultas optimizadas con filtro de programa
        const videosData = await window.queryOptimized('content', [
            where('programa', '==', currentUser.programa)
        ]);

        allVideos = [];
        videosData.forEach(video => {
            // Agregar campos calculados desde localStorage
            video.isWatched = localStorage.getItem(`video-${video.id}-watched`) === 'true';
            video.lastWatched = localStorage.getItem(`video-${video.id}-lastWatched`);
            video.progress = parseInt(localStorage.getItem(`video-${video.id}-progress`) || '0');
            allVideos.push(video);
        });

        // Obtener reintentos disponibles para este estudiante
        const reintentosDisponibles = await getReintentosDisponibles(currentUser.email);

        const filtered = filterByUserAccess(allVideos, reintentosDisponibles);
        filteredVideos = filtered;
        sortVideos();
        updateVideosStats();
        renderVideos();

    } catch (error) {
        console.error('Error al cargar videos:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error al cargar videos</h3><p>Intenta recargar la página</p></div>';
    }
}

async function loadActividades(selectedModulo = null) {
    try {
        // Si no hay módulo seleccionado, mostrar selector de módulos
        if (!selectedModulo) {
            showModulosSelectorActividades();
            return;
        }

        // Cargar actividades y filtrar por módulo
        loadActividadesContent(selectedModulo);
    } catch (error) {
        console.error('Error al cargar actividades:', error);
        const container = document.getElementById('actividadesContainer');
        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error al cargar actividades</h3><p>Intenta recargar la página</p></div>';
        }
    }
}

// Asignar función al objeto window para acceso global
window.loadActividades = loadActividades;

async function loadActividadesContent(selectedModulo) {
    console.log(`loadActividadesContent called with selectedModulo: ${selectedModulo}`);
    const container = document.getElementById('actividadesContainer');
    if (!container) return;

    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser || !currentUser.programa) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Usuario no válido</h3><p>Inicia sesión nuevamente</p></div>';
            return;
        }
        console.log(`Usuario programa: ${currentUser.programa}`);

        // Cargar actividades manuales desde 'activities'
        const actividadesData = await window.queryOptimized('activities', [
            where('programa', '==', currentUser.programa)
        ]);

        // Cargar actividades interactivas IA desde 'actividades_interactivas'
        let actividadesInteractivasData = [];
        try {
            const iaSnap = await getDocs(query(collection(db, 'actividades_interactivas'), where('programa', '==', currentUser.programa)));
            iaSnap.forEach(d => actividadesInteractivasData.push({ ...d.data(), id: d.id, esInteractiva: true }));
        } catch(e) {
            console.warn('No se pudieron cargar actividades interactivas:', e);
        }

        // Filtrar actividades manuales por módulo en cliente
        const actividadesFiltradas = [];
        actividadesData.forEach(actividad => {
            console.log(`Actividad: ${actividad.titulo}, programa: ${actividad.programa}, modulo: ${actividad.modulo}`);
            // Si no tiene módulo asignado, mostrar en módulo 3 por defecto
            let actividadModulo = actividad.modulo;
            if (typeof actividadModulo === 'number') {
                actividadModulo = `modulo${actividadModulo}`;
            } else if (!actividadModulo) {
                actividadModulo = 'modulo3';
            }
            const selectedModuloStr = selectedModulo.toString();
            console.log(`ActividadModulo asignado: ${actividadModulo}, selectedModulo: ${selectedModuloStr}`);
            if (actividadModulo === selectedModuloStr) {
                actividadesFiltradas.push(actividad);
                console.log('Actividad incluida en filtro');
            } else {
                console.log('Actividad excluida del filtro');
            }
        });

        // Filtrar actividades interactivas IA por módulo
        actividadesInteractivasData.forEach(actividad => {
            let actividadModulo = actividad.modulo;
            if (typeof actividadModulo === 'number') {
                actividadModulo = `modulo${actividadModulo}`;
            } else if (!actividadModulo) {
                actividadModulo = 'modulo3';
            }
            if (actividadModulo === selectedModulo.toString()) {
                actividadesFiltradas.push(actividad);
            }
        });

        console.log(`Actividades filtradas para modulo ${selectedModulo}:`, actividadesFiltradas);

        console.log(`Cargando actividades para programa: ${currentUser.programa}, modulo: ${selectedModulo}`);
        console.log('Actividades encontradas:', actividadesFiltradas);

        allActividades = [];
        actividadesFiltradas.forEach(actividad => {
            // Agregar campos calculados desde localStorage
            actividad.isCompleted = localStorage.getItem(`actividad-${actividad.id}-completed`) === 'true';
            actividad.lastCompleted = localStorage.getItem(`actividad-${actividad.id}-lastCompleted`);
            actividad.progress = parseInt(localStorage.getItem(`actividad-${actividad.id}-progress`) || '0');
            allActividades.push(actividad);
        });

        // Cargar estado de entregas con listener en tiempo real
        if (currentUser) {
            // Obtener reintentos disponibles para este estudiante
            const reintentosDisponibles = await getReintentosDisponibles(currentUser.email);
            
            const entregasQuery = query(collection(db, 'entregas'), where('estudianteId', '==', currentUser.email));
            onSnapshot(entregasQuery, (snapshot) => {
                const entregasMap = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    entregasMap[data.actividadId] = data;
                });
                allActividades.forEach(actividad => {
                    const entrega = entregasMap[actividad.id];
                    if (entrega) {
                        actividad.isSubmitted = true;
                        actividad.isCompleted = entrega.calificada || false;
                        actividad.entrega = entrega;
                    } else {
                        actividad.isSubmitted = false;
                        actividad.isCompleted = localStorage.getItem(`actividad-${actividad.id}-completed`) === 'true';
                        actividad.entrega = null;
                    }
                });

                // Filtrar por acceso del usuario (ya filtrado por programa y módulo en la consulta)
                const filteredByAccess = filterByUserAccess(allActividades, reintentosDisponibles);

                filteredActividades = filteredByAccess;

                // Mostrar contenido de actividades
                document.getElementById('modulosSelectorActividades').style.display = 'none';
                document.getElementById('actividadesContent').style.display = 'block';

                // Push history state for the selected module
                window.history.pushState({page: 'estudiante', section: 'actividades', modulo: selectedModulo}, `${getModuloName(selectedModulo)} - Actividades`, 'estudiante.html');

                // Actualizar título
                const tituloElement = document.querySelector('#actividades .page-title');
                tituloElement.innerHTML = `<i class="fas fa-tasks"></i> ${getModuloName(selectedModulo)} - Actividades`;

                sortActividades();
                updateActividadesStats();
                renderActividades();
            }, (error) => {
                console.error('Error listening entregas:', error);
            });
        }

    } catch (error) {
        console.error('Error al cargar actividades:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error al cargar actividades</h3><p>Intenta recargar la página</p></div>';
    }
}

async function loadMateriales() {
    const container = document.getElementById('materialesList');
    if (!container) return;

    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser || !currentUser.programa) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Usuario no válido</h3><p>Inicia sesión nuevamente</p></div>';
            return;
        }

        // Usar consultas optimizadas con filtro de programa
        const materialesData = await window.queryOptimized('materials', [
            where('programa', '==', currentUser.programa)
        ]);

        allMateriales = [];
        materialesData.forEach(material => {
            // Agregar campos calculados desde localStorage
            material.isDownloaded = localStorage.getItem(`material-${material.id}-downloaded`) === 'true';
            allMateriales.push(material);
        });

        // Obtener reintentos disponibles para este estudiante
        const reintentosDisponibles = await getReintentosDisponibles(currentUser.email);

        const filtered = filterByUserAccess(allMateriales, reintentosDisponibles);
        filteredMateriales = filtered;
        sortMateriales();
        updateMaterialesStats();
        renderMateriales();
    } catch (error) {
        console.error('Error al cargar materiales:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>Error al cargar materiales</h3><p>Intenta recargar la página</p></div>';
    }
}

function sortMateriales() {
    filteredMateriales.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}

function updateMaterialesStats() {
    // Opcional: agregar estadísticas
}

function renderMateriales() {
    const container = document.getElementById('materialesList');
    if (!container) return;

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-times"></i><h3>Acceso requerido</h3><p>Inicia sesión para ver los materiales disponibles.</p></div>';
        return;
    }

    const ahora = new Date();
    container.className = `clases-container grid-view`;

    container.innerHTML = filteredMateriales.map(material => {
        const fecha = material.fecha ? new Date(material.fecha).toLocaleDateString('es-ES') : 'Sin fecha';
        const tipoIcon = material.tipo === 'pdf' ? '📄' : material.tipo === 'docx' ? '📗' : material.tipo === 'video' ? '🎥' : material.tipo === 'link' ? '🔗' : material.tipo === 'imagen' ? '🖼️' : '📎';
        const tamanoText = material.tamano > 0 ? `${material.tamano} MB` : '';
        const isNew = material.fecha && (new Date() - new Date(material.fecha)) < (7 * 24 * 60 * 60 * 1000); // 7 días

        return `
        <div class="clase-card grid-view ${isNew ? 'new' : ''}" data-id="${material.id}">
            <div class="clase-header">
                <div class="clase-title">
                    ${tipoIcon} ${material.titulo}
                </div>
                <div class="clase-meta">
                    <div class="meta-item"><i class="fas fa-calendar"></i> ${fecha}</div>
                    ${tamanoText ? `<div class="meta-item"><i class="fas fa-file"></i> ${tamanoText}</div>` : ''}
                </div>
            </div>
            <div class="clase-content">
                <div class="clase-description">
                    ${material.descripcion || 'Sin descripción'}
                </div>
                <div class="clase-actions">
                    ${material.url && isValidUrl(material.url) ? `
                        <a href="${material.url}" target="_blank" class="btn-primary-clase" onclick="markAsDownloaded('${material.id}')" ${material.tipo === 'pdf' || material.tipo === 'docx' || material.tipo === 'video' ? 'rel="noopener noreferrer"' : ''}>
                            <i class="fas fa-${material.tipo === 'video' ? 'play' : material.tipo === 'link' ? 'external-link-alt' : 'download'}"></i>
                            ${material.tipo === 'video' ? 'Ver Video' : material.tipo === 'link' ? 'Abrir Enlace' : 'Descargar Material'}
                        </a>
                    ` : `
                        <div class="material-error">
                            <button class="btn-primary-clase btn-disabled" disabled>
                                <i class="fas fa-exclamation-triangle"></i> Material no disponible
                            </button>
                            <small class="error-hint">
                                ${!material.url ? 'URL no configurada' : 'URL inválida: ' + (material.url.length > 30 ? material.url.substring(0, 30) + '...' : material.url)}
                            </small>
                        </div>
                    `}
                </div>
            </div>
        </div>
        `;
    }).join('');

    if (filteredMateriales.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>No hay materiales disponibles</h3><p>No se encontraron materiales que coincidan con tu búsqueda.</p></div>';
    }
}

function markAsDownloaded(materialId) {
    // Marcar como descargado/visto
    localStorage.setItem(`material-${materialId}-downloaded`, 'true');

    // Registrar la fecha de último acceso
    localStorage.setItem(`material-${materialId}-lastAccess`, new Date().toISOString());

    // Opcional: enviar analytics o tracking
}

function isValidUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Trim whitespace
    url = url.trim();

    if (url === '') {
        return false;
    }

    // Check if it's a relative URL (starts with /)
    if (url.startsWith('/')) {
        return true;
    }

    // Check if it's a protocol-relative URL (starts with //)
    if (url.startsWith('//')) {
        return true;
    }

    try {
        const urlObj = new URL(url);

        // Check if it has a valid protocol
        if (!['http:', 'https:', 'ftp:', 'mailto:'].includes(urlObj.protocol)) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

function volverAModulos() {
    // Mostrar el selector de módulos
    document.getElementById('modulosSelector').style.display = 'block';
    document.getElementById('clasesContent').style.display = 'none';
    const tituloElement = document.querySelector('#clases .page-title');
    tituloElement.innerHTML = '<i class="fas fa-book-open"></i> Mis Clases';
    // Llamar a loadClases para asegurar que se cargue el selector
    loadClases();
}

function showModulosSelectorActividades() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const programa = currentUser.programa || '';
    
    // Determinar el programa de manera más flexible
    let programaNormalizado = 'Panadería y Pastelería'; // Default
    
    if (programa.toLowerCase().includes('belleza')) {
        programaNormalizado = 'Belleza Integral';
    } else if (programa.toLowerCase().includes('asesoría') || programa.toLowerCase().includes('asesoria')) {
        programaNormalizado = 'Asesoría Técnica';
    } else if (programa.toLowerCase().includes('panadería') || programa.toLowerCase().includes('panaderia') || programa.toLowerCase().includes('pastelería') || programa.toLowerCase().includes('pasteleria')) {
        programaNormalizado = 'Panadería y Pastelería';
    }
    
    // Definir módulos según el programa
    const modulosPorPrograma = {
        'Panadería y Pastelería': [
            { id: 'modulo1', icon: 'fa-bread-slice', nombre: 'Módulo 1', descripcion: 'Panadería', color: '#667eea' },
            { id: 'modulo2', icon: 'fa-cookie-bite', nombre: 'Módulo 2', descripcion: 'Galletaría', color: '#f093fb' },
            { id: 'modulo3', icon: 'fa-birthday-cake', nombre: 'Módulo 3', descripcion: 'Pastelería', color: '#4facfe' },
            { id: 'modulo4', icon: 'fa-utensils', nombre: 'Módulo 4', descripcion: 'Repostería', color: '#43e97b' }
        ],
        'Belleza Integral': [
            { id: 'modulo1', icon: 'fa-eye', nombre: 'Módulo 1', descripcion: 'Diseño de Mirada', color: '#ec4899' },
            { id: 'modulo2', icon: 'fa-magic', nombre: 'Módulo 2', descripcion: 'Maquillaje', color: '#f472b6' },
            { id: 'modulo3', icon: 'fa-cut', nombre: 'Módulo 3', descripcion: 'Estilismo', color: '#a855f7' },
            { id: 'modulo4', icon: 'fa-hand-sparkles', nombre: 'Módulo 4', descripcion: 'Nails Designer', color: '#8b5cf6' }
        ],
        'Asesoría Técnica': [
            { id: 'modulo1', icon: 'fa-chalkboard-teacher', nombre: 'Módulo 1', descripcion: 'Fundamentos', color: '#3b82f6' },
            { id: 'modulo2', icon: 'fa-chart-line', nombre: 'Módulo 2', descripcion: 'Estrategias', color: '#6366f1' },
            { id: 'modulo3', icon: 'fa-users', nombre: 'Módulo 3', descripcion: 'Gestión', color: '#8b5cf6' },
            { id: 'modulo4', icon: 'fa-award', nombre: 'Módulo 4', descripcion: 'Especialización', color: '#a855f7' }
        ]
    };
    
    const modulos = modulosPorPrograma[programaNormalizado] || modulosPorPrograma['Panadería y Pastelería'];
    
    const container = document.getElementById('modulosSelectorActividades');
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h3 style="color: #1e3a8a; margin-bottom: 0.5rem;"><i class="fas fa-layer-group"></i> Selecciona un Módulo</h3>
            <p style="color: #6b7280; margin-bottom: 2rem;">${programa}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; max-width: 800px; margin: 0 auto;">
                ${modulos.map(m => `
                    <div class="modulo-card" data-modulo="${m.id}" style="background: linear-gradient(135deg, ${m.color} 0%, ${m.color}dd 100%);">
                        <i class="fas ${m.icon}"></i>
                        <h4>${m.nombre}</h4>
                        <p>${m.descripcion}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Agregar event listeners para los clics
    const cards = container.querySelectorAll('.modulo-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const modulo = card.getAttribute('data-modulo');
            window.loadActividades(modulo);
        });
        card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
        card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
    });
}

function volverAModulosActividades() {
    // Mostrar el selector de módulos
    document.getElementById('modulosSelectorActividades').style.display = 'block';
    document.getElementById('actividadesContent').style.display = 'none';
    const tituloElement = document.querySelector('#actividades .page-title');
    tituloElement.innerHTML = '<i class="fas fa-tasks"></i> Actividades';
    // Llamar a loadActividades para asegurar que se cargue el selector
    loadActividades();
}

function getModuloName(moduloKey) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const programa = currentUser.programa || '';
    
    // Determinar el programa de manera más flexible
    let programaNormalizado = 'Panadería y Pastelería'; // Default
    
    if (programa.toLowerCase().includes('belleza')) {
        programaNormalizado = 'Belleza Integral';
    } else if (programa.toLowerCase().includes('asesoría') || programa.toLowerCase().includes('asesoria')) {
        programaNormalizado = 'Asesoría Técnica';
    } else if (programa.toLowerCase().includes('panadería') || programa.toLowerCase().includes('panaderia') || programa.toLowerCase().includes('pastelería') || programa.toLowerCase().includes('pasteleria')) {
        programaNormalizado = 'Panadería y Pastelería';
    }
    
    const modulosPorPrograma = {
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
    
    const modulos = modulosPorPrograma[programaNormalizado] || modulosPorPrograma['Panadería y Pastelería'];
    return modulos[moduloKey] || moduloKey;
}

// =================== FUNCIONES DE MATERIALES ===================
async function filterMaterialesByCategory(category) {
    switch (category) {
        case 'recientes':
            filteredMateriales = allMateriales.filter(material =>
                material.fecha && (new Date() - new Date(material.fecha)) < (30 * 24 * 60 * 60 * 1000) // 30 días
            );
            break;
        case 'pdf':
            filteredMateriales = allMateriales.filter(material => material.tipo === 'pdf');
            break;
        case 'video':
            filteredMateriales = allMateriales.filter(material => material.tipo === 'video');
            break;
        case 'documento':
            filteredMateriales = allMateriales.filter(material => material.tipo === 'docx');
            break;
        default:
            filteredMateriales = [...allMateriales];
    }

    // Obtener reintentos disponibles para este estudiante
    const reintentosDisponibles = getReintentosFromCache();

    // Aplicar filtro de programa
    filteredMateriales = filterByUserAccess(filteredMateriales, reintentosDisponibles);
    sortMateriales();
    renderMateriales();
}

async function filterMateriales() {
    const searchTerm = document.getElementById('materialesSearch')?.value.toLowerCase() || '';

    if (!searchTerm) {
        filteredMateriales = [...allMateriales];
    } else {
        filteredMateriales = allMateriales.filter(material =>
            material.titulo.toLowerCase().includes(searchTerm) ||
            (material.descripcion && material.descripcion.toLowerCase().includes(searchTerm))
        );
    }

    // Obtener reintentos disponibles para este estudiante
    const reintentosDisponibles = getReintentosFromCache();

    // Aplicar filtro de programa
    filteredMateriales = filterByUserAccess(filteredMateriales, reintentosDisponibles);
    sortMateriales();
    renderMateriales();
}

// =================== CLASES ===================
// Variables globales para las clases
let allClases = [];
let filteredClases = [];
let currentViewMode = 'grid';
let currentPage = 1;
let itemsPerPage = 12;
let currentFilter = 'all';
let currentSort = 'fecha-desc';

// =================== MATERIALES ===================
// Variables globales para los materiales
let allMateriales = [];
let filteredMateriales = [];

// =================== CLASES MEJORADAS ===================
async function loadClases(selectedModulo = null) {
    try {
        // Si no hay módulo seleccionado, mostrar selector de módulos
        if (!selectedModulo) {
            showModulosSelectorEstudiante();
            return;
        }

        // Cargar clases y filtrar por módulo
        loadClasesByModulo(selectedModulo);
    } catch (error) {
        console.error('Error al cargar clases:', error);
        const container = document.getElementById('clasesContainer');
        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error al cargar clases</h3><p>Intenta recargar la página</p></div>';
        }
    }
}

// Asignar función al objeto window para acceso global
window.loadClases = loadClases;

async function loadClasesByModulo(selectedModulo) {
    const container = document.getElementById('clasesContainer');
    if (!container) return;

    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser || !currentUser.programa) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Usuario no válido</h3><p>Inicia sesión nuevamente</p></div>';
            return;
        }

        // Usar consultas optimizadas con filtros
        const clasesData = await window.queryOptimized('classes', [
            where('programa', '==', currentUser.programa),
            where('modulo', '==', selectedModulo)
        ]);

        allClases = [];
        clasesData.forEach(clase => {
            // Agregar campos calculados desde localStorage
            clase.isCompleted = localStorage.getItem(`clase-${clase.id}-completed`) === 'true';
            clase.isRead = localStorage.getItem(`clase-${clase.id}-read`) === 'true';
            clase.lastRead = localStorage.getItem(`clase-${clase.id}-lastRead`);
            clase.progress = parseInt(localStorage.getItem(`clase-${clase.id}-progress`) || '0');
            allClases.push(clase);
        });

        // Obtener reintentos disponibles para este estudiante
        const reintentosDisponibles = await getReintentosDisponibles(currentUser.email);

        // Filtrar por acceso del usuario (sede, horario, etc.)
        const filteredByAccess = filterByUserAccess(allClases, reintentosDisponibles);

        filteredClases = filteredByAccess;

        // Mostrar contenido de clases
        document.getElementById('modulosSelector').style.display = 'none';
        document.getElementById('clasesContent').style.display = 'block';

        // Push history state for the selected module
        window.history.pushState({page: 'estudiante', section: 'clases', modulo: selectedModulo}, `${getModuloName(selectedModulo)} - Mis Clases`, 'estudiante.html');

        // Actualizar título
        const tituloElement = document.querySelector('#clases .page-title');
        tituloElement.innerHTML = `<i class="fas fa-book-open"></i> ${getModuloName(selectedModulo)} - Mis Clases`;

        sortClases();
        updateClasesStats();
        renderClases();

    } catch (error) {
        console.error('Error al cargar clases:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error al cargar clases</h3><p>Intenta recargar la página</p></div>';
    }
}

function showModulosSelectorEstudiante() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const programa = currentUser.programa || '';
    
    // Determinar el programa de manera más flexible
    let programaNormalizado = 'Panadería y Pastelería'; // Default
    
    if (programa.toLowerCase().includes('belleza')) {
        programaNormalizado = 'Belleza Integral';
    } else if (programa.toLowerCase().includes('asesoría') || programa.toLowerCase().includes('asesoria')) {
        programaNormalizado = 'Asesoría Técnica';
    } else if (programa.toLowerCase().includes('panadería') || programa.toLowerCase().includes('panaderia') || programa.toLowerCase().includes('pastelería') || programa.toLowerCase().includes('pasteleria')) {
        programaNormalizado = 'Panadería y Pastelería';
    }
    
    // Definir módulos según el programa
    const modulosPorPrograma = {
        'Panadería y Pastelería': [
            { id: 'modulo1', icon: 'fa-bread-slice', nombre: 'Módulo 1', descripcion: 'Panadería', color: '#667eea' },
            { id: 'modulo2', icon: 'fa-cookie-bite', nombre: 'Módulo 2', descripcion: 'Galletaría', color: '#f093fb' },
            { id: 'modulo3', icon: 'fa-birthday-cake', nombre: 'Módulo 3', descripcion: 'Pastelería', color: '#4facfe' },
            { id: 'modulo4', icon: 'fa-utensils', nombre: 'Módulo 4', descripcion: 'Repostería', color: '#43e97b' }
        ],
        'Belleza Integral': [
            { id: 'modulo1', icon: 'fa-eye', nombre: 'Módulo 1', descripcion: 'Diseño de Mirada', color: '#ec4899' },
            { id: 'modulo2', icon: 'fa-magic', nombre: 'Módulo 2', descripcion: 'Maquillaje', color: '#f472b6' },
            { id: 'modulo3', icon: 'fa-cut', nombre: 'Módulo 3', descripcion: 'Estilismo', color: '#a855f7' },
            { id: 'modulo4', icon: 'fa-hand-sparkles', nombre: 'Módulo 4', descripcion: 'Nails Designer', color: '#8b5cf6' }
        ],
        'Asesoría Técnica': [
            { id: 'modulo1', icon: 'fa-chalkboard-teacher', nombre: 'Módulo 1', descripcion: 'Fundamentos', color: '#3b82f6' },
            { id: 'modulo2', icon: 'fa-chart-line', nombre: 'Módulo 2', descripcion: 'Estrategias', color: '#6366f1' },
            { id: 'modulo3', icon: 'fa-users', nombre: 'Módulo 3', descripcion: 'Gestión', color: '#8b5cf6' },
            { id: 'modulo4', icon: 'fa-award', nombre: 'Módulo 4', descripcion: 'Especialización', color: '#a855f7' }
        ]
    };
    
    const modulos = modulosPorPrograma[programaNormalizado] || modulosPorPrograma['Panadería y Pastelería'];
    
    const container = document.getElementById('modulosSelector');
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h3 style="color: #1e3a8a; margin-bottom: 0.5rem;"><i class="fas fa-layer-group"></i> Selecciona un Módulo</h3>
            <p style="color: #6b7280; margin-bottom: 2rem;">${programa}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; max-width: 800px; margin: 0 auto;">
                ${modulos.map(m => `
                    <div class="modulo-card" data-modulo="${m.id}" style="background: linear-gradient(135deg, ${m.color} 0%, ${m.color}dd 100%);">
                        <i class="fas ${m.icon}"></i>
                        <h4>${m.nombre}</h4>
                        <p>${m.descripcion}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Agregar event listeners para los clics
    const cards = container.querySelectorAll('.modulo-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const modulo = card.getAttribute('data-modulo');
            window.loadClases(modulo);
        });
        card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
        card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
    });
}

function updateClasesStats() {
    const total = filteredClases.length;
    const leidas = filteredClases.filter(c => c.isRead).length;
    const progreso = total > 0 ? Math.round((leidas / total) * 100) : 0;

    const totalElement = document.getElementById('totalClasesCount');
    const leidasElement = document.getElementById('leidasCount');
    const progresoElement = document.getElementById('progresoCount');
    
    if (totalElement) totalElement.textContent = total;
    if (leidasElement) leidasElement.textContent = leidas;
    if (progresoElement) progresoElement.textContent = progreso + '%';
}

// =================== RECURSOS PREMIUM ===================

function renderClases() {
    const container = document.getElementById('clasesContainer');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const clasesToShow = filteredClases.slice(startIndex, endIndex);

    if (clasesToShow.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><h3>No hay clases disponibles</h3><p>No se encontraron clases que coincidan con tu búsqueda.</p></div>';
        const paginationEl = document.getElementById('clasesPagination');
        if (paginationEl) paginationEl.style.display = 'none';
        return;
    }

    container.className = `clases-container ${currentViewMode}-view`;

    container.innerHTML = clasesToShow.map(clase => {
        const fecha = clase.fechaCreacion ? new Date(clase.fechaCreacion).toLocaleDateString('es-ES') : 'Sin fecha';
        const isNew = clase.fechaCreacion && (new Date() - new Date(clase.fechaCreacion)) < (7 * 24 * 60 * 60 * 1000); // 7 días
        const tags = clase.tags ? clase.tags.split(',').map(tag => tag.trim()) : [];

        return `
            <div class="clase-card ${currentViewMode === 'list' ? 'list-view' : ''} ${clase.isCompleted ? 'completed' : ''} ${isNew ? 'new' : ''}" data-id="${clase.id}">
                <div class="clase-header">
                    <h3 class="clase-title">
                        <i class="fas fa-book-open"></i>
                        ${clase.titulo}
                    </h3>
                    <div class="clase-meta">
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i>
                            ${fecha}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-graduation-cap"></i>
                            ${clase.programa || 'General'}
                        </span>
                        ${clase.duracion ? `<span class="meta-item"><i class="fas fa-clock"></i> ${clase.duracion}</span>` : ''}
                    </div>
                </div>

                <div class="clase-content">
                    <p class="clase-description">${clase.descripcion || 'Sin descripción disponible.'}</p>

                    ${tags.length > 0 ? `
                        <div class="clase-tags">
                            ${tags.map(tag => `<span class="clase-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div class="clase-progress">
                        <div class="progress-bar" style="width: ${clase.progress}%"></div>
                    </div>

                    <div class="clase-actions">
                        <button class="btn-primary-clase" onclick="openModal('clase', '${clase.id}')">
                            <i class="fas fa-eye"></i>
                            ${clase.isRead ? 'Revisar' : 'Leer'}
                        </button>
                        <button class="btn-secondary-clase" onclick="toggleClaseCompleted('${clase.id}')">
                            <i class="fas fa-${clase.isCompleted ? 'check-circle' : 'circle'}"></i>
                            ${clase.isCompleted ? 'Completada' : 'Marcar como leída'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredClases.length / itemsPerPage);
    const pagination = document.getElementById('clasesPagination');

    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    
    const currentPageEl = document.getElementById('currentPage');
    const totalPagesEl = document.getElementById('totalPages');
    const prevPageEl = document.getElementById('prevPage');
    const nextPageEl = document.getElementById('nextPage');
    
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    if (prevPageEl) prevPageEl.disabled = currentPage === 1;
    if (nextPageEl) nextPageEl.disabled = currentPage === totalPages;
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredClases.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderClases();
}

function setViewMode(mode) {
    currentViewMode = mode;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="setViewMode('${mode}')"]`).classList.add('active');
    renderClases();
}

function filterByCategory(category) {
    currentFilter = category;
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[onclick="filterByCategory('${category}')"]`).classList.add('active');

    switch (category) {
        case 'recientes':
            filteredClases = filteredClases.filter(clase =>
                clase.fechaCreacion && (new Date() - new Date(clase.fechaCreacion)) < (30 * 24 * 60 * 60 * 1000)
            );
            break;
        case 'no-leidas':
            filteredClases = filteredClases.filter(clase => !clase.isRead);
            break;
        case 'completadas':
            filteredClases = filteredClases.filter(clase => clase.isCompleted);
            break;
        default:
            // Ya está filtrado por programa desde loadClases
            break;
    }
    currentPage = 1;
    sortClases();
    renderClases();
}

function filterClases() {
    const searchTerm = document.getElementById('clasesSearch').value.toLowerCase();

    // Guardar referencia a las clases filtradas por programa antes de aplicar búsqueda
    const programFilteredClases = [...filteredClases];

    if (!searchTerm) {
        filteredClases = [...programFilteredClases];
    } else {
        filteredClases = programFilteredClases.filter(clase =>
            clase.titulo.toLowerCase().includes(searchTerm) ||
            (clase.descripcion && clase.descripcion.toLowerCase().includes(searchTerm)) ||
            (clase.tags && clase.tags.toLowerCase().includes(searchTerm))
        );
    }

    // Aplicar filtro de programa
    filteredClases = filterByUserAccess(filteredClases);
    currentPage = 1;
    sortClases();
    renderClases();
}

function sortClases() {
    const sortElement = document.getElementById('sortClases');
    if (!sortElement) return; // Si no existe el elemento, no hacer nada
    
    const sortBy = sortElement.value;

    filteredClases.sort((a, b) => {
        switch (sortBy) {
            case 'fecha-desc':
                return new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0);
            case 'fecha-asc':
                return new Date(a.fechaCreacion || 0) - new Date(b.fechaCreacion || 0);
            case 'titulo-asc':
                return a.titulo.localeCompare(b.titulo);
            case 'titulo-desc':
                return b.titulo.localeCompare(a.titulo);
            default:
                return 0;
        }
    });

    renderClases();
}

function toggleClaseCompleted(claseId) {
    const clase = allClases.find(c => c.id === claseId);
    if (!clase) return;

    clase.isCompleted = !clase.isCompleted;
    clase.isRead = true;
    clase.progress = clase.isCompleted ? 100 : Math.max(clase.progress, 50);

    // Guardar en localStorage
    localStorage.setItem(`clase-${claseId}-completed`, clase.isCompleted);
    localStorage.setItem(`clase-${claseId}-read`, clase.isRead);
    localStorage.setItem(`clase-${claseId}-progress`, clase.progress);
    localStorage.setItem(`clase-${claseId}-lastRead`, new Date().toISOString());

    updateClasesStats();
    renderClases();
}

// =================== VIDEOS ===================
// Variables globales para los videos
let allVideos = [];
let filteredVideos = [];
let currentVideosViewMode = 'grid';
let currentVideosPage = 1;
let itemsPerVideosPage = 12;
let currentVideosFilter = 'all';
let currentVideosSort = 'fecha-desc';

// Funciones para videos
function updateVideosStats() {
    const total = filteredVideos.length;
    const vistas = filteredVideos.filter(v => v.isWatched).length;
    const progreso = total > 0 ? Math.round((vistas / total) * 100) : 0;
    
    const totalElement = document.getElementById('totalVideosCount');
    const vistasElement = document.getElementById('vistasCount');
    const progresoElement = document.getElementById('progresoVideosCount');
    
    if (totalElement) totalElement.textContent = total;
    if (vistasElement) vistasElement.textContent = vistas;
    if (progresoElement) progresoElement.textContent = progreso + '%';
}

function renderVideos() {
    const container = document.getElementById('videosContainer');
    const startIndex = (currentVideosPage - 1) * itemsPerVideosPage;
    const endIndex = startIndex + itemsPerVideosPage;
    const videosToShow = filteredVideos.slice(startIndex, endIndex);

    if (videosToShow.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-play-circle"></i><h3>No hay videos disponibles</h3><p>No se encontraron videos que coincidan con tu búsqueda.</p></div>';
        const paginationEl = document.getElementById('videosPagination');
        if (paginationEl) paginationEl.style.display = 'none';
        return;
    }

    container.className = `clases-container ${currentVideosViewMode}-view`;

    container.innerHTML = videosToShow.map(video => {
        const fecha = video.fechaCreacion ? new Date(video.fechaCreacion).toLocaleDateString('es-ES') : 'Sin fecha';
        const isNew = video.fechaCreacion && (new Date() - new Date(video.fechaCreacion)) < (7 * 24 * 60 * 60 * 1000); // 7 días
        const tags = video.tags ? video.tags.split(',').map(tag => tag.trim()) : [];

        return `
            <div class="clase-card ${currentVideosViewMode === 'list' ? 'list-view' : ''} ${video.isWatched ? 'completed' : ''} ${isNew ? 'new' : ''}" data-id="${video.id}">
                <div class="clase-header">
                    <div class="clase-title">
                        <i class="fas fa-play-circle"></i> ${video.titulo}
                    </div>
                    <div class="clase-meta">
                        <div class="meta-item"><i class="fas fa-calendar"></i> ${fecha}</div>
                        <div class="meta-item"><i class="fas fa-clock"></i> ${video.duracion || 'N/A'}</div>
                    </div>
                </div>
                <div class="clase-content">
                    <div class="clase-description">
                        ${video.descripcion || 'Sin descripción'}
                    </div>
                    <div class="clase-tags">
                        ${tags.map(tag => `<span class="clase-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="clase-actions">
                        <button class="btn-primary-clase" onclick="openModal('video', '${video.id}')">
                            <i class="fas fa-play"></i> Ver Video
                        </button>
                        <button class="btn-secondary-clase" onclick="toggleVideoWatched('${video.id}')">
                            <i class="fas fa-check"></i> ${video.isWatched ? 'Marcar no visto' : 'Marcar visto'}
                        </button>
                    </div>
                    <div class="clase-progress">
                        <div class="progress-bar" style="width: ${video.progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    updateVideosPagination();
}

function updateVideosPagination() {
    const totalPages = Math.ceil(filteredVideos.length / itemsPerVideosPage);
    const pagination = document.getElementById('videosPagination');

    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    
    const currentPageEl = document.getElementById('currentVideosPage');
    const totalPagesEl = document.getElementById('totalVideosPages');
    const prevPageEl = document.getElementById('prevVideosPage');
    const nextPageEl = document.getElementById('nextVideosPage');
    
    if (currentPageEl) currentPageEl.textContent = currentVideosPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    if (prevPageEl) prevPageEl.disabled = currentVideosPage === 1;
    if (nextPageEl) nextPageEl.disabled = currentVideosPage === totalPages;
}

function changeVideosPage(direction) {
    const totalPages = Math.ceil(filteredVideos.length / itemsPerVideosPage);
    currentVideosPage += direction;
    if (currentVideosPage < 1) currentVideosPage = 1;
    if (currentVideosPage > totalPages) currentVideosPage = totalPages;
    renderVideos();
}

function setVideosViewMode(mode) {
    currentVideosViewMode = mode;
    document.querySelectorAll('#videos .view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#videos [onclick="setVideosViewMode('${mode}')"]`).classList.add('active');
    renderVideos();
}

function filterVideosByCategory(category) {
    currentVideosFilter = category;
    document.querySelectorAll('#videos .filter-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`#videos [onclick="filterVideosByCategory('${category}')"]`).classList.add('active');

    switch (category) {
        case 'recientes':
            filteredVideos = allVideos.filter(video =>
                video.fechaCreacion && (new Date() - new Date(video.fechaCreacion)) < (30 * 24 * 60 * 60 * 1000) // 30 días
            );
            break;
        case 'no-vistas':
            filteredVideos = allVideos.filter(video => !video.isWatched);
            break;
        case 'vistas':
            filteredVideos = allVideos.filter(video => video.isWatched);
            break;
        default:
            filteredVideos = [...allVideos];
    }

    // Aplicar filtro de programa
    filteredVideos = filterByUserAccess(filteredVideos);
    currentVideosPage = 1;
    sortVideos();
    renderVideos();
}

function filterVideos() {
    const searchTerm = document.getElementById('videosSearch').value.toLowerCase();

    if (!searchTerm) {
        filteredVideos = [...allVideos];
    } else {
        filteredVideos = allVideos.filter(video =>
            video.titulo.toLowerCase().includes(searchTerm) ||
            (video.descripcion && video.descripcion.toLowerCase().includes(searchTerm)) ||
            (video.tags && video.tags.toLowerCase().includes(searchTerm))
        );
    }

    // Aplicar filtro de programa
    filteredVideos = filterByUserAccess(filteredVideos);
    currentVideosPage = 1;
    sortVideos();
    renderVideos();
}

function sortVideos() {
    const sortElement = document.getElementById('sortVideos');
    if (!sortElement) return; // Si no existe el elemento, no hacer nada
    
    const sortBy = sortElement.value;

    filteredVideos.sort((a, b) => {
        switch (sortBy) {
            case 'fecha-desc':
                return new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0);
            case 'fecha-asc':
                return new Date(a.fechaCreacion || 0) - new Date(b.fechaCreacion || 0);
            case 'titulo-asc':
                return a.titulo.localeCompare(b.titulo);
            case 'titulo-desc':
                return b.titulo.localeCompare(a.titulo);
            default:
                return 0;
        }
    });

    renderVideos();
}

function toggleVideoWatched(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;

    video.isWatched = !video.isWatched;
    video.progress = video.isWatched ? 100 : Math.max(video.progress, 50);

    // Guardar en localStorage
    localStorage.setItem(`video-${videoId}-watched`, video.isWatched);
    localStorage.setItem(`video-${videoId}-progress`, video.progress);
    localStorage.setItem(`video-${videoId}-lastWatched`, new Date().toISOString());

    updateVideosStats();
    renderVideos();
}

// =================== ACTIVIDADES ===================
// Variables globales para las actividades
let allActividades = [];
let filteredActividades = [];
let filteredCuestionarios = [];
let filteredEvaluaciones = [];
let currentActividadesViewMode = 'grid';
let currentActividadesPage = 1;
let itemsPerActividadesPage = 12;
let currentActividadesFilter = 'all';
let currentActividadesSort = 'fecha-desc';

// =================== CUESTIONARIOS ===================
// Variables globales para los cuestionarios
let currentCuestionariosViewMode = 'grid';
let currentEvaluacionesViewMode = 'grid';
let currentCuestionariosFilter = 'all';
let currentCuestionariosSort = 'fecha-desc';

// Variable global para el editor de entregas
let entregaEditor;
async function loadContentFromChunks(claseId) {
    try {
        // Obtener todos los chunks para esta clase
        const chunksQuery = query(collection(db, 'class_chunks'), where('claseId', '==', claseId));
        const chunksSnapshot = await getDocs(chunksQuery);

        if (chunksSnapshot.empty) {
            return null;
        }

        const chunks = [];
        chunksSnapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.content) {  // Validar que el chunk tenga contenido
                chunks.push({
                    content: data.content,
                    chunkIndex: data.chunkIndex || 0
                });
            }
        });

        if (chunks.length === 0) {
            return null;  // No hay chunks válidos
        }

        // Ordenar los chunks por chunkIndex
        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

        // Unir todos los chunks
        const fullContent = chunks.map(chunk => chunk.content).join('');

        // Validar que el contenido final no esté vacío
        if (!fullContent || fullContent.trim().length === 0) {
            return null;
        }

        return fullContent;
    } catch (error) {
        console.error('Error loading content from chunks:', error);
        return null;
    }
}
function updateActividadesStats() {
    const total = filteredActividades.length;
    const completadas = filteredActividades.filter(a => a.isCompleted).length;
    const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;
    
    const totalElement = document.getElementById('totalActividadesCount');
    const completadasElement = document.getElementById('completadasCount');
    const progresoElement = document.getElementById('progresoActividadesCount');
    
    if (totalElement) totalElement.textContent = total;
    if (completadasElement) completadasElement.textContent = completadas;
    if (progresoElement) progresoElement.textContent = progreso + '%';
}

function renderActividades() {
    const container = document.getElementById('actividadesContainer');
    const startIndex = (currentActividadesPage - 1) * itemsPerActividadesPage;
    const endIndex = startIndex + itemsPerActividadesPage;
    const actividadesToShow = filteredActividades.slice(startIndex, endIndex);

    if (actividadesToShow.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><h3>No hay actividades disponibles</h3><p>No se encontraron actividades que coincidan con tu búsqueda.</p></div>';
        const paginationEl = document.getElementById('actividadesPagination');
        if (paginationEl) paginationEl.style.display = 'none';
        return;
    }

    container.className = `clases-container ${currentActividadesViewMode}-view`;

    container.innerHTML = actividadesToShow.map(actividad => {
        const fecha = actividad.fechaRegistro ? new Date(actividad.fechaRegistro).toLocaleDateString('es-ES') : 'Sin fecha';
        const isNew = actividad.fechaRegistro && (new Date() - new Date(actividad.fechaRegistro)) < (7 * 24 * 60 * 60 * 1000); // 7 días
        const dificultadClass = actividad.dificultad === 'principiante' ? 'success' : actividad.dificultad === 'avanzado' ? 'danger' : 'warning';
        const dificultadIcon = actividad.dificultad === 'principiante' ? 'fa-seedling' : actividad.dificultad === 'avanzado' ? 'fa-fire' : 'fa-balance-scale';
        const tiempoText = actividad.tiempoEstimado ? `${actividad.tiempoEstimado} min` : 'Sin especificar';
        const esInteractiva = !!actividad.esInteractiva;
        const tieneCalificacion = actividad.entrega && actividad.entrega.calificada;
        const puntaje = actividad.entrega && actividad.entrega.puntaje !== undefined ? actividad.entrega.puntaje : null;

        return `
            <div class="clase-card ${currentActividadesViewMode === 'list' ? 'list-view' : ''} ${actividad.isCompleted ? 'completed' : actividad.isSubmitted ? 'submitted' : ''} ${isNew ? 'new' : ''} ${esInteractiva ? 'interactiva' : ''}" data-id="${actividad.id}">
                <div class="clase-header">
                    <div class="clase-title">
                        <i class="fas ${esInteractiva ? 'fa-bolt' : 'fa-tasks'}"></i> ${actividad.titulo}
                        ${esInteractiva ? '<span class="badge-interactiva"><i class="fas fa-star"></i> Interactiva</span>' : ''}
                    </div>
                    <div class="clase-meta">
                        <div class="meta-item"><i class="fas fa-calendar"></i> ${fecha}</div>
                        <div class="meta-item"><i class="fas fa-clock"></i> ${tiempoText}</div>
                        <div class="meta-item dificultad-${dificultadClass}"><i class="fas ${dificultadIcon}"></i> ${actividad.dificultad || 'Intermedio'}</div>
                        ${esInteractiva ? `<div class="meta-item" style="color:#6366f1;"><i class="fas fa-question-circle"></i> ${actividad.preguntas?.length || 0} preguntas</div>` : ''}
                    </div>
                </div>
                <div class="clase-content">
                    ${actividad.objetivos ? `<div class="clase-objetivos"><strong>Objetivos:</strong> ${actividad.objetivos}</div>` : ''}
                    <div class="clase-description">
                        ${actividad.descripcion || actividad.instrucciones || 'Sin instrucciones detalladas'}
                    </div>
                    ${actividad.materiales ? `<div class="clase-materiales"><strong>Materiales:</strong> ${actividad.materiales}</div>` : ''}
                    ${actividad.archivoUrl ? `<div class="clase-archivo"><i class="fas fa-link"></i> <a href="${actividad.archivoUrl}" target="_blank">Recursos adicionales</a></div>` : ''}
                    <div class="clase-actions">
                        <button class="btn-primary-clase ${esInteractiva ? 'btn-interactiva' : ''}" onclick="openModal('actividad', '${actividad.id}', ${esInteractiva})" ${actividad.isSubmitted && !actividad.isCompleted && !esInteractiva ? 'disabled' : ''}>
                            <i class="fas ${esInteractiva ? 'fa-play-circle' : 'fa-upload'}"></i> ${actividad.isCompleted ? (esInteractiva ? 'Ver Resultado' : 'Revisar Entrega') : actividad.isSubmitted ? (esInteractiva ? 'Intentar de Nuevo' : 'Pendiente de calificación') : (esInteractiva ? 'Iniciar Actividad' : 'Entregar Actividad')}
                        </button>
                        ${!esInteractiva ? `<button class="btn-secondary-clase" onclick="toggleActividadCompleted('${actividad.id}')" ${actividad.isSubmitted ? 'disabled' : ''}><i class="fas fa-check"></i> ${actividad.isCompleted ? 'Marcar pendiente' : 'Marcar completada'}</button>` : ''}
                    </div>
                    ${tieneCalificacion ? `
                    <div class="clase-calificacion">
                        <div class="calificacion-badge">
                            <i class="fas fa-star"></i> ${esInteractiva && puntaje !== null ? `Puntaje: ${puntaje}%` : `Calificación: ${actividad.entrega.nota || 'Pendiente'}`}
                            ${actividad.entrega.comentario ? `<br><small>Comentario: ${actividad.entrega.comentario}</small>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    <div class="clase-progress">
                        <div class="progress-bar" style="width: ${actividad.progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    updateActividadesPagination();
}

function updateActividadesPagination() {
    const totalPages = Math.ceil(filteredActividades.length / itemsPerActividadesPage);
    const pagination = document.getElementById('actividadesPagination');

    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    
    const currentPageEl = document.getElementById('currentActividadesPage');
    const totalPagesEl = document.getElementById('totalActividadesPages');
    const prevPageEl = document.getElementById('prevActividadesPage');
    const nextPageEl = document.getElementById('nextActividadesPage');
    
    if (currentPageEl) currentPageEl.textContent = currentActividadesPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    if (prevPageEl) prevPageEl.disabled = currentActividadesPage === 1;
    if (nextPageEl) nextPageEl.disabled = currentActividadesPage === totalPages;
}

function changeActividadesPage(direction) {
    const totalPages = Math.ceil(filteredActividades.length / itemsPerActividadesPage);
    currentActividadesPage += direction;
    if (currentActividadesPage < 1) currentActividadesPage = 1;
    if (currentActividadesPage > totalPages) currentActividadesPage = totalPages;
    renderActividades();
}

function setActividadesViewMode(mode) {
    currentActividadesViewMode = mode;
    document.querySelectorAll('#actividades .view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#actividades [onclick="setActividadesViewMode('${mode}')"]`).classList.add('active');
    renderActividades();
}

function filterActividadesByCategory(category) {
    currentActividadesFilter = category;
    document.querySelectorAll('#actividades .filter-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`#actividades [onclick="filterActividadesByCategory('${category}')"]`).classList.add('active');

    switch (category) {
        case 'recientes':
            filteredActividades = allActividades.filter(actividad =>
                actividad.fechaRegistro && (new Date() - new Date(actividad.fechaRegistro)) < (30 * 24 * 60 * 60 * 1000) // 30 días
            );
            break;
        case 'pendientes':
            filteredActividades = allActividades.filter(actividad => !actividad.isCompleted);
            break;
        case 'completadas':
            filteredActividades = allActividades.filter(actividad => actividad.isCompleted);
            break;
        default:
            filteredActividades = [...allActividades];
    }

    // Aplicar filtro de programa
    filteredActividades = filterByUserAccess(filteredActividades);
    currentActividadesPage = 1;
    sortActividades();
    renderActividades();
}

function filterActividades() {
    const searchTerm = document.getElementById('actividadesSearch').value.toLowerCase();
    const dificultadFilter = document.getElementById('actividadDificultadFilter').value;
    const tiempoFilter = document.getElementById('actividadTiempoFilter').value;

    filteredActividades = allActividades.filter(actividad => {
        // Filtro de búsqueda
        const matchesSearch = !searchTerm ||
            actividad.titulo.toLowerCase().includes(searchTerm) ||
            (actividad.instrucciones && actividad.instrucciones.toLowerCase().includes(searchTerm)) ||
            (actividad.objetivos && actividad.objetivos.toLowerCase().includes(searchTerm)) ||
            (actividad.materiales && actividad.materiales.toLowerCase().includes(searchTerm));

        // Filtro de dificultad
        const matchesDificultad = dificultadFilter === 'all' || actividad.dificultad === dificultadFilter;

        // Filtro de tiempo
        let matchesTiempo = true;
        if (tiempoFilter !== 'all' && actividad.tiempoEstimado) {
            const tiempo = actividad.tiempoEstimado;
            switch (tiempoFilter) {
                case '30':
                    matchesTiempo = tiempo < 30;
                    break;
                case '60':
                    matchesTiempo = tiempo >= 30 && tiempo <= 60;
                    break;
                case '120':
                    matchesTiempo = tiempo > 60 && tiempo <= 120;
                    break;
                case '240':
                    matchesTiempo = tiempo > 120;
                    break;
            }
        }

        return matchesSearch && matchesDificultad && matchesTiempo;
    });

    // Aplicar filtro de programa
    filteredActividades = filterByUserAccess(filteredActividades);
    currentActividadesPage = 1;
    sortActividades();
    renderActividades();
}

function sortActividades() {
    const sortElement = document.getElementById('actividadOrdenFilter');
    if (!sortElement) return;
    
    const sortBy = sortElement.value;

    filteredActividades.sort((a, b) => {
        switch (sortBy) {
            case 'fecha-desc':
                return new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0);
            case 'fecha-asc':
                return new Date(a.fechaRegistro || 0) - new Date(b.fechaRegistro || 0);
            case 'titulo-asc':
                return a.titulo.localeCompare(b.titulo);
            case 'titulo-desc':
                return b.titulo.localeCompare(a.titulo);
            case 'tiempo-asc':
                return (a.tiempoEstimado || 0) - (b.tiempoEstimado || 0);
            case 'tiempo-desc':
                return (b.tiempoEstimado || 0) - (a.tiempoEstimado || 0);
            default:
                return 0;
        }
    });

    renderActividades();
}

function toggleActividadCompleted(actividadId) {
    const actividad = allActividades.find(a => a.id === actividadId);
    if (!actividad || actividad.isSubmitted) return;

    actividad.isCompleted = !actividad.isCompleted;
    actividad.progress = actividad.isCompleted ? 100 : Math.max(actividad.progress, 50);

    // Guardar en localStorage
    localStorage.setItem(`actividad-${actividadId}-completed`, actividad.isCompleted);
    localStorage.setItem(`actividad-${actividadId}-progress`, actividad.progress);
    localStorage.setItem(`actividad-${actividadId}-lastCompleted`, new Date().toISOString());

    updateActividadesStats();
    renderActividades();
}

// =================== EVALUACIONES ===================
async function loadEvaluaciones() {
    const container = document.getElementById('evaluacionesList');
    if (!container) return;

    try {
        // Cargar preguntas originales primero
        await cargarPreguntasOriginales();
        
        const snapshot = await getDocs(collection(db, 'evaluaciones'));
        allEvaluaciones = [];
        snapshot.forEach(doc => {
            const evaluacion = { id: doc.id, ...doc.data() };
            // Agregar campos calculados
            evaluacion.isCompleted = false; // Se actualizará con respuestas
            evaluacion.progress = 0;
            allEvaluaciones.push(evaluacion);
        });

        // Cargar estado de respuestas con listener en tiempo real
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (currentUser) {
            const respuestasQuery = query(collection(db, 'respuestasEvaluaciones'), where('estudianteId', '==', currentUser.email));
            const reintentosQuery = query(collection(db, 'reintentosEvaluaciones'), where('estudianteId', '==', currentUser.email), where('usado', '==', false));
            
            // Cargar reintentos permitidos (tanto para evaluaciones como cuestionarios)
            const reintentosSnapshot = await getDocs(reintentosQuery);
            const reintentosPermitidos = {};
            reintentosSnapshot.forEach(doc => {
                const reintento = doc.data();
                // Guardar tanto por evaluacionId como por cuestionarioId
                if (reintento.evaluacionId) {
                    reintentosPermitidos[reintento.evaluacionId] = { id: doc.id, ...reintento, tipo: 'evaluacion' };
                }
                if (reintento.cuestionarioId) {
                    reintentosPermitidos[reintento.cuestionarioId] = { id: doc.id, ...reintento, tipo: 'cuestionario' };
                }
            });
            
            // Actualizar cache global de reintentos
            reintentosCache = Object.values(reintentosPermitidos);
            
            onSnapshot(respuestasQuery, (snapshot) => {
                const respuestasMap = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const clave = `${data.estudianteId}_${data.evaluacionId}`;
                    if (!respuestasMap[clave]) respuestasMap[clave] = [];
                    respuestasMap[clave].push(data);
                });
                allEvaluaciones.forEach(evaluacion => {
                    const clave = `${currentUser.email}_${evaluacion.id}`;
                    const misRespuestas = respuestasMap[clave] || [];
                    evaluacion.intentosRealizados = misRespuestas.length;
                    
                    // Verificar si hay reintento permitido
                    const reintentoPermitido = reintentosPermitidos[evaluacion.id];
                    if (reintentoPermitido) {
                        evaluacion.reintentoPermitido = true;
                        evaluacion.reintentoData = reintentoPermitido;
                        evaluacion.isCompleted = false; // Permitir reintento
                        evaluacion.progress = 0;
                        evaluacion.respuestas = null;
                        evaluacion.calificacionRecalculada = null;
                    } else if (misRespuestas.length > 0) {
                        evaluacion.isCompleted = true;
                        evaluacion.respuestas = misRespuestas;
                        evaluacion.progress = 100;
                        
                        // PRE-CALCULAR la calificación usando el mismo método que admin.html
                        const ultimaRespuesta = misRespuestas[misRespuestas.length - 1];
                        if (ultimaRespuesta.respuestas && evaluacion.preguntas) {
                            evaluacion.calificacionRecalculada = recalcularCalificacion(ultimaRespuesta.respuestas, evaluacion.preguntas);
                        }
                    } else {
                        evaluacion.isCompleted = false;
                        evaluacion.respuestas = null;
                        evaluacion.calificacionRecalculada = null;
                    }
                });
                
                // Convertir reintentosPermitidos al formato esperado por filterByUserAccess
                const reintentosDisponibles = Object.values(reintentosPermitidos).filter(r => !r.usado);
                
                const filtered = filterByUserAccess(allEvaluaciones, reintentosDisponibles);
                filteredEvaluaciones = filtered;
                sortEvaluaciones();
                updateEvaluacionesStats();
                renderEvaluaciones();
                
                // Actualizar las notas de evaluaciones en la sección de calificaciones por módulo
                actualizarNotasEvaluacionesPorModulo();
            }, (error) => {
                console.error('Error listening respuestas evaluaciones:', error);
            });
        }
    } catch (error) {
        console.error('Error al cargar evaluaciones:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>Error al cargar evaluaciones</h3><p>Intenta recargar la página</p></div>';
    }
}

// Función para sincronizar datos del usuario desde Firebase
async function sincronizarDatosUsuario() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser || !currentUser.email) return currentUser;
    
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', currentUser.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // Verificar si el estado ha cambiado a graduado o retirado
            const nuevoEstado = userData.status || 'cursando';
            if (nuevoEstado !== 'cursando' && nuevoEstado !== 'active') {
                console.warn('⛔ Estado del estudiante bloqueado:', nuevoEstado);
                sessionStorage.clear();
                window.location.href = 'login.html';
                return null;
            }
            
            // Actualizar datos en sessionStorage
            const updatedUser = {
                ...currentUser,
                name: userData.name || currentUser.name,
                programa: userData.programa || currentUser.programa,
                sede: userData.sede || currentUser.sede,
                horario: userData.horario || currentUser.horario,
                estadoPagos: userData.estadoPagos || currentUser.estadoPagos,
                status: nuevoEstado
            };
            
            // Solo actualizar si hay cambios
            if (JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
                console.log('🔄 Datos de usuario actualizados desde Firebase:', {
                    programa: updatedUser.programa,
                    sede: updatedUser.sede,
                    horario: updatedUser.horario
                });
                sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
            
            return updatedUser;
        }
    } catch (error) {
        console.error('Error sincronizando datos de usuario:', error);
    }
    
    return currentUser;
}

// Función para actualizar el dashboard
async function updateDashboard() {
    // Primero sincronizar datos desde Firebase
    const currentUser = await sincronizarDatosUsuario();
    
    if (currentUser && currentUser.role === 'student') {
        loadStudentInfo();
        loadDashboardStats();
        loadEvaluaciones();
    }
}

// Funciones del modal
function openModal(type, id, esInteractiva = false) {
    const modal = document.getElementById('detailModal');

    if (type === 'clase') {
        loadClaseDetail(id);
        return; // No mostrar modal para clases
    } else if (type === 'actividad') {
        if (esInteractiva) {
            loadActividadInteractivaDetail(id);
        } else {
            loadActividadDetail(id);
        }
    } else if (type === 'cuestionario') {
        loadCuestionarioDetail(id);
    } else if (type === 'video') {
        loadVideoDetail(id);
    }

    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

async function loadClaseDetail(id) {
    try {
        // Mostrar indicador de carga
        const contentElement = document.getElementById('clase-viewer-content');
        if (contentElement) {
            contentElement.innerHTML = '<div class="content-loading" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Cargando contenido...</div>';
        }

        currentClaseId = id; // Guardar el ID de la clase actual
        const docRef = doc(db, 'classes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const clase = docSnap.data();
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');

            // Validar que la clase pertenezca al programa del usuario
            if (!currentUser || !clase.programa) {
                showToast('Acceso denegado: clase no disponible para tu programa', 'error');
                return;
            }
            
            const itemPrograma = (clase.programa || '').toString().toLowerCase().trim();
            const userPrograma = (currentUser.programa || '').toString().toLowerCase().trim();
            
            if (!itemPrograma || itemPrograma !== userPrograma) {
                showToast('Acceso denegado: esta clase no pertenece a tu programa', 'error');
                return;
            }

            // Marcar como leída automáticamente al abrir
            localStorage.setItem(`clase-${id}-read`, 'true');
            localStorage.setItem(`clase-${id}-lastRead`, new Date().toISOString());

            // Actualizar progreso si no estaba completada
            const wasCompleted = localStorage.getItem(`clase-${id}-completed`) === 'true';
            if (!wasCompleted) {
                const currentProgress = parseInt(localStorage.getItem(`clase-${id}-progress`) || '0');
                const newProgress = Math.min(currentProgress + 25, 90); // Incrementar progreso al leer
                localStorage.setItem(`clase-${id}-progress`, newProgress);
            }

            // Cargar datos en la interfaz de clase-viewer
            document.getElementById('clase-viewer-title').textContent = clase.titulo;
            document.getElementById('clase-viewer-programa').textContent = clase.programa;
            document.getElementById('clase-viewer-fecha').textContent = clase.fechaCreacion ? new Date(clase.fechaCreacion).toLocaleDateString('es-ES') : 'N/A';
            document.getElementById('clase-viewer-duracion').textContent = clase.duracion || 'N/A';

            // Actualizar descripción
            document.getElementById('clase-viewer-description').innerHTML = clase.descripcion || 'Sin descripción disponible.';

            // Cargar contenido (desde chunks si es necesario)
            let content = clase.contenido;
            if (clase.hasChunks) {
                content = await loadContentFromChunks(id);

                // Si no se pudo cargar desde chunks, intentar autoreparar
                if (!content || content.trim().length === 0) {
                    console.warn('Contenido no cargado desde chunks, intentando autoreparar clase:', id);
                    try {
                        // Marcar la clase como no having chunks
                        await updateDoc(doc(db, 'classes', id), {
                            hasChunks: false,
                            totalChunks: 0,
                            contenido: 'Contenido restaurado automáticamente desde chunks.'
                        });
                        content = 'Contenido restaurado automáticamente desde chunks.';
                    } catch (repairError) {
                        console.error('Error autoreparando clase:', repairError);
                        content = 'Error al cargar el contenido. Por favor contacta al administrador.';
                    }
                }
            }

            // Si aún no hay contenido, mostrar mensaje de error con opción de recarga
            if (!content || content.trim().length === 0) {
                content = `
                    <div style="text-align: center; padding: 40px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 20px 0;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626; margin-bottom: 20px;"></i>
                        <h3 style="color: #dc2626; margin-bottom: 10px;">Contenido no disponible</h3>
                        <p style="color: #7f1d1d; margin-bottom: 20px;">
                            El contenido de esta clase no se pudo cargar correctamente.
                        </p>
                        <button onclick="location.reload()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-refresh"></i> Recargar página
                        </button>
                    </div>
                `;
            }

            // Actualizar contenido
            document.getElementById('clase-viewer-content').innerHTML = content;

            // Manejar imágenes rotas en el contenido
            setTimeout(() => {
                const contentElement = document.getElementById('clase-viewer-content');
                const images = contentElement.querySelectorAll('img');
                images.forEach(img => {
                    if (!img.hasAttribute('onerror')) {
                        img.onerror = function() {
                            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD4KPC9zdmc+';
                            this.alt = 'Imagen no disponible';
                            this.style.maxWidth = '300px';
                            this.style.height = 'auto';
                            this.style.border = '2px dashed #d1d5db';
                            this.style.borderRadius = '8px';
                            this.style.padding = '20px';
                            this.style.backgroundColor = '#f9fafb';
                        };
                    }
                });
            }, 100);

            // Actualizar progreso
            const progress = localStorage.getItem(`clase-${id}-progress`) || '0';
            document.getElementById('clase-viewer-progress').textContent = progress + '% completado';
            document.getElementById('clase-viewer-progress-bar').style.width = progress + '%';

            // Actualizar estado
            const isCompleted = localStorage.getItem(`clase-${id}-completed`) === 'true';
            document.getElementById('clase-viewer-status').textContent = isCompleted ? 'Completada' : 'En Progreso';

            // Actualizar tiempo (simulado)
            const readTime = Math.floor((parseInt(progress) / 100) * 15); // 15 minutos estimados por clase
            document.getElementById('clase-viewer-time').textContent = readTime + ' min';

            // Actualizar favorito
            const isBookmarked = localStorage.getItem(`clase-${id}-bookmarked`) === 'true';
            document.getElementById('clase-viewer-bookmark').textContent = isBookmarked ? 'Sí' : 'No';
            document.getElementById('bookmark-text').textContent = isBookmarked ? 'Quitar de Favoritos' : 'Agregar a Favoritos';

            // Actualizar botón de completar
            const completeBtn = document.getElementById('clase-viewer-complete-btn');
            completeBtn.classList.toggle('completed', isCompleted);
            completeBtn.innerHTML = `<i class="fas fa-${isCompleted ? 'check-circle' : 'circle'}"></i> ${isCompleted ? 'Clase Completada' : 'Marcar como Completada'}`;
            completeBtn.onclick = () => toggleClaseCompletedFromViewer(id);

            // Mostrar/ocultar sección de tags
            const tagsSection = document.getElementById('clase-tags-section');
            const tagsList = document.getElementById('clase-viewer-tags');
            if (clase.tags) {
                tagsList.innerHTML = clase.tags.split(',').map(tag => `<span class="clase-tag">${tag.trim()}</span>`).join('');
                tagsSection.style.display = 'block';
            } else {
                tagsSection.style.display = 'none';
            }

            // Actualizar navegación
            const currentIndex = filteredClases.findIndex(c => c.id === id);
            document.getElementById('clase-current-number').textContent = currentIndex + 1;
            document.getElementById('clase-total-number').textContent = filteredClases.length;

            // Habilitar/deshabilitar botones de navegación
            const prevBtn = document.getElementById('clase-prev-btn');
            const nextBtn = document.getElementById('clase-next-btn');
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === filteredClases.length - 1;

            prevBtn.onclick = () => currentIndex > 0 ? loadClaseDetail(filteredClases[currentIndex - 1].id) : null;
            nextBtn.onclick = () => currentIndex < filteredClases.length - 1 ? loadClaseDetail(filteredClases[currentIndex + 1].id) : null;

            // Cambiar a la sección de clase-viewer
            // Guardar la sección actual antes de cambiar
            const currentSection = sessionStorage.getItem('activeSection') || 'clases';
            window.history.pushState({page: 'estudiante', section: currentSection, claseId: id}, 'Clases', 'estudiante.html');
            showSectionV2('clase-viewer');
            sessionStorage.setItem('activeSection', 'clase-viewer');
            sessionStorage.setItem('currentClaseId', id);

            // Actualizar el menú de navegación para mostrar "Ver Clase"
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('.nav-item[data-section="clase-viewer"]').classList.add('active');
            document.querySelector('.nav-item[data-section="clase-viewer"]').style.display = 'block';

            // Recargar la lista de clases para actualizar el estado
            window.loadClases();
        }
    } catch (error) {
        console.error('Error loading clase detail:', error);
        showToast('Error al cargar la clase. Intenta nuevamente.', 'error');
    }
}

// Funciones auxiliares para la interfaz de clases
function navigateClase(currentId, direction) {
    const currentIndex = filteredClases.findIndex(c => c.id === currentId);

    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < filteredClases.length) {
        const newClase = filteredClases[newIndex];
        loadClaseDetail(newClase.id);
    }
}

function getClaseIndex(claseId) {
    return filteredClases.findIndex(c => c.id === claseId);
}

function toggleClaseCompletedFromModal(id) {
    const clase = filteredClases.find(c => c.id === id);
    if (!clase) {
        showToast('Clase no encontrada o no disponible para tu programa', 'error');
        return;
    }

    const isCompleted = localStorage.getItem(`clase-${id}-completed`) === 'true';
    const newCompleted = !isCompleted;

    localStorage.setItem(`clase-${id}-completed`, newCompleted);
    localStorage.setItem(`clase-${id}-progress`, newCompleted ? '100' : '90');
    localStorage.setItem(`clase-${id}-lastRead`, new Date().toISOString());

    // Recargar la vista para actualizar la interfaz premium
    loadClaseDetail(id);

    // Mostrar feedback
    showToast(newCompleted ? '¡Clase completada!' : 'Marcada como en progreso', 'success');
}

function toggleClaseCompletedFromViewer(id) {
    const clase = filteredClases.find(c => c.id === id);
    if (!clase) {
        showToast('Clase no encontrada o no disponible para tu programa', 'error');
        return;
    }

    const isCompleted = localStorage.getItem(`clase-${id}-completed`) === 'true';
    const newCompleted = !isCompleted;

    localStorage.setItem(`clase-${id}-completed`, newCompleted);
    localStorage.setItem(`clase-${id}-progress`, newCompleted ? '100' : '90');
    localStorage.setItem(`clase-${id}-lastRead`, new Date().toISOString());

    // Actualizar elementos específicos de la interfaz clase-viewer
    const progress = newCompleted ? '100' : '90';
    document.getElementById('clase-viewer-progress').textContent = progress + '% completado';
    document.getElementById('clase-viewer-progress-bar').style.width = progress + '%';
    document.getElementById('clase-viewer-status').textContent = newCompleted ? 'Completada' : 'En Progreso';

    // Actualizar botón
    const completeBtn = document.getElementById('clase-viewer-complete-btn');
    completeBtn.classList.toggle('completed', newCompleted);
    completeBtn.innerHTML = `<i class="fas fa-${newCompleted ? 'check-circle' : 'circle'}"></i> ${newCompleted ? 'Clase Completada' : 'Marcar como Completada'}`;

    // Recargar la lista de clases para actualizar el estado
    window.loadClases();

    // Mostrar feedback
    showToast(newCompleted ? '¡Clase completada!' : 'Marcada como en progreso', 'success');
}

function shareClase(id) {
    const clase = filteredClases.find(c => c.id === id);
    if (!clase) {
        showToast('Clase no encontrada o no disponible para tu programa', 'error');
        return;
    }

    const url = window.location.href;
    const shareText = `Mira esta clase: "${clase.titulo}" en la plataforma ECE CHARLOTTE`;

    if (navigator.share) {
        navigator.share({
            title: clase.titulo,
            text: shareText,
            url: url
        });
    } else {
        // Fallback para navegadores que no soportan Web Share API
        const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`;
        window.open(shareUrl, '_blank');
    }
}

function printClase(id) {
    const clase = filteredClases.find(c => c.id === id);
    if (!clase) {
        showToast('Clase no encontrada o no disponible para tu programa', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${clase.titulo} - ECE CHARLOTTE</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #3b82f6; }
                .meta { color: #64748b; margin-bottom: 20px; }
                .content { line-height: 1.6; }
            </style>
        </head>
        <body>
            <h1>${clase.titulo}</h1>
            <div class="meta">
                <p><strong>Programa:</strong> ${clase.programa}</p>
                <p><strong>Fecha:</strong> ${clase.fechaCreacion ? new Date(clase.fechaCreacion).toLocaleDateString('es-ES') : 'N/A'}</p>
            </div>
            ${clase.descripcion ? `<h2>Descripción</h2><p>${clase.descripcion}</p>` : ''}
            <div class="content">
                ${clase.contenido || 'Sin contenido'}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Nuevas funciones auxiliares para la interfaz premium
function toggleBookmark(claseId) {
    const isBookmarked = localStorage.getItem(`clase-${claseId}-bookmarked`) === 'true';
    localStorage.setItem(`clase-${claseId}-bookmarked`, (!isBookmarked).toString());

    // Mostrar feedback visual
    const bookmarkBtn = document.querySelector('.action-icon.bookmarked');
    if (bookmarkBtn) {
        bookmarkBtn.classList.toggle('active', !isBookmarked);
    }

    showToast(isBookmarked ? 'Removido de favoritos' : 'Agregado a favoritos', 'success');
}

function printClaseFromViewer() {
    if (!currentClaseId) {
        showToast('No hay clase cargada', 'error');
        return;
    }
    printClase(currentClaseId);
}

function shareClaseFromViewer() {
    if (!currentClaseId) {
        showToast('No hay clase cargada', 'error');
        return;
    }
    shareClase(currentClaseId);
}

function toggleBookmarkFromViewer() {
    if (!currentClaseId) {
        showToast('No hay clase cargada', 'error');
        return;
    }
    toggleBookmark(currentClaseId);
    
    // Actualizar el texto del botón
    const isBookmarked = localStorage.getItem(`clase-${currentClaseId}-bookmarked`) === 'true';
    const bookmarkText = document.getElementById('bookmark-text');
    if (bookmarkText) {
        bookmarkText.textContent = isBookmarked ? 'En Favoritos' : 'Agregar a Favoritos';
    }
}

async function downloadClaseFromViewer() {
    if (!currentClaseId) {
        showToast('No hay clase cargada', 'error');
        return;
    }
    
    // Obtener la clase actual (asumiendo que está en filteredClases o buscarla)
    const clase = filteredClases ? filteredClases.find(c => c.id === currentClaseId) : null;
    if (!clase) {
        showToast('Clase no encontrada', 'error');
        return;
    }
    
    // Cargar contenido usando la misma lógica que loadClaseDetail
    let content = clase.contenido;
    if (clase.hasChunks) {
        try {
            content = await loadContentFromChunks(currentClaseId);
        } catch (error) {
            console.error('Error cargando contenido desde chunks:', error);
            content = clase.contenido || 'Error al cargar el contenido desde chunks.';
        }
    }
    
    // Si aún no hay contenido, usar mensaje por defecto
    if (!content || content.trim().length === 0) {
        content = 'No hay contenido disponible para esta clase.';
    }
    
    // Crear contenido HTML para descargar
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${clase.titulo} - ECE CHARLOTTE</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                h1 { color: #3b82f6; }
                .meta { color: #64748b; margin-bottom: 20px; }
                .content { margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1>${clase.titulo}</h1>
            <div class="meta">
                <p><strong>Programa:</strong> ${clase.programa}</p>
                <p><strong>Fecha:</strong> ${clase.fechaCreacion ? new Date(clase.fechaCreacion).toLocaleDateString('es-ES') : 'N/A'}</p>
                <p><strong>Duración:</strong> ${clase.duracion || 'N/A'}</p>
            </div>
            ${clase.descripcion ? `<h2>Descripción</h2><p>${clase.descripcion}</p>` : ''}
            <div class="content">
                ${content}
            </div>
        </body>
        </html>
    `;
    
    // Crear blob y descargar
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clase.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Clase descargada exitosamente', 'success');
}

function showToast(message, type = 'info') {
    // Crear toast temporal
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 100);

    // Remover después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// =================== ACTIVIDADES INTERACTIVAS ===================

// Estado de la actividad interactiva actual
let actividadInteractivaActual = null;
let respuestasInteractivas = {}; // { preguntaIdx: respuestaDelEstudiante }

async function loadActividadInteractivaDetail(id) {
    try {
        const docRef = doc(db, 'actividades_interactivas', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            document.getElementById('modalBody').innerHTML = '<p>Actividad no encontrada</p>';
            return;
        }

        const actividad = { id: docSnap.id, ...docSnap.data() };
        actividadInteractivaActual = actividad;
        respuestasInteractivas = {};

        document.getElementById('modalTitle').textContent = actividad.titulo;

        // Verificar si ya tiene resultado guardado
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        const clave = `actividad-interactiva-resultado-${id}-${currentUser?.email}`;
        const resultadoGuardado = localStorage.getItem(clave);
        if (resultadoGuardado) {
            const resultado = JSON.parse(resultadoGuardado);
            mostrarResultadoInteractivo(actividad, resultado);
            return;
        }

        const preguntasHtml = (actividad.preguntas || []).map((p, i) => renderPreguntaInteractiva(p, i)).join('');

        document.getElementById('modalBody').innerHTML = `
            <div class="actividad-interactiva-wrapper">
                <div class="act-info-banner">
                    <span><i class="fas fa-bolt"></i> Actividad Interactiva</span>
                    <span><i class="fas fa-question-circle"></i> ${actividad.preguntas?.length || 0} preguntas</span>
                    <span><i class="fas fa-trophy"></i> Aprueba con ${actividad.puntuacionMinima || 70}%</span>
                    ${actividad.intentosMaximos ? `<span><i class="fas fa-redo"></i> Hasta ${actividad.intentosMaximos} intentos</span>` : ''}
                </div>
                <p style="color:#475569; margin-bottom:1.5rem;">${actividad.descripcion || ''}</p>
                <div id="preguntasInteractivasContainer">
                    ${preguntasHtml}
                </div>
                <div style="text-align:center; margin-top:2rem;">
                    <button class="btn-modal btn-primary-modal" onclick="calificarActividadInteractiva('${id}')">
                        <i class="fas fa-check-circle"></i> Enviar Respuestas
                    </button>
                </div>
            </div>
        `;

        // Inicializar interactividad para cada pregunta
        actividad.preguntas.forEach((p, i) => initPreguntaInteractiva(p, i));

    } catch (error) {
        console.error('Error loading actividad interactiva:', error);
        document.getElementById('modalBody').innerHTML = '<p>Error al cargar la actividad</p>';
    }
}

// ---- Render por tipo ----
function renderPreguntaInteractiva(p, i) {
    const tipoIcons = {
        quiz: 'fa-list-ul', verdadero_falso: 'fa-check-circle', ordenar: 'fa-sort',
        completar: 'fa-edit', relacionar: 'fa-arrows-alt-h', crucigrama: 'fa-th',
        clasificar: 'fa-layer-group', sopa_letras: 'fa-search', escritura_libre: 'fa-robot'
    };
    const tipoLabels = {
        quiz: 'Selección Múltiple', verdadero_falso: 'Verdadero / Falso', ordenar: 'Ordenar',
        completar: 'Completar', relacionar: 'Relacionar', crucigrama: 'Crucigrama',
        clasificar: 'Clasificar', sopa_letras: 'Sopa de Letras', escritura_libre: 'Escritura Libre'
    };
    const icon = tipoIcons[p.tipo] || 'fa-question';
    const label = tipoLabels[p.tipo] || p.tipo;
    let cuerpo = '';

    switch(p.tipo) {
        case 'quiz':
            cuerpo = `<div class="opt-group" id="opts-${i}">
                ${(p.opciones || []).map((op, j) => `
                    <button class="opt-btn" data-idx="${j}" onclick="seleccionarOpcion(${i}, ${j}, this)">
                        <span class="opt-letra">${String.fromCharCode(65+j)}</span> ${op}
                    </button>`).join('')}
            </div>`;
            break;

        case 'verdadero_falso':
            cuerpo = `<div class="opt-group vf-group" id="opts-${i}">
                <button class="opt-btn vf-btn" data-val="true" onclick="seleccionarVF(${i}, true, this)">
                    <i class="fas fa-check"></i> Verdadero
                </button>
                <button class="opt-btn vf-btn" data-val="false" onclick="seleccionarVF(${i}, false, this)">
                    <i class="fas fa-times"></i> Falso
                </button>
            </div>`;
            break;

        case 'ordenar': {
            const shuffled = [...(p.items || [])].sort(() => Math.random() - 0.5);
            cuerpo = `<div class="ordenar-instruccion"><i class="fas fa-hand-pointer"></i> Haz clic en los elementos en el orden correcto</div>
                <div class="ordenar-container" id="ordenar-${i}">
                    ${shuffled.map((item, j) => `
                        <div class="ordenar-item" data-item="${p.items.indexOf(item)}" onclick="clickOrdenarItem(${i}, this)">
                            <span class="orden-num" id="orden-num-${i}-${j}"></span>
                            ${item}
                        </div>`).join('')}
                </div>`;
            break;
        }

        case 'completar': {
            let texto = p.texto || p.pregunta || '';
            let blanks = 0;
            const textoConInputs = texto.replace(/\[BLANK\]/g, () => {
                const n = blanks++;
                return `<input type="text" class="completar-input" id="blank-${i}-${n}" placeholder="___" oninput="actualizarCompletarRespuesta(${i})">`;
            });
            cuerpo = `<div class="completar-texto">${textoConInputs}</div>`;
            break;
        }

        case 'relacionar': {
            const pares = p.pares || [];
            const derechasShuffled = [...pares].sort(() => Math.random() - 0.5);
            cuerpo = `<div class="relacionar-container" id="relacionar-${i}">
                <div class="relacionar-col">
                    <div class="relacionar-col-title"><i class="fas fa-tag"></i> Términos</div>
                    ${pares.map((par, j) => `
                        <div class="relacionar-item izq" data-idx="${j}" id="rel-izq-${i}-${j}" onclick="seleccionarRelacionarIzq(${i}, ${j}, this)">
                            ${par.izquierda}
                        </div>`).join('')}
                </div>
                <div class="relacionar-lineas" id="rel-svg-${i}"></div>
                <div class="relacionar-col">
                    <div class="relacionar-col-title"><i class="fas fa-align-left"></i> Definiciones</div>
                    ${derechasShuffled.map((par, j) => `
                        <div class="relacionar-item der" data-original="${pares.indexOf(par)}" id="rel-der-${i}-${j}" onclick="seleccionarRelacionarDer(${i}, ${j}, this)">
                            ${par.derecha}
                        </div>`).join('')}
                </div>
            </div>`;
            break;
        }

        case 'crucigrama': {
            cuerpo = renderCrucigramaHTML(p, i);
            break;
        }

        case 'clasificar': {
            const elementos = [...(p.elementos || [])].sort(() => Math.random() - 0.5);
            const categorias = p.categorias || [];
            cuerpo = `<div class="clasificar-wrapper" id="clasificar-${i}">
                <div class="clasificar-banco">
                    <div class="clasificar-banco-title"><i class="fas fa-hand-pointer"></i> Elementos a clasificar</div>
                    <div class="clasificar-banco-items" id="banco-${i}">
                        ${elementos.map((el, j) => `
                            <div class="clasificar-chip" draggable="true" id="chip-${i}-${j}" data-texto="${el.texto}" data-categoria="${el.categoria}"
                                onclick="clickClasificarChip(${i}, this)"
                                ondragstart="dragStartClasificar(event, ${i}, '${el.texto.replace(/'/g, "\\'")}', '${el.categoria.replace(/'/g, "\\'")}')">
                                ${el.texto}
                            </div>`).join('')}
                    </div>
                </div>
                <div class="clasificar-categorias">
                    ${categorias.map(cat => `
                        <div class="clasificar-categoria" id="cat-${i}-${encodeURIComponent(cat)}"
                            ondragover="event.preventDefault()"
                            ondrop="dropClasificar(event, ${i}, '${cat.replace(/'/g, "\\'")}')">
                            <div class="clasificar-cat-title">${cat}</div>
                            <div class="clasificar-cat-items" id="catitems-${i}-${encodeURIComponent(cat)}"></div>
                        </div>`).join('')}
                </div>
            </div>`;
            break;
        }

        case 'sopa_letras': {
            cuerpo = renderSopaLetrasHTML(p, i);
            break;
        }

        case 'escritura_libre':
            cuerpo = `<div class="escritura-libre-wrapper">
                <div class="rubrica-box">
                    <strong><i class="fas fa-clipboard-list"></i> Criterios de evaluación:</strong>
                    <p>${p.rubrica}</p>
                    ${p.longitudMinima ? `<small><i class="fas fa-text-width"></i> Mínimo ${p.longitudMinima} palabras</small>` : ''}
                </div>
                <textarea class="escritura-textarea" id="escritura-${i}" rows="6" placeholder="Escribe tu respuesta aquí..." oninput="actualizarEscrituraLibre(${i}, this)"></textarea>
                <div class="escritura-contador" id="contador-${i}">0 palabras</div>
            </div>`;
            break;
    }

    return `
        <div class="pregunta-interactiva" id="preg-${i}" data-tipo="${p.tipo}">
            <div class="preg-header">
                <span class="preg-tipo-badge ${p.tipo}"><i class="fas ${icon}"></i> ${label}</span>
                <span class="preg-num">Pregunta ${i + 1}</span>
            </div>
            <div class="preg-texto">${p.pregunta}</div>
            <div class="preg-cuerpo">${cuerpo}</div>
            <div class="preg-feedback" id="feedback-${i}" style="display:none;"></div>
        </div>
    `;
}

// ---- Inicialización post-render ----
function initPreguntaInteractiva(p, i) {
    if (p.tipo === 'relacionar') {
        window[`_relState_${i}`] = { selIzq: null, conexiones: {} };
    }
    if (p.tipo === 'ordenar') {
        window[`_ordenState_${i}`] = { orden: [], items: p.items };
    }
    if (p.tipo === 'clasificar') {
        window[`_clasifState_${i}`] = {};
    }
    if (p.tipo === 'sopa_letras') {
        initSopaLetras(i, p);
    }
}

// ---- Quiz ----
function seleccionarOpcion(pregIdx, opIdx, btn) {
    document.querySelectorAll(`#opts-${pregIdx} .opt-btn`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    respuestasInteractivas[pregIdx] = opIdx;
}

// ---- Verdadero/Falso ----
function seleccionarVF(pregIdx, valor, btn) {
    document.querySelectorAll(`#opts-${pregIdx} .opt-btn`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    respuestasInteractivas[pregIdx] = valor;
}

// ---- Ordenar ----
function clickOrdenarItem(pregIdx, el) {
    const state = window[`_ordenState_${pregIdx}`];
    if (!state) return;
    if (el.classList.contains('ordenado')) {
        // Remover del orden
        const idx = parseInt(el.dataset.item);
        state.orden = state.orden.filter(x => x !== idx);
        el.classList.remove('ordenado');
        el.querySelector('.orden-num') && (el.querySelector('.orden-num').textContent = '');
        // Renumerar
        state.orden.forEach((itemIdx, pos) => {
            const allItems = document.querySelectorAll(`#ordenar-${pregIdx} .ordenar-item`);
            allItems.forEach(it => {
                if (parseInt(it.dataset.item) === itemIdx) {
                    const numEl = it.querySelector('.orden-num');
                    if (numEl) numEl.textContent = pos + 1;
                }
            });
        });
    } else {
        state.orden.push(parseInt(el.dataset.item));
        el.classList.add('ordenado');
        const numEl = el.querySelector('.orden-num');
        if (numEl) numEl.textContent = state.orden.length;
    }
    respuestasInteractivas[pregIdx] = [...state.orden];
}

// ---- Completar ----
function actualizarCompletarRespuesta(pregIdx) {
    const inputs = document.querySelectorAll(`[id^="blank-${pregIdx}-"]`);
    respuestasInteractivas[pregIdx] = Array.from(inputs).map(inp => inp.value.trim());
}

// ---- Relacionar ----
function seleccionarRelacionarIzq(pregIdx, idx, el) {
    const state = window[`_relState_${pregIdx}`];
    if (!state) return;
    document.querySelectorAll(`#relacionar-${pregIdx} .izq`).forEach(e => e.classList.remove('selected'));
    state.selIzq = idx;
    el.classList.add('selected');
}

function seleccionarRelacionarDer(pregIdx, j, el) {
    const state = window[`_relState_${pregIdx}`];
    if (!state || state.selIzq === null) return;
    const originalIdx = parseInt(el.dataset.original);
    state.conexiones[state.selIzq] = originalIdx;
    // Limpiar visual: quitar connected de todas der para esta izq
    document.querySelectorAll(`#relacionar-${pregIdx} .der`).forEach(e => {
        if (parseInt(e.dataset.original) === originalIdx) {
            // Desconectar previas por este derecho
            for (const k in state.conexiones) {
                if (state.conexiones[k] === originalIdx && parseInt(k) !== state.selIzq) {
                    delete state.conexiones[k];
                    document.getElementById(`rel-izq-${pregIdx}-${k}`)?.classList.remove('connected');
                }
            }
        }
    });
    // Actualizar visual
    document.querySelectorAll(`#relacionar-${pregIdx} .izq`).forEach(e => {
        const idx2 = parseInt(e.id.split('-')[3]);
        if (state.conexiones[idx2] !== undefined) e.classList.add('connected');
        else e.classList.remove('connected');
    });
    document.querySelectorAll(`#relacionar-${pregIdx} .der`).forEach(e => {
        const orig = parseInt(e.dataset.original);
        if (Object.values(state.conexiones).includes(orig)) e.classList.add('connected');
        else e.classList.remove('connected');
    });
    // Mark the selected izq as connected
    el.classList.add('connected');
    document.getElementById(`rel-izq-${pregIdx}-${state.selIzq}`)?.classList.add('connected');
    state.selIzq = null;
    document.querySelectorAll(`#relacionar-${pregIdx} .izq`).forEach(e => e.classList.remove('selected'));
    respuestasInteractivas[pregIdx] = { ...state.conexiones };
}

// ---- Crucigrama ----
function renderCrucigramaHTML(p, i) {
    const palabras = p.palabras || [];
    // Construir grilla
    let maxFila = 0, maxCol = 0;
    palabras.forEach(pw => {
        const word = pw.palabra.toUpperCase().replace(/\s/g, '');
        if (pw.orientacion === 'horizontal') {
            maxFila = Math.max(maxFila, (pw.fila || 0));
            maxCol = Math.max(maxCol, (pw.columna || 0) + word.length - 1);
        } else {
            maxFila = Math.max(maxFila, (pw.fila || 0) + word.length - 1);
            maxCol = Math.max(maxCol, (pw.columna || 0));
        }
    });
    maxFila = Math.min(maxFila, 14);
    maxCol = Math.min(maxCol, 14);

    const grid = Array.from({ length: maxFila + 1 }, () => Array(maxCol + 1).fill(null));
    palabras.forEach((pw, wi) => {
        const word = pw.palabra.toUpperCase().replace(/\s/g, '');
        for (let c = 0; c < word.length; c++) {
            const fila = pw.orientacion === 'horizontal' ? (pw.fila || 0) : (pw.fila || 0) + c;
            const col  = pw.orientacion === 'horizontal' ? (pw.columna || 0) + c : (pw.columna || 0);
            if (fila <= maxFila && col <= maxCol) {
                grid[fila][col] = { letra: word[c], wordIdx: wi, posEnPalabra: c };
            }
        }
    });

    let html = `<div class="crucigrama-wrapper">
        <div class="crucigrama-grid" id="crucigrama-${i}">`;
    for (let f = 0; f <= maxFila; f++) {
        for (let c = 0; c <= maxCol; c++) {
            const cell = grid[f][c];
            if (cell) {
                html += `<input type="text" maxlength="1" class="crucigrama-cell" id="cc-${i}-${f}-${c}"
                    data-correcta="${cell.letra}" data-fila="${f}" data-col="${c}"
                    oninput="this.value=this.value.toUpperCase(); actualizarCrucigrama(${i})"
                    style="grid-column:${c+1}; grid-row:${f+1};">`;
            } else {
                html += `<div class="crucigrama-vacio" style="grid-column:${c+1}; grid-row:${f+1};"></div>`;
            }
        }
    }
    html += `</div>
        <div class="crucigrama-pistas">
            <div class="pistas-h"><strong><i class="fas fa-arrow-right"></i> Horizontal</strong>
                ${palabras.filter(pw=>pw.orientacion==='horizontal').map((pw,j)=>`<div><span class="pista-num">${j+1}.</span> ${pw.pista}</div>`).join('')}
            </div>
            <div class="pistas-v"><strong><i class="fas fa-arrow-down"></i> Vertical</strong>
                ${palabras.filter(pw=>pw.orientacion!=='horizontal').map((pw,j)=>`<div><span class="pista-num">${j+1}.</span> ${pw.pista}</div>`).join('')}
            </div>
        </div>
    </div>`;
    return html;
}

function actualizarCrucigrama(pregIdx) {
    const cells = document.querySelectorAll(`#crucigrama-${pregIdx} .crucigrama-cell`);
    const respuesta = {};
    cells.forEach(cell => {
        respuesta[`${cell.dataset.fila}-${cell.dataset.col}`] = { valor: cell.value, correcta: cell.dataset.correcta };
    });
    respuestasInteractivas[pregIdx] = respuesta;
}

// ---- Clasificar ----
function dragStartClasificar(event, pregIdx, texto, categoria) {
    event.dataTransfer.setData('text/plain', JSON.stringify({ pregIdx, texto, categoria }));
}

function dropClasificar(event, pregIdx, categoriaDestino) {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    if (data.pregIdx !== pregIdx) return;
    moverChipACategoria(pregIdx, data.texto, data.categoria, categoriaDestino);
}

function clickClasificarChip(pregIdx, el) {
    const state = window[`_clasifState_${pregIdx}`];
    if (!state) return;
    // Seleccionar categoría activa si hay una marcada
    const catActiva = document.querySelector(`#clasificar-${pregIdx} .clasificar-categoria.activa`);
    if (catActiva) {
        const catName = decodeURIComponent(catActiva.id.replace(`cat-${pregIdx}-`, ''));
        moverChipACategoria(pregIdx, el.dataset.texto, el.dataset.categoria, catName);
    } else {
        // Destacar el chip seleccionado
        document.querySelectorAll(`#clasificar-${pregIdx} .clasificar-chip`).forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    }
}

function moverChipACategoria(pregIdx, texto, categoriaOriginal, categoriaDestino) {
    const state = window[`_clasifState_${pregIdx}`];
    if (!state) return;
    state[texto] = categoriaDestino;
    // Mover visualmente
    const encDest = encodeURIComponent(categoriaDestino);
    const catItems = document.getElementById(`catitems-${pregIdx}-${encDest}`);
    // Primero quitar de cualquier contenedor
    document.querySelectorAll(`#clasificar-${pregIdx} .clasificar-chip`).forEach(chip => {
        if (chip.dataset.texto === texto) {
            chip.remove();
        }
    });
    if (catItems) {
        const newChip = document.createElement('div');
        newChip.className = 'clasificar-chip en-categoria';
        newChip.draggable = true;
        newChip.dataset.texto = texto;
        newChip.dataset.categoria = categoriaOriginal;
        newChip.setAttribute('ondragstart', `dragStartClasificar(event, ${pregIdx}, '${texto.replace(/'/g, "\\'")}', '${categoriaOriginal.replace(/'/g, "\\'")}')`)
        newChip.setAttribute('onclick', `clickClasificarChip(${pregIdx}, this)`);
        newChip.textContent = texto;
        catItems.appendChild(newChip);
    }
    respuestasInteractivas[pregIdx] = { ...state };
}

// ---- Sopa de letras ----
function renderSopaLetrasHTML(p, i) {
    const palabras = (p.palabras || []).map(w => w.toUpperCase().replace(/\s/g, ''));
    const tam = Math.max(10, Math.min(15, palabras.reduce((max, w) => Math.max(max, w.length + 3), 8)));
    const gridData = generarSopaLetras(palabras, tam);

    let gridHtml = `<div class="sopa-grid" id="sopa-${i}" style="--tam:${tam};">`;
    gridData.forEach((fila, f) => {
        fila.forEach((letra, c) => {
            gridHtml += `<div class="sopa-cell" id="sc-${i}-${f}-${c}" data-letra="${letra}" data-fila="${f}" data-col="${c}"
                onclick="clickSopaCell(${i}, ${f}, ${c}, this)">${letra}</div>`;
        });
    });
    gridHtml += `</div>`;

    const pistasHtml = palabras.map((pal, j) => `
        <div class="sopa-pista" id="pista-${i}-${j}">
            <span class="pista-palabra" id="ppal-${i}-${j}">${'_ '.repeat(pal.length).trim()}</span>
            <span class="pista-hint">${p.pistas?.[j] || pal}</span>
        </div>`).join('');

    window[`_sopaState_${i}`] = { palabras, grid: gridData, encontradas: new Set(), seleccion: [], selActiva: null, tam, pistas: p.pistas };

    return `<div class="sopa-wrapper">
        ${gridHtml}
        <div class="sopa-pistas-lista"><strong><i class="fas fa-list"></i> Palabras a encontrar:</strong>
            ${pistasHtml}
        </div>
    </div>`;
}

function generarSopaLetras(palabras, tam) {
    const grid = Array.from({ length: tam }, () => Array(tam).fill(''));
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const orientaciones = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];

    palabras.forEach(palabra => {
        let colocada = false;
        let intentos = 0;
        while (!colocada && intentos < 200) {
            intentos++;
            const [dr, dc] = orientaciones[Math.floor(Math.random() * orientaciones.length)];
            const fila = Math.floor(Math.random() * tam);
            const col  = Math.floor(Math.random() * tam);
            let valido = true;
            for (let k = 0; k < palabra.length; k++) {
                const nf = fila + dr * k, nc = col + dc * k;
                if (nf < 0 || nf >= tam || nc < 0 || nc >= tam) { valido = false; break; }
                if (grid[nf][nc] !== '' && grid[nf][nc] !== palabra[k]) { valido = false; break; }
            }
            if (valido) {
                for (let k = 0; k < palabra.length; k++) {
                    grid[fila + dr * k][col + dc * k] = palabra[k];
                }
                colocada = true;
            }
        }
    });

    // Rellenar vacíos
    for (let f = 0; f < tam; f++) {
        for (let c = 0; c < tam; c++) {
            if (!grid[f][c]) grid[f][c] = letras[Math.floor(Math.random() * letras.length)];
        }
    }
    return grid;
}

function initSopaLetras(i, p) {}

function clickSopaCell(i, fila, col, el) {
    const state = window[`_sopaState_${i}`];
    if (!state) return;

    if (state.selActiva === null) {
        // Primera celda seleccionada
        state.selActiva = { fila, col };
        el.classList.add('sopa-sel');
        state.seleccion = [{ fila, col, el }];
    } else {
        // Segunda celda: determine dirección y marcar todas las celdas intermedias
        const { fila: f0, col: c0 } = state.selActiva;
        const df = fila - f0, dc = col - c0;
        const len = Math.max(Math.abs(df), Math.abs(dc));
        if (len === 0) {
            // Mismo cell, cancelar
            state.selActiva = null;
            state.seleccion.forEach(s => s.el.classList.remove('sopa-sel'));
            state.seleccion = [];
            return;
        }
        const dr = df === 0 ? 0 : df / Math.abs(df);
        const dc2 = dc === 0 ? 0 : dc / Math.abs(dc);
        // Solo permite dirección pura (horizontal, vertical, diagonal 45deg)
        if (Math.abs(df) !== 0 && Math.abs(dc) !== 0 && Math.abs(df) !== Math.abs(dc)) {
            // Dirección inválida, cancelar selección
            state.selActiva = null;
            state.seleccion.forEach(s => s.el.classList.remove('sopa-sel'));
            state.seleccion = [];
            return;
        }
        state.seleccion.forEach(s => s.el.classList.remove('sopa-sel'));
        state.seleccion = [];
        let palabra = '';
        for (let k = 0; k <= len; k++) {
            const nf = f0 + dr * k, nc = c0 + dc2 * k;
            if (nf < 0 || nf >= state.tam || nc < 0 || nc >= state.tam) break;
            const cellEl = document.getElementById(`sc-${i}-${nf}-${nc}`);
            if (cellEl) {
                palabra += state.grid[nf][nc];
                state.seleccion.push({ fila: nf, col: nc, el: cellEl });
                cellEl.classList.add('sopa-sel');
            }
        }
        // Verificar si la palabra es correcta
        const idxEncontrado = state.palabras.findIndex(pw => pw === palabra || pw === [...palabra].reverse().join(''));
        if (idxEncontrado !== -1 && !state.encontradas.has(state.palabras[idxEncontrado])) {
            state.encontradas.add(state.palabras[idxEncontrado]);
            state.seleccion.forEach(s => {
                s.el.classList.remove('sopa-sel');
                s.el.classList.add('sopa-encontrada');
            });
            // Marcar la pista
            const pistaEl = document.getElementById(`pista-${i}-${idxEncontrado}`);
            const ppalEl = document.getElementById(`ppal-${i}-${idxEncontrado}`);
            if (pistaEl) pistaEl.classList.add('encontrada');
            if (ppalEl) ppalEl.textContent = state.palabras[idxEncontrado];
            respuestasInteractivas[i] = [...state.encontradas];
        } else {
            // Selección incorrecta, limpiar
            state.seleccion.forEach(s => s.el.classList.remove('sopa-sel'));
        }
        state.selActiva = null;
        state.seleccion = [];
    }
}

// ---- Escritura Libre ----
function actualizarEscrituraLibre(pregIdx, textareaEl) {
    const palabras = textareaEl.value.trim().split(/\s+/).filter(Boolean).length;
    const contadorEl = document.getElementById(`contador-${pregIdx}`);
    if (contadorEl) contadorEl.textContent = `${palabras} palabra${palabras !== 1 ? 's' : ''}`;
    respuestasInteractivas[pregIdx] = textareaEl.value.trim();
}

// =================== CALIFICACIÓN ===================

async function calificarActividadInteractiva(actividadId) {
    const actividad = actividadInteractivaActual;
    if (!actividad) return;

    const preguntas = actividad.preguntas || [];
    let totalPuntos = 0;
    let obtenidos = 0;
    const detalles = [];

    for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        const resp = respuestasInteractivas[i];
        let correcto = false;
        let puntosPreg = 1;
        let feedbackTexto = '';

        switch(p.tipo) {
            case 'quiz':
                if (resp === undefined) { feedbackTexto = 'Sin respuesta'; break; }
                correcto = resp === p.respuestaCorrecta;
                feedbackTexto = correcto ? '¡Correcto!' : `Incorrecto. La respuesta correcta es: ${p.opciones[p.respuestaCorrecta]}`;
                break;

            case 'verdadero_falso':
                if (resp === undefined) { feedbackTexto = 'Sin respuesta'; break; }
                correcto = resp === p.respuestaCorrecta;
                feedbackTexto = correcto ? '¡Correcto!' : `Incorrecto. La respuesta correcta es: ${p.respuestaCorrecta ? 'Verdadero' : 'Falso'}`;
                break;

            case 'ordenar': {
                if (!resp || !Array.isArray(resp)) { feedbackTexto = 'Sin respuesta'; break; }
                const correcto2 = p.ordenCorrecto || p.items.map((_, idx) => idx);
                correcto = resp.length === correcto2.length && resp.every((v, idx) => v === correcto2[idx]);
                feedbackTexto = correcto ? '¡Correcto!' : `El orden correcto era: ${correcto2.map(idx => p.items[idx]).join(' → ')}`;
                break;
            }

            case 'completar': {
                if (!resp || !Array.isArray(resp)) { feedbackTexto = 'Sin respuesta'; break; }
                const correctas = p.respuestas || [];
                const aciertos = resp.filter((r, idx) => r.toLowerCase().trim() === (correctas[idx] || '').toLowerCase().trim()).length;
                correcto = aciertos === correctas.length;
                puntosPreg = correctas.length > 0 ? aciertos / correctas.length : 0;
                feedbackTexto = correcto ? '¡Perfecto!' : `Aciertos: ${aciertos}/${correctas.length}. Respuestas correctas: ${correctas.join(', ')}`;
                break;
            }

            case 'relacionar': {
                if (!resp) { feedbackTexto = 'Sin respuesta'; break; }
                const pares = p.pares || [];
                let match = 0;
                for (let j = 0; j < pares.length; j++) {
                    if (resp[j] === j) match++;
                }
                correcto = match === pares.length;
                puntosPreg = pares.length > 0 ? match / pares.length : 0;
                feedbackTexto = correcto ? '¡Excelente!' : `Pares correctos: ${match}/${pares.length}`;
                break;
            }

            case 'crucigrama': {
                if (!resp) { feedbackTexto = 'Sin respuesta'; break; }
                const cells = Object.values(resp);
                const total2 = cells.length;
                const correctas2 = cells.filter(c => c.valor === c.correcta).length;
                correcto = correctas2 === total2 && total2 > 0;
                puntosPreg = total2 > 0 ? correctas2 / total2 : 0;
                feedbackTexto = correcto ? '¡Perfecto!' : `Letras correctas: ${correctas2}/${total2}`;
                break;
            }

            case 'clasificar': {
                if (!resp) { feedbackTexto = 'Sin respuesta'; break; }
                const elementos = p.elementos || [];
                const correctas3 = elementos.filter(el => resp[el.texto] === el.categoria).length;
                correcto = correctas3 === elementos.length;
                puntosPreg = elementos.length > 0 ? correctas3 / elementos.length : 0;
                feedbackTexto = correcto ? '¡Excelente!' : `Clasificados correctamente: ${correctas3}/${elementos.length}`;
                break;
            }

            case 'sopa_letras': {
                const state = window[`_sopaState_${i}`];
                const encontradas = state?.encontradas?.size || 0;
                const totalPal = state?.palabras?.length || 1;
                correcto = encontradas === totalPal;
                puntosPreg = encontradas / totalPal;
                feedbackTexto = correcto ? '¡Encontraste todas!' : `Palabras encontradas: ${encontradas}/${totalPal}`;
                break;
            }

            case 'escritura_libre': {
                // Evaluar con IA
                puntosPreg = await evaluarEscrituraLibreConIA(p, resp || '', i);
                correcto = puntosPreg >= 0.7;
                feedbackTexto = `Evaluación IA: ${Math.round(puntosPreg * 100)}%`;
                break;
            }
        }

        totalPuntos += 1; // Cada pregunta vale 1 punto base
        obtenidos += typeof puntosPreg === 'number' ? Math.min(puntosPreg, 1) : (correcto ? 1 : 0);

        detalles.push({ correcto, puntos: puntosPreg, feedback: feedbackTexto, explicacion: p.explicacion });

        // Mostrar feedback visual en la pregunta
        const feedbackEl = document.getElementById(`feedback-${i}`);
        if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.className = `preg-feedback ${correcto ? 'feedback-correcto' : 'feedback-incorrecto'}`;
            feedbackEl.innerHTML = `
                <i class="fas ${correcto ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                ${feedbackTexto}
                ${p.explicacion ? `<div class="explicacion-feedback"><i class="fas fa-lightbulb"></i> ${p.explicacion}</div>` : ''}
            `;
        }
    }

    const puntaje = totalPuntos > 0 ? Math.round((obtenidos / totalPuntos) * 100) : 0;
    const aprobado = puntaje >= (actividad.puntuacionMinima || 70);

    // Guardar resultado localmente
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    const clave = `actividad-interactiva-resultado-${actividadId}-${currentUser?.email}`;
    const resultado = { puntaje, aprobado, fecha: new Date().toISOString(), detalles };
    localStorage.setItem(clave, JSON.stringify(resultado));

    // Guardar en Firestore para que el admin lo vea
    if (currentUser) {
        try {
            await setDoc(doc(db, 'entregas_interactivas', `${actividadId}-${currentUser.email}`), {
                actividadId,
                estudianteId: currentUser.email,
                nombre: currentUser.name || '',
                programa: currentUser.programa || '',
                puntaje,
                aprobado,
                fecha: new Date().toISOString(),
                detalles
            });
        } catch(e) {
            console.warn('No se pudo guardar resultado en Firestore:', e);
        }
    }

    // Mostrar resultado en el modal
    mostrarResultadoInteractivo(actividad, resultado);
}

async function evaluarEscrituraLibreConIA(pregunta, respuestaEstudiante, pregIdx) {
    if (!respuestaEstudiante || respuestaEstudiante.trim().length < 10) return 0;
    try {
        let apiKey = '';
        try {
            const configDoc = await getDoc(doc(db, 'config', 'openrouter'));
            if (configDoc.exists()) apiKey = configDoc.data()?.apiKey || '';
        } catch(e) {}
        if (!apiKey) return 0.5; // Sin clave: puntaje medio por defecto

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Charlotte Educational Platform'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [{
                    role: 'user',
                    content: `Eres un evaluador educativo. Evalúa la siguiente respuesta del estudiante.

PREGUNTA: ${pregunta.pregunta}
RÚBRICA DE EVALUACIÓN: ${pregunta.rubrica}

RESPUESTA DEL ESTUDIANTE:
${respuestaEstudiante}

Responde SOLO con un número decimal entre 0 y 1 representando el puntaje (ej: 0.85). Sin explicaciones.`
                }],
                max_tokens: 10,
                temperature: 0.1
            })
        });
        if (!response.ok) return 0.5;
        const data = await response.json();
        const texto = data.choices?.[0]?.message?.content?.trim() || '0.5';
        const num = parseFloat(texto);
        return isNaN(num) ? 0.5 : Math.min(1, Math.max(0, num));
    } catch(e) {
        console.warn('Error evaluando escritura libre:', e);
        return 0.5;
    }
}

function mostrarResultadoInteractivo(actividad, resultado) {
    const { puntaje, aprobado, fecha, detalles } = resultado;
    document.getElementById('modalTitle').textContent = aprobado ? '¡Actividad Completada!' : 'Resultado de la Actividad';
    document.getElementById('modalBody').innerHTML = `
        <div class="resultado-interactivo">
            <div class="resultado-circulo ${aprobado ? 'aprobado' : 'reprobado'}">
                <div class="resultado-pct">${puntaje}%</div>
                <div class="resultado-label">${aprobado ? '¡Aprobado!' : 'Intenta de nuevo'}</div>
            </div>
            <div class="resultado-info">
                <p><i class="fas fa-calendar"></i> Completado: ${new Date(fecha).toLocaleDateString('es-ES', {hour:'2-digit',minute:'2-digit'})}</p>
                <p><i class="fas fa-trophy"></i> Mínimo para aprobar: ${actividad.puntuacionMinima || 70}%</p>
            </div>
            ${!aprobado ? `
                <button class="btn-modal btn-primary-modal" onclick="reiniciarActividadInteractiva('${actividad.id}')">
                    <i class="fas fa-redo"></i> Intentar de nuevo
                </button>
            ` : ''}
            <div class="resultado-detalles">
                <h4><i class="fas fa-list-check"></i> Detalle por pregunta</h4>
                ${(detalles || []).map((d, idx) => `
                    <div class="detalle-item ${d.correcto ? 'correcto' : 'incorrecto'}">
                        <span class="detalle-num">${idx + 1}</span>
                        <span><i class="fas ${d.correcto ? 'fa-check' : 'fa-times'}"></i> ${d.feedback}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function reiniciarActividadInteractiva(actividadId) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    const clave = `actividad-interactiva-resultado-${actividadId}-${currentUser?.email}`;
    localStorage.removeItem(clave);
    loadActividadInteractivaDetail(actividadId);
}

// =================== FIN ACTIVIDADES INTERACTIVAS ===================

async function loadActividadDetail(id) {
    try {
        const docRef = doc(db, 'activities', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const actividad = docSnap.data();
            document.getElementById('modalTitle').textContent = `Entregar: ${actividad.titulo}`;
            document.getElementById('modalBody').innerHTML = `
                <div class="actividad-detail">
                    <div class="actividad-info">
                        <div class="info-section">
                            <h3><i class="fas fa-info-circle"></i> Información de la Actividad</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Programa:</span>
                                    <span class="info-value">${actividad.programa}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Fecha de publicación:</span>
                                    <span class="info-value">${actividad.fechaRegistro ? new Date(actividad.fechaRegistro).toLocaleDateString('es-ES') : 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Fecha límite:</span>
                                    <span class="info-value">${actividad.fechaLimite ? new Date(actividad.fechaLimite).toLocaleDateString('es-ES') : 'Sin límite'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Estado:</span>
                                    <span class="info-value status-${new Date() > new Date(actividad.fechaLimite) ? 'vencida' : 'activa'}">
                                        ${new Date() > new Date(actividad.fechaLimite) ? 'Vencida' : 'Activa'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h3><i class="fas fa-clipboard-list"></i> Instrucciones</h3>
                            <div class="instrucciones-content">
                                ${actividad.instrucciones || 'No hay instrucciones específicas.'}
                            </div>
                            ${actividad.archivoUrl ? '<div class="archivo-adjunto"><i class="fas fa-paperclip"></i><a href="' + actividad.archivoUrl + '" target="_blank" class="archivo-link">Descargar archivo adjunto</a></div>' : ''}
                        </div>
                    </div>
                    
                    <div class="entrega-section">
                        <h3><i class="fas fa-edit"></i> Tu Entrega</h3>
                        <div class="editor-container">
                            <textarea id="entregaEditor" placeholder="Escribe tu entrega aquí..."></textarea>
                        </div>
                        <div class="entrega-actions">
                            <button class="btn-modal btn-secondary" onclick="guardarBorrador('${id}')">
                                <i class="fas fa-save"></i> Guardar Borrador
                            </button>
                            ${!actividad.entrega || !actividad.entrega.calificada ? '<button class="btn-modal btn-primary-modal" onclick="submitEntrega(\'' + id + '\')"><i class="fas fa-paper-plane"></i> Entregar Actividad</button>' : '<div class="entrega-calificada-msg"><i class="fas fa-check-circle"></i> Esta actividad ya ha sido calificada y no se puede modificar.</div>'}
                        </div>
                        <div class="entrega-info">
                            <small><i class="fas fa-info-circle"></i> Tu entrega se guardará automáticamente como borrador cada 30 segundos</small>
                        </div>
                    </div>

                    ${actividad.entrega ? '<div class="entrega-section"><h3><i class="fas fa-paper-plane"></i> Entrega Enviada</h3><div class="entrega-enviada"><div class="entrega-meta"><span><i class="fas fa-calendar"></i> Enviada: ' + new Date(actividad.entrega.fechaEntrega).toLocaleDateString('es-ES') + '</span><span class="entrega-status ' + (actividad.entrega.calificada ? 'status-calificada' : 'status-pendiente') + '">' + (actividad.entrega.calificada ? 'Calificada' : 'Pendiente de calificación') + '</span></div><div class="entrega-contenido">' + actividad.entrega.entrega + '</div>' + (actividad.entrega.calificada ? '<div class="calificacion-section"><h4><i class="fas fa-star"></i> Calificación</h4><div class="calificacion-info"><div class="nota"><span class="nota-label">Nota:</span><span class="nota-value">' + (actividad.entrega.nota || 'Pendiente') + '</span></div>' + (actividad.entrega.comentario ? '<div class="comentario"><span class="comentario-label">Comentario del profesor:</span><div class="comentario-text">' + actividad.entrega.comentario + '</div></div>' : '<div class="comentario"><span class="comentario-label">Comentario del profesor:</span><div class="comentario-text">No hay comentario</div></div>') + '</div></div>' : '') + '</div></div>' : ''}
                </div>
            `;
            
            // Clase para subir imágenes como base64 (con compresión)
            class Base64UploadAdapter {
                constructor(loader) {
                    this.loader = loader;
                }

                async upload() {
                    return this.loader.file
                        .then(file => new Promise(async (resolve, reject) => {
                            // Verificar tamaño del archivo (máximo 5MB antes de compresión)
                            if (file.size > 5 * 1024 * 1024) {
                                reject(new Error('La imagen es demasiado grande. Máximo 5MB.'));
                                return;
                            }
                            
                            // Comprimir imagen antes de convertir a base64
                            const compressedFile = await this.compressImage(file);
                            
                            const reader = new FileReader();
                            reader.onload = () => {
                                resolve({
                                    default: reader.result
                                });
                            };
                            reader.onerror = () => {
                                reject(reader.error);
                            };
                            reader.readAsDataURL(compressedFile);
                        }));
                }

                async compressImage(file) {
                    return new Promise((resolve) => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        
                        img.onload = () => {
                            // Calcular nuevas dimensiones (máximo 800px de ancho/alto)
                            const maxSize = 800;
                            let { width, height } = img;
                            
                            if (width > height) {
                                if (width > maxSize) {
                                    height = (height * maxSize) / width;
                                    width = maxSize;
                                }
                            } else {
                                if (height > maxSize) {
                                    width = (width * maxSize) / height;
                                    height = maxSize;
                                }
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            
                            // Dibujar imagen comprimida
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            // Convertir a blob con calidad reducida
                            canvas.toBlob(resolve, 'image/jpeg', 0.8);
                        };
                        
                        img.src = URL.createObjectURL(file);
                    });
                }

                abort() {
                    // No se puede abortar la lectura de FileReader
                }
            }

            function Base64UploadAdapterPlugin(editor) {
                editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
                    return new Base64UploadAdapter(loader);
                };
            }
            
            // Inicializar CKEditor (igual que admin)
            setTimeout(() => {
                if (document.getElementById('entregaEditor')) {
                    ClassicEditor
                        .create(document.querySelector('#entregaEditor'), {
                            toolbar: ['heading', '|', 'bold', 'italic', '|', 'bulletedList', 'numberedList', 'outdent', 'indent', '|', 'link', 'imageUpload', 'blockQuote', 'insertTable', 'mediaEmbed', 'undo', 'redo'],
                            extraPlugins: [Base64UploadAdapterPlugin]
                        })
                        .then(editor => {
                            entregaEditor = editor;
                            
                            // Método para mostrar advertencia de almacenamiento
                            editor.showStorageWarning = () => {
                                const warning = document.createElement('div');
                                warning.innerHTML = `
                                    <div style="position: fixed; top: 20px; right: 20px; background: #f59e0b; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; max-width: 300px; font-size: 14px;">
                                        <strong>⚠️ Almacenamiento lleno</strong><br>
                                        El borrador es muy grande. Considera reducir el número de imágenes o guardar manualmente.
                                        <button onclick="this.parentElement.remove()" style="margin-top: 10px; background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Cerrar</button>
                                    </div>
                                `;
                                document.body.appendChild(warning);
                                setTimeout(() => {
                                    if (warning.parentElement) {
                                        warning.remove();
                                    }
                                }, 10000);
                            };
                            
                            // Cargar borrador guardado
                            const borrador = localStorage.getItem(`borrador-${id}`);
                            if (borrador) {
                                editor.setData(borrador);
                            }
                            
                            // Auto-guardado cada 30 segundos
                            setInterval(() => {
                                try {
                                    const content = editor.getData();
                                    if (content.trim()) {
                                        localStorage.setItem(`borrador-${id}`, content);
                                    }
                                } catch (error) {
                                    if (error.name === 'QuotaExceededError') {
                                        console.warn('Contenido del borrador demasiado grande. Considera reducir imágenes o guardar manualmente.');
                                        // Mostrar notificación de advertencia
                                        editor.showStorageWarning();
                                    }
                                }
                            }, 30000);
                        })
                        .catch(error => {
                            console.error('Error inicializando editor:', error);
                        });
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error loading actividad detail:', error);
        document.getElementById('modalBody').innerHTML = '<p>Error al cargar la actividad</p>';
    }
}

async function loadCuestionarioDetail(id) {
    try {
        const docRef = doc(db, 'cuestionarios', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const cuestionario = docSnap.data();
            document.getElementById('modalTitle').textContent = cuestionario.titulo;

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            const respuestas = JSON.parse(localStorage.getItem('respuestasCuestionarios') || '{}');
            const misClave = `${currentUser.email}_${id}`;
            const misIntentos = respuestas[misClave] || [];
            const intentosRestantes = (cuestionario.intentos || 1) - misIntentos.length;
            const fechaLimite = cuestionario.fechaLimite ? new Date(cuestionario.fechaLimite) : null;
            const vencido = fechaLimite && new Date() > fechaLimite;
            const puedeResponder = !vencido && intentosRestantes > 0;

            let modalBody = `
                <p><strong>Descripción:</strong> ${cuestionario.descripcion || 'Sin descripción'}</p>
                <p><strong>Tiempo disponible:</strong> ${cuestionario.tiempoDisponible || 0} minutos</p>
                <p><strong>Intentos restantes:</strong> ${intentosRestantes}</p>
                ${fechaLimite ? '<p><strong>Fecha límite:</strong> ' + fechaLimite.toLocaleString('es-ES') + '</p>' : ''}
            `;

            if (misIntentos.length > 0) {
                modalBody += `
                    <div class="entrega-section">
                        <h3><i class="fas fa-check-circle"></i> Respuestas Enviadas</h3>
                        <p>Has enviado ${misIntentos.length} intento(s). Último: ${misIntentos[misIntentos.length - 1].fecha || 'N/A'}</p>
                        ${misIntentos[misIntentos.length - 1].calificada ? `
                            <div class="clase-calificacion">
                                <div class="calificacion-badge">
                                    <i class="fas fa-star"></i> Calificación: ${misIntentos[misIntentos.length - 1].calificacion || 'Pendiente'}
                                    ${misIntentos[misIntentos.length - 1].comentario ? `<br><small>Comentario: ${misIntentos[misIntentos.length - 1].comentario}</small>` : ''}
                                </div>
                            </div>
                        ` : '<p>Calificación pendiente.</p>'}
                    </div>
                `;
            }

            if (puedeResponder) {
                const preguntasHtml = cuestionario.preguntas.map((pregunta, index) => {
                    if (pregunta.tipo === 'multiple') {
                        const opciones = pregunta.opciones.map((op, i) => `
                            <label style="display: block; margin: 5px 0;">
                                <input type="radio" name="pregunta${index}" value="${i}"> ${op}
                            </label>
                        `).join('');
                        return `
                            <div style="margin-bottom: 20px;">
                                <p><strong>${index + 1}. ${pregunta.texto}</strong></p>
                                ${opciones}
                            </div>
                        `;
                    } else {
                        return `
                            <div style="margin-bottom: 20px;">
                                <p><strong>${index + 1}. ${pregunta.texto}</strong></p>
                                <textarea name="pregunta${index}" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;"></textarea>
                            </div>
                        `;
                    }
                }).join('');

                modalBody += `
                    <div class="entrega-section">
                        <h3><i class="fas fa-edit"></i> Responder Cuestionario</h3>
                        <form id="cuestionarioForm">
                            ${preguntasHtml}
                            <button type="button" class="btn-modal btn-primary-modal" onclick="submitCuestionario('${id}')">Enviar Respuestas</button>
                        </form>
                    </div>
                `;
            } else {
                modalBody += '<p>No puedes responder este cuestionario (sin intentos restantes o vencido).</p>';
            }

            document.getElementById('modalBody').innerHTML = modalBody;
        }
    } catch (error) {
        console.error('Error loading cuestionario detail:', error);
        document.getElementById('modalBody').innerHTML = '<p>Error al cargar el cuestionario</p>';
    }
}

async function loadVideoDetail(id) {
    try {
        const docRef = doc(db, 'content', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const video = docSnap.data();
            document.getElementById('modalTitle').textContent = video.titulo;
            
            // Detectar tipo de video
            const isYouTube = video.url.includes('youtube.com') || video.url.includes('youtu.be');
            const isLocalVideo = video.url.startsWith('/videos/') || video.url.includes('/videos/');
            const isMp4 = video.url.endsWith('.mp4') || video.url.endsWith('.webm');
            
            let videoPlayerHTML = '';
            
            if (isYouTube) {
                // YouTube
                const videoId = getVideoId(video.url);
                videoPlayerHTML = videoId ? `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width: 100%; height: 315px;"></iframe>` : '';
            } else if (isLocalVideo || isMp4) {
                // Video local desde Render
                const videoUrl = video.url.startsWith('http') ? video.url : `/videos/${video.url}`;
                videoPlayerHTML = `
                    <div style="background: #000; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                        <video id="videoPlayer-${id}" width="100%" height="315" controls style="display: block; width: 100%;">
                            <source src="${videoUrl}" type="video/mp4">
                            Tu navegador no soporta videos HTML5
                        </video>
                    </div>
                    <div style="background: #f0f9ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 12px; margin: 10px 0; font-size: 0.9em; color: #1e40af;">
                        <i class="fas fa-info-circle"></i> Video alojado en servidor
                    </div>
                `;
            } else {
                // Enlace externo
                videoPlayerHTML = `<p><a href="${video.url}" target="_blank" style="color: #3b82f6; text-decoration: underline; font-weight: 600;"><i class="fas fa-external-link-alt"></i> Abrir video en nueva pestaña</a></p>`;
            }
            
            document.getElementById('modalBody').innerHTML = `
                <p><strong>Descripción:</strong> ${video.descripcion || 'Sin descripción'}</p>
                <p><strong>Programa:</strong> ${video.programa}</p>
                <p><strong>Duración:</strong> ${video.duracion || 'N/A'}</p>
                <p><strong>Fecha:</strong> ${video.fechaCreacion ? new Date(video.fechaCreacion).toLocaleDateString('es-ES') : 'N/A'}</p>
                <div style="margin-top: 20px;">
                    ${videoPlayerHTML}
                </div>
            `;
            
            // Guardar progreso del video al reproducir
            const videoElement = document.getElementById(`videoPlayer-${id}`);
            if (videoElement) {
                videoElement.addEventListener('play', () => {
                    localStorage.setItem(`video-${id}-progress`, '25');
                });
                videoElement.addEventListener('pause', () => {
                    const progress = Math.round((videoElement.currentTime / videoElement.duration) * 100);
                    localStorage.setItem(`video-${id}-progress`, progress);
                });
                videoElement.addEventListener('ended', () => {
                    localStorage.setItem(`video-${id}-watched`, 'true');
                    localStorage.setItem(`video-${id}-progress`, '100');
                });
                
                // Restaurar posición si fue pausado
                const savedProgress = localStorage.getItem(`video-${id}-progress`);
                if (savedProgress && savedProgress !== '0') {
                    videoElement.addEventListener('loadedmetadata', () => {
                        videoElement.currentTime = (savedProgress / 100) * videoElement.duration;
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error loading video detail:', error);
        document.getElementById('modalBody').innerHTML = '<p>Error al cargar el video</p>';
    }
}

async function submitEntrega(actividadId) {
    if (!entregaEditor) {
        alert('Editor no inicializado');
        return;
    }
    const entrega = entregaEditor.getData().trim();
    if (!entrega) {
        alert('Por favor escribe tu entrega');
        return;
    }
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    try {
        // Obtener información de la actividad
        const actividadDoc = await getDoc(doc(db, 'activities', actividadId));
        const actividadData = actividadDoc.exists ? actividadDoc.data() : {};

        // Usar ID compuesto para asegurar unicidad por actividad y estudiante
        const entregaId = `${actividadId}-${currentUser.email}`;
        const entregaRef = doc(db, 'entregas', entregaId);
        
        // Verificar si ya existe y está calificada
        const entregaSnap = await getDoc(entregaRef);
        if (entregaSnap.exists() && entregaSnap.data().calificada) {
            alert('Esta entrega ya ha sido calificada y no se puede modificar.');
            return;
        }
        
        await setDoc(entregaRef, {
            actividadId,
            estudianteId: currentUser.email,
            nombre: currentUser.name,
            programa: currentUser.programa,
            entrega,
            fechaEntrega: new Date().toISOString(),
            calificada: false, // Siempre resetear calificación al actualizar
            // Información de la actividad
            actividadTitulo: actividadData.titulo || 'Sin título',
            actividadDescripcion: actividadData.instrucciones || 'Sin descripción',
            tipo: actividadData.tipo || 'General',
            modulo: actividadData.modulo || null,
            dificultad: actividadData.dificultad || null,
            tiempoEstimado: actividadData.tiempoEstimado || null
        });
        
        // Limpiar borrador
        localStorage.removeItem(`borrador-${actividadId}`);
        alert('Entrega enviada exitosamente');
        closeModal();
        // Recargar actividades para actualizar estado
        window.loadActividades();
    } catch (error) {
        console.error('Error submitting entrega:', error);
        alert('Error al enviar la entrega');
    }
}

function guardarBorrador(actividadId) {
    if (!entregaEditor) {
        alert('Editor no inicializado');
        return;
    }
    const content = entregaEditor.getData();
    try {
        if (content.trim()) {
            localStorage.setItem(`borrador-${actividadId}`, content);
            // Mostrar notificación de éxito
            const notification = document.createElement('div');
            notification.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; font-weight: 600;">
                    ✓ Borrador guardado
                </div>
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 2000);
        }
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            // Mostrar advertencia de almacenamiento lleno
            const warning = document.createElement('div');
            warning.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; max-width: 300px; font-size: 14px;">
                    <strong>💾 Almacenamiento lleno</strong><br>
                    El borrador es demasiado grande. Intenta:<br>
                    • Reducir el número de imágenes<br>
                    • Usar imágenes más pequeñas<br>
                    • Guardar secciones más cortas
                    <button onclick="this.parentElement.remove()" style="margin-top: 10px; background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Cerrar</button>
                </div>
            `;
            document.body.appendChild(warning);
            setTimeout(() => {
                if (warning.parentElement) {
                    warning.remove();
                }
            }, 15000);
        } else {
            alert('Error al guardar borrador: ' + error.message);
        }
    }
}

async function submitCuestionario(cuestionarioId) {
    const form = document.getElementById('cuestionarioForm');
    const formData = new FormData(form);
    const respuestas = [];
    for (let [key, value] of formData.entries()) {
        const index = parseInt(key.replace('pregunta', ''));
        respuestas[index] = value;
    }
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    try {
        await addDoc(collection(db, 'respuestasCuestionarios'), {
            cuestionarioId,
            estudianteId: currentUser.email,
            respuestas,
            fechaRespuesta: new Date().toISOString()
        });
        alert('Respuestas enviadas exitosamente');
        closeModal();
        loadCuestionarios(); // Recargar para actualizar estado
    } catch (error) {
        console.error('Error submitting cuestionario:', error);
        alert('Error al enviar las respuestas');
    }
}

// =================== UTILIDADES PARA VALIDACIÓN DE URLs ===================
async function validateAndFixMaterialUrls() {
    try {

        const materialesQuery = query(collection(db, 'materials'));
        const materialesSnapshot = await getDocs(materialesQuery);

        let fixedCount = 0;
        let invalidCount = 0;

        for (const doc of materialesSnapshot.docs) {
            const material = doc.data();
            const materialId = doc.id;

            if (material.url) {
                const isValid = isValidUrl(material.url);

                if (!isValid) {

                    // Intentar corregir URLs comunes
                    let fixedUrl = material.url.trim();

                    // Agregar protocolo si falta
                    if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://') && !fixedUrl.startsWith('//')) {
                        // Si parece una URL de Google Drive
                        if (fixedUrl.includes('drive.google.com') || fixedUrl.includes('docs.google.com')) {
                            fixedUrl = 'https://' + fixedUrl;
                        } else {
                            invalidCount++;
                            continue;
                        }
                    }

                    // Verificar si la URL corregida es válida
                    if (isValidUrl(fixedUrl)) {

                        await updateDoc(doc.ref, {
                            url: fixedUrl,
                            urlFixed: true,
                            urlFixedDate: new Date().toISOString()
                        });

                        fixedCount++;
                    } else {
                        invalidCount++;
                    }
                }
            } else {
                invalidCount++;
            }
        }

        if (fixedCount > 0) {
            alert(`Se corrigieron ${fixedCount} URLs automáticamente. ${invalidCount} URLs necesitan revisión manual.`);
        } else if (invalidCount > 0) {
            alert(`${invalidCount} materiales tienen URLs inválidas o faltantes. Revisa la consola para más detalles.`);
        } else {
            alert('¡Todas las URLs de materiales son válidas!');
        }

    } catch (error) {
        console.error('Error validating material URLs:', error);
        alert('Error al validar URLs: ' + error.message);
    }
}

// Función para ejecutar desde consola: validateAndFixMaterialUrls()

// Exponer funciones globales
window.openModal = openModal;
window.closeModal = closeModal;
window.submitEntrega = submitEntrega;
window.submitCuestionario = submitCuestionario;
window.setViewMode = setViewMode;
window.filterByCategory = filterByCategory;
window.changePage = changePage;
window.toggleClaseCompleted = toggleClaseCompleted;
window.setVideosViewMode = setVideosViewMode;
window.filterVideosByCategory = filterVideosByCategory;
window.changeVideosPage = changeVideosPage;
window.toggleVideoWatched = toggleVideoWatched;
window.setActividadesViewMode = setActividadesViewMode;
window.filterActividadesByCategory = filterActividadesByCategory;
window.changeActividadesPage = changeActividadesPage;
window.toggleActividadCompleted = toggleActividadCompleted;
window.guardarBorrador = guardarBorrador;
window.filterMaterialesByCategory = filterMaterialesByCategory;
window.filterMateriales = filterMateriales;
window.markAsDownloaded = markAsDownloaded;
window.isValidUrl = isValidUrl;
window.validateAndFixMaterialUrls = validateAndFixMaterialUrls;
window.navigateClase = navigateClase;
window.getClaseIndex = getClaseIndex;
window.toggleClaseCompletedFromModal = toggleClaseCompletedFromModal;
window.toggleClaseCompletedFromViewer = toggleClaseCompletedFromViewer;
window.shareClase = shareClase;
window.printClase = printClase;

// Actividades interactivas
window.calificarActividadInteractiva = calificarActividadInteractiva;
window.reiniciarActividadInteractiva = reiniciarActividadInteractiva;
window.seleccionarOpcion = seleccionarOpcion;
window.seleccionarVF = seleccionarVF;
window.clickOrdenarItem = clickOrdenarItem;
window.actualizarCompletarRespuesta = actualizarCompletarRespuesta;
window.seleccionarRelacionarIzq = seleccionarRelacionarIzq;
window.seleccionarRelacionarDer = seleccionarRelacionarDer;
window.actualizarCrucigrama = actualizarCrucigrama;
window.dragStartClasificar = dragStartClasificar;
window.dropClasificar = dropClasificar;
window.clickClasificarChip = clickClasificarChip;
window.clickSopaCell = clickSopaCell;
window.actualizarEscrituraLibre = actualizarEscrituraLibre;

// =================== FUNCIONES CALIFICACIONES ===================

// Función para actualizar las notas de evaluaciones en la sección de calificaciones
// Calcula sobre 2 puntos: 100% = 2, 50% = 1, etc.
async function actualizarNotasEvaluacionesPorModulo() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    // Inicializar calificacionesEvaluacionesGuardadas si no existe
    if (!window.calificacionesEvaluacionesGuardadas) {
        window.calificacionesEvaluacionesGuardadas = {};
    }

    const programa = (currentUser.programa || '').toLowerCase();

    // Mapeo de módulos dinámico según programa
    let moduloMap = {};

    if (programa.includes('panaderia') || programa.includes('panadería')) {
        moduloMap = {
            'modulo1': ['panaderia', 'panadería', 'panes'],
            'modulo2': ['galleteria', 'galletería', 'galletas', 'galleteria y bizcocheria', 'galleteriabizcocheria'],
            'modulo3': ['pasteleria', 'pastelería', 'pasteles'],
            'modulo4': ['reposteria', 'repostería', 'postres']
        };
    } else if (programa.includes('belleza')) {
        // Para belleza, asignar evaluaciones por título específico o por defecto al módulo 3
        moduloMap = {
            'modulo1': ['diseño', 'mirada', 'ojos', 'cejas'],
            'modulo2': ['maquillaje', 'makeup'],
            'modulo3': ['estilismo', 'corte', 'peinado', 'cabello'],
            'modulo4': ['nails', 'uñas', 'designer']
        };
    } else {
        // Default
        moduloMap = {
            'modulo1': ['modulo1', 'módulo 1'],
            'modulo2': ['modulo2', 'módulo 2'],
            'modulo3': ['modulo3', 'módulo 3'],
            'modulo4': ['modulo4', 'módulo 4']
        };
    }

    // Inicializar contadores por módulo
    const moduloNotas = {
        'modulo1': { total: 0, count: 0 },
        'modulo2': { total: 0, count: 0 },
        'modulo3': { total: 0, count: 0 },
        'modulo4': { total: 0, count: 0 }
    };
    
    // Calcular la nota promedio de evaluaciones por módulo
    allEvaluaciones.forEach(evaluacion => {
        if (evaluacion.calificacionRecalculada !== null && evaluacion.calificacionRecalculada !== undefined) {
            // Determinar a qué módulo pertenece esta evaluación
            const moduloEvaluacion = (evaluacion.modulo || '').toLowerCase();
            const tituloEvaluacion = (evaluacion.titulo || '').toLowerCase();
            
            let moduloAsignado = null;
            
            // Primero buscar por campo modulo
            for (const [modulo, keywords] of Object.entries(moduloMap)) {
                if (keywords.some(kw => moduloEvaluacion.includes(kw))) {
                    moduloAsignado = modulo;
                    break;
                }
            }
            
            // Si no se encontró, buscar por título
            if (!moduloAsignado) {
                for (const [modulo, keywords] of Object.entries(moduloMap)) {
                    if (keywords.some(kw => tituloEvaluacion.includes(kw))) {
                        moduloAsignado = modulo;
                        break;
                    }
                }
            }
            
            // Si aún no se encontró, asignar a modulo3 (Pastelería) como default
            if (!moduloAsignado) {
                moduloAsignado = 'modulo3';
            }
            
            // Convertir calificación porcentual a escala de 2 puntos
            const notaEscala2 = (evaluacion.calificacionRecalculada / 100) * 2;

            moduloNotas[moduloAsignado].total += notaEscala2;
            moduloNotas[moduloAsignado].count++;
        }
    });
    
    // Actualizar UI con las notas calculadas
    for (let i = 1; i <= 4; i++) {
        const moduloKey = `modulo${i}`;
        const datos = moduloNotas[moduloKey];
        
        // Obtener la nota guardada previamente en la base de datos
        const notaGuardada = window.calificacionesEvaluacionesGuardadas?.[moduloKey] || 0;
        
        // Calcular nota de evaluaciones respondidas
        const notaCalculada = datos.count > 0 ? (datos.total / datos.count) : 0;
        
        // Si hay evaluaciones completadas, usar la nota calculada (ahora corregida)
        // Si no hay evaluaciones, usar la nota guardada
        const notaFinal = datos.count > 0 ? notaCalculada : notaGuardada;
        
        // Si hay evaluaciones completadas, guardar/actualizar automáticamente en Firebase
        if (datos.count > 0) {
            // Validar que tenemos los datos necesarios
            if (!currentUser || !currentUser.email) {
                console.error('Usuario no válido para guardar calificaciones');
                return;
            }
            
            try {
                // Definir los datos de la calificación
                const califData = {
                    estudianteId: currentUser.email,
                    modulo: moduloKey,
                    evaluaciones: notaCalculada,
                    actividades: 0, // Se actualizará desde otro lugar
                    practica: 0, // Se actualizará desde otro lugar
                    fechaActualizacion: new Date().toISOString(),
                    programa: currentUser.programa || ''
                };
                
                // Buscar si ya existe una calificación para este módulo y estudiante
                const existingSnapshot = await getDocs(query(collection(db, 'calificaciones_modulos'),
                    where('estudianteId', '==', currentUser.email),
                    where('modulo', '==', moduloKey),
                    limit(1)
                ));

                const updateData = {
                    evaluaciones: notaCalculada,
                    fechaActualizacion: new Date().toISOString(),
                    programa: currentUser.programa || ''
                };

                if (!existingSnapshot.empty) {
                    // Actualizar existente - SOLO el campo evaluaciones
                    const docId = existingSnapshot.docs[0].id;
                    await updateDoc(doc(db, 'calificaciones_modulos', docId), updateData);
                    console.log(`✅ Calificación de evaluaciones actualizada en ${moduloKey} para ${currentUser.email}`);
                } else {
                    // Crear nueva con valores por defecto
                    const califData = {
                        estudianteId: currentUser.email,
                        modulo: moduloKey,
                        evaluaciones: notaCalculada,
                        actividades: 0,
                        practica: 0,
                        fechaActualizacion: new Date().toISOString(),
                        programa: currentUser.programa || ''
                    };
                    await addDoc(collection(db, 'calificaciones_modulos'), califData);
                    console.log(`🆕 Nueva calificación creada en ${moduloKey} para ${currentUser.email}`);
                }
                
                // Actualizar el valor guardado para evitar re-guardar en la misma sesión
                window.calificacionesEvaluacionesGuardadas[moduloKey] = notaCalculada;
            } catch (error) {
                console.error(`Error guardando calificación calculada para módulo ${moduloKey}:`, error);
                console.error('Detalles del error:', {
                    message: error.message,
                    code: error.code,
                    modulo: moduloKey,
                    estudiante: currentUser?.email,
                    nota: notaCalculada
                });
            }
        }
        
        const elemento = document.getElementById(`${moduloKey}Evaluaciones`);
        if (elemento) {
            elemento.textContent = notaFinal.toFixed(1);
        }
        
        // También actualizar el score total del módulo
        actualizarScoreModulo(i);
    }
    
    // Actualizar total final
    actualizarTotalFinal();
}

// Función para actualizar el score total de un módulo
function actualizarScoreModulo(moduloNum) {
    const moduloId = `modulo${moduloNum}`;
    const actividadesEl = document.getElementById(`${moduloId}Actividades`);
    const evaluacionesEl = document.getElementById(`${moduloId}Evaluaciones`);
    const practicaEl = document.getElementById(`${moduloId}Practica`);
    const scoreEl = document.getElementById(`${moduloId}ScoreMain`);
    const progressEl = document.getElementById(`${moduloId}ProgressFill`);
    const percentEl = document.getElementById(`${moduloId}ProgressPercent`);

    const actividades = parseFloat(actividadesEl?.textContent || '0') || 0;
    const evaluaciones = parseFloat(evaluacionesEl?.textContent || '0') || 0;
    const practica = parseFloat(practicaEl?.textContent || '0') || 0;

    const total = actividades + evaluaciones + practica;
    const maxScore = 6.0; // Máximo posible (2 puntos por cada categoría)
    const percentage = Math.min((total / maxScore) * 100, 100);

    if (scoreEl) scoreEl.textContent = total.toFixed(1);
    if (progressEl) progressEl.style.width = `${percentage}%`;
    if (percentEl) percentEl.textContent = `${Math.round(percentage)}%`;

    // Actualizar clase de color según el rendimiento
    if (progressEl) {
        progressEl.className = 'progress-fill';
        if (percentage >= 80) {
            progressEl.classList.add('excellent');
        } else if (percentage >= 60) {
            progressEl.classList.add('good');
        } else if (percentage >= 40) {
            progressEl.classList.add('average');
        } else {
            progressEl.classList.add('needs-improvement');
        }
    }

    // Actualizar color del valor de calificación
    if (scoreEl) {
        scoreEl.className = 'new-final-grade';
        if (total >= 4.8) {
            scoreEl.classList.add('excellent');
        } else if (total >= 3.6) {
            scoreEl.classList.add('good');
        } else if (total >= 2.4) {
            scoreEl.classList.add('average');
        } else {
            scoreEl.classList.add('needs-improvement');
        }
    }
}

// Función para actualizar el total final
function actualizarTotalFinal() {
    let totalFinal = 0;
    let modulosConDatos = 0;

    for (let i = 1; i <= 4; i++) {
        const scoreEl = document.getElementById(`modulo${i}ScoreMain`);
        const score = parseFloat(scoreEl?.textContent || '0') || 0;
        if (score > 0) {
            totalFinal += score;
            modulosConDatos++;
        }
    }

    const promedioFinal = modulosConDatos > 0 ? totalFinal / modulosConDatos : 0;

    // Si no hay calificaciones, mostrar mensaje alternativo SOLO si no hay interfaz nueva renderizada
    const container = document.getElementById('gradesContainer');
    if (modulosConDatos === 0 && container && !container.querySelector('.grades-section')) {
        const noGradesHtml = `
            <div class="grades-section">
                <div class="grades-header">
                    <h2><i class="fas fa-chart-line"></i> Mis Calificaciones</h2>
                    <p>Programa de ${JSON.parse(sessionStorage.getItem('currentUser') || 'null')?.programa || 'Estudios'}</p>
                </div>
                <div class="no-grades">
                    <i class="fas fa-graduation-cap"></i>
                    <h3>Aún no tienes calificaciones</h3>
                    <p>Completa evaluaciones y actividades para ver tus calificaciones aquí.</p>
                </div>
            </div>
        `;
        container.innerHTML = noGradesHtml;
        return;
    }

    const totalScoreEl = document.getElementById('totalScore');
    const totalPonderadoEl = document.getElementById('totalPonderado');

    if (totalScoreEl) totalScoreEl.textContent = promedioFinal.toFixed(1);
    if (totalPonderadoEl) totalPonderadoEl.textContent = promedioFinal.toFixed(1);
}

// Función para renderizar módulos dinámicamente según el programa
function renderModulosCalificaciones() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    const programa = (currentUser.programa || '').toLowerCase();
    let modulos = [];
    let programaIcon = 'fas fa-graduation-cap';
    let programaColor = '#3b82f6';

    if (programa.includes('panaderia') || programa.includes('panadería')) {
        modulos = [
            { id: 'modulo1', nombre: 'Panadería', icon: 'fas fa-bread-slice', color: '#f59e0b', descripcion: 'Técnicas básicas de panadería' },
            { id: 'modulo2', nombre: 'Galletaría', icon: 'fas fa-cookie-bite', color: '#ef4444', descripcion: 'Elaboración de galletas y pastas' },
            { id: 'modulo3', nombre: 'Pastelería', icon: 'fas fa-birthday-cake', color: '#ec4899', descripcion: 'Arte de la pastelería fina' },
            { id: 'modulo4', nombre: 'Repostería', icon: 'fas fa-utensils', color: '#8b5cf6', descripcion: 'Técnicas avanzadas de repostería' }
        ];
        programaIcon = 'fas fa-utensils';
        programaColor = '#f59e0b';
    } else if (programa.includes('belleza')) {
        modulos = [
            { id: 'modulo1', nombre: 'Diseño de Mirada', icon: 'fas fa-eye', color: '#06b6d4', descripcion: 'Técnicas de maquillaje de ojos' },
            { id: 'modulo2', nombre: 'Maquillaje', icon: 'fas fa-palette', color: '#ec4899', descripcion: 'Maquillaje completo profesional' },
            { id: 'modulo3', nombre: 'Estilismo', icon: 'fas fa-cut', color: '#10b981', descripcion: 'Corte y peinado profesional' },
            { id: 'modulo4', nombre: 'Nails Designer', icon: 'fas fa-hand-sparkles', color: '#f59e0b', descripcion: 'Diseño y decoración de uñas' }
        ];
        programaIcon = 'fas fa-spa';
        programaColor = '#ec4899';
    } else {
        // Default para otros programas
        modulos = [
            { id: 'modulo1', nombre: 'Módulo 1', icon: 'fas fa-book', color: '#3b82f6', descripcion: 'Contenido del módulo 1' },
            { id: 'modulo2', nombre: 'Módulo 2', icon: 'fas fa-book', color: '#3b82f6', descripcion: 'Contenido del módulo 2' },
            { id: 'modulo3', nombre: 'Módulo 3', icon: 'fas fa-book', color: '#3b82f6', descripcion: 'Contenido del módulo 3' },
            { id: 'modulo4', nombre: 'Módulo 4', icon: 'fas fa-book', color: '#3b82f6', descripcion: 'Contenido del módulo 4' }
        ];
        programaIcon = 'fas fa-graduation-cap';
        programaColor = '#3b82f6';
    }

    const container = document.getElementById('gradesContainer');
    if (!container) {
        console.error('Contenedor gradesContainer no encontrado');
        return;
    }

    // Limpiar el contenedor antes de renderizar
    container.innerHTML = '';

    let html = `
        <div class="grades-section">
            <div class="grades-header">
                <h2><i class="${programaIcon}"></i> Mis Calificaciones</h2>
                <p>Programa de ${programa.includes('panaderia') || programa.includes('panadería') ? 'Panadería' : programa.includes('belleza') ? 'Belleza' : 'Estudios'}</p>
            </div>

            <div class="grades-grid">
    `;

    // Renderizar tarjetas de módulos con nueva estructura
    modulos.forEach((modulo, index) => {
        const gradeClass = 'average'; // Esto se actualizará dinámicamente
        html += `
            <div class="new-grade-card" style="animation-delay: ${index * 0.1}s">
                <div class="new-grade-card-header">
                    <div class="new-grade-card-icon" style="background: linear-gradient(135deg, ${modulo.color}, ${modulo.color}dd);">
                        <i class="${modulo.icon}"></i>
                    </div>
                    <h3 class="new-grade-card-title">${modulo.nombre}</h3>
                </div>

                <div class="new-grade-card-content">
                    <div class="new-grade-item">
                        <span class="new-grade-label">Actividades</span>
                        <span class="new-grade-value" id="${modulo.id}Actividades">0.0</span>
                    </div>
                    <div class="new-grade-item">
                        <span class="new-grade-label">Evaluaciones</span>
                        <span class="new-grade-value" id="${modulo.id}Evaluaciones">0.0</span>
                    </div>
                    <div class="new-grade-item">
                        <span class="new-grade-label">Práctica</span>
                        <span class="new-grade-value" id="${modulo.id}Practica">0.0</span>
                    </div>
                </div>

                <div class="new-grade-card-footer">
                    <div class="new-final-grade" id="${modulo.id}ScoreMain">0.0</div>
                    <div class="new-grade-percentage" id="${modulo.id}ProgressPercent">0%</div>
                    <div class="new-progress-bar">
                        <div class="new-progress-fill ${gradeClass}" id="${modulo.id}ProgressFill"></div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>

        <!-- Modal de Detalles de Módulo -->
        <div id="moduleDetailModal" class="modal">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2 id="moduleDetailTitle">Detalles del Módulo</h2>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body" id="moduleDetailContent">
                    <!-- Contenido dinámico del módulo -->
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Agregar animación de entrada
    setTimeout(() => {
        document.querySelectorAll('.new-grade-card').forEach(card => {
            card.classList.add('animate-in');
        });
    }, 100);
}

async function loadCalificaciones() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    // Renderizar módulos según el programa
    renderModulosCalificaciones();
    
    try {
        // Cargar calificaciones específicas por módulo
        const modulosQuery = query(collection(db, 'calificaciones_modulos'), where('estudianteId', '==', currentUser.email));
        const modulosSnapshot = await getDocs(modulosQuery);

        // Crear mapa de calificaciones por módulo
        const modulosCalif = {};
        modulosSnapshot.forEach(doc => {
            const data = doc.data();
            modulosCalif[data.modulo] = data;
        });

        // Guardar las calificaciones de evaluaciones existentes para usarlas después
        window.calificacionesEvaluacionesGuardadas = {};

        // Definir módulos según programa para actualizar datos
        const programa = (currentUser.programa || '').toLowerCase();
        let modulos = [];

        if (programa.includes('panaderia') || programa.includes('panadería')) {
            modulos = [
                { id: 'modulo1', nombre: 'Panadería' },
                { id: 'modulo2', nombre: 'Galletaría' },
                { id: 'modulo3', nombre: 'Pastelería' },
                { id: 'modulo4', nombre: 'Repostería' }
            ];
        } else if (programa.includes('belleza')) {
            modulos = [
                { id: 'modulo1', nombre: 'Diseño de Mirada' },
                { id: 'modulo2', nombre: 'Maquillaje' },
                { id: 'modulo3', nombre: 'Estilismo' },
                { id: 'modulo4', nombre: 'Nails Designer' }
            ];
        } else {
            modulos = [
                { id: 'modulo1', nombre: 'Módulo 1' },
                { id: 'modulo2', nombre: 'Módulo 2' },
                { id: 'modulo3', nombre: 'Módulo 3' },
                { id: 'modulo4', nombre: 'Módulo 4' }
            ];
        }

        // Actualizar UI de módulos con calificaciones específicas
        modulos.forEach(modulo => {
            const moduloData = modulosCalif[modulo.id] || {};

            const actividades = moduloData.actividades || 0;
            const evaluacionesGuardadas = moduloData.evaluaciones || 0;
            const practica = moduloData.practica || 0;

            // Guardar las evaluaciones existentes
            window.calificacionesEvaluacionesGuardadas[modulo.id] = evaluacionesGuardadas;

            // Actualizar elementos de la UI
            const actividadesEl = document.getElementById(`${modulo.id}Actividades`);
            const evaluacionesEl = document.getElementById(`${modulo.id}Evaluaciones`);
            const practicaEl = document.getElementById(`${modulo.id}Practica`);

            if (actividadesEl) actividadesEl.textContent = actividades.toFixed(1);
            if (evaluacionesEl) evaluacionesEl.textContent = evaluacionesGuardadas.toFixed(1);
            if (practicaEl) practicaEl.textContent = practica.toFixed(1);
        });

    } catch (error) {
        console.error('Error cargando calificaciones:', error);
    }

    // Cargar evaluaciones del estudiante para calcular notas adicionales
    try {
        await cargarEvaluacionesParaCalificaciones(currentUser.email);
    } catch (error) {
        console.error('Error cargando evaluaciones para calificaciones:', error);
    }

    // Cargar y mostrar actividades individuales calificadas
    try {
        await loadIndividualActivities(currentUser.email);
    } catch (error) {
        console.error('Error cargando actividades individuales:', error);
    }
}

// Función para cargar evaluaciones y calcular notas para la sección de calificaciones
async function cargarEvaluacionesParaCalificaciones(estudianteEmail) {
    try {
        // Si allEvaluaciones ya tiene datos con calificaciones, usarlos directamente
        if (allEvaluaciones && allEvaluaciones.length > 0 && allEvaluaciones.some(e => e.calificacionRecalculada !== undefined)) {
            actualizarNotasEvaluacionesPorModulo();
            return;
        }

        // Cargar evaluaciones
        const evaluacionesSnapshot = await getDocs(collection(db, 'evaluaciones'));
        const evaluaciones = [];
        evaluacionesSnapshot.forEach(doc => {
            evaluaciones.push({ id: doc.id, ...doc.data() });
        });

        // Cargar respuestas del estudiante
        const respuestasQuery = query(collection(db, 'respuestasEvaluaciones'), where('estudianteId', '==', estudianteEmail));
        const respuestasSnapshot = await getDocs(respuestasQuery);
        
        const respuestasMap = {};
        respuestasSnapshot.forEach(doc => {
            const data = doc.data();
            const clave = `${data.estudianteId}_${data.evaluacionId}`;
            if (!respuestasMap[clave]) respuestasMap[clave] = [];
            respuestasMap[clave].push(data);
        });

        // Calcular calificaciones
        evaluaciones.forEach(evaluacion => {
            const clave = `${estudianteEmail}_${evaluacion.id}`;
            const misRespuestas = respuestasMap[clave] || [];
            
            if (misRespuestas.length > 0) {
                const ultimaRespuesta = misRespuestas[misRespuestas.length - 1];
                if (ultimaRespuesta.respuestas && evaluacion.preguntas) {
                    evaluacion.calificacionRecalculada = recalcularCalificacion(ultimaRespuesta.respuestas, evaluacion.preguntas);
                }
            }
        });

        // Guardar en allEvaluaciones para que actualizarNotasEvaluacionesPorModulo las use
        allEvaluaciones = evaluaciones;
        
        // Actualizar las notas en la UI
        actualizarNotasEvaluacionesPorModulo();

    } catch (error) {
        console.error('Error cargando evaluaciones para calificaciones:', error);
    }
}

async function loadIndividualActivities(email) {
    try {
        // Obtener todas las entregas del estudiante y filtrar en cliente para evitar problemas con índices
        const entregasQuery = query(collection(db, 'entregas'), where('estudianteId', '==', email));
        const entregasSnapshot = await getDocs(entregasQuery);

        // Filtrar entregas calificadas en el cliente
        const entregasCalificadas = [];
        entregasSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.calificada) {
                entregasCalificadas.push(data);
            }
        });

        const container = document.getElementById('actividadesIndividuales');
        if (!container) return;

        if (entregasCalificadas.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No tienes actividades calificadas aún.</p>';
            return;
        }

        let html = `
            <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 2rem;">
                <div style="background: #f8f9fa; padding: 1rem; border-bottom: 1px solid #e2e8f0;">
                    <h4 style="margin: 0; color: #1e3a8a;"><i class="fas fa-tasks"></i> Mis Calificaciones de Actividades</h4>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f8f9fa;">
                            <tr>
                                <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #1e3a8a;">Actividad</th>
                                <th style="padding: 1rem; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #1e3a8a;">Nota (0-100)</th>
                                <th style="padding: 1rem; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #1e3a8a;">Nota Escala (0-5)</th>
                                <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #1e3a8a;">Comentario</th>
                                <th style="padding: 1rem; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #1e3a8a;">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        entregasCalificadas.forEach(entrega => {
            const notaEscala = (entrega.nota / 100) * 5;
            html += `
                            <tr>
                                <td style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">${entrega.titulo || entrega.actividadTitulo || 'Actividad'}</td>
                                <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e2e8f0;">${entrega.nota}/100</td>
                                <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e2e8f0;">${notaEscala.toFixed(1)}/5</td>
                                <td style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">${entrega.comentario || '-'}</td>
                                <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e2e8f0;">${entrega.fechaCalificacion ? new Date(entrega.fechaCalificacion).toLocaleDateString() : '-'}</td>
                            </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error cargando actividades individuales:', error);
        const container = document.getElementById('actividadesIndividuales');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 2rem;">Error al cargar actividades</p>';
        }
    }
}

async function loadActividadesGrades(email) {
    try {
        const entregasQuery = query(collection(db, 'entregas'), where('estudianteId', '==', email));
        const entregasSnapshot = await getDocs(entregasQuery);
        
        const actividadesGrades = [];
        let totalScore = 0;
        let gradedCount = 0;
        
        entregasSnapshot.forEach(doc => {
            const entrega = doc.data();
            if (entrega.tipo === 'actividad' && entrega.calificada) {
                actividadesGrades.push({
                    titulo: entrega.titulo || 'Actividad',
                    nota: entrega.nota || 0,
                    comentario: entrega.comentario || '',
                    fecha: entrega.fechaCalificacion || entrega.fecha
                });
                totalScore += parseFloat(entrega.nota || 0);
                gradedCount++;
            }
        });
        
        // Mostrar calificaciones de actividades
        const container = document.getElementById('actividadesGradesList');
        if (container) {
            if (actividadesGrades.length === 0) {
                container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No hay actividades calificadas aún</p>';
            } else {
                container.innerHTML = actividadesGrades.map(grade => `
                    <div class="grade-item">
                        <span class="grade-label">${grade.titulo}</span>
                        <span class="grade-value">${grade.nota}/10</span>
                    </div>
                    ${grade.comentario ? `
                    <div class="grade-comment">
                        <h4>Comentarios</h4>
                        <p>${grade.comentario}</p>
                    </div>
                    ` : ''}
                `).join('');
            }
        }
        
        // Calcular promedio de actividades
        const avgScore = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : '0.0';
        const totalElement = document.getElementById('actividadesTotalScore');
        if (totalElement) totalElement.textContent = avgScore;
        
        return { totalScore: parseFloat(avgScore), count: gradedCount };
        
    } catch (error) {
        console.error('Error cargando calificaciones de actividades:', error);
        return { totalScore: 0, count: 0 };
    }
}

async function loadEvaluacionesGrades(email) {
    try {
        const resultadosQuery = query(collection(db, 'resultados_evaluaciones'), where('estudianteId', '==', email));
        const resultadosSnapshot = await getDocs(resultadosQuery);
        
        const evaluacionesGrades = [];
        let totalScore = 0;
        let gradedCount = 0;
        
        resultadosSnapshot.forEach(doc => {
            const resultado = doc.data();
            if (resultado.calificada) {
                evaluacionesGrades.push({
                    titulo: resultado.titulo || 'Evaluación',
                    nota: resultado.nota || 0,
                    comentario: resultado.comentario || '',
                    fecha: resultado.fechaCalificacion || resultado.fecha
                });
                totalScore += parseFloat(resultado.nota || 0);
                gradedCount++;
            }
        });
        
        // Mostrar calificaciones de evaluaciones
        const container = document.getElementById('evaluacionesGradesList');
        if (container) {
            if (evaluacionesGrades.length === 0) {
                container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No hay evaluaciones calificadas aún</p>';
            } else {
                container.innerHTML = evaluacionesGrades.map(grade => `
                    <div class="grade-item">
                        <span class="grade-label">${grade.titulo}</span>
                        <span class="grade-value">${grade.nota}/10</span>
                    </div>
                    ${grade.comentario ? `
                    <div class="grade-comment">
                        <h4>Comentarios</h4>
                        <p>${grade.comentario}</p>
                    </div>
                    ` : ''}
                `).join('');
            }
        }
        
        // Calcular promedio de evaluaciones
        const avgScore = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : '0.0';
        const totalElement = document.getElementById('evaluacionesTotalScore');
        if (totalElement) totalElement.textContent = avgScore;
        
        return { totalScore: parseFloat(avgScore), count: gradedCount };
        
    } catch (error) {
        console.error('Error cargando calificaciones de evaluaciones:', error);
        return { totalScore: 0, count: 0 };
    }
}

async function loadPracticaGrade(email) {
    try {
        const practicaQuery = query(collection(db, 'calificaciones_practicas'), where('estudianteId', '==', email));
        const practicaSnapshot = await getDocs(practicaQuery);
        
        if (!practicaSnapshot.empty) {
            const practica = practicaSnapshot.docs[0].data();
            
            const scoreElement = document.getElementById('practicaScore');
            const statusElement = document.getElementById('practicaStatus');
            const commentElement = document.getElementById('practicaComment');
            const commentTextElement = document.getElementById('practicaCommentText');
            
            if (practica.calificada) {
                if (scoreElement) scoreElement.textContent = (practica.nota || 0).toFixed(1);
                if (statusElement) {
                    statusElement.textContent = 'Calificada';
                    statusElement.className = 'grade-status graded';
                }
                if (practica.comentario && commentTextElement) {
                    commentTextElement.textContent = practica.comentario;
                    if (commentElement) commentElement.style.display = 'block';
                }
                return { score: parseFloat(practica.nota || 0), calificada: true };
            } else {
                if (scoreElement) scoreElement.textContent = '0.0';
                if (statusElement) {
                    statusElement.textContent = 'Pendiente';
                    statusElement.className = 'grade-status pending';
                }
                return { score: 0, calificada: false };
            }
        } else {
            // No hay evaluación práctica registrada
            return { score: 0, calificada: false };
        }
        
    } catch (error) {
        console.error('Error cargando calificación práctica:', error);
        return { score: 0, calificada: false };
    }
}

function calculateTotalGrade() {
    // Obtener valores actuales
    const actividadesScore = parseFloat(document.getElementById('actividadesTotalScore').textContent || '0');
    const evaluacionesScore = parseFloat(document.getElementById('evaluacionesTotalScore').textContent || '0');
    const practicaScore = parseFloat(document.getElementById('practicaScore').textContent || '0');
    
    // Calcular ponderaciones según el sistema requerido
    // Actividades: 0.5 puntos cada una (máximo por actividad)
    // Evaluaciones: 2 puntos en total
    // Evaluación práctica: 8 puntos
    
    // Para simplificar, asumimos que hay actividades y evaluaciones que contribuyen
    // En un sistema real, esto debería basarse en el número real de actividades/evaluaciones
    
    // Por ahora, calculamos un promedio simple y aplicamos las ponderaciones
    const actividadesPonderado = actividadesScore * 0.5; // 0.5 pts por actividad (promedio)
    const evaluacionesPonderado = evaluacionesScore * 2.0; // 2 pts en total
    const practicaPonderado = practicaScore; // Ya está en escala de 8 puntos
    
    const totalPonderado = actividadesPonderado + evaluacionesPonderado + practicaPonderado;
    const totalScore = totalPonderado; // El total ya está en la escala correcta
    
    // Actualizar elementos
    document.getElementById('actividadesPonderado').textContent = actividadesPonderado.toFixed(1);
    document.getElementById('evaluacionesPonderado').textContent = evaluacionesPonderado.toFixed(1);
    document.getElementById('practicaPonderado').textContent = practicaPonderado.toFixed(1);
    document.getElementById('totalPonderado').textContent = totalPonderado.toFixed(1);
    document.getElementById('totalScore').textContent = totalScore.toFixed(1);
}

// =================== FUNCIONES RECURSOS PREMIUM ===================
let recursosData = { fotos: [], recursos: [], contactos: [] };
let filteredRecursos = [];
let currentRecursosCategory = 'all';

async function loadRecursos() {
    try {
        // Cargar datos de las colecciones
        const [fotosSnap, recursosSnap, contactosSnap] = await Promise.all([
            getDocs(collection(db, 'fotos')),
            getDocs(collection(db, 'recursos')),
            getDocs(collection(db, 'contactos'))
        ]);

        recursosData.fotos = fotosSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'foto' }));
        recursosData.recursos = recursosSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'recurso' }));
        recursosData.contactos = contactosSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'contacto' }));

        // Filtrar por programa
        recursosData.fotos = filterByUserAccess(recursosData.fotos);
        recursosData.recursos = filterByUserAccess(recursosData.recursos);
        recursosData.contactos = filterByUserAccess(recursosData.contactos);

        // Inicializar datos filtrados
        filteredRecursos = [...recursosData.fotos, ...recursosData.recursos, ...recursosData.contactos];

        // Actualizar contador en dashboard
        document.getElementById('totalRecursos').textContent = filteredRecursos.length;

        // Renderizar
        renderRecursos();

    } catch (error) {
        console.error('Error cargando recursos:', error);
        document.getElementById('recursosList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle empty-icon"></i>
                <h3>Error al cargar recursos</h3>
                <p>Por favor, intenta recargar la página.</p>
            </div>
        `;
    }
}

function switchRecursoTab(tabName) {
    // Actualizar pestañas activas
    document.querySelectorAll('.recurso-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Renderizar contenido
    renderRecursos(tabName);
}

function renderRecursos() {
    const container = document.getElementById('recursosList');
    if (!container) return;

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-times"></i><h3>Acceso requerido</h3><p>Inicia sesión para ver los recursos disponibles.</p></div>';
        return;
    }

    const ahora = new Date();
    container.className = `clases-container grid-view`;

    let items = [];
    if (currentRecursosCategory === 'all') {
        items = filteredRecursos;
    } else if (currentRecursosCategory === 'recientes') {
        items = filteredRecursos.filter(item => item.fecha && (new Date() - new Date(item.fecha)) < (7 * 24 * 60 * 60 * 1000));
    } else if (currentRecursosCategory === 'pdf') {
        items = filteredRecursos.filter(item => item.tipo === 'recurso');
    } else if (currentRecursosCategory === 'video') {
        items = filteredRecursos.filter(item => item.tipo === 'foto');
    } else if (currentRecursosCategory === 'documento') {
        items = filteredRecursos.filter(item => item.tipo === 'contacto');
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star empty-icon"></i>
                <h3>No hay recursos disponibles</h3>
                <p>Los recursos se publicarán próximamente.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const fecha = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : 'Sin fecha';
        const tipoIcon = item.tipo === 'foto' ? '📸' : item.tipo === 'recurso' ? '📄' : '👤';
        const isNew = item.fecha && (new Date() - new Date(item.fecha)) < (7 * 24 * 60 * 60 * 1000); // 7 días

        let actions = '';
        if (item.tipo === 'foto') {
            actions = `<button class="btn-icon btn-view" onclick="openImageModal('${item.url || item.imagen}', '${item.titulo || 'Foto'}')" title="Ver imagen"><i class="fas fa-eye"></i></button>`;
        } else if (item.tipo === 'recurso') {
            actions = `<a href="${item.url}" target="_blank" class="btn-icon btn-download" title="Descargar"><i class="fas fa-download"></i></a>`;
        } else if (item.tipo === 'contacto') {
            actions = `<button class="btn-icon btn-contact" onclick="openContactModal('${item.nombre}', '${item.email}', '${item.telefono}', '${item.rol}')" title="Contactar"><i class="fas fa-envelope"></i></button>`;
        }
hola

        return `
        <div class="clase-card grid-view ${isNew ? 'new' : ''}" data-id="${item.id}">
            <div class="clase-header">
                <div class="clase-title">
                    ${tipoIcon} ${item.titulo || item.nombre || 'Sin título'}
                </div>
                <div class="clase-meta">
                    <div class="meta-item"><i class="fas fa-calendar"></i> ${fecha}</div>
                    <div class="meta-item"><i class="fas fa-tag"></i> ${item.programa || 'General'}</div>
                </div>
            </div>
            <div class="clase-content">
                <div class="clase-description">
                    ${item.descripcion || item.rol || 'Sin descripción'}
                </div>
                <div class="clase-actions">
                    ${actions}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

window.renderRecursos = renderRecursos;

function renderGaleria(container) {
    if (filteredRecursosData.fotos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images empty-icon"></i>
                <h3>No hay trabajos disponibles</h3>
                <p>Los trabajos de estudiantes se publicarán próximamente.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="galeria-grid">
            ${filteredRecursosData.fotos.map(foto => `
                <div class="galeria-item">
                    <img src="${foto.url || foto.imagen}" alt="${foto.titulo || 'Trabajo estudiante'}" 
                         class="galeria-image" onclick="openImageModal('${foto.url || foto.imagen}', '${foto.titulo || 'Trabajo estudiante'}')">
                    <div class="galeria-info">
                        <h3 class="galeria-title">${foto.titulo || 'Trabajo sin título'}</h3>
                        <p class="galeria-description">${foto.descripcion || 'Trabajo realizado por un estudiante del programa.'}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderRecursosList(container) {
    if (filteredRecursosData.recursos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tools empty-icon"></i>
                <h3>No hay recursos disponibles</h3>
                <p>Los recursos útiles se publicarán próximamente.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="recursos-list">
            ${filteredRecursosData.recursos.map(recurso => `
                <div class="recurso-card">
                    <div class="recurso-header">
                        <div class="recurso-icon">
                            <i class="fas fa-${recurso.icono || 'link'}"></i>
                        </div>
                        <h3 class="recurso-title">${recurso.titulo || 'Recurso sin título'}</h3>
                    </div>
                    <p class="recurso-description">${recurso.descripcion || 'Descripción no disponible.'}</p>
                    <a href="${recurso.url}" target="_blank" class="recurso-link">
                        <i class="fas fa-external-link-alt"></i>
                        Acceder al recurso
                    </a>
                </div>
            `).join('')}
        </div>
    `;
}

function renderContactos(container) {
    if (filteredRecursosData.contactos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-address-book empty-icon"></i>
                <h3>No hay contactos disponibles</h3>
                <p>Los contactos profesionales se publicarán próximamente.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="contactos-grid">
            ${filteredRecursosData.contactos.map(contacto => `
                <div class="contacto-card">
                    <div class="contacto-avatar">
                        ${contacto.nombre ? contacto.nombre.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <h3 class="contacto-name">${contacto.nombre || 'Contacto sin nombre'}</h3>
                    <p class="contacto-role">${contacto.rol || 'Profesional'}</p>
                    <div class="contacto-info">
                        ${contacto.email ? `<div class="contacto-item"><i class="fas fa-envelope"></i> ${contacto.email}</div>` : ''}
                        ${contacto.telefono ? `<div class="contacto-item"><i class="fas fa-phone"></i> ${contacto.telefono}</div>` : ''}
                        ${contacto.especialidad ? `<div class="contacto-item"><i class="fas fa-star"></i> ${contacto.especialidad}</div>` : ''}
                    </div>
                    <div class="contacto-actions">
                        ${contacto.email ? `<a href="mailto:${contacto.email}" class="contacto-btn primary"><i class="fas fa-envelope"></i> Email</a>` : ''}
                        ${contacto.telefono ? `<a href="tel:${contacto.telefono}" class="contacto-btn secondary"><i class="fas fa-phone"></i> Llamar</a>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPrograma(container) {
    container.innerHTML = `
        <div class="programa-content">
            <div class="programa-header">
                <h2 class="programa-title">Sobre el Programa Charlotte</h2>
                <p class="programa-description">
                    El Programa Charlotte es una formación integral en panadería y pastelería profesional, 
                    diseñada para transformar tu pasión por la repostería en una carrera exitosa. 
                    Nuestros estudiantes aprenden técnicas tradicionales y modernas, desarrollando 
                    habilidades culinarias excepcionales y conocimientos empresariales.
                </p>
            </div>

            <div class="programa-features">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <h3 class="feature-title">Formación Profesional</h3>
                    <p class="feature-description">
                        Aprende de los mejores chefs profesionales con años de experiencia 
                        en la industria de la panadería y pastelería.
                    </p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-tools"></i>
                    </div>
                    <h3 class="feature-title">Técnicas Avanzadas</h3>
                    <p class="feature-description">
                        Domina técnicas tradicionales y modernas, desde panes artesanales 
                        hasta pasteles elaborados y decoración profesional.
                    </p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3 class="feature-title">Comunidad Profesional</h3>
                    <p class="feature-description">
                        Únete a una red de profesionales apasionados por la repostería, 
                        donde podrás compartir conocimientos y experiencias.
                    </p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-briefcase"></i>
                    </div>
                    <h3 class="feature-title">Oportunidades Laborales</h3>
                    <p class="feature-description">
                        Accede a oportunidades laborales en pastelerías, hoteles, 
                        restaurantes y emprendimientos propios.
                    </p>
                </div>
            </div>
        </div>
    `;
}

function filterRecursosByCategory(category) {
    currentRecursosCategory = category;
    document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.filter-tab[onclick*="filterRecursosByCategory('${category}')"]`).classList.add('active');
    renderRecursos();
}

window.filterRecursosByCategory = filterRecursosByCategory;

function filterRecursos() {
    const searchTerm = document.getElementById('recursosSearch').value.toLowerCase();

    if (!searchTerm) {
        filteredRecursos = [...recursosData.fotos, ...recursosData.recursos, ...recursosData.contactos];
    } else {
        filteredRecursos = [...recursosData.fotos, ...recursosData.recursos, ...recursosData.contactos].filter(item =>
            (item.titulo || item.nombre || '').toLowerCase().includes(searchTerm) ||
            (item.descripcion || item.rol || '').toLowerCase().includes(searchTerm)
        );
    }

    renderRecursos();
}

window.filterRecursos = filterRecursos;

function openContactModal(nombre, email, telefono, rol) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    document.getElementById('modalTitle').textContent = `Contactar a ${nombre}`;

    modalBody.innerHTML = `
        <div class="contact-info">
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Rol:</strong> ${rol}</p>
            ${email ? `<p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>` : ''}
            ${telefono ? `<p><strong>Teléfono:</strong> <a href="tel:${telefono}">${telefono}</a></p>` : ''}
        </div>
    `;

    modal.style.display = 'block';
}

window.openContactModal = openContactModal;

function openImageModal(imageUrl, title) {
    // Crear modal para imagen ampliada
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="max-width: 90%; max-height: 90%; position: relative;">
            <img src="${imageUrl}" alt="${title}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="position: absolute; top: -40px; right: 0; background: none; border: none; color: white; font-size: 2rem; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

        // =================== FUNCIONES PARA GAMIFICACIÓN ===================
        
        // Función para calcular nivel basado en puntos
        function calculateLevel(points) {
            // Cada nivel requiere más XP: nivel 1 = 100 XP, nivel 2 = 200 XP, etc.
            let level = 1;
            let totalXPNeeded = 0;
            let xpForNextLevel = 100;
            
            while (points >= totalXPNeeded + xpForNextLevel) {
                totalXPNeeded += xpForNextLevel;
                level++;
                xpForNextLevel = level * 100; // Incremento progresivo
            }
            
            const currentXP = points - totalXPNeeded;
            const progress = Math.round((currentXP / xpForNextLevel) * 100);
            
            return { level, currentXP, xpForNextLevel, progress };
        }
        
        async function loadGamificacionStats() {
            try {
                
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
                if (!currentUser || !currentUser.id) {
                    return;
                }

                // Verificar que Firebase esté disponible
                if (!db) {
                    throw new Error('Firebase db not initialized');
                }

                // Cargar datos del usuario con timeout
                const userDocPromise = getDoc(doc(db, 'users', currentUser.id));
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout al cargar datos del usuario')), 10000)
                );
                
                const userDoc = await Promise.race([userDocPromise, timeoutPromise]);
                
                // Verificar que el documento existe
                if (!userDoc.exists()) {
                    console.error('User document not found. Checking if user exists in users collection...');
                    
                    // Intentar buscar por email como fallback
                    const q = query(collection(db, 'users'), where('email', '==', currentUser.email));
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty) {
                        throw new Error('Usuario encontrado por email pero no por ID. ID guardado: ' + currentUser.id);
                    } else {
                        console.error('User not found in users collection at all');
                        throw new Error('Usuario no encontrado en la colección users. Email: ' + currentUser.email);
                    }
                }
                
                const userData = userDoc.data() || {};
                
                const misPuntos = userData.puntos || 0;
                
                // Actualizar nombre y programa del jugador
                document.getElementById('playerName').textContent = userData.name || currentUser.email;
                document.getElementById('playerProgram').textContent = userData.programa || 'Sin programa';
                document.getElementById('playerHorario').textContent = userData.horario || 'Sin horario';
                
                // Calcular nivel y experiencia
                const { level, currentXP, xpForNextLevel, progress } = calculateLevel(misPuntos);
                document.getElementById('playerLevel').textContent = level;
                document.getElementById('levelProgress').textContent = `${currentXP}/${xpForNextLevel} XP`;
                document.getElementById('progressBarFill').style.width = `${progress}%`;
                document.getElementById('progressBarText').textContent = `${progress}%`;
                
                // Actualizar puntos
                document.getElementById('misPuntos').textContent = misPuntos.toLocaleString();

                // Contar cuestionarios completados
                const resultadosQuery = query(collection(db, 'respuestasCuestionarios'), where('estudianteId', '==', currentUser.email));
                const resultadosSnapshot = await getDocs(resultadosQuery);
                
                document.getElementById('cuestionariosCompletados').textContent = resultadosSnapshot.size;

                // Calcular ranking
                const allUsersSnapshot = await getDocs(collection(db, 'users'));
                const usersWithPoints = allUsersSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(u => (u.puntos || 0) > 0)
                    .sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
                
                const miRanking = usersWithPoints.findIndex(u => u.id === currentUser.id) + 1;
                document.getElementById('miRanking').textContent = miRanking > 0 ? `#${miRanking}` : '-';

                // Cargar leaderboard personal (top 10)
                loadLeaderboardPersonal();
                
                // Cargar logros
                loadMisLogros();
                
            } catch (error) {
                console.error('Error loading gamification stats:', error);
                console.error('Error details:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                
                // Mostrar mensaje de error al usuario
                const gamificationSection = document.querySelector('.content-card');
                if (gamificationSection) {
                    gamificationSection.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: #ef4444;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p><strong>Error al cargar estadísticas de gamificación</strong></p>
                            <p style="font-size: 0.9em; margin-top: 0.5rem;">${error.message}</p>
                            <button onclick="loadGamificacionStats()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Reintentar
                            </button>
                        </div>
                    `;
                }
            }
        }

        async function loadLeaderboardPersonal() {
            try {
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
                // Fetch all users and sort client-side to avoid index requirement
                const allUsersSnapshot = await getDocs(collection(db, 'users'));
                const allUsers = allUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Sort by puntos desc and take top 10
                const topUsers = allUsers
                    .filter(user => (user.puntos || 0) > 0)
                    .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
                    .slice(0, 10);
                
                const container = document.getElementById('leaderboardPersonal');
                
                if (topUsers.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 3rem; color: #94a3b8;">
                            <i class="fas fa-trophy" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                            <p style="font-size: 1.1rem; margin: 0;">No hay clasificaciones disponibles aún</p>
                            <small>¡Sé el primero en ganar puntos!</small>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = topUsers.map((userData, index) => {
                    const position = index + 1;
                    const isCurrentUser = userData.id === currentUser.id;
                    const isTop3 = position <= 3;
                    
                    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position;
                    const { level } = calculateLevel(userData.puntos || 0);
                    const initials = (userData.name || userData.email || '?').substring(0, 2).toUpperCase();
                    
                    return `
                        <div style="
                            display: flex; 
                            align-items: center; 
                            gap: 1rem; 
                            padding: 1rem; 
                            margin: 0.5rem 0; 
                            background: ${isCurrentUser ? '#fef3c7' : 'white'};
                            border: 1px solid ${isCurrentUser ? '#f59e0b' : '#e2e8f0'};
                            border-radius: 8px;
                            transition: all 0.3s;
                        " onmouseover="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none';">
                            <div style="font-size: 1.5rem; min-width: 40px; text-align: center; font-weight: bold;">
                                ${medal}
                            </div>
                            <div style="
                                width: 45px; 
                                height: 45px; 
                                background: linear-gradient(135deg, #3b82f6, #1e3a8a); 
                                border-radius: 8px; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                color: white; 
                                font-weight: 700; 
                                font-size: 1.1rem;
                            ">
                                ${initials}
                            </div>
                            <div style="flex: 1;">
                                <strong style="color: #0a1628;">
                                    ${userData.name || userData.email}
                                    ${isCurrentUser ? '<span style="color: #f59e0b;"> (Tú)</span>' : ''}
                                </strong>
                                <div style="color: #64748b; font-size: 0.85rem; margin-top: 0.25rem;">
                                    <i class="fas fa-graduation-cap"></i> ${userData.programa || 'Sin programa'} • 
                                    <i class="fas fa-star"></i> Nivel ${level}
                                </div>
                            </div>
                            <div style="font-size: 1.3rem; font-weight: bold; color: #f59e0b;">
                                ${(userData.puntos || 0).toLocaleString()}
                            </div>
                        </div>
                    `;
                }).join('');
            } catch (error) {
                console.error('Error loading leaderboard:', error);
                document.getElementById('leaderboardPersonal').innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Error al cargar la clasificación</p>
                    </div>
                `;
            }
        }
        
        function filterLeaderboard(filter) {
            // Actualizar botones activos
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // TODO: Implementar filtro por programa
            if (filter === 'program') {
                // Filtrar por programa del usuario actual
            }
            // Por ahora, volver a cargar todos
            loadLeaderboardPersonal();
        }
        
        window.filterLeaderboard = filterLeaderboard;

        async function loadMisLogros() {
            try {
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
                if (!currentUser || !currentUser.id) return;
                
                const container = document.getElementById('misLogros');
                
                // Contar cuestionarios completados
                const resultadosQuery = query(collection(db, 'respuestasCuestionarios'), where('estudianteId', '==', currentUser.email));
                const resultadosSnapshot = await getDocs(resultadosQuery);
                const cuestionariosCompletados = resultadosSnapshot.size;
                
                // Obtener puntos del usuario
                const userDoc = await getDoc(doc(db, 'users', currentUser.id));
                const puntos = userDoc.data()?.puntos || 0;
                const { level } = calculateLevel(puntos);
                
                // Sistema completo de logros
                const allAchievements = [
                    {
                        id: 'first_quiz',
                        titulo: '🎯 Primer Paso',
                        descripcion: 'Completaste tu primer cuestionario',
                        icono: 'fas fa-file-alt',
                        color: '#3b82f6',
                        gradient: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                        unlocked: cuestionariosCompletados >= 1,
                        requirement: 'Completa 1 cuestionario'
                    },
                    {
                        id: 'active_student',
                        titulo: '📚 Estudiante Activo',
                        descripcion: 'Completaste 5 cuestionarios',
                        icono: 'fas fa-graduation-cap',
                        color: '#10b981',
                        gradient: 'linear-gradient(135deg, #10b981, #059669)',
                        unlocked: cuestionariosCompletados >= 5,
                        requirement: 'Completa 5 cuestionarios'
                    },
                    {
                        id: 'expert',
                        titulo: '⭐ Experto',
                        descripcion: 'Completaste 10 cuestionarios',
                        icono: 'fas fa-star',
                        color: '#f59e0b',
                        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        unlocked: cuestionariosCompletados >= 10,
                        requirement: 'Completa 10 cuestionarios'
                    },
                    {
                        id: 'master',
                        titulo: '👑 Maestro',
                        descripcion: 'Completaste 20 cuestionarios',
                        icono: 'fas fa-crown',
                        color: '#8b5cf6',
                        gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        unlocked: cuestionariosCompletados >= 20,
                        requirement: 'Completa 20 cuestionarios'
                    },
                    {
                        id: 'centurion',
                        titulo: '💯 Centurión',
                        descripcion: 'Alcanzaste 100 puntos',
                        icono: 'fas fa-trophy',
                        color: '#dc2626',
                        gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        unlocked: puntos >= 100,
                        requirement: 'Alcanza 100 puntos'
                    },
                    {
                        id: 'half_thousand',
                        titulo: '🔥 Imparable',
                        descripcion: 'Alcanzaste 500 puntos',
                        icono: 'fas fa-fire',
                        color: '#f97316',
                        gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
                        unlocked: puntos >= 500,
                        requirement: 'Alcanza 500 puntos'
                    },
                    {
                        id: 'thousand',
                        titulo: '💎 Leyenda',
                        descripcion: 'Alcanzaste 1000 puntos',
                        icono: 'fas fa-gem',
                        color: '#06b6d4',
                        gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        unlocked: puntos >= 1000,
                        requirement: 'Alcanza 1000 puntos'
                    },
                    {
                        id: 'level_5',
                        titulo: '🚀 Nivel 5',
                        descripcion: 'Alcanzaste el nivel 5',
                        icono: 'fas fa-rocket',
                        color: '#ec4899',
                        gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
                        unlocked: level >= 5,
                        requirement: 'Alcanza el nivel 5'
                    },
                    {
                        id: 'level_10',
                        titulo: '⚡ Nivel 10',
                        descripcion: 'Alcanzaste el nivel 10',
                        icono: 'fas fa-bolt',
                        color: '#eab308',
                        gradient: 'linear-gradient(135deg, #eab308, #ca8a04)',
                        unlocked: level >= 10,
                        requirement: 'Alcanza el nivel 10'
                    },
                    {
                        id: 'early_bird',
                        titulo: '🌅 Madrugador',
                        descripcion: 'Iniciaste sesión antes de las 8 AM',
                        icono: 'fas fa-sun',
                        color: '#fbbf24',
                        gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        unlocked: false, // Lógica especial
                        requirement: 'Inicia sesión antes de las 8 AM'
                    },
                    {
                        id: 'night_owl',
                        titulo: '🦉 Búho Nocturno',
                        descripcion: 'Estudiaste después de las 10 PM',
                        icono: 'fas fa-moon',
                        color: '#6366f1',
                        gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        unlocked: false, // Lógica especial
                        requirement: 'Estudia después de las 10 PM'
                    },
                    {
                        id: 'week_streak',
                        titulo: '📅 Racha Semanal',
                        descripcion: 'Accediste 7 días seguidos',
                        icono: 'fas fa-calendar-check',
                        color: '#14b8a6',
                        gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                        unlocked: false, // Requiere implementación de racha
                        requirement: 'Accede 7 días consecutivos'
                    }
                ];
                
                const unlockedCount = allAchievements.filter(a => a.unlocked).length;
                document.getElementById('logrosDesbloqueados').textContent = unlockedCount;
                document.getElementById('achievementCount').textContent = unlockedCount;
                document.getElementById('achievementTotal').textContent = allAchievements.length;
                
                container.innerHTML = allAchievements.map(logro => `
                    <div class="content-card ${logro.unlocked ? '' : ''}" 
                         style="opacity: ${logro.unlocked ? '1' : '0.5'}; ${logro.unlocked ? '' : 'filter: grayscale(80%);'} border-top-color: ${logro.color};">
                        <div style="text-align: center; font-size: 3rem; margin-bottom: 1rem; color: ${logro.color};">
                            ${logro.titulo.split(' ')[0]}
                        </div>
                        <h4 style="text-align: center; margin-bottom: 0.5rem;">${logro.titulo.substring(2)}</h4>
                        <p style="text-align: center; margin: 0 0 1rem 0;">${logro.descripcion}</p>
                        <div style="text-align: center; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.85rem; color: ${logro.unlocked ? '#10b981' : '#94a3b8'};">
                            ${logro.unlocked ? 
                                '<i class="fas fa-check-circle"></i> Desbloqueado' : 
                                `<i class="fas fa-lock"></i> ${logro.requirement}`
                            }
                        </div>
                    </div>
                `).join('');
                
            } catch (error) {
                console.error('Error loading achievements:', error);
                document.getElementById('misLogros').innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Error al cargar logros</p>
                    </div>
                `;
            }
        }

        // Inicializar nuevas funciones
        // Attach event listeners for quick-links immediately since script is at end
        const quickLinks = document.querySelectorAll('.quick-link[data-action]');
        if (quickLinks.length === 0) {
            console.warn('No quick-links found. Make sure the HTML has elements with class quick-link and data-action.');
        } else {
            quickLinks.forEach(link => {
                link.addEventListener('click', function() {
                    const action = this.getAttribute('data-action');
                    switch(action) {
                        case 'print':
                            printClaseFromViewer();
                            break;
                        case 'share':
                            shareClaseFromViewer();
                            break;
                        case 'bookmark':
                            toggleBookmarkFromViewer();
                            break;
                        case 'download':
                            downloadClaseFromViewer();
                            break;
                        default:
                            console.warn('Unknown action:', action);
                    }
                });
            });
        }

        loadDashboardStats();
        // loadEntregas(); // TODO: Implementar carga de entregas

        // Exponer funciones globales
        window.loadGamificacionStats = loadGamificacionStats;
        window.loadLeaderboardPersonal = loadLeaderboardPersonal;
        
        // Función para verificar pagos antes de acceder a cuestionarios/evaluaciones
        async function verificarPagosYAcceder(id, tipo) {
            console.log('🔍 verificarPagosYAcceder called with:', { id, tipo });
            try {
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
                if (!currentUser) {
                    alert('Usuario no autenticado');
                    return;
                }

                // PRIMERO: Verificar si hay reintento concedido (caso especial) usando cache global
                let reintentosDisponibles = getReintentosFromCache();
                
                // Si la cache está vacía, intentar obtener reintentos directamente
                if (reintentosDisponibles.length === 0) {
                    console.log('📝 Cache vacía, obteniendo reintentos directamente...');
                    reintentosDisponibles = await getReintentosDisponibles(currentUser.email);
                }
                
                const reintentoValido = reintentosDisponibles.find(reintento => {
                    const esParaEsteItem = reintento.evaluacionId === id || reintento.cuestionarioId === id;
                    if (!esParaEsteItem) return false;
                    
                    // Verificar si el reintento tiene fecha de expiración
                    if (reintento.fechaExpiracion) {
                        const ahora = new Date();
                        const fechaExpiracion = new Date(reintento.fechaExpiracion);
                        if (ahora > fechaExpiracion) {
                            console.log('⏰ Reintento expirado:', reintento.fechaExpiracion);
                            return false;
                        }
                    }
                    
                    // Verificar si tiene días de validez desde la creación
                    if (reintento.diasValidez && reintento.fechaCreacion) {
                        const fechaCreacion = new Date(reintento.fechaCreacion);
                        const ahora = new Date();
                        const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));
                        if (diasTranscurridos > reintento.diasValidez) {
                            console.log('⏰ Reintento expirado por días de validez:', reintento.diasValidez, 'días transcurridos:', diasTranscurridos);
                            return false;
                        }
                    }
                    
                    return true;
                });
                
                if (reintentoValido) {
                    console.log('🎯 Reintento válido encontrado! Acceso concedido por caso especial');
                    const url = tipo === 'cuestionario' 
                        ? `responder-cuestionario.html?id=${id}` 
                        : `responder-evaluacion.html?id=${id}`;
                    window.location.href = url;
                    return; // Salir aquí, no verificar restricciones normales
                }

                // SEGUNDO: Verificar si es intento inicial o reintento
                const collectionName = tipo === 'cuestionario' ? 'respuestasCuestionarios' : 'respuestasEvaluaciones';
                const respuestasQuery = query(collection(db, collectionName), 
                    where('estudianteId', '==', currentUser.email),
                    where(tipo === 'cuestionario' ? 'cuestionarioId' : 'evaluacionId', '==', id)
                );
                const respuestasSnapshot = await getDocs(respuestasQuery);
                console.log(`📊 Verificando respuestas previas para ${tipo} ${id}:`, respuestasSnapshot.size, 'respuestas encontradas');
                
                if (respuestasSnapshot.empty) {
                    // Es un intento inicial - permitir acceso sin restricciones
                    console.log('📝 Intento inicial - acceso permitido');
                    const url = tipo === 'cuestionario' 
                        ? `responder-cuestionario.html?id=${id}` 
                        : `responder-evaluacion.html?id=${id}`;
                    window.location.href = url;
                    return;
                } else {
                    // Ya tiene respuestas - verificar pagos para reintento
                    console.log('🔄 Reintento detectado - verificando pagos');
                    const userData = userDoc.docs[0].data();
                    const estadoPagos = userData.estadoPagos || 'pagos_al_dia';

                    if (estadoPagos === 'pagos_pendientes') {
                    // Mostrar modal de advertencia
                    const modalHtml = `
                        <div id="pagosPendientesModal" class="modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000;">
                            <div class="modal-content" style="background: white; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                                <div style="padding: 2rem; text-align: center;">
                                    <div style="color: #ef4444; font-size: 3rem; margin-bottom: 1rem;">
                                        <i class="fas fa-exclamation-triangle"></i>
                                    </div>
                                    <h2 style="color: #1e3a8a; margin-bottom: 1rem;">Acceso Restringido</h2>
                                    <p style="color: #64748b; margin-bottom: 2rem; line-height: 1.6;">
                                        Tienes valores pendientes por cancelar. No puedes acceder a cuestionarios ni evaluaciones hasta que regularices tu situación financiera.
                                    </p>
                                    <p style="color: #374151; font-weight: 600; margin-bottom: 2rem;">
                                        Por favor, contacta a tu docente para resolver esta situación.
                                    </p>
                                    <button onclick="document.getElementById('pagosPendientesModal').remove()"
                                            style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                        Entendido
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                    return;
                }

                // Verificar que la actividad existe en la colección correcta
                let actualTipo = tipo;
                try {
                    const collectionName = tipo === 'evaluacion' ? 'evaluaciones' : 'cuestionarios';
                    const docSnap = await getDoc(doc(db, collectionName, id));
                    if (!docSnap.exists()) {
                        console.error('Documento no encontrado en', collectionName, ':', id);
                        alert('Actividad no encontrada');
                        return;
                    }
                    console.log('Actividad encontrada en', collectionName);
                } catch (error) {
                    console.error('Error verificando existencia de la actividad:', error);
                    alert('Error al verificar la actividad');
                    return;
                }

                // Si los pagos están al día, proceder con el acceso normal
                const url = tipo === 'cuestionario' 
                    ? `responder-cuestionario.html?id=${id}` 
                    : `responder-evaluacion.html?id=${id}`;
                console.log('Tipo recibido:', tipo, 'URL generada:', url);
                window.location.href = url;
                }
            } catch (error) {
                console.error('Error verificando pagos:', error);
                alert('Error al verificar estado de pagos. Inténtalo de nuevo.');
            }
        }

        // Exponer funciones globales
        window.loadMisLogros = loadMisLogros;
        window.printClaseFromViewer = printClaseFromViewer;
        window.shareClaseFromViewer = shareClaseFromViewer;
        window.toggleBookmarkFromViewer = toggleBookmarkFromViewer;
        window.downloadClaseFromViewer = downloadClaseFromViewer;
        window.verificarPagosYAcceder = verificarPagosYAcceder;
        
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
