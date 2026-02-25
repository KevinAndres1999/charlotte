/**
 * Módulo de Cuestionarios - Charlotte Estudiante
 * 
 * Funciones para gestionar cuestionarios del estudiante.
 */

// Variables globales del módulo
let allCuestionarios = [];
let filteredCuestionarios = [];
let currentCuestionariosViewMode = 'grid';

// Importar Firestore
const { getDocs, getDoc, doc, addDoc, updateDoc, collection, query, where, onSnapshot, setDoc } = window.firebaseFirestore || {};

/**
 * Cargar la lista de cuestionarios disponibles
 */
async function loadCuestionarios() {
    const container = document.getElementById('cuestionariosContainer');
    if (!container) return;

    try {
        // Cargar preguntas originales primero
        if (typeof cargarPreguntasOriginales === 'function') {
            await cargarPreguntasOriginales();
        }
        
        const snapshot = await getDocs(collection(db, 'cuestionarios'));
        allCuestionarios = [];
        snapshot.forEach(doc => {
            const cuestionario = { id: doc.id, ...doc.data() };
            // Agregar campos calculados
            cuestionario.isCompleted = false;
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
                        if (ultimaRespuesta.respuestas && cuestionario.preguntas && typeof recalcularCalificacion === 'function') {
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

/**
 * Ordenar cuestionarios por fecha
 */
function sortCuestionarios() {
    filteredCuestionarios.sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
}

/**
 * Actualizar estadísticas de cuestionarios
 */
function updateCuestionariosStats() {
    // Opcional: agregar estadísticas
}

/**
 * Renderizar la lista de cuestionarios
 */
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
        const isNew = cuestionario.fechaRegistro && (new Date() - new Date(cuestionario.fechaRegistro)) < (7 * 24 * 60 * 60 * 1000);
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

        const乳lpsoDisponibilidad = fechaInicio && fechaFin ? `Disponible del ${fechaInicio.toLocaleString('es-ES')} al ${fechaFin.toLocaleString('es-ES')}` : '';

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
                    ${乳lpsoDisponibilidad ? `<br><small style="color: #64748b;"><i class="fas fa-calendar-check"></i> ${乳lpsoDisponibilidad}</small>` : ''}
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
    }
}

/**
 * Cambiar modo de vista de cuestionarios
 */
function toggleCuestionariosView() {
    currentCuestionariosViewMode = currentCuestionariosViewMode === 'grid' ? 'list' : 'grid';
    renderCuestionarios();
}

/**
 * Filtrar cuestionarios
 */
function filterCuestionarios() {
    const searchTerm = document.getElementById('cuestionariosSearch')?.value.toLowerCase() || '';
    const estadoFilter = document.getElementById('cuestionariosFilter')?.value || 'all';
    
    filteredCuestionarios = allCuestionarios.filter(cuestionario => {
        const matchSearch = !searchTerm || 
            cuestionario.titulo?.toLowerCase().includes(searchTerm) ||
            cuestionario.descripcion?.toLowerCase().includes(searchTerm);
        
        let matchFilter = true;
        if (estadoFilter === 'completed') {
            matchFilter = cuestionario.isCompleted;
        } else if (estadoFilter === 'pending') {
            matchFilter = !cuestionario.isCompleted;
        }
        
        return matchSearch && matchFilter;
    });
    
    sortCuestionarios();
    renderCuestionarios();
}

/**
 * Cargar detalle de un cuestionario
 */
async function loadCuestionarioDetail(id) {
    try {
        const docRef = doc(db, 'cuestionarios', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const cuestionario = docSnap.data();
            const modalTitleEl = document.getElementById('modalTitle');
            if (modalTitleEl) modalTitleEl.textContent = cuestionario.titulo;

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

            const modalBodyEl = document.getElementById('modalBody');
            if (modalBodyEl) modalBodyEl.innerHTML = modalBody;
        }
    } catch (error) {
        console.error('Error loading cuestionario detail:', error);
        const modalBodyEl = document.getElementById('modalBody');
        if (modalBodyEl) modalBodyEl.innerHTML = '<p>Error al cargar el cuestionario</p>';
    }
}

/**
 * Enviar respuestas de un cuestionario
 */
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
        
        // Cerrar modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
        
        // Recargar cuestionarios
        loadCuestionarios();
    } catch (error) {
        console.error('Error submitting cuestionario:', error);
        alert('Error al enviar las respuestas');
    }
}

/**
 * Obtener reintentos disponibles para un estudiante
 */
async function getReintentosDisponibles(estudianteEmail) {
    try {
        const q = query(collection(db, 'reintentos'), where('estudianteEmail', '==', estudianteEmail));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting reintentos:', error);
        return [];
    }
}

/**
 * Obtener reintentos desde cache
 */
function getReintentosFromCache() {
    // Esta función debería usar una variable global cache si está disponible
    return window.reintentosCache || [];
}

/**
 * Filtrar por acceso de usuario
 */
function filterByUserAccess(cuestionarios, reintentosDisponibles) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) return [];
    
    return cuestionarios.filter(cuestionario => {
        // Si no tiene restricciones, permitir
        if (!cuestionario.approvedPrograms || cuestionario.approvedPrograms.length === 0) {
            return true;
        }
        
        // Verificar si el programa del usuario está en la lista de permitidos
        const userPrograma = currentUser.programa || '';
        return cuestionario.approvedPrograms.includes(userPrograma);
    });
}

// Funciones helper del módulo (existen en el HTML)
/**
 * Recalcular calificación (debe existir en utilities)
 */
function recalcularCalificacion(respuestas, preguntas) {
    if (typeof window.recalcularCalificacion === 'function') {
        return window.recalcularCalificacion(respuestas, preguntas);
    }
    
    // Fallback: cálculo básico
    let correctas = 0;
    preguntas.forEach((pregunta, index) => {
        if (pregunta.tipo === 'multiple' && pregunta.respuestaCorrecta !== undefined) {
            if (respuestas[index] == pregunta.respuestaCorrecta) {
                correctas++;
            }
        }
    });
    
    const totalPreguntas = preguntas.filter(p => p.tipo === 'multiple').length;
    return totalPreguntas > 0 ? Math.round((correctas / totalPreguntas) * 100) : 0;
}

/**
 * Cargar preguntas originales (debe existir en utilities)
 */
async function cargarPreguntasOriginales() {
    // Esta función debería estar en utilities
    if (typeof window.cargarPreguntasOriginales === 'function') {
        return window.cargarPreguntasOriginales();
    }
}

// Exponer funciones globalmente
window.loadCuestionarios = loadCuestionarios;
window.sortCuestionarios = sortCuestionarios;
window.updateCuestionariosStats = updateCuestionariosStats;
window.renderCuestionarios = renderCuestionarios;
window.toggleCuestionariosView = toggleCuestionariosView;
window.filterCuestionarios = filterCuestionarios;
window.loadCuestionarioDetail = loadCuestionarioDetail;
window.submitCuestionario = submitCuestionario;
window.getReintentosDisponibles = getReintentosDisponibles;
window.getReintentosFromCache = getReintentosFromCache;
window.filterByUserAccess = filterByUserAccess;

console.log('✅ Módulo de Cuestionarios estudiante cargado');
