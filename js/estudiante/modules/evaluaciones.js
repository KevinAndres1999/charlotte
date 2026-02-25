/**
 * Módulo de Evaluaciones - Charlotte Estudiante
 * 
 * Funciones para gestionar evaluaciones del estudiante.
 */

// Variables globales del módulo
let allEvaluaciones = [];
let filteredEvaluaciones = [];
let currentEvaluacionesViewMode = 'grid';
let reintentosCache = [];

// Importar Firestore
const { getDocs, getDoc, doc, addDoc, updateDoc, collection, query, where, onSnapshot, setDoc } = window.firebaseFirestore || {};

/**
 * Cargar la lista de evaluaciones disponibles
 */
async function loadEvaluaciones() {
    const container = document.getElementById('evaluacionesList');
    if (!container) return;

    try {
        // Cargar preguntas originales primero
        if (typeof cargarPreguntasOriginales === 'function') {
            await cargarPreguntasOriginales();
        }
        
        const snapshot = await getDocs(collection(db, 'evaluaciones'));
        allEvaluaciones = [];
        snapshot.forEach(doc => {
            const evaluacion = { id: doc.id, ...doc.data() };
            // Agregar campos calculados
            evaluacion.isCompleted = false;
            evaluacion.progress = 0;
            allEvaluaciones.push(evaluacion);
        });

        // Cargar estado de respuestas con listener en tiempo real
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (currentUser) {
            const respuestasQuery = query(collection(db, 'respuestasEvaluaciones'), where('estudianteId', '==', currentUser.email));
            const reintentosQuery = query(collection(db, 'reintentosEvaluaciones'), where('estudianteId', '==', currentUser.email), where('usado', '==', false));
            
            // Cargar reintentos permitidos
            const reintentosSnapshot = await getDocs(reintentosQuery);
            const reintentosPermitidos = {};
            reintentosSnapshot.forEach(doc => {
                const reintento = doc.data();
                if (reintento.evaluacionId) {
                    reintentosPermitidos[reintento.evaluacionId] = { id: doc.id, ...reintento, tipo: 'evaluacion' };
                }
                if (reintento.cuestionarioId) {
                    reintentosPermitidos[reintento.cuestionarioId] = { id: doc.id, ...reintento, tipo: 'cuestionario' };
                }
            });
            
            // Actualizar cache global de reintentos
            reintentosCache = Object.values(reintentosPermitidos);
            window.reintentosCache = reintentosCache;
            
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
                        evaluacion.isCompleted = false;
                        evaluacion.progress = 0;
                        evaluacion.respuestas = null;
                        evaluacion.calificacionRecalculada = null;
                    } else if (misRespuestas.length > 0) {
                        evaluacion.isCompleted = true;
                        evaluacion.respuestas = misRespuestas;
                        evaluacion.progress = 100;
                        
                        // Calcular calificación
                        const ultimaRespuesta = misRespuestas[misRespuestas.length - 1];
                        if (ultimaRespuesta.respuestas && evaluacion.preguntas && typeof recalcularCalificacion === 'function') {
                            evaluacion.calificacionRecalculada = recalcularCalificacion(ultimaRespuesta.respuestas, evaluacion.preguntas);
                        }
                    } else {
                        evaluacion.isCompleted = false;
                        evaluacion.respuestas = null;
                        evaluacion.calificacionRecalculada = null;
                    }
                });
                
                const reintentosDisponibles = Object.values(reintentosPermitidos).filter(r => !r.usado);
                const filtered = filterByUserAccessEvaluaciones(allEvaluaciones, reintentosDisponibles);
                filteredEvaluaciones = filtered;
                sortEvaluaciones();
                updateEvaluacionesStats();
                renderEvaluaciones();
                
                // Actualizar las notas de evaluaciones en la sección de calificaciones por módulo
                if (typeof actualizarNotasEvaluacionesPorModulo === 'function') {
                    actualizarNotasEvaluacionesPorModulo();
                }
            }, (error) => {
                console.error('Error listening respuestas evaluaciones:', error);
            });
        }
    } catch (error) {
        console.error('Error al cargar evaluaciones:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>Error al cargar evaluaciones</h3><p>Intenta recargar la página</p></div>';
    }
}

/**
 * Ordenar evaluaciones por fecha
 */
function sortEvaluaciones() {
    filteredEvaluaciones.sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
}

/**
 * Actualizar estadísticas de evaluaciones
 */
function updateEvaluacionesStats() {
    // Opcional: agregar estadísticas
}

/**
 * Renderizar la lista de evaluaciones
 */
