/**
 * Módulo de Usuarios - Charlotte Admin
 * 
 * Funciones completas para gestión de usuarios.
 */

// Usar db global de admin.html
const db = window.db;
const { collection, getDocs, query, where, doc, setDoc, deleteDoc, addDoc } = window;

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
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 1.1rem;">No hay usuarios pendientes</p>
            </div>`;
        return;
    }
    
    const programaColores = {
        'Panadería y Pastelería': { bg: '#fffbeb', border: '#f59e0b', icon: 'fa-bread-slice', color: '#92400e' },
        'Belleza Integral': { bg: '#fdf2f8', border: '#ec4899', icon: 'fa-cut', color: '#9d174d' },
        'Asesoría Técnica': { bg: '#f5f3ff', border: '#8b5cf6', icon: 'fa-chalkboard-teacher', color: '#5b21b6' }
    };
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1rem; padding: 0.5rem;">
            ${allPendingUsers.map(user => {
                const colores = programaColores[user.programa] || { bg: '#f8fafc', border: '#6b7280', icon: 'fa-user', color: '#374151' };
                return `
                    <div style="background: white; border: 2px solid ${colores.border}; border-radius: 16px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;"
                         onmouseenter="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)';"
                         onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                        <div style="background: ${colores.bg}; padding: 1rem 1.25rem; border-bottom: 1px solid ${colores.border};">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="width: 45px; height: 45px; background: ${colores.border}; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas ${colores.icon}" style="color: white; font-size: 1.1rem;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h4 style="margin: 0; font-size: 1rem; color: #1f2937; font-weight: 600;">${user.name || 'Sin nombre'}</h4>
                                    <p style="margin: 0; font-size: 0.8rem; color: #6b7280;">${user.email}</p>
                                </div>
                            </div>
                        </div>
                        <div style="padding: 1rem 1.25rem;">
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                                <span style="background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #374151;">
                                    <i class="fas fa-graduation-cap"></i> ${user.programa || 'Sin programa'}
                                </span>
                                <span style="background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #374151;">
                                    <i class="fas fa-map-marker-alt"></i> ${user.sede || 'Sin sede'}
                                </span>
                                <span style="background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #374151;">
                                    <i class="fas fa-clock"></i> ${user.horario || 'Sin horario'}
                                </span>
                            </div>
                            <div style="background: #f9fafb; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.75rem;">
                                <i class="fas fa-key"></i> Contraseña: <code style="background: #e5e7eb; padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace;">${user.password || '***'}</code>
                                ${user.telefono ? `<span style="margin-left: 0.75rem;"><i class="fas fa-phone"></i> ${user.telefono}</span>` : ''}
                            </div>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button onclick="aprobarUsuario('${user.id}')" style="flex: 1; padding: 0.5rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                                    <i class="fas fa-check"></i> Aprobar
                                </button>
                                <button onclick="rechazarUsuario('${user.id}')" style="flex: 1; padding: 0.5rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                                    <i class="fas fa-times"></i> Rechazar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Renderizar usuarios aprobados
