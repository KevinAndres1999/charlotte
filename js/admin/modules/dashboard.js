/**
 * Módulo de Dashboard - Charlotte Admin
 * 
 * Funciones completas para el panel de control y estadísticas.
 */

// Usar db global de admin.html
const db = window.db;
const { collection, getDocs, query, where } = window;

// Variables del módulo
let statsCache = null;
let statsCacheTime = 0;
const STATS_CACHE_DURATION = 30000; // 30 segundos de caché
let dashboardLoaded = false;

// Función para obtener color del programa
function getProgramColor(program) {
    const colors = {
        'Panadería': 'panaderia',
        'Belleza': 'belleza',
        'Sin programa': 'default'
    };
    return colors[program] || 'default';
}

// Función principal para cargar estadísticas del dashboard
async function loadDashboardStats(forceReload = false) {
    // Evitar cargas duplicadas simultáneas
    if (dashboardLoaded && !forceReload && statsCache && (Date.now() - statsCacheTime < STATS_CACHE_DURATION)) {
        console.log('Using cached dashboard stats');
        applyStatsToUI(statsCache);
        return;
    }
    
    dashboardLoaded = true;
    console.log('Loading dashboard stats');
    
    try {
        // Cargar todas las colecciones en paralelo
        const [
            videosSnapshot, 
            clasesSnapshot, 
            actividadesSnapshot, 
            materialesSnapshot, 
            entregasSnapshot, 
            respuestasSnapshot, 
            respuestasEvaluacionesSnapshot, 
            usuariosSnapshot, 
            cuestionariosSnapshot, 
            evaluacionesSnapshot
        ] = await Promise.all([
            getDocs(collection(db, 'content')),
            getDocs(collection(db, 'classes')),
            getDocs(collection(db, 'activities')),
            getDocs(collection(db, 'materials')),
            getDocs(collection(db, 'entregas')),
            getDocs(collection(db, 'respuestas')),
            getDocs(collection(db, 'respuestasEvaluaciones')),
            getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
            getDocs(collection(db, 'cuestionarios')),
            getDocs(collection(db, 'evaluaciones'))
        ]);
        
        console.log('All stats loaded in parallel');
        
        // Procesar usuarios
        let activeUsers = usuariosSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => user.status === 'active');

        const uniqueUsers = {};
        activeUsers.forEach(user => {
            const email = user.email;
            if (!uniqueUsers[email] || new Date(user.approvedAt || 0) > new Date(uniqueUsers[email].approvedAt || 0)) {
                uniqueUsers[email] = user;
            }
        });

        // Calcular métricas
        const totalUsers = Object.keys(uniqueUsers).length;
        const usersByProgram = {};
        const usersBySede = {};
        const recentUsers = activeUsers.filter(user =>
            user.approvedAt && (Date.now() - new Date(user.approvedAt).getTime()) < (30 * 24 * 60 * 60 * 1000)
        );

        Object.values(uniqueUsers).forEach(user => {
            const programa = user.programa || 'Sin programa';
            usersByProgram[programa] = (usersByProgram[programa] || 0) + 1;

            const sede = user.sede || 'Sin sede';
            usersBySede[sede] = (usersBySede[sede] || 0) + 1;
        });

        const engagementRate = entregasSnapshot.size > 0 ? Math.round((entregasSnapshot.size / totalUsers) * 100) / 100 : 0;

        // Calcular evaluaciones activas
        let evaluacionesActivas = 0;
        const ahora = new Date();
        
        evaluacionesSnapshot.forEach(doc => {
            const evaluacion = doc.data();
            const fechaInicio = evaluacion.fechaInicio ? new Date(evaluacion.fechaInicio) : null;
            const fechaFin = evaluacion.fechaFin ? new Date(evaluacion.fechaFin) : null;

            if (!fechaInicio && !fechaFin) {
                evaluacionesActivas++;
            } else if (fechaFin && ahora <= fechaFin && (!fechaInicio || ahora >= fechaInicio)) {
                evaluacionesActivas++;
            }
        });

        // Calcular promedio de evaluaciones
        const evaluacionesMap = {};
        evaluacionesSnapshot.forEach(doc => {
            evaluacionesMap[doc.id] = doc.data();
        });

        const evaluacionesIds = new Set(Object.keys(evaluacionesMap));
        
        // Mapa de preguntas originales
        const preguntasOriginalesMap = new Map();
        cuestionariosSnapshot.forEach(docSnap => {
            const c = docSnap.data();
            if (c.preguntas && Array.isArray(c.preguntas)) {
                c.preguntas.forEach((pregunta, idx) => {
                    const texto = (pregunta.texto || pregunta.pregunta || '').trim().toLowerCase();
                    if (texto) {
                        preguntasOriginalesMap.set(texto, { correctaIdx: pregunta.correctaIdx || pregunta.correcta, pregunta });
                    }
                });
            }
        });

        // Procesar respuestas
        const respuestasPorEvaluacion = {};
        
        respuestasEvaluacionesSnapshot.forEach(doc => {
            const respuesta = doc.data();
            if (respuesta.evaluacionId && evaluacionesIds.has(respuesta.evaluacionId)) {
                if (!respuestasPorEvaluacion[respuesta.evaluacionId]) {
                    respuestasPorEvaluacion[respuesta.evaluacionId] = {};
                }
                
                const estudianteKey = respuesta.estudianteId || respuesta.email || respuesta.nombre || 'desconocido';
                const fechaRespuesta = respuesta.fechaRespuesta ? new Date(respuesta.fechaRespuesta) : new Date(0);
                
                let calificacionRecalculada = respuesta.calificacion;
                const evaluacion = evaluacionesMap[respuesta.evaluacionId];
                
                if (evaluacion && evaluacion.preguntas && respuesta.respuestas) {
                    let correctas = 0;
                    evaluacion.preguntas.forEach((pregunta, idx) => {
                        const respuestaEstudiante = respuesta.respuestas[idx];
                        let respuestaCorrectaIdx = pregunta.respuesta !== undefined ? pregunta.respuesta : 
                                                   (pregunta.correcta !== undefined ? pregunta.correcta : null);
                        
                        if (respuestaCorrectaIdx !== null && respuestaCorrectaIdx !== undefined && 
                            respuestaEstudiante === respuestaCorrectaIdx) {
                            correctas++;
                        }
                    });
                    calificacionRecalculada = Math.round((correctas / evaluacion.preguntas.length) * 100);
                }
                
                if (!respuestasPorEvaluacion[respuesta.evaluacionId][estudianteKey] || 
                    fechaRespuesta > new Date(respuestasPorEvaluacion[respuesta.evaluacionId][estudianteKey].fechaRespuesta || 0)) {
                    respuestasPorEvaluacion[respuesta.evaluacionId][estudianteKey] = {
                        calificacion: calificacionRecalculada,
                        fechaRespuesta: respuesta.fechaRespuesta
                    };
                }
            }
        });

        // Calcular promedio general
        let todasLasCalificaciones = [];
        Object.values(respuestasPorEvaluacion).forEach(respuestasEstudiantes => {
            const calificaciones = Object.values(respuestasEstudiantes).map(r => r.calificacion).filter(c => c !== undefined);
            todasLasCalificaciones.push(...calificaciones);
        });

        const promedioGeneralEvaluaciones = todasLasCalificaciones.length > 0 
            ? Math.round(todasLasCalificaciones.reduce((a, b) => a + b, 0) / todasLasCalificaciones.length)
            : 0;

        // Guardar en caché
        statsCache = {
            videos: videosSnapshot.size,
            clases: clasesSnapshot.size,
            actividades: actividadesSnapshot.size,
            materiales: materialesSnapshot.size,
            entregas: entregasSnapshot.size,
            usuarios: totalUsers,
            cuestionarios: cuestionariosSnapshot.size,
            evaluaciones: evaluacionesSnapshot.size,
            evaluacionesActivas: evaluacionesActivas,
            promedioGeneralEvaluaciones: promedioGeneralEvaluaciones,
            usuariosRecientes: recentUsers.length,
            engagementRate: engagementRate,
            usersByProgram: usersByProgram,
            usersBySede: usersBySede
        };
        statsCacheTime = Date.now();
        
        applyStatsToUI(statsCache);
    } catch (error) {
        console.error('Error loading stats:', error);
        dashboardLoaded = false;
    }
}

