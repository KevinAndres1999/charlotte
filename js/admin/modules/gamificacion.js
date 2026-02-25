/**
 * Módulo de Gamificación - Charlotte Admin
 * Funciones relacionadas con gamificación
 */

// Importar Firestore
const { getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, collection, query, where, orderBy, setDoc } = window.firebaseFirestore || {};

/**
 * Cargar estadísticas de gamificación
 */
async function loadGamificacionStats() {
    try {
        const container = document.getElementById('gamificacionStats');
        if (!container) return;
        
        // Obtener todos los usuarios
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calcular estadísticas
        const totalUsers = users.length;
        const usersWithPoints = users.filter(u => (u.puntos || 0) > 0);
        const totalPoints = users.reduce((sum, u) => sum + (u.puntos || 0), 0);
        const avgPoints = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0;
        
        // Top usuarios por puntos
        const topUsers = [...usersWithPoints]
            .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
            .slice(0, 10);
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <i class="fas fa-users"></i>
                    <div class="stat-value">${totalUsers}</div>
                    <div class="stat-label">Total Usuarios</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-star"></i>
                    <div class="stat-value">${usersWithPoints.length}</div>
                    <div class="stat-label">Usuarios con Puntos</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-coins"></i>
                    <div class="stat-value">${totalPoints.toLocaleString()}</div>
                    <div class="stat-label">Puntos Totales</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-line"></i>
                    <div class="stat-value">${avgPoints}</div>
                    <div class="stat-label">Promedio por Usuario</div>
                </div>
            </div>
            
            <h3>Top 10 Usuarios</h3>
            <div class="leaderboard">
                ${topUsers.map((user, index) => `
                    <div class="leaderboard-item">
                        <div class="position">${index + 1}</div>
                        <div class="user-info">
                            <strong>${user.name || user.email}</strong>
                            <small>${user.programa || 'Sin programa'}</small>
                        </div>
                        <div class="points">${(user.puntos || 0).toLocaleString()} pts</div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading gamification stats:', error);
    }
}

/**
 * Guardar configuración de puntos
 */
async function guardarConfiguracionPuntos() {
    try {
        const configuracion = {
            puntosPorCuestionario: parseInt(document.getElementById('puntosPorCuestionario')?.value || 10),
            puntosPorActividad: parseInt(document.getElementById('puntosPorActividad')?.value || 5),
            puntosPorVideo: parseInt(document.getElementById('puntosPorVideo')?.value || 3),
            puntosPorClase: parseInt(document.getElementById('puntosPorClase')?.value || 2),
            puntosPorEvaluacion: parseInt(document.getElementById('puntosPorEvaluacion')?.value || 15),
            bonificacionRacha: parseInt(document.getElementById('bonificacionRacha')?.value || 5),
            multiplicadorNivel: parseFloat(document.getElementById('multiplicadorNivel')?.value || 1.5),
            updatedAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'configuracion', 'gamificacion'), configuracion, { merge: true });
        
        alert('Configuración guardada exitosamente');
        
    } catch (error) {
        console.error('Error saving config:', error);
        alert('Error al guardar la configuración');
    }
}

/**
 * Cargar configuración de puntos
 */
async function loadConfiguracionPuntos() {
    try {
        const configDoc = await getDoc(doc(db, 'configuracion', 'gamificacion'));
        
        if (configDoc.exists()) {
            const config = configDoc.data();
            
            if (document.getElementById('puntosPorCuestionario')) 
                document.getElementById('puntosPorCuestionario').value = config.puntosPorCuestionario || 10;
            if (document.getElementById('puntosPorActividad')) 
                document.getElementById('puntosPorActividad').value = config.puntosPorActividad || 5;
            if (document.getElementById('puntosPorVideo')) 
                document.getElementById('puntosPorVideo').value = config.puntosPorVideo || 3;
            if (document.getElementById('puntosPorClase')) 
                document.getElementById('puntosPorClase').value = config.puntosPorClase || 2;
            if (document.getElementById('puntosPorEvaluacion')) 
                document.getElementById('puntosPorEvaluacion').value = config.puntosPorEvaluacion || 15;
            if (document.getElementById('bonificacionRacha')) 
                document.getElementById('bonificacionRacha').value = config.bonificacionRacha || 5;
            if (document.getElementById('multiplicadorNivel')) 
                document.getElementById('multiplicadorNivel').value = config.multiplicadorNivel || 1.5;
        }
        
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

/**
 * Cargar leaderboard
 */
async function loadLeaderboard() {
    try {
        const container = document.getElementById('leaderboard');
        if (!container) return;
        
        // Obtener todos los usuarios con puntos
        const usersSnapshot = await getDocs(query(collection(db, 'users'), where('puntos', '>', 0)));
        const users = usersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
        
        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><h3>No hay datos</h3><p>Aún no hay usuarios con puntos</p></div>';
            return;
        }
        
        container.innerHTML = users.map((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1;
            
            return `
                <div class="leaderboard-item">
                    <div class="position">${medal}</div>
                    <div class="user-avatar">${(user.name || user.email || '?').substring(0, 2).toUpperCase()}</div>
                    <div class="user-info">
                        <strong>${user.name || user.email}</strong>
                        <small>${user.programa || 'Sin programa'}</small>
                    </div>
                    <div class="points">${(user.puntos || 0).toLocaleString()} pts</div>
                    <div class="actions">
                        <button onclick="ajustarPuntos('${user.id}')" class="btn btn-sm"><i class="fas fa-edit"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

/**
 * Ajustar puntos de un usuario
 */
async function ajustarPuntos(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            alert('Usuario no encontrado');
            return;
        }
        
        const user = userDoc.data();
        const nuevosPuntos = prompt(`Puntos actuales: ${user.puntos || 0}\nIngresa los nuevos puntos:`, user.puntos || 0);
        
        if (nuevosPuntos === null) return;
        
        const puntos = parseInt(nuevosPuntos);
        if (isNaN(puntos) || puntos < 0) {
            alert('Por favor ingresa un número válido');
            return;
        }
        
        await updateDoc(doc(db, 'users', userId), {
            puntos: puntos
        });
        
        alert('Puntos actualizados');
        loadLeaderboard();
        
    } catch (error) {
        console.error('Error adjusting points:', error);
        alert('Error al ajustar puntos');
    }
}

/**
 * Otorgar puntos a un usuario
 */
async function otorgarPuntos(estudianteId, cantidad, motivo) {
    try {
        const userDoc = await getDoc(doc(db, 'users', estudianteId));
        
        if (!userDoc.exists()) {
            throw new Error('Usuario no encontrado');
        }
        
        const userData = userDoc.data();
        const puntosActuales = userData.puntos || 0;
        
        await updateDoc(doc(db, 'users', estudianteId), {
            puntos: puntosActuales + cantidad
        });
        
        // Registrar en historial
        await addDoc(collection(db, 'historialPuntos'), {
            estudianteId,
            cantidad,
            motivo,
            puntosAnteriores: puntosActuales,
            puntosNuevos: puntosActuales + cantidad,
            fecha: new Date().toISOString(),
            tipo: cantidad > 0 ? 'otorgar' : 'deducir'
        });
        
        console.log(`Puntos otorgados: ${cantidad} a ${estudianteId}`);
        
    } catch (error) {
        console.error('Error granting points:', error);
        throw error;
    }
}

/**
 * Cargar historial de puntos
 */
async function loadHistorialPuntos() {
    try {
        const container = document.getElementById('historialPuntos');
        if (!container) return;
        
        const snapshot = await getDocs(query(collection(db, 'historialPuntos'), orderBy('fecha', 'desc')));
        const historial = snapshot.docs.map(doc => doc.data());
        
        container.innerHTML = historial.map(h => `
            <div class="historial-item">
                <div class="info">
                    <strong>${h.estudianteId}</strong>
                    <small>${h.motivo}</small>
                </div>
                <div class="cantidad ${h.cantidad > 0 ? 'positive' : 'negative'}">
                    ${h.cantidad > 0 ? '+' : ''}${h.cantidad}
                </div>
                <div class="fecha">
                    ${new Date(h.fecha).toLocaleString('es-ES')}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Exportar módulo
export default {
    name: 'gamificacion',
    
    init: function() {
        console.log('Gamificacion module initialized');
    },
    
    loadStats: loadGamificacionStats,
    loadConfig: loadConfiguracionPuntos,
    saveConfig: guardarConfiguracionPuntos,
    loadLeaderboard: loadLeaderboard,
    adjustPoints: ajustarPuntos,
    grantPoints: otorgarPuntos,
    loadHistory: loadHistorialPuntos
};

// Exponer globalmente
window.loadGamificacionStats = loadGamificacionStats;
window.loadConfiguracionPuntos = loadConfiguracionPuntos;
window.guardarConfiguracionPuntos = guardarConfiguracionPuntos;
window.loadLeaderboard = loadLeaderboard;
window.ajustarPuntos = ajustarPuntos;
window.otorgarPuntos = otorgarPuntos;
window.loadHistorialPuntos = loadHistorialPuntos;

console.log('✅ Módulo de Gamificación admin cargado');