function renderApprovedUsers() {
    const container = document.getElementById('usuarios-aprobados');
    if (!container) return;
    
    if (allApprovedUsers.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 1.1rem;">No hay usuarios aprobados</p>
            </div>`;
        return;
    }
    
    const programaColores = {
        'Panadería y Pastelería': { bg: '#fffbeb', border: '#f59e0b', icon: 'fa-bread-slice', color: '#92400e' },
        'Belleza Integral': { bg: '#fdf2f8', border: '#ec4899', icon: 'fa-cut', color: '#9d174d' },
        'Asesoría Técnica': { bg: '#f5f3ff', border: '#8b5cf6', icon: 'fa-chalkboard-teacher', color: '#5b21b6' }
    };
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1rem; padding: 0.5rem;">
            ${allApprovedUsers.map(user => {
                const colores = programaColores[user.programa] || { bg: '#f8fafc', border: '#6b7280', icon: 'fa-user', color: '#374151' };
                const estadoPago = user.estadoPagos === 'pagos_pendientes';
                const restriccionActiva = user.restriccion && new Date(user.restriccion.fechaFin) > new Date();
                return `
                    <div style="background: white; border: 2px solid ${colores.border}; border-radius: 16px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;"
                         onmouseenter="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)';"
                         onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                        <div style="background: ${colores.bg}; padding: 1rem 1.25rem; border-bottom: 1px solid ${colores.border};">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="width: 45px; height: 45px; background: ${colores.border}; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas ${colores.icon}" style="color: white; font-size: 1.1rem;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h4 style="margin: 0; font-size: 1rem; color: #1f2937; font-weight: 600;">${user.name || 'Sin nombre'}</h4>
                                    <p style="margin: 0; font-size: 0.8rem; color: #6b7280;">${user.email}</p>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-end;">
                                    <div style="padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; background: ${estadoPago ? '#fef2f2' : '#ecfdf5'}; color: ${estadoPago ? '#dc2626' : '#059669'}; border: 1px solid ${estadoPago ? '#fecaca' : '#a7f3d0'};">
                                        <i class="fas fa-${estadoPago ? 'exclamation-circle' : 'check-circle'}"></i> ${estadoPago ? 'Pago Pend.' : 'Al día'}
                                    </div>
                                    ${restriccionActiva ? `
                                        <div style="padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.65rem; font-weight: 600; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">
                                            <i class="fas fa-ban"></i> Restringido
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div style="padding: 1rem 1.25rem;">
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                                <span style="background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #374151;">
                                    <i class="fas fa-graduation-cap"></i> ${user.programa || 'Sin programa'}
                                </span>
                                <span style="background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #374151;">
                                    <i class="fas fa-map-marker-alt"></i> ${user.sede || 'Sin sede'}
                                </span>
                                <span style="background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #374151;">
                                    <i class="fas fa-clock"></i> ${user.horario || 'Sin horario'}
                                </span>
                            </div>
                            <div style="background: #f9fafb; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.75rem;">
                                <i class="fas fa-key"></i> Contraseña: <code style="background: #e5e7eb; padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace;">${user.password || '***'}</code>
                                ${user.telefono ? `<span style="margin-left: 0.75rem;"><i class="fas fa-phone"></i> ${user.telefono}</span>` : ''}
                            </div>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button onclick="editarUsuarioAprobado('${user.id}')" style="flex: 1; padding: 0.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button onclick="verHistorialPagos('${user.id}')" style="flex: 1; padding: 0.5rem; background: ${estadoPago ? '#f59e0b' : '#10b981'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                                    <i class="fas fa-history"></i> Pagos
                                </button>
                                <button onclick="eliminarUsuario('${user.id}')" style="padding: 0.5rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;" title="Eliminar usuario">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
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

// Exportar funciones globalmente (solo si no existen para evitar sobrescribir versiones más completas)
if (!window.loadUsuariosPendientes) {
    window.loadUsuariosPendientes = loadUsuariosPendientes;
}
if (!window.loadUsuariosAprobados) {
    window.loadUsuariosAprobados = loadUsuariosAprobados;
}
if (!window.aprobarUsuario) {
    window.aprobarUsuario = aprobarUsuario;
}
if (!window.rechazarUsuario) {
    window.rechazarUsuario = rechazarUsuario;
}
if (!window.eliminarUsuario) {
    window.eliminarUsuario = eliminarUsuario;
}
if (!window.aprobarTodosPendientes) {
    window.aprobarTodosPendientes = aprobarTodosPendientes;
}
if (!window.renderPendingUsers) {
    window.renderPendingUsers = renderPendingUsers;
}
if (!window.renderApprovedUsers) {
    window.renderApprovedUsers = renderApprovedUsers;
}
if (!window.filterUsuarios) {
    window.filterUsuarios = filterUsuarios;
}
if (!window.actualizarDashboardUsuarios) {
    window.actualizarDashboardUsuarios = actualizarDashboardUsuarios;
}

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