// Aplicar estadísticas a la UI
function applyStatsToUI(stats) {
    // Verificar que los elementos existan antes de actualizar
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    setText('stat-videos', stats.videos);
    setText('stat-clases', stats.clases);
    setText('stat-actividades', stats.actividades);
    setText('stat-materiales', stats.materiales);
    setText('stat-entregas', stats.entregas);
    setText('stat-usuarios', stats.usuarios);
    setText('stat-cuestionarios', stats.cuestionarios);
    setText('stat-evaluaciones', stats.evaluaciones);
    
    // Tarjetas de evaluaciones
    setText('totalEvaluaciones', stats.evaluaciones || 0);
    setText('evaluacionesActivas', stats.evaluacionesActivas || 0);
    setText('promedioCalificacionesEvaluaciones', `${stats.promedioGeneralEvaluaciones || 0}%`);
    
    // Tarjetas de cuestionarios
    setText('totalCuestionarios', stats.cuestionarios || 0);
    setText('totalCuestionariosBadge', stats.cuestionarios || 0);
    setText('totalRespuestasCuest', stats.usuarios || 0);
    setText('promedioCalificacionesCuest', `${stats.promedioGeneralEvaluaciones || 0}%`);
    
    // Métricas avanzadas
    setText('stat-usuarios-recientes', stats.usuariosRecientes || 0);
    setText('stat-engagement-rate', stats.engagementRate || 0);
    setText('stat-completion-rate', `${stats.evaluacionesCompletionRate || 0}%`);
    
    // Mostrar distribución por programa
    renderProgramDistribution(stats.usersByProgram || {});
}

