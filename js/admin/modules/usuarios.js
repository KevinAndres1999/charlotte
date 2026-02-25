/**
 * Módulo de Usuarios - Charlotte Admin
 * 
 * Funciones completas para gestión de usuarios.
 */

import { db, collection, getDocs, query, where, doc, setDoc, deleteDoc, addDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Variables globales del módulo
let allPendingUsers = [];
let allApprovedUsers = [];
let modoSeleccionMasiva = false;
let usuariosSeleccionados = new Set();

// Función para cargar usuarios pendientes
async function loadUsuariosPendientes() {
    try {
        console.log('🔄 Iniciando carga de usuarios pendientes...');
        
        const snapshot = await getDocs(query(collection(db, 'pendingStudents')));
        
        allPendingUsers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const totalEl = document.getElementById('total-pendientes');
        if (totalEl) totalEl.textContent = allPendingUsers.length;

        renderPendingUsers();
    } catch (error) {
        console.error('❌ Error loading pending users:', error);
    }
}

// Función para cargar usuarios aprobados
async function loadUsuariosAprobados() {
    try {
        console.log('🔄 Iniciando carga de usuarios aprobados...');

        const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));

        let users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Filtrar duplicados basados en email
        const uniqueUsers = {};
        users.forEach(user => {
            const email = user.email;
            if (!uniqueUsers[email] || new Date(user.approvedAt || 0) > new Date(uniqueUsers[email].approvedAt || 0)) {
                uniqueUsers[email] = user;
            }
        });

        allApprovedUsers = Object.values(uniqueUsers);

        const totalEl = document.getElementById('total-aprobados');
        if (totalEl) totalEl.textContent = allApprovedUsers.length;

        actualizarDashboardUsuarios();
        renderApprovedUsers();
    } catch (error) {
        console.error('❌ Error loading approved users:', error);
    }
}

// Función para actualizar el dashboard de estadísticas
function actualizarDashboardUsuarios() {
    const total = allApprovedUsers.length + (allPendingUsers ? allPendingUsers.length : 0);
    const pagosPendientes = allApprovedUsers.filter(u => u.estadoPagos === 'pagos_pendientes').length;
    
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    setText('total-todos-usuarios', total);
    setText('total-pagos-pendientes', pagosPendientes);
    
    // Estadísticas por sede
    const carapungo = allApprovedUsers.filter(u => u.sede === 'Carapungo').length;
    const sangolqui = allApprovedUsers.filter(u => u.sede === 'Sangolquí').length;
    
    setText('total-carapungo', carapungo);
    setText('total-sangolqui', sangolqui);
}

// Función para aprobar usuario
async function aprobarUsuario(id) {
    try {
        const user = allPendingUsers.find(u => u.id === id);
        if (!user) return;

        // Mover a users con datos completos
        await setDoc(doc(db, 'users', user.email), {
            ...user,
            role: 'student',
            status: 'active',
            approvedAt: new Date().toISOString()
        });

        // Eliminar de pendingStudents
        await deleteDoc(doc(db, 'pendingStudents', id));

        alert('Usuario aprobado correctamente');
        await loadUsuariosPendientes();
        await loadUsuariosAprobados();
    } catch (error) {
        console.error('Error approving user:', error);
        alert('Error al aprobar usuario');
    }
}

// Función para rechazar usuario
async function rechazarUsuario(id) {
    if (!confirm('¿Estás seguro de rechazar este usuario?')) return;
    
    try {
        await deleteDoc(doc(db, 'pendingStudents', id));
        alert('Usuario rechazado');
        await loadUsuariosPendientes();
    } catch (error) {
        console.error('Error rejecting user:', error);
        alert('Error al rechazar usuario');
    }
}

// Función para eliminar usuario
async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
        await deleteDoc(doc(db, 'users', id));
        alert('Usuario eliminado');
        await loadUsuariosAprobados();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error al eliminar usuario');
    }
}

