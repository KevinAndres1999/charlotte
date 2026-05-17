/**
 * Módulo de Usuarios - Charlotte Admin
 * 
 * Funciones completas para gestión de usuarios.
 */

// Usar db global de admin.html
const db = window.db;
const { collection, getDocs, query, where, doc, setDoc, updateDoc, deleteDoc, addDoc } = window;

// Helper para updateDoc: usa window.updateDoc si existe, si no usa setDoc con merge
const _updateDoc = window.updateDoc ||
    ((ref, data) => window.setDoc(ref, data, { merge: true }));

// Configuración de estados de estudiante
const ESTADOS_ESTUDIANTE = {
    cursando:  { label: 'Cursando',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: 'fa-book-open' },
    graduado:  { label: 'Graduado',  color: '#b45309', bg: '#fffbeb', border: '#fcd34d', icon: 'fa-graduation-cap' },
    retirado:  { label: 'Retirado',  color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', icon: 'fa-user-slash' },
    active:    { label: 'Cursando',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: 'fa-book-open' }  // compatibilidad
};

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
        
        // Verificar y limpiar duplicados (usuarios que ya están aprobados)
        if (allPendingUsers.length > 0) {
            console.log('🔍 Verificando duplicados en pendientes...');
            const duplicadosEliminados = [];
            
            for (const pendingUser of allPendingUsers) {
                if (pendingUser.email) {
                    const existingQuery = await getDocs(query(
                        collection(db, 'users'),
                        where('email', '==', pendingUser.email),
                        where('role', '==', 'student')
                    ));
                    
                    if (!existingQuery.empty) {
                        console.log(`⚠️ Usuario duplicado encontrado: ${pendingUser.name} (${pendingUser.email})`);
                        await deleteDoc(doc(db, 'pendingStudents', pendingUser.id));
                        duplicadosEliminados.push(pendingUser.name);
                    }
                }
            }
            
            if (duplicadosEliminados.length > 0) {
                console.log(`🧹 ${duplicadosEliminados.length} solicitud(es) duplicada(s) eliminada(s):`, duplicadosEliminados);
                // Recargar después de limpiar
                const newSnapshot = await getDocs(query(collection(db, 'pendingStudents')));
                allPendingUsers = newSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }
        }
        
        // Exponer globalmente para que otros módulos puedan acceder
        window.allPendingUsers = allPendingUsers;
        
        console.log('✅ allPendingUsers cargados y expuestos:', allPendingUsers.length);

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
        
        // Exponer globalmente para que otros módulos (como cobros.js) puedan acceder
        window.allApprovedUsers = allApprovedUsers;
        
        console.log('✅ allApprovedUsers cargados y expuestos:', allApprovedUsers.length);

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
    console.log('📊 Actualizando dashboard - allApprovedUsers:', allApprovedUsers.length);
    
    const cursando = allApprovedUsers.filter(u => u.status === 'cursando' || u.status === 'active').length;
    const graduados = allApprovedUsers.filter(u => u.status === 'graduado').length;
    const retirados = allApprovedUsers.filter(u => u.status === 'retirado').length;
    const total = allApprovedUsers.length + (allPendingUsers ? allPendingUsers.length : 0);
    const pagosPendientes = allApprovedUsers.filter(u => u.estadoPagos === 'pagos_pendientes').length;
    
    console.log('📊 Estadísticas:', { cursando, graduados, retirados, total, pagosPendientes });
    
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            console.log(`✅ Actualizado ${id} = ${value}`);
        } else {
            console.warn(`⚠️ Elemento ${id} no encontrado`);
        }
    };
    
    // Actualizar contadores principales
    setText('total-todos-usuarios', total);
    setText('total-pagos-pendientes', pagosPendientes);
    // Los siguientes elementos no existen en el HTML actual, comentados para evitar warnings
    // setText('total-cursando', cursando);
    // setText('total-graduados', graduados);
    // setText('total-retirados', retirados);
    
    // Estadísticas por sede
    const carapungo = allApprovedUsers.filter(u => u.sede === 'Carapungo').length;
    const sangolqui = allApprovedUsers.filter(u => u.sede === 'Sangolquí').length;
    const maxSede = Math.max(carapungo, sangolqui, 1);
    
    console.log('📊 Por sede:', { carapungo, sangolqui });
    
    setText('count-carapungo', carapungo);
    setText('count-sangolqui', sangolqui);
    // Elementos total-carapungo y total-sangolqui no existen en el HTML
    // setText('total-carapungo', carapungo);
    // setText('total-sangolqui', sangolqui);
    
    const barCarapungo = document.getElementById('bar-carapungo');
    const barSangolqui = document.getElementById('bar-sangolqui');
    if (barCarapungo) barCarapungo.style.width = ((carapungo / maxSede) * 100) + '%';
    if (barSangolqui) barSangolqui.style.width = ((sangolqui / maxSede) * 100) + '%';
    
    // Estadísticas por horario
    const sabMat = allApprovedUsers.filter(u => u.horario === 'Sábado Matutina').length;
    const sabVesp = allApprovedUsers.filter(u => u.horario === 'Sábado Vespertina').length;
    const domMat = allApprovedUsers.filter(u => u.horario === 'Domingo Matutina').length;
    const maxHorario = Math.max(sabMat, sabVesp, domMat, 1);
    
    console.log('📊 Por horario:', { sabMat, sabVesp, domMat });
    
    setText('count-sab-mat', sabMat);
    setText('count-sab-vesp', sabVesp);
    setText('count-dom-mat', domMat);
    
    const barSabMat = document.getElementById('bar-sab-mat');
    const barSabVesp = document.getElementById('bar-sab-vesp');
    const barDomMat = document.getElementById('bar-dom-mat');
    if (barSabMat) barSabMat.style.width = ((sabMat / maxHorario) * 100) + '%';
    if (barSabVesp) barSabVesp.style.width = ((sabVesp / maxHorario) * 100) + '%';
    if (barDomMat) barDomMat.style.width = ((domMat / maxHorario) * 100) + '%';
    
    // Estadísticas por programa
    const panaderia = allApprovedUsers.filter(u => u.programa === 'Panadería y Pastelería').length;
    const belleza = allApprovedUsers.filter(u => u.programa === 'Belleza Integral').length;
    const asesoria = allApprovedUsers.filter(u => u.programa === 'Asesoría Técnica').length;
    const maxPrograma = Math.max(panaderia, belleza, asesoria, 1);
    
    console.log('📊 Por programa:', { panaderia, belleza, asesoria });
    
    setText('count-panaderia', panaderia);
    setText('count-belleza', belleza);
    setText('count-asesoria', asesoria);
    
    const barPanaderia = document.getElementById('bar-panaderia');
    const barBelleza = document.getElementById('bar-belleza');
    const barAsesoria = document.getElementById('bar-asesoria');
    if (barPanaderia) barPanaderia.style.width = ((panaderia / maxPrograma) * 100) + '%';
    if (barBelleza) barBelleza.style.width = ((belleza / maxPrograma) * 100) + '%';
    if (barAsesoria) barAsesoria.style.width = ((asesoria / maxPrograma) * 100) + '%';
    
    // Calcular distribución por programa
    const usersByProgram = {};
    allApprovedUsers.forEach(user => {
        const programa = user.programa || 'Sin programa';
        usersByProgram[programa] = (usersByProgram[programa] || 0) + 1;
    });
    
    console.log('📊 Distribución por programa:', usersByProgram);
    
    // Renderizar distribución por programa
    renderProgramDistribution(usersByProgram);
}