// Renderizar distribución por programa
function renderProgramDistribution(usersByProgram) {
    const container = document.getElementById('program-distribution');
    if (!container) return;
    
    const totalUsers = Object.values(usersByProgram).reduce((sum, count) => sum + count, 0);
    if (totalUsers === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>No hay datos de distribución disponibles</p></div>';
        return;
    }
    
    const programs = Object.entries(usersByProgram)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6);
    
    let html = '<div class="program-distribution-grid">';
    
    programs.forEach(([program, count]) => {
        const percentage = Math.round((count / totalUsers) * 100);
        const colorClass = getProgramColor(program);
        
        html += `
            <div class="program-item">
                <div class="program-info">
                    <span class="program-name">${program}</span>
                    <span class="program-count">${count} estudiantes</span>
                </div>
                <div class="program-bar">
                    <div class="program-bar-fill ${colorClass}" style="width: ${percentage}%"></div>
                </div>
                <span class="program-percentage">${percentage}%</span>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Exportar funciones globalmente
// NOTA: Comentar esto para evitar sobrescribir la función del script inline
// window.loadDashboardStats = loadDashboardStats;
// window.applyStatsToUI = applyStatsToUI;
window.renderProgramDistribution = renderProgramDistribution;
window.getProgramColor = getProgramColor;

// Exportar como módulo ES6 para compatibilidad
export default {
    name: 'dashboard',
    init: function() {
        console.log('Dashboard module initialized');
        this.exposeToGlobal();
    },
    exposeToGlobal: function() {
        if (typeof window.loadDashboardStats !== 'function') {
            window.loadDashboardStats = loadDashboardStats;
        }
        if (typeof window.applyStatsToUI !== 'function') {
            window.applyStatsToUI = applyStatsToUI;
        }
        if (typeof window.renderProgramDistribution !== 'function') {
            window.renderProgramDistribution = renderProgramDistribution;
        }
        console.log('✅ Funciones de Dashboard expuestas al ámbito global');
    }
};

console.log('✅ Módulo de Dashboard cargado completamente');