// Función para aprobar todos los pendientes
async function aprobarTodosPendientes() {
    if (!allPendingUsers || allPendingUsers.length === 0) {
        alert('No hay usuarios pendientes');
        return;
    }
    
    if (!confirm(`¿Aprobar todos los ${allPendingUsers.length} usuarios pendientes?`)) return;
    
    try {
        for (const user of allPendingUsers) {
            await setDoc(doc(db, 'users', user.email), {
                ...user,
                role: 'student',
                status: 'active',
                approvedAt: new Date().toISOString()
            });
            await deleteDoc(doc(db, 'pendingStudents', user.id));
        }
        
        alert('Todos los usuarios han sido aprobados');
        await loadUsuariosPendientes();
        await loadUsuariosAprobados();
    } catch (error) {
        console.error('Error approving all users:', error);
        alert('Error al aprobar usuarios');
    }
}

// Renderizar usuarios pendientes
function renderPendingUsers() {
    const container = document.getElementById('usuarios-pendientes');
    if (!container) return;
    
    if (allPendingUsers.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay usuarios pendientes</p>';
        return;
    }
    
    container.innerHTML = allPendingUsers.map(user => `
        <div class="user-card">
            <div class="user-info">
                <h4>${user.name || 'Sin nombre'}</h4>
                <p>${user.email}</p>
                <p>Programa: ${user.programa || 'No especificado'}</p>
            </div>
            <div class="user-actions">
                <button onclick="aprobarUsuario('${user.id}')" class="btn-approve">Aprobar</button>
                <button onclick="rechazarUsuario('${user.id}')" class="btn-reject">Rechazar</button>
            </div>
        </div>
    `).join('');
}

// Renderizar usuarios aprobados
function renderApprovedUsers() {
    const container = document.getElementById('usuarios-aprobados');
    if (!container) return;
    
    if (allApprovedUsers.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay usuarios aprobados</p>';
        return;
    }
    
    container.innerHTML = allApprovedUsers.map(user => `
        <div class="user-card">
            <div class="user-info">
                <h4>${user.name || 'Sin nombre'}</h4>
                <p>${user.email}</p>
                <p>Programa: ${user.programa || 'No especificado'}</p>
                <p>Sede: ${user.sede || 'No especificada'}</p>
            </div>
            <div class="user-actions">
                <button onclick="eliminarUsuario('${user.id}')" class="btn-delete">Eliminar</button>
            </div>
        </div>
    `).join('');
}

// Filtrar usuarios
function filterUsuarios() {
    renderPendingUsers();
}

// Obtener color del programa
function getProgramColor(program) {
    const colors = {
        'Panadería': 'panaderia',
        'Belleza': 'belleza',
        'Sin programa': 'default'
    };
    return colors[program] || 'default';
}

// Exportar funciones globalmente
window.loadUsuariosPendientes = loadUsuariosPendientes;
window.loadUsuariosAprobados = loadUsuariosAprobados;
window.aprobarUsuario = aprobarUsuario;
window.rechazarUsuario = rechazarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.aprobarTodosPendientes = aprobarTodosPendientes;
window.renderPendingUsers = renderPendingUsers;
window.renderApprovedUsers = renderApprovedUsers;
window.filterUsuarios = filterUsuarios;
window.actualizarDashboardUsuarios = actualizarDashboardUsuarios;

// Exportar como módulo ES6 para compatibilidad
export default {
    name: 'usuarios',
    init: function() {
        console.log('Usuarios module initialized');
        this.exposeToGlobal();
    },
    exposeToGlobal: function() {
        if (typeof window.loadUsuariosPendientes !== 'function') {
            window.loadUsuariosPendientes = loadUsuariosPendientes;
        }
        if (typeof window.loadUsuariosAprobados !== 'function') {
            window.loadUsuariosAprobados = loadUsuariosAprobados;
        }
        console.log('✅ Funciones de Usuarios expuestas al ámbito global');
    }
};

console.log('✅ Módulo de Usuarios cargado completamente');