// Función para renderizar distribución por programa
function renderProgramDistribution(usersByProgram) {
    console.log('📊 renderProgramDistribution llamada con:', usersByProgram);
    
    const container = document.getElementById('program-distribution');
    console.log('📊 Container program-distribution:', container);
    
    if (!container) {
        console.error('❌ Container program-distribution no encontrado');
        return;
    }
    
    const totalUsers = Object.values(usersByProgram).reduce((sum, count) => sum + count, 0);
    console.log('📊 Total usuarios para distribución:', totalUsers);
    
    if (totalUsers === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;"><i class="fas fa-chart-pie" style="font-size: 2rem; opacity: 0.5;"></i><p>No hay datos de distribución disponibles</p></div>';
        return;
    }
    
    const programs = Object.entries(usersByProgram)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6);
    
    console.log('📊 Programas a renderizar:', programs);
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    programs.forEach(([program, count]) => {
        const percentage = Math.round((count / totalUsers) * 100);
        const colorClass = getProgramColor(program);
        
        html += `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="flex: 0 0 150px;">
                    <div style="font-weight: 600; font-size: 0.9rem; color: #1f2937;">${program}</div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${count} estudiantes</div>
                </div>
                <div style="flex: 1; background: #e5e7eb; border-radius: 8px; height: 24px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: ${getColorByProgram(program)}; transition: width 0.3s;"></div>
                </div>
                <div style="flex: 0 0 50px; text-align: right; font-weight: 600; color: #1f2937;">${percentage}%</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    console.log('✅ Dashboard de distribución renderizado');
}

// Función para aprobar usuario
async function aprobarUsuario(id) {
    try {
        console.log('Aprobando usuario con ID:', id);
        const user = allPendingUsers.find(u => u.id === id);
        if (!user) {
            alert('Error: Usuario no encontrado en solicitudes pendientes');
            return;
        }

        const data = user;
        console.log('Datos del usuario a aprobar:', data);

        // Mostrar modal para seleccionar sede y horario
        const modalHtml = `
            <div id="approvalModal" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
                <div style="background: white; border-radius: 20px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 1.5rem 2rem; border-radius: 20px 20px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; color: white; font-size: 1.25rem;"><i class="fas fa-user-check"></i> Aprobar Usuario</h3>
                            <button onclick="document.getElementById('approvalModal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div style="padding: 2rem;">
                        <div style="background: #ecfdf5; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #a7f3d0;">
                            <p style="margin: 0 0 0.25rem 0; font-weight: 600; color: #1f2937;">${data.name}</p>
                            <p style="margin: 0; font-size: 0.9rem; color: #6b7280;">${data.email}</p>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #059669;"><strong>Programa:</strong> ${data.programa}</p>
                        </div>

                        <div style="margin-bottom: 1.25rem;">
                            <label for="userSede" style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-map-marker-alt"></i> Seleccionar Sede</label>
                            <select id="userSede" required style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="">Seleccionar sede</option>
                                <option value="Carapungo">Carapungo</option>
                                <option value="Sangolquí">Sangolquí</option>
                                <option value="Saquisilí">Saquisilí</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 1.25rem;">
                            <label for="userHorario" style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-clock"></i> Seleccionar Horario</label>
                            <select id="userHorario" required style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="">Seleccionar horario</option>
                                <option value="Sábado Matutina">Sábado Matutina</option>
                                <option value="Sábado Vespertina">Sábado Vespertina</option>
                                <option value="Domingo Matutina">Domingo Matutina</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 1.5rem;">
                            <label for="estadoPagos" style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-money-bill-wave"></i> Estado de Pagos</label>
                            <select id="estadoPagos" required style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="pagos_al_dia">Pagos al día</option>
                                <option value="pagos_pendientes">Pagos pendientes</option>
                            </select>
                            <small style="color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem; display: block;">Los estudiantes con pagos pendientes no podrán acceder a cuestionarios ni evaluaciones</small>
                        </div>
                    </div>
                    <div style="padding: 1.5rem 2rem; border-top: 1px solid #e5e7eb; display: flex; gap: 1rem;">
                        <button onclick="document.getElementById('approvalModal').remove()" style="flex: 1; padding: 0.875rem; background: #6b7280; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                            Cancelar
                        </button>
                        <button onclick="confirmarAprobacion('${id}')" style="flex: 2; padding: 0.875rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                            <i class="fas fa-check"></i> Aprobar Usuario
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Agregar el modal al body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (error) {
        console.error('Error approving user:', error);
        alert('Error al aprobar usuario: ' + error.message);
    }
}

async function confirmarAprobacion(id) {
    const sede = document.getElementById('userSede').value;
    const horario = document.getElementById('userHorario').value;
    const estadoPagos = document.getElementById('estadoPagos').value;

    if (!sede || !horario || !estadoPagos) {
        alert('Por favor completa todos los campos (sede, horario y estado de pagos)');
        return;
    }

    try {
        console.log('Confirmando aprobación de usuario con ID:', id);
        const user = allPendingUsers.find(u => u.id === id);
        if (!user) {
            alert('Error: Usuario no encontrado');
            return;
        }

        const data = user;

        // Verificar si el usuario ya existe en la colección users
        const existingUserQuery = await getDocs(query(collection(db, 'users'),
            where('email', '==', data.email),
            where('role', '==', 'student')
        ));

        if (!existingUserQuery.empty) {
            console.log('⚠️ Usuario ya existe en la colección users con email:', data.email);
            console.log('📋 Eliminando solicitud duplicada de pendientes...');
            await deleteDoc(doc(db, 'pendingStudents', id));
            await loadUsuariosPendientes();
            await loadUsuariosAprobados();
            
            // Mostrar notificación en lugar de alert
            if (typeof showNotification === 'function') {
                showNotification(`El usuario ${data.name} ya está aprobado. Solicitud duplicada eliminada.`, 'info');
            }
            
            document.getElementById('approvalModal').remove();
            return;
        }

        // Preparar datos del usuario aprobado
        const approvedUserData = {
            firebaseUID: data.firebaseUID || id,
            name: data.name,
            email: data.email,
            cedula: data.cedula,
            telefono: data.telefono,
            programa: data.programa,
            sede: sede,
            horario: horario,
            estadoPagos: estadoPagos,
            role: 'student',
            status: 'cursando',  // Cambiar de 'pending' a 'cursando' al aprobar
            authMethod: data.authMethod || 'firebase',  // Mantener método de autenticación
            registeredDate: data.registeredDate,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Solo incluir password si existe (usuarios legados)
        // Los nuevos usuarios con authMethod='firebase' NO necesitan password en Firestore
        if (data.password && data.authMethod !== 'firebase') {
            approvedUserData.password = data.password;
        }

        // Guardar en users con el MISMO ID (firebaseUID) usando setDoc
        // IMPORTANTE: Usar setDoc con el ID del usuario para mantener consistencia con Firebase Auth
        await setDoc(doc(db, 'users', id), approvedUserData);

        // Eliminar de pendingStudents
        await deleteDoc(doc(db, 'pendingStudents', id));

        // Cerrar modal y recargar listas
        document.getElementById('approvalModal').remove();
        await loadUsuariosPendientes();
        await loadUsuariosAprobados();
        alert('✅ Usuario aprobado exitosamente');

    } catch (error) {
        console.error('Error confirming approval:', error);
        alert('Error al aprobar usuario: ' + error.message);
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

// Función para editar usuario pendiente
async function editarUsuarioPendiente(userId) {
    try {
        const user = allPendingUsers.find(u => u.id === userId);
        if (!user) {
            alert('Usuario no encontrado');
            return;
        }

        const modalHtml = `
            <div id="editUserModal" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
                <div style="background: white; border-radius: 20px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 1.5rem 2rem; border-radius: 20px 20px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; color: white; font-size: 1.25rem;"><i class="fas fa-user-edit"></i> Editar Estudiante</h3>
                            <button onclick="document.getElementById('editUserModal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div style="padding: 2rem;">
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;">
                            <p style="margin: 0 0 0.25rem 0; font-weight: 600; color: #1f2937;">${user.name}</p>
                            <p style="margin: 0; font-size: 0.9rem; color: #6b7280;">${user.email}</p>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-graduation-cap"></i> Programa</label>
                            <select id="editUserPrograma" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="Panadería y Pastelería" ${user.programa === 'Panadería y Pastelería' ? 'selected' : ''}>Panadería y Pastelería</option>
                                <option value="Belleza Integral" ${user.programa === 'Belleza Integral' ? 'selected' : ''}>Belleza Integral</option>
                                <option value="Asesoría Técnica" ${user.programa === 'Asesoría Técnica' ? 'selected' : ''}>Asesoría Técnica</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-map-marker-alt"></i> Sede</label>
                            <select id="editUserSede" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="Carapungo" ${user.sede === 'Carapungo' ? 'selected' : ''}>Carapungo</option>
                                <option value="Sangolquí" ${user.sede === 'Sangolquí' ? 'selected' : ''}>Sangolquí</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-clock"></i> Horario</label>
                            <select id="editUserHorario" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="">Sin horario asignado</option>
                                <option value="Sábado Matutina" ${user.horario === 'Sábado Matutina' ? 'selected' : ''}>Sábado Matutina</option>
                                <option value="Sábado Vespertina" ${user.horario === 'Sábado Vespertina' ? 'selected' : ''}>Sábado Vespertina</option>
                                <option value="Domingo Matutina" ${user.horario === 'Domingo Matutina' ? 'selected' : ''}>Domingo Matutina</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; gap: 1rem;">
                            <button onclick="document.getElementById('editUserModal').remove()" style="flex: 1; padding: 0.875rem; background: #6b7280; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                                Cancelar
                            </button>
                            <button onclick="guardarEdicionUsuarioPendiente('${userId}')" style="flex: 2; padding: 0.875rem; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar usuario: ' + error.message);
    }
}

async function guardarEdicionUsuarioPendiente(userId) {
    const programa = document.getElementById('editUserPrograma').value;
    const sede = document.getElementById('editUserSede').value;
    const horario = document.getElementById('editUserHorario').value;
    
    try {
        await updateDoc(doc(db, 'pendingStudents', userId), {
            programa: programa,
            sede: sede,
            horario: horario
        });
        
        document.getElementById('editUserModal').remove();
        await loadUsuariosPendientes();
        alert('✅ Usuario actualizado exitosamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    }
}

// Función para editar usuario aprobado
async function editarUsuarioAprobado(userId) {
    try {
        const user = allApprovedUsers.find(u => u.id === userId);
        if (!user) {
            alert('Usuario no encontrado');
            return;
        }

        const modalHtml = `
            <div id="editUserAprobadoModal" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
                <div style="background: white; border-radius: 20px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 1.5rem 2rem; border-radius: 20px 20px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; color: white; font-size: 1.25rem;"><i class="fas fa-user-edit"></i> Editar Estudiante Aprobado</h3>
                            <button onclick="document.getElementById('editUserAprobadoModal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div style="padding: 2rem;">
                        <div style="background: #ecfdf5; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #a7f3d0;">
                            <p style="margin: 0 0 0.25rem 0; font-weight: 600; color: #1f2937;">${user.name}</p>
                            <p style="margin: 0; font-size: 0.9rem; color: #6b7280;">${user.email}</p>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-graduation-cap"></i> Programa</label>
                            <select id="editUserAprobadoPrograma" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="Panadería y Pastelería" ${user.programa === 'Panadería y Pastelería' ? 'selected' : ''}>Panadería y Pastelería</option>
                                <option value="Belleza Integral" ${user.programa === 'Belleza Integral' ? 'selected' : ''}>Belleza Integral</option>
                                <option value="Asesoría Técnica" ${user.programa === 'Asesoría Técnica' ? 'selected' : ''}>Asesoría Técnica</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-map-marker-alt"></i> Sede</label>
                            <select id="editUserAprobadoSede" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="Carapungo" ${user.sede === 'Carapungo' ? 'selected' : ''}>Carapungo</option>
                                <option value="Sangolquí" ${user.sede === 'Sangolquí' ? 'selected' : ''}>Sangolquí</option>
                                <option value="Saquisilí" ${user.sede === 'Saquisilí' ? 'selected' : ''}>Saquisilí</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-clock"></i> Horario</label>
                            <select id="editUserAprobadoHorario" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="">Sin horario asignado</option>
                                <option value="Sábado Matutina" ${user.horario === 'Sábado Matutina' ? 'selected' : ''}>Sábado Matutina</option>
                                <option value="Sábado Vespertina" ${user.horario === 'Sábado Vespertina' ? 'selected' : ''}>Sábado Vespertina</option>
                                <option value="Domingo Matutina" ${user.horario === 'Domingo Matutina' ? 'selected' : ''}>Domingo Matutina</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;"><i class="fas fa-money-bill-wave"></i> Estado de Pagos</label>
                            <select id="editUserAprobadoEstadoPagos" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
                                <option value="pagos_al_dia" ${(user.estadoPagos || 'pagos_al_dia') === 'pagos_al_dia' ? 'selected' : ''}>✅ Pagos al día</option>
                                <option value="pagos_pendientes" ${user.estadoPagos === 'pagos_pendientes' ? 'selected' : ''}>⚠️ Pagos pendientes</option>
                            </select>
                            <small style="color: #6b7280; font-size: 0.85rem; margin-top: 0.4rem; display: block;">Los estudiantes con pagos pendientes no pueden acceder a cuestionarios ni evaluaciones.</small>
                        </div>
                        
                        <div style="display: flex; gap: 1rem;">
                            <button onclick="document.getElementById('editUserAprobadoModal').remove()" style="flex: 1; padding: 0.875rem; background: #6b7280; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                                Cancelar
                            </button>
                            <button onclick="guardarEdicionUsuarioAprobado('${userId}')" style="flex: 2; padding: 0.875rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar usuario: ' + error.message);
    }
}

async function guardarEdicionUsuarioAprobado(userId) {
    const programa = document.getElementById('editUserAprobadoPrograma').value;
    const sede = document.getElementById('editUserAprobadoSede').value;
    const horario = document.getElementById('editUserAprobadoHorario').value;
    const estadoPagos = document.getElementById('editUserAprobadoEstadoPagos').value;
    
    try {
        await updateDoc(doc(db, 'users', userId), {
            programa: programa,
            sede: sede,
            horario: horario,
            estadoPagos: estadoPagos,
            updatedAt: new Date().toISOString()
        });
        
        // Actualizar también en la cache local
        const idx = allApprovedUsers.findIndex(u => u.id === userId);
        if (idx !== -1) {
            allApprovedUsers[idx].programa = programa;
            allApprovedUsers[idx].sede = sede;
            allApprovedUsers[idx].horario = horario;
            allApprovedUsers[idx].estadoPagos = estadoPagos;
        }
        
        document.getElementById('editUserAprobadoModal').remove();
        renderApprovedUsers();
        actualizarDashboardUsuarios();
        alert('✅ Usuario actualizado exitosamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    }
}

// Función para ver historial de pagos
async function verHistorialPagos(userId) {
    const user = allApprovedUsers.find(u => u.id === userId);
    if (!user) return;
    
    // Obtener historial de pagos del usuario
    const historialPagos = user.historialPagos || [];
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    let historialHtml = historialPagos.length > 0 ? 
        historialPagos.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: ${p.estado === 'pagado' ? '#ecfdf5' : '#fef2f2'}; border-radius: 8px; margin-bottom: 0.5rem;">
                <div>
                    <strong>${p.concepto}</strong>
                    <p style="margin: 0; font-size: 0.8rem; color: #6b7280;">${p.fecha ? new Date(p.fecha).toLocaleDateString() : 'Sin fecha'}</p>
                </div>
                <div style="text-align: right;">
                    <span style="font-weight: 600; color: ${p.estado === 'pagado' ? '#059669' : '#dc2626'};">$${p.monto || 0}</span>
                    <p style="margin: 0; font-size: 0.75rem; color: ${p.estado === 'pagado' ? '#059669' : '#dc2626'};">
                        <i class="fas fa-${p.estado === 'pagado' ? 'check-circle' : 'clock'}"></i> ${p.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                    </p>
                </div>
            </div>
        `).join('') : '<p style="text-align: center; color: #6b7280;">No hay registros de pagos</p>';
    
    const modalHtml = `
        <div id="historialPagosModal" class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 20px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 1.5rem 2rem; border-radius: 20px 20px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; color: white; font-size: 1.25rem;"><i class="fas fa-history"></i> Historial de Pagos</h2>
                        <button onclick="document.getElementById('historialPagosModal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div style="padding: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
                        <div>
                            <h4 style="margin: 0;">${user.name}</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">${user.email}</p>
                        </div>
                        <div style="padding: 0.5rem 1rem; border-radius: 8px; background: ${user.estadoPagos === 'pagos_pendientes' ? '#fef2f2' : '#ecfdf5'}; color: ${user.estadoPagos === 'pagos_pendientes' ? '#dc2626' : '#059669'}; font-weight: 600;">
                            ${user.estadoPagos === 'pagos_pendientes' ? 'Pagos Pendientes' : 'Al Día'}
                        </div>
                    </div>
                    
                    <h5 style="margin: 0 0 0.75rem 0;"><i class="fas fa-list"></i> Historial:</h5>
                    <div style="max-height: 250px; overflow-y: auto;">
                        ${historialHtml}
                    </div>
                    
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; text-align: center;">
                        <button onclick="window.showSection && window.showSection('cobros'); document.getElementById('historialPagosModal').remove();" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                            <i class="fas fa-money-bill-wave"></i> Ir a Cobros
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Función para cambiar el estado de un estudiante
async function cambiarEstadoEstudiante(userId, nuevoEstado) {
    const estadoConfig = ESTADOS_ESTUDIANTE[nuevoEstado];
    if (!estadoConfig) return;
    const user = allApprovedUsers.find(u => u.id === userId);
    if (!user) return;
    if (!confirm(`¿Cambiar estado de "${user.name || user.email}" a "${estadoConfig.label}"?`)) return;
    try {
        await setDoc(doc(db, 'users', userId), { ...user, status: nuevoEstado });
        const idx = allApprovedUsers.findIndex(u => u.id === userId);
        if (idx !== -1) allApprovedUsers[idx].status = nuevoEstado;
        renderApprovedUsers();
        actualizarDashboardUsuarios();
    } catch (error) {
        console.error('Error cambiando estado:', error);
        alert('Error al cambiar el estado del estudiante');
    }
}

// Función para eliminar usuario
async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario? Se eliminará de Firebase Auth y Firestore.')) return;
    
    try {
        // Obtener el usuario actual para verificar el firebaseUID y email
        const userDoc = await getDoc(doc(db, 'users', id));
        if (!userDoc.exists()) {
            alert('Usuario no encontrado');
            return;
        }
        
        const userData = userDoc.data();
        const firebaseUID = userData.firebaseUID || id; // Usar firebaseUID si existe, si no usar el ID del doc
        const email = userData.email;

        // Obtener token de autenticación de Firebase
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
            alert('No autenticado');
            return;
        }

        // Obtener ID token de Firebase
        let idToken = sessionStorage.getItem('adminIdToken');
        if (!idToken) {
            // Si no hay token guardado, intentar obtenerlo del usuario de Firebase
            try {
                idToken = await window.auth?.currentUser?.getIdToken();
            } catch (e) {
                console.warn('No se pudo obtener ID token:', e);
            }
        }

        if (!idToken) {
            alert('Token de autenticación no disponible. Por favor, recarga la página.');
            return;
        }

        // Llamar al endpoint para eliminar de Firebase Auth + Firestore
        const response = await fetch(window.APP_CONFIG.API_BASE + '/admin/delete-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + idToken
            },
            body: JSON.stringify({
                firebaseUID: firebaseUID,
                email: email
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al eliminar usuario');
        }

        // Eliminar de Firestore (redundante pero seguro)
        await deleteDoc(doc(db, 'users', id));
        
        // Remover de la lista local
        const idx = allApprovedUsers.findIndex(u => u.id === id);
        if (idx !== -1) {
            allApprovedUsers.splice(idx, 1);
        }

        alert('✅ Usuario eliminado completamente (Firebase Auth + Firestore)');
        await loadUsuariosAprobados();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error al eliminar usuario: ' + error.message);
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
            const userDocId = user.firebaseUID || user.id || user.email;
            
            // Actualizar el documento existente
            await updateDoc(doc(db, 'users', userDocId), {
                role: 'student',
                status: 'cursando',
                approvedAt: new Date().toISOString()
            });
            await deleteDoc(doc(db, 'pendingStudents', user.id));
        }
        
        alert('✅ Todos los usuarios han sido aprobados');
        await loadUsuariosPendientes();
        await loadUsuariosAprobados();
    } catch (error) {
        console.error('Error approving all users:', error);
        alert('Error al aprobar usuarios: ' + error.message);
    }
}

// Renderizar usuarios pendientes
function renderPendingUsers() {
    const container = document.getElementById('usuarios-pendientes');
    if (!container) return;
    
    // Aplicar filtros
    const searchInput = document.getElementById('usuariosSearch');
    const programaFilterEl = document.getElementById('filterProgramaPendientes');
    const sedeFilterEl = document.getElementById('filterSedePendientes');
    const horarioFilterEl = document.getElementById('filterHorarioPendientes');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const programaFilter = programaFilterEl ? programaFilterEl.value : '';
    const sedeFilter = sedeFilterEl ? sedeFilterEl.value : '';
    const horarioFilter = horarioFilterEl ? horarioFilterEl.value : '';
    
    let filtered = allPendingUsers.filter(user => {
        const matchesSearch = !searchTerm ||
            (user.name && user.name.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm));
        const matchesPrograma = !programaFilter || user.programa === programaFilter;
        const matchesSede = !sedeFilter || user.sede === sedeFilter;
        const matchesHorario = !horarioFilter || user.horario === horarioFilter;
        return matchesSearch && matchesPrograma && matchesSede && matchesHorario;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 1.1rem;">No hay usuarios pendientes que coincidan con los filtros</p>
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
            ${filtered.map(user => {
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
                                <button onclick="editarUsuarioPendiente('${user.id}')" style="flex: 1; padding: 0.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
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
    
    // Aplicar filtros
    const programaFilterEl = document.getElementById('filterPrograma');
    const sedeFilterEl = document.getElementById('filterSedeAprobados');
    const horarioFilterEl = document.getElementById('filterHorarioAprobados');
    
    const programaFilter = programaFilterEl ? programaFilterEl.value : '';
    const sedeFilter = sedeFilterEl ? sedeFilterEl.value : '';
    const horarioFilter = horarioFilterEl ? horarioFilterEl.value : '';
    
    let filtered = allApprovedUsers.filter(user => {
        const matchesPrograma = !programaFilter || user.programa === programaFilter;
        const matchesSede = !sedeFilter || user.sede === sedeFilter;
        const matchesHorario = !horarioFilter || user.horario === horarioFilter;
        return matchesPrograma && matchesSede && matchesHorario;
    });
    
    // Ordenar por fecha de aprobación descendente
    filtered.sort((a, b) => {
        const aDate = a.approvedAt ? new Date(a.approvedAt) : new Date(0);
        const bDate = b.approvedAt ? new Date(b.approvedAt) : new Date(0);
        return bDate - aDate;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 1.1rem;">No hay usuarios aprobados que coincidan con los filtros</p>
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
            ${filtered.map(user => {
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
                            <!-- Badge de estado del estudiante -->
                            <div style="margin-bottom: 0.75rem;">
                                ${(() => {
                                    const est = user.status || 'cursando';
                                    const cfg = ESTADOS_ESTUDIANTE[est] || ESTADOS_ESTUDIANTE.cursando;
                                    return `<div style="display:flex; align-items:center; justify-content:space-between; background:${cfg.bg}; border:1px solid ${cfg.border}; border-radius:8px; padding:0.4rem 0.75rem;">
                                        <span style="font-size:0.75rem; font-weight:700; color:${cfg.color};">
                                            <i class="fas ${cfg.icon}"></i> ${cfg.label}
                                        </span>
                                        <select onchange="cambiarEstadoEstudiante('${user.id}', this.value); this.value=''"
                                            style="border:none; background:transparent; color:${cfg.color}; font-size:0.7rem; cursor:pointer; outline:none;" title="Cambiar estado">
                                            <option value="">Cambiar estado…</option>
                                            <option value="cursando">Cursando</option>
                                            <option value="graduado">🎓 Graduado</option>
                                            <option value="retirado">🚫 Retirado</option>
                                        </select>
                                    </div>`;
                                })()}
                            </div>
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
    renderApprovedUsers();
}

// Obtener color del programa
function getProgramColor(program) {
    const colors = {
        'Panadería': 'panaderia',
        'Panadería y Pastelería': 'panaderia',
        'Belleza': 'belleza',
        'Belleza Integral': 'belleza',
        'Asesoría Técnica': 'asesoria',
        'Sin programa': 'default'
    };
    return colors[program] || 'default';
}

// Obtener color HEX por programa
function getColorByProgram(program) {
    const colors = {
        'Panadería y Pastelería': '#f59e0b',
        'Belleza Integral': '#ec4899',
        'Asesoría Técnica': '#8b5cf6',
        'Sin programa': '#6b7280'
    };
    return colors[program] || '#6b7280';
}

// Exportar funciones globalmente - Ejecutar inmediatamente sin condicionales
window.loadUsuariosPendientes = loadUsuariosPendientes;
window.loadUsuariosAprobados = loadUsuariosAprobados;
window.aprobarUsuario = aprobarUsuario;
window.confirmarAprobacion = confirmarAprobacion;
window.rechazarUsuario = rechazarUsuario;
window.editarUsuarioPendiente = editarUsuarioPendiente;
window.guardarEdicionUsuarioPendiente = guardarEdicionUsuarioPendiente;
window.editarUsuarioAprobado = editarUsuarioAprobado;
window.guardarEdicionUsuarioAprobado = guardarEdicionUsuarioAprobado;
window.verHistorialPagos = verHistorialPagos;
window.eliminarUsuario = eliminarUsuario;
window.cambiarEstadoEstudiante = cambiarEstadoEstudiante;
window.aprobarTodosPendientes = aprobarTodosPendientes;
window.renderPendingUsers = renderPendingUsers;
window.renderApprovedUsers = renderApprovedUsers;
window.filterUsuarios = filterUsuarios;
window.actualizarDashboardUsuarios = actualizarDashboardUsuarios;
window.renderProgramDistribution = renderProgramDistribution;

console.log('✅ Módulo de Usuarios cargado completamente');
console.log('✅ Funciones expuestas globalmente:', {
    aprobarUsuario: typeof window.aprobarUsuario,
    confirmarAprobacion: typeof window.confirmarAprobacion,
    rechazarUsuario: typeof window.rechazarUsuario,
    editarUsuarioPendiente: typeof window.editarUsuarioPendiente,
    editarUsuarioAprobado: typeof window.editarUsuarioAprobado
});

// Exportar como módulo ES6 para compatibilidad
const usuariosModule = {
    name: 'usuarios',
    loadUsuariosPendientes,
    loadUsuariosAprobados,
    aprobarUsuario,
    confirmarAprobacion,
    rechazarUsuario,
    editarUsuarioPendiente,
    guardarEdicionUsuarioPendiente,
    editarUsuarioAprobado,
    guardarEdicionUsuarioAprobado,
    verHistorialPagos,
    eliminarUsuario,
    cambiarEstadoEstudiante,
    aprobarTodosPendientes,
    renderPendingUsers,
    renderApprovedUsers,
    filterUsuarios,
    actualizarDashboardUsuarios,
    renderProgramDistribution,
    init: function() {
        // Re-exponer funciones al ámbito global al llamar init()
        window.loadUsuariosPendientes = loadUsuariosPendientes;
        window.loadUsuariosAprobados = loadUsuariosAprobados;
        window.aprobarUsuario = aprobarUsuario;
        window.confirmarAprobacion = confirmarAprobacion;
        window.rechazarUsuario = rechazarUsuario;
        window.editarUsuarioPendiente = editarUsuarioPendiente;
        window.guardarEdicionUsuarioPendiente = guardarEdicionUsuarioPendiente;
        window.editarUsuarioAprobado = editarUsuarioAprobado;
        window.guardarEdicionUsuarioAprobado = guardarEdicionUsuarioAprobado;
        window.verHistorialPagos = verHistorialPagos;
        window.eliminarUsuario = eliminarUsuario;
        window.cambiarEstadoEstudiante = cambiarEstadoEstudiante;
        window.aprobarTodosPendientes = aprobarTodosPendientes;
        window.renderPendingUsers = renderPendingUsers;
        window.renderApprovedUsers = renderApprovedUsers;
        window.filterUsuarios = filterUsuarios;
        window.actualizarDashboardUsuarios = actualizarDashboardUsuarios;
        window.renderProgramDistribution = renderProgramDistribution;
        console.log('✅ Módulo usuarios inicializado - funciones disponibles globalmente');
    }
};

export default usuariosModule;
