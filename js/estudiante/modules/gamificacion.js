/**
 * Módulo de Gamificación - Charlotte Estudiante
 * 
 * Funciones para la gamificación y logros del estudiante.
 */

// Importar Firestore
const { getDocs, getDoc, doc, addDoc, updateDoc, collection, query, where, setDoc } = window.firebaseFirestore || {};

/**
 * Función para calcular nivel basado en puntos
 * @param {number} points - Puntos del usuario
 */
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

/**
 * Cargar estadísticas de gamificación del estudiante
 */
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
        const playerNameEl = document.getElementById('playerName');
        const playerProgramEl = document.getElementById('playerProgram');
        const playerHorarioEl = document.getElementById('playerHorario');
        
        if (playerNameEl) playerNameEl.textContent = userData.name || currentUser.email;
        if (playerProgramEl) playerProgramEl.textContent = userData.programa || 'Sin programa';
        if (playerHorarioEl) playerHorarioEl.textContent = userData.horario || 'Sin horario';
        
        // Calcular nivel y experiencia
        const { level, currentXP, xpForNextLevel, progress } = calculateLevel(misPuntos);
        
        const playerLevelEl = document.getElementById('playerLevel');
        const levelProgressEl = document.getElementById('levelProgress');
        const progressBarFillEl = document.getElementById('progressBarFill');
        const progressBarTextEl = document.getElementById('progressBarText');
        
        if (playerLevelEl) playerLevelEl.textContent = level;
        if (levelProgressEl) levelProgressEl.textContent = `${currentXP}/${xpForNextLevel} XP`;
        if (progressBarFillEl) progressBarFillEl.style.width = `${progress}%`;
        if (progressBarTextEl) progressBarTextEl.textContent = `${progress}%`;
        
        // Actualizar puntos
        const misPuntosEl = document.getElementById('misPuntos');
        if (misPuntosEl) misPuntosEl.textContent = misPuntos.toLocaleString();

        // Contar cuestionarios completados
        const resultadosQuery = query(collection(db, 'respuestasCuestionarios'), where('estudianteId', '==', currentUser.email));
        const resultadosSnapshot = await getDocs(resultadosQuery);
        
        const cuestionariosCompletadosEl = document.getElementById('cuestionariosCompletados');
        if (cuestionariosCompletadosEl) cuestionariosCompletadosEl.textContent = resultadosSnapshot.size;

        // Calcular ranking
        const allUsersSnapshot = await getDocs(collection(db, 'users'));
        const usersWithPoints = allUsersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => (u.puntos || 0) > 0)
            .sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
        
        const miRanking = usersWithPoints.findIndex(u => u.id === currentUser.id) + 1;
        
        const miRankingEl = document.getElementById('miRanking');
        if (miRankingEl) miRankingEl.textContent = miRanking > 0 ? `#${miRanking}` : '-';

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

/**
 * Cargar el leaderboard personal (top 10)
 */
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
        
        if (!container) return;
        
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
                " onmouseover="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='translateX this.style.boxShadow(0)';='none';">
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
        const container = document.getElementById('leaderboardPersonal');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Error al cargar la clasificación</p>
                </div>
            `;
        }
    }
}

/**
 * Filtrar leaderboard por programa
 */
function filterLeaderboard(filter) {
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // TODO: Implementar filtro por programa
    if (filter === 'program') {
        // Filtrar por programa del usuario actual
    }
    // Por ahora, volver a cargar todos
    loadLeaderboardPersonal();
}

/**
 * Cargar los logros del estudiante
 */
async function loadMisLogros() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser || !currentUser.id) return;
        
        const container = document.getElementById('misLogros');
        if (!container) return;
        
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
                unlocked: false,
                requirement: 'Inicia sesión antes de las 8 AM'
            },
            {
                id: 'night_owl',
                titulo: '🦉 Búho Nocturno',
                descripcion: 'Estudiaste después de las 10 PM',
                icono: 'fas fa-moon',
                color: '#6366f1',
                gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                unlocked: false,
                requirement: 'Estudia después de las 10 PM'
            },
            {
                id: 'week_streak',
                titulo: '📅 Racha Semanal',
                descripcion: 'Accediste 7 días seguidos',
                icono: 'fas fa-calendar-check',
                color: '#14b8a6',
                gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                unlocked: false,
                requirement: 'Accede 7 días consecutivos'
            }
        ];
        
        const unlockedCount = allAchievements.filter(a => a.unlocked).length;
        
        const logrosDesbloqueadosEl = document.getElementById('logrosDesbloqueados');
        const achievementCountEl = document.getElementById('achievementCount');
        const achievementTotalEl = document.getElementById('achievementTotal');
        
        if (logrosDesbloqueadosEl) logrosDesbloqueadosEl.textContent = unlockedCount;
        if (achievementCountEl) achievementCountEl.textContent = unlockedCount;
        if (achievementTotalEl) achievementTotalEl.textContent = allAchievements.length;
        
        container.innerHTML = allAchievements.map(achievement => `
            <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}" 
                 style="background: ${achievement.unlocked ? achievement.gradient : '#f1f5f9'}; 
                        color: ${achievement.unlocked ? 'white' : '#94a3b8'};
                        padding: 1.25rem;
                        border-radius: 12px;
                        text-align: center;
                        transition: all 0.3s;
                        cursor: pointer;
                        ${!achievement.unlocked ? 'opacity: 0.7;' : ''}"
                 title="${achievement.unlocked ? achievement.descripcion : achievement.requirement}">
                <i class="${achievement.icono}" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600;">${achievement.titulo}</h4>
                ${achievement.unlocked ? 
                    '<p style="margin: 0.5rem 0 0; font-size: 0.8rem; opacity: 0.9;">' + achievement.descripcion + '</p>' :
                    '<p style="margin: 0.5rem 0 0; font-size: 0.75rem;">🔒 ' + achievement.requirement + '</p>'
                }
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

// Exponer funciones globalmente
window.calculateLevel = calculateLevel;
window.loadGamificacionStats = loadGamificacionStats;
window.loadLeaderboardPersonal = loadLeaderboardPersonal;
window.filterLeaderboard = filterLeaderboard;
window.loadMisLogros = loadMisLogros;

console.log('✅ Módulo de Gamificación estudiante cargado');