function renderEvaluaciones() {
    
    const container = document.getElementById('evaluacionesList');
    if (!container) {
        console.log('Container evaluacionesList not found');
        return;
    }

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-times"></i><h3>Acceso requerido</h3><p>Inicia sesión para ver las evaluaciones disponibles.</p></div>';
        return;
    }

    container.className = `clases-container ${currentEvaluacionesViewMode}-view`;

    container.innerHTML = filteredEvaluaciones.map((evaluacion, index) => {
        
        const fecha = evaluacion.fechaRegistro ? new Date(evaluacion.fechaRegistro).toLocaleDateString('es-ES') : 'Sin fecha';
        const fechaLimite = evaluacion.fechaLimite ? new Date(evaluacion.fechaLimite) : null;
        const fechaInicio = evaluacion.fechaInicio ? new Date(evaluacion.fechaInicio) : null;
        const fechaFin = evaluacion.fechaFin ? new Date(evaluacion.fechaFin) : null;
        const ahora = new Date();
        const vencido = fechaLimite && ahora > fechaLimite;
        const disponible = (!fechaInicio || ahora >= fechaInicio) && (!fechaFin || ahora <= fechaFin);
        const isNew = evaluacion.fechaRegistro && (new Date() - new Date(evaluacion.fechaRegistro)) < (7 * 24 * 60 * 60 * 1000);
        const intentosRealizados = evaluacion.intentosRealizados || 0;
        const maxIntentos = evaluacion.intentosMaximos || evaluacion.numeroIntentos || evaluacion.intentos || 1;
        const intentosRestantes = maxIntentos - intentosRealizados;
        
        // Verificar reintento permitido
        const tieneReintentoValido = evaluacion.reintentoPermitido && evaluacion.reintentoData;
        
        const puedeResponder = (disponible || tieneReintentoValido) && !vencido && (intentosRestantes > 0 || tieneReintentoValido);
        const isCompleted = evaluacion.isCompleted;
        const progress = isCompleted ? 100 : 0;

        const乳lpsoDisponibilidad = fechaInicio && fechaFin ? `Disponible del ${fechaInicio.toLocaleString('es-ES')} al ${fechaFin.toLocaleString('es-ES')}` : '';

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
                    ${乳lpsoDisponibilidad ? `<br><small style="color: #64748b;"><i class="fas fa-calendar-check"></i> ${乳lpsoDisponibilidad}</small>` : ''}
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
                        <i class="fas fa-play"></i> ${!disponible && !tieneReintentoValido ? 'No disponible en este momento' : isCompleted && !puedeResponder ? 'Ya has realizado todos los intentos posibles' : isCompleted ? 'Revisar Respuesta' : tieneReintentoValido ? 'Reintentar Evaluación' : 'Realizar Evaluación'}
                    </button>
                    ${isCompleted ? `<button class="btn-eye-clase" onclick="mostrarRespuestasModal('${evaluacion.id.replace(/'/g, '\\\'')}', 'evaluacion')" title="Ver respuestas detalladas">
                        <i class="fas fa-eye"></i>
                    </button>` : ''}
                </div>
                ${evaluacion.respuestas && evaluacion.respuestas.length > 0 ? `
                <div class="clase-calificacion">
                    <div class="calificacion-badge">
                        <i class="fas fa-star"></i> Calificación: ${evaluacion.calificacionRecalculada !== null && evaluacion.calificacionRecalculada !== undefined ? evaluacion.calificacionRecalculada + '%' : 'Pendiente'}
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
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-check"></i><h3>No hay evaluaciones disponibles</h3><p>No se encontraron evaluaciones que coincidan con tu búsqueda.</p></div>';
    }
}

/**
 * Cambiar modo de vista de evaluaciones
 */
function toggleEvaluacionesView() {
    currentEvaluacionesViewMode = currentEvaluacionesViewMode === 'grid' ? 'list' : 'grid';
    renderEvaluaciones();
}

/**
 * Filtrar evaluaciones
 */
function filterEvaluaciones() {
    const searchTerm = document.getElementById('evaluacionesSearch')?.value.toLowerCase() || '';
    const estadoFilter = document.getElementById('evaluacionesFilter')?.value || 'all';
    
    filteredEvaluaciones = allEvaluaciones.filter(evaluacion => {
        const matchSearch = !searchTerm || 
            evaluacion.titulo?.toLowerCase().includes(searchTerm) ||
            evaluacion.descripcion?.toLowerCase().includes(searchTerm);
        
        let matchFilter = true;
        if (estadoFilter === 'completed') {
            matchFilter = evaluacion.isCompleted;
        } else if (estadoFilter === 'pending') {
            matchFilter = !evaluacion.isCompleted;
        }
        
        return matchSearch && matchFilter;
    });
    
    sortEvaluaciones();
    renderEvaluaciones();
}

/**
 * Cargar detalle de una evaluación
 */
async function loadEvaluacionDetail(id) {
    try {
        const docRef = doc(db, 'evaluaciones', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const evaluacion = docSnap.data();
            const modalTitleEl = document.getElementById('modalTitle');
            if (modalTitleEl) modalTitleEl.textContent = evaluacion.titulo;

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            const respuestas = JSON.parse(localStorage.getItem('respuestasEvaluaciones') || '{}');
            const misClave = `${currentUser.email}_${id}`;
            const misIntentos = respuestas[misClave] || [];
            const intentosRestantes = (evaluacion.intentos || 1) - misIntentos.length;
            const fechaLimite = evaluacion.fechaLimite ? new Date(evaluacion.fechaLimite) : null;
            const vencido = fechaLimite && new Date() > fechaLimite;
            const puedeResponder = !vencido && intentosRestantes > 0;

            let modalBody = `
                <p><strong>Descripción:</strong> ${evaluacion.descripcion || 'Sin descripción'}</p>
                <p><strong>Tiempo disponible:</strong> ${evaluacion.tiempoLimite || 0} minutos</p>
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
                const preguntasHtml = evaluacion.preguntas.map((pregunta, index) => {
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
                        <h3><i class="fas fa-edit"></i> Realizar Evaluación</h3>
                        <form id="evaluacionForm">
                            ${preguntasHtml}
                            <button type="button" class="btn-modal btn-primary-modal" onclick="submitEvaluacion('${id}')">Enviar Respuestas</button>
                        </form>
                    </div>
                `;
            } else {
                modalBody += '<p>No puedes realizar esta evaluación (sin intentos restantes o vencida).</p>';
            }

            const modalBodyEl = document.getElementById('modalBody');
            if (modalBodyEl) modalBodyEl.innerHTML = modalBody;
        }
    } catch (error) {
        console.error('Error loading evaluacion detail:', error);
        const modalBodyEl = document.getElementById('modalBody');
        if (modalBodyEl) modalBodyEl.innerHTML = '<p>Error al cargar la evaluación</p>';
    }
}

/**
 * Enviar respuestas de una evaluación
 */
async function submitEvaluacion(evaluacionId) {
    const form = document.getElementById('evaluacionForm');
    const formData = new FormData(form);
    const respuestas = [];
    for (let [key, value] of formData.entries()) {
        const index = parseInt(key.replace('pregunta', ''));
        respuestas[index] = value;
    }
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    try {
        await addDoc(collection(db, 'respuestasEvaluaciones'), {
            evaluacionId,
            estudianteId: currentUser.email,
            respuestas,
            fechaRespuesta: new Date().toISOString()
        });
        alert('Respuestas enviadas exitosamente');
        
        // Cerrar modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
        
        // Recargar evaluaciones
        loadEvaluaciones();
    } catch (error) {
        console.error('Error submitting evaluacion:', error);
        alert('Error al enviar las respuestas');
    }
}

/**
 * Filtrar por acceso de usuario para evaluaciones
 */
function filterByUserAccessEvaluaciones(evaluaciones, reintentosDisponibles) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) return [];
    
    return evaluaciones.filter(evaluacion => {
        if (!evaluacion.approvedPrograms || evaluacion.approvedPrograms.length === 0) {
            return true;
        }
        
        const userPrograma = currentUser.programa || '';
        return evaluacion.approvedPrograms.includes(userPrograma);
    });
}

/**
 * Cargar calificaciones de evaluaciones
 */
async function loadEvaluacionesGrades(email) {
    try {
        const q = query(collection(db, 'respuestasEvaluaciones'), where('estudianteId', '==', email));
        const snapshot = await getDocs(q);
        
        const grades = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            grades.push({
                evaluacionId: data.evaluacionId,
                fecha: data.fechaRespuesta,
                calificacion: data.calificacion || 0
            });
        });
        
        return grades;
    } catch (error) {
        console.error('Error loading evaluaciones grades:', error);
        return [];
    }
}

// Exponer funciones globalmente
window.loadEvaluaciones = loadEvaluaciones;
window.sortEvaluaciones = sortEvaluaciones;
window.updateEvaluacionesStats = updateEvaluacionesStats;
window.renderEvaluaciones = renderEvaluaciones;
window.toggleEvaluacionesView = toggleEvaluacionesView;
window.filterEvaluaciones = filterEvaluaciones;
window.loadEvaluacionDetail = loadEvaluacionDetail;
window.submitEvaluacion = submitEvaluacion;
window.filterByUserAccessEvaluaciones = filterByUserAccessEvaluaciones;
window.loadEvaluacionesGrades = loadEvaluacionesGrades;
window.reintentosCache = reintentosCache;

console.log('✅ Módulo de Evaluaciones estudiante cargado');
