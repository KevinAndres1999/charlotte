/**
 * Módulo de Foros - Charlotte Admin
 * Funciones relacionadas con gestión de foros
 */

// Usar funciones globales de admin.html
const db = window.db;
const { getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, collection, query, where, orderBy } = window;

/**
 * Cargar lista de foros
 */
async function loadForosList() {
    try {
        const container = document.getElementById('forosList');
        if (!container) return;
        
        // Fetch all foros
        const snapshot = await getDocs(collection(db, 'foros'));
        const allForos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by fecha de creación
        allForos.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
        
        if (allForos.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><h3>No hay foros creados</h3><p>Crea el primer hilo de discusión</p></div>';
            return;
        }
        
        container.innerHTML = allForos.map(foro => {
            const fecha = new Date(foro.fechaCreacion).toLocaleDateString('es-ES');
            const statusBadge = foro.status === 'pending' ? 
                '<span class="badge badge-warning">Pendiente</span>' : 
                '<span class="badge badge-success">Aprobado</span>';
            
            return `
                <div class="content-card">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h4>${foro.titulo}</h4>
                            <p>${foro.contenido?.substring(0, 150)}...</p>
                            <small>${foro.autorNombre} - ${fecha}</small>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            ${statusBadge}
                            <button onclick="viewForo('${foro.id}')" class="btn btn-sm"><i class="fas fa-eye"></i></button>
                            ${foro.status === 'pending' ? `<button onclick="approveForo('${foro.id}')" class="btn btn-sm btn-success"><i class="fas fa-check"></i></button>` : ''}
                            <button onclick="deleteForo('${foro.id}')" class="btn btn-sm btn-danger"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading foros:', error);
    }
}

/**
 * Cargar foros pendientes de aprobación
 */
async function loadForosPendientes() {
    try {
        const container = document.getElementById('forosPendientesList');
        if (!container) return;
        
        // Fetch pending foros
        const snapshot = await getDocs(query(collection(db, 'foros'), where('status', '==', 'pending')));
        const pendingForos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by fecha de creación
        pendingForos.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
        
        if (pendingForos.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><h3>No hay foros pendientes</h3><p>Todos los foros están aprobados</p></div>';
            return;
        }
        
        container.innerHTML = pendingForos.map(foro => {
            const fecha = new Date(foro.fechaCreacion).toLocaleDateString('es-ES');
            
            return `
                <div class="content-card">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h4>${foro.titulo}</h4>
                            <p>${foro.contenido?.substring(0, 150)}...</p>
                            <small>${foro.autorNombre} - ${fecha}</small>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="viewForo('${foro.id}')" class="btn btn-sm"><i class="fas fa-eye"></i> Ver</button>
                            <button onclick="approveForo('${foro.id}')" class="btn btn-sm btn-success"><i class="fas fa-check"></i> Aprobar</button>
                            <button onclick="deleteForo('${foro.id}')" class="btn btn-sm btn-danger"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading pending foros:', error);
    }
}

/**
 * Aprobar un foro
 */
async function approveForo(id) {
    try {
        const foroDoc = await getDoc(doc(db, 'foros', id));
        if (!foroDoc.exists()) {
            alert('Foro no encontrado');
            return;
        }
        
        const foro = foroDoc.data();
        
        // Mostrar modal para seleccionar programas, sedes y horarios
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 1000; display: flex;
            align-items: center; justify-content: center; padding: 2rem;
        `;
        
        // Obtener listas únicas de programas, sedes y horarios
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const programas = [...new Set(usersSnapshot.docs.map(d => d.data().programa).filter(p => p))];
        const sedes = [...new Set(usersSnapshot.docs.map(d => d.data().sede).filter(s => s))];
        const horarios = [...new Set(usersSnapshot.docs.map(d => d.data().horario).filter(h => h))];
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 500px; width: 100%; padding: 2rem;">
                <h3 style="margin-top: 0;">Aprobar Foro</h3>
                <p><strong>Foro:</strong> ${foro.titulo}</p>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Programas permitidos</label>
                    <select id="approvedPrograms" multiple style="width: 100%; padding: 0.5rem; height: 100px;">
                        ${programas.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                    <small style="color: #64748b;">Mantén Ctrl/Cmd para seleccionar varios. Deja vacío para todos.</small>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Sedes permitidas</label>
                    <select id="approvedSedes" multiple style="width: 100%; padding: 0.5rem; height: 80px;">
                        ${sedes.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                    <small style="color: #64748b;">Deja vacío para todas.</small>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Horarios permitidos</label>
                    <select id="approvedHorarios" multiple style="width: 100%; padding: 0.5rem; height: 80px;">
                        ${horarios.map(h => `<option value="${h}">${h}</option>`).join('')}
                    </select>
                    <small style="color: #64748b;">Deja vacío para todos.</small>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">Cancelar</button>
                    <button onclick="confirmApproveForo('${id}')" class="btn btn-primary">Aprobar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error approving foro:', error);
        alert('Error al aprobar el foro');
    }
}

/**
 * Confirmar aprobación de foro
 */
async function confirmApproveForo(id) {
    try {
        const programsSelect = document.getElementById('approvedPrograms');
        const sedesSelect = document.getElementById('approvedSedes');
        const horariosSelect = document.getElementById('approvedHorarios');
        
        const approvedPrograms = Array.from(programsSelect.selectedOptions).map(o => o.value);
        const approvedSedes = Array.from(sedesSelect.selectedOptions).map(o => o.value);
        const approvedHorarios = Array.from(horariosSelect.selectedOptions).map(o => o.value);
        
        await updateDoc(doc(db, 'foros', id), {
            status: 'approved',
            approvedPrograms: approvedPrograms,
            approvedSedes: approvedSedes,
            approvedHorarios: approvedHorarios,
            fechaAprobacion: new Date().toISOString()
        });
        
        alert('Foro aprobado exitosamente');
        
        // Cerrar modal
        document.querySelector('.modal-overlay').remove();
        
        // Recargar listas
        loadForosList();
        loadForosPendientes();
        
    } catch (error) {
        console.error('Error confirming approve:', error);
        alert('Error al aprobar el foro');
    }
}

/**
 * Ver detalle de un foro
 */
async function viewForo(foroId) {
    try {
        const foroDoc = await getDoc(doc(db, 'foros', foroId));
        if (!foroDoc.exists()) {
            alert('Foro no encontrado');
            return;
        }
        
        const foro = { id: foroDoc.id, ...foroDoc.data() };
        
        // Obtener respuestas
        const respuestasSnapshot = await getDocs(query(collection(db, 'respuestasForos'), where('foroId', '==', foroId), orderBy('fechaCreacion', 'asc')));
        const respuestas = respuestasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 1000; display: flex;
            align-items: center; justify-content: center; padding: 2rem;
        `;
        
        const fecha = new Date(foro.fechaCreacion).toLocaleString('es-ES');
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 700px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0;">${foro.titulo}</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                
                <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p>${foro.contenido}</p>
                    <small style="color: #64748b;">${foro.autorNombre} - ${fecha}</small>
                </div>
                
                <h4>Respuestas (${respuestas.length})</h4>
                
                ${respuestas.length === 0 ? 
                    '<p style="color: #64748b;">No hay respuestas aún</p>' : 
                    respuestas.map(r => `
                        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 0.5rem;">
                            <strong>${r.autorNombre}</strong>
                            <p style="margin: 0.5rem 0;">${r.contenido}</p>
                            <small style="color: #64748b;">${new Date(r.fechaCreacion).toLocaleString('es-ES')}</small>
                        </div>
                    `).join('')
                }
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error viewing foro:', error);
        alert('Error al cargar el foro');
    }
}

/**
 * Eliminar un foro
 */
async function deleteForo(id) {
    if (!confirm('¿Estás seguro de eliminar este hilo y todas sus respuestas?')) return;
    
    try {
        // Eliminar respuestas primero
        const respuestasSnapshot = await getDocs(query(collection(db, 'respuestasForos'), where('foroId', '==', id)));
        const deletePromises = respuestasSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        
        // Eliminar foro
        await deleteDoc(doc(db, 'foros', id));
        
        alert('Foro eliminado exitosamente');
        loadForosList();
        loadForosPendientes();
        
    } catch (error) {
        console.error('Error deleting foro:', error);
        alert('Error al eliminar el foro');
    }
}

/**
 * Mostrar modal para crear foro
 */
function showCreateForoModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 1000; display: flex;
        align-items: center; justify-content: center; padding: 2rem;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 600px; width: 100%;">
            <div style="padding: 2rem; border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Crear Nuevo Hilo</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <form id="createForoForm" style="padding: 2rem;" onsubmit="createForoAdmin(event)">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Título del Hilo</label>
                    <input type="text" name="titulo" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Contenido</label>
                    <textarea name="contenido" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; min-height: 150px;"></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Crear Hilo</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Crear un nuevo foro como admin
 */
async function createForoAdmin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const titulo = formData.get('titulo').trim();
    const contenido = formData.get('contenido').trim();
    
    if (!titulo || !contenido) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser || !currentUser.id) {
        alert('Debes iniciar sesión');
        return;
    }
    
    try {
        await addDoc(collection(db, 'foros'), {
            titulo: titulo,
            contenido: contenido,
            autorId: currentUser.id,
            autorNombre: currentUser.name || currentUser.email,
            status: 'approved',
            approvedPrograms: [],
            approvedSedes: [],
            approvedHorarios: [],
            fechaCreacion: new Date().toISOString(),
            respuestas: 0,
            activo: true
        });
        
        event.target.closest('.modal-overlay').remove();
        alert('Hilo creado exitosamente');
        loadForosList();
        
    } catch (error) {
        console.error('Error creating foro:', error);
        alert('Error al crear el hilo');
    }
}

// Exportar módulo
export default {
    name: 'foros',
    
    init: function() {
        console.log('Foros module initialized');
    },
    
    loadList: loadForosList,
    loadPendientes: loadForosPendientes,
    approve: approveForo,
    view: viewForo,
    delete: deleteForo,
    create: createForoAdmin,
    showCreateModal: showCreateForoModal,
    confirmApprove: confirmApproveForo
};

// Exponer globalmente
window.loadForosList = loadForosList;
window.loadForosPendientes = loadForosPendientes;
window.approveForo = approveForo;
window.confirmApproveForo = confirmApproveForo;
window.viewForo = viewForo;
window.deleteForo = deleteForo;
window.showCreateForoModal = showCreateForoModal;
window.createForoAdmin = createForoAdmin;

console.log('✅ Módulo de Foros admin cargado');
