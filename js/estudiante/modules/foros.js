/**
 * Módulo de Foros - Charlotte Estudiante
 * 
 * Funciones para los foros de discusión de estudiantes.
 */

// Importar utilidades necesarias
const { getDocs, getDoc, doc, addDoc, updateDoc, collection, query, where, orderBy, onSnapshot } = window.firebaseFirestore || {};

// =================== FUNCIONES PARA FOROS ===================

/**
 * Cargar la lista de foros disponibles para el estudiante
 */
async function loadForosList() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser) return;

        // Fetch all foros and filter/sort client-side to avoid index requirement
        const snapshot = await getDocs(collection(db, 'foros'));
        const allForos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Separate approved and pending foros
        const approvedForos = allForos
            .filter(foro => foro.status === 'approved')
            .filter(foro => {
                // Check if user's program is in approvedPrograms (or empty means all)
                const userPrograma = currentUser.programa || '';
                const userSede = currentUser.sede || '';
                const userHorario = currentUser.horario || '';

                // Ensure arrays are actually arrays and handle null/undefined
                const foroPrograms = Array.isArray(foro.approvedPrograms) ? foro.approvedPrograms : [];
                const foroSedes = Array.isArray(foro.approvedSedes) ? foro.approvedSedes : [];
                const foroHorarios = Array.isArray(foro.approvedHorarios) ? foro.approvedHorarios : [];

                // Check matches - empty array means all users can see
                const programMatch = foroPrograms.length === 0 || foroPrograms.includes(userPrograma);
                const sedeMatch = foroSedes.length === 0 || foroSedes.includes(userSede);
                const horarioMatch = foroHorarios.length === 0 || foroHorarios.includes(userHorario);

                return programMatch && sedeMatch && horarioMatch;
            });
        
        // Show pending foros created by current user
        const myPendingForos = allForos
            .filter(foro => foro.status === 'pending' && foro.autorId === currentUser.id);
        
        // Combine and sort by creation date (newest first)
        const filteredForos = [...approvedForos, ...myPendingForos]
            .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

        const container = document.getElementById('forosList');
        if (filteredForos.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-comments"></i>
                    <h3>No hay hilos activos</h3>
                    <p>¡Sé el primero en crear un hilo de discusión!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredForos.map(foro => {
            const fecha = new Date(foro.fechaCreacion);
            const fechaRelativa = getRelativeTime(fecha);
            const fechaCompleta = fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const isPending = foro.status === 'pending';
            const statusBadge = isPending ? 
                '<span style="background: #fef3c7; color: #d97706; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem;">⏳ Pendiente</span>' : '';
            
            const respuestasCount = foro.respuestas || 0;
            
            return `
                <div class="content-card foro-card" onclick="viewForo('${foro.id}')">
                    <h4 style="display: flex; align-items: center; margin-bottom: 0.75rem;">
                        <span style="flex: 1;">${foro.titulo}</span>
                        ${statusBadge}
                    </h4>
                    <p style="color: #64748b; margin-bottom: 1rem; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                        ${foro.contenido ? foro.contenido.substring(0, 200) + (foro.contenido.length > 200 ? '...' : '') : '<em>Sin contenido</em>'}
                    </p>
                    <div class="meta">
                        <span><i class="fas fa-user"></i> ${foro.autorNombre}</span>
                        <span title="${fechaCompleta}"><i class="fas fa-clock"></i> ${fechaRelativa}</span>
                        <span><i class="fas fa-comments"></i> ${respuestasCount} ${respuestasCount === 1 ? 'respuesta' : 'respuestas'}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading foros:', error);
    }
}

/**
 * Función auxiliar para mostrar tiempo relativo
 */
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    if (days < 7) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    if (days < 30) {
        const weeks = Math.floor(days / 7);
        return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    }
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Filtrar foros por término de búsqueda
 */
function filterForos() {
    const searchTerm = document.getElementById('forosSearch').value.toLowerCase();
    const cards = document.querySelectorAll('#forosList .content-card');
    
    cards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();
        const content = card.querySelector('p').textContent.toLowerCase();
        const visible = title.includes(searchTerm) || content.includes(searchTerm);
        card.style.display = visible ? '' : 'none';
    });
}

/**
 * Mostrar modal para crear un nuevo foro
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
                    <h3 style="margin: 0; color: #1e40af;">Crear Nuevo Hilo</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <form id="createForoForm" style="padding: 2rem;" onsubmit="createForo(event)">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Título del Hilo</label>
                    <input type="text" name="titulo" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;" placeholder="Escribe un título descriptivo...">
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Contenido</label>
                    <textarea name="contenido" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; min-height: 150px; font-size: 1rem;" placeholder="Describe tu pregunta o tema de discusión..."></textarea>
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
 * Crear un nuevo foro
 */
async function createForo(event) {
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
        alert('Debes iniciar sesión para crear un foro');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        await addDoc(collection(db, 'foros'), {
            titulo: titulo,
            contenido: contenido,
            autorId: currentUser.id,
            autorNombre: currentUser.name || currentUser.email,
            programa: currentUser.programa || '',
            sede: currentUser.sede || '',
            horario: currentUser.horario || '',
            status: 'pending',
            approvedPrograms: [],
            approvedSedes: [],
            approvedHorarios: [],
            fechaCreacion: new Date().toISOString(),
            respuestas: 0,
            activo: true
        });
        
        event.target.closest('.modal-overlay').remove();
        alert('Hilo creado exitosamente. Espera la aprobación del administrador para que sea visible.');
        loadForosList();
        
    } catch (error) {
        console.error('Error creating foro:', error);
        alert('Error al crear el hilo');
    }
}

/**
 * Ver un foro específico con sus respuestas
 */
async function viewForo(foroId) {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
            alert('Debes iniciar sesión para ver el foro');
            window.location.href = 'login.html';
            return;
        }

        // Obtener el foro
        const foroDoc = await getDoc(doc(db, 'foros', foroId));
        if (!foroDoc.exists()) {
            alert('Foro no encontrado');
            return;
        }

        const foro = { id: foroDoc.id, ...foroDoc.data() };

        // Obtener respuestas del foro
        const respuestasQuery = query(
            collection(db, 'respuestasForos'),
            where('foroId', '==', foroId),
            orderBy('fechaCreacion', 'asc')
        );
        const respuestasSnapshot = await getDocs(respuestasQuery);
        const respuestas = respuestasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Crear modal para ver el foro completo
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 10000; 
            display: flex;
            align-items: center; 
            justify-content: center; 
            padding: 20px;
            animation: fadeIn 0.3s ease;
        `;

        const fechaForo = new Date(foro.fechaCreacion).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-comments"></i> ${foro.titulo}</h2>
                    <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
                </div>
                
                <div class="modal-body">
                    <!-- Autor y Fecha -->
                    <div style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1.5rem;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6, #1e3a8a); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                            ${foro.autorNombre.charAt(0).toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #0a1628;">${foro.autorNombre}</div>
                            <div style="font-size: 0.85rem; color: #64748b;">
                                <i class="fas fa-clock"></i> ${fechaForo} • 
                                <i class="fas fa-comments"></i> ${respuestas.length} ${respuestas.length === 1 ? 'respuesta' : 'respuestas'}
                            </div>
                        </div>
                    </div>

                    <!-- Contenido Principal -->
                    <div style="background: #f8fafc; border-left: 3px solid #3b82f6; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                        <div style="color: #0a1628; line-height: 1.7;">
                            ${foro.contenido ? foro.contenido.replace(/\n/g, '<br>') : '<em style="color: #64748b;">Sin contenido</em>'}
                        </div>
                    </div>

                    <!-- Respuestas -->
                    <div>
                        <h3 style="color: #1e3a8a; margin-bottom: 1rem;">
                            <i class="fas fa-comments"></i> Respuestas (${respuestas.length})
                        </h3>
                        
                        <div id="respuestas-container" style="margin-bottom: 1.5rem;">
                            ${respuestas.length === 0 ?
                                `<div class="empty-state">
                                    <i class="fas fa-comment-dots"></i>
                                    <p>No hay respuestas aún</p>
                                    <small>¡Sé el primero en compartir tu opinión!</small>
                                </div>` :
                                respuestas.map((respuesta, index) => {
                                    const fechaRespuesta = new Date(respuesta.fechaCreacion).toLocaleString('es-ES', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    return `
                                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                                            <div style="display: flex; align-items: start; gap: 0.75rem;">
                                                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #3b82f6, #1e3a8a); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.9rem; flex-shrink: 0;">
                                                    ${respuesta.autorNombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div style="flex: 1; min-width: 0;">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; gap: 0.5rem; flex-wrap: wrap;">
                                                        <strong style="color: #0a1628;">${respuesta.autorNombre}</strong>
                                                        <small style="color: #64748b; font-size: 0.8rem;">
                                                            <i class="fas fa-clock"></i> ${fechaRespuesta}
                                                        </small>
                                                    </div>
                                                    <div style="color: #374151; line-height: 1.6;">
                                                        ${respuesta.contenido.replace(/\n/g, '<br>')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')
                            }
                        </div>

                        <!-- Form de Respuesta -->
                        <div class="card" style="margin: 0;">
                            <h3><i class="fas fa-reply"></i> Agregar Respuesta</h3>
                            <form id="respuesta-form">
                                <textarea id="respuesta-content" placeholder="Escribe tu respuesta..." required
                                    style="width: 100%; min-height: 120px; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; font-family: inherit; font-size: 1rem; margin-bottom: 1rem;"></textarea>
                                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">
                                        Cancelar
                                    </button>
                                    <button type="submit" id="submit-respuesta-btn" class="btn btn-view">
                                        <i class="fas fa-paper-plane"></i> Enviar Respuesta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Manejar envío de respuesta
        const form = modal.querySelector('#respuesta-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const contenido = modal.querySelector('#respuesta-content').value.trim();
            if (!contenido) {
                alert('Por favor escribe una respuesta');
                return;
            }

            const submitBtn = modal.querySelector('#submit-respuesta-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            try {
                // Agregar respuesta a la colección
                await addDoc(collection(db, 'respuestasForos'), {
                    foroId: foroId,
                    contenido: contenido,
                    autorId: currentUser.id,
                    autorNombre: currentUser.name || currentUser.email,
                    fechaCreacion: new Date().toISOString()
                });

                // Actualizar contador de respuestas en el foro
                await updateDoc(doc(db, 'foros', foroId), {
                    respuestas: respuestas.length + 1
                });

                alert('Respuesta enviada exitosamente');
                modal.remove();

                // Recargar la lista de foros para actualizar el contador
                loadForosList();

            } catch (error) {
                console.error('Error sending respuesta:', error);
                alert('Error al enviar la respuesta');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Respuesta';
            }
        });

    } catch (error) {
        console.error('Error viewing foro:', error);
        alert('Error al cargar el foro');
    }
}

// Exponer funciones globalmente
window.loadForosList = loadForosList;
window.getRelativeTime = getRelativeTime;
window.filterForos = filterForos;
window.showCreateForoModal = showCreateForoModal;
window.createForo = createForo;
window.viewForo = viewForo;

console.log('✅ Módulo de Foros estudiante cargado');
