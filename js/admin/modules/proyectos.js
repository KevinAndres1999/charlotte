/**
 * Módulo de Proyectos Estudiantiles - Charlotte Admin
 * 
 * Funciones para gestionar la revisión de proyectos empresariales de estudiantes.
 */

// Usar db global de admin.html
const db = window.db;
const { doc, getDoc, getDocs, collection, setDoc, deleteDoc, query, where, limit } = window;

// Definir estructura de campos por módulo (17 campos en total)
const PROJECT_STRUCTURE = {
    1: { title: 'Identificación del Negocio', fields: { nombre_negocio: 1, eslogan: 1, descripcion: 1, mision: 1, vision: 1 } },
    2: { title: 'Análisis de Mercado', fields: { cliente_ideal: 1, competencia: 1, propuesta_valor: 1 } },
    3: { title: 'Operaciones y Procesos', fields: { servicios_principales: 1, proceso_estrella: 1, recursos_necesarios: 1 } },
    4: { title: 'Marketing y Ventas', fields: { canales_venta: 1, estrategia_redes: 1, campaña_lanzamiento: 1 } },
    5: { title: 'Finanzas Básicas', fields: { inversion_inicial: 1, precio_venta: 1, proyeccion_ventas: 1 } }
};

// Títulos de los módulos
const MODULE_TITLES = {
    1: 'Identificación del Negocio',
    2: 'Análisis de Mercado y Clientes',
    3: 'Operaciones y Procesos',
    4: 'Plan de Marketing y Ventas',
    5: 'Finanzas Básicas'
};

// Funciones auxiliares
function formatProjectDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return 'N/A';
    }
}

function isPlaceholderAnswer(text) {
    if (!text || text.length < 5) return true;
    if (text.startsWith('[') && text.endsWith(']')) return true;
    if (/\[.*\]/i.test(text) && text.length < 100) return true;
    return false;
}

function getStepDescription(step) {
    const descriptions = {
        1: 'Definir especialización y tipo de negocio',
        2: 'Establecer objetivos del negocio',
        3: 'Análisis de mercado y competencia',
        4: 'Plan financiero y costos',
        5: 'Estrategias de marketing y ventas'
    };
    return descriptions[step] || '';
}

// Función para cargar todos los proyectos
// Variable global para almacenar todos los proyectos
let allProjectsData = [];
let deletedProjectsCount = 0;

async function loadProjects() {
    const container = document.getElementById('projectsList');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">Cargando proyectos...</p></div>';

    try {
        const projectsRef = collection(db, 'projects');
        const snapshot = await getDocs(projectsRef);
        
        if (snapshot.empty) {
            container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;"><i class="fas fa-info-circle" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">No hay proyectos para revisar</p></div>';
            updateStats([], {});
            return;
        }

        const projects = [];
        snapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });

        // Obtener todos los usuarios activos
        const activeUsers = new Set();
        const userNames = {};
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const email = userData.email?.toLowerCase();
            if (email) {
                activeUsers.add(email);
                userNames[email] = userData.name || userData.email;
            }
            activeUsers.add(doc.id.toLowerCase());
            userNames[doc.id.toLowerCase()] = userData.name || doc.id;
        });

        // LIMPIEZA AUTOMÁTICA: Eliminar proyectos de usuarios que ya no existen
        const projectsToDelete = [];
        projects.forEach(project => {
            const studentEmail = (project.userEmail || project.id || '').toLowerCase();
            const userExists = activeUsers.has(studentEmail);
            if (!userExists) {
                projectsToDelete.push(project.id);
            }
        });

        // Filtrar proyectos de usuarios eliminados
        const deletedSet = new Set(projectsToDelete);
        const validProjects = projects.filter(p => !deletedSet.has(p.id));
        
        // Si hay proyectos para eliminar, hacerlo en background
        if (projectsToDelete.length > 0) {
            console.log(`🗑️ Eliminando ${projectsToDelete.length} proyectos de usuarios eliminados...`);
            deletedProjectsCount = projectsToDelete.length;
            
            // Eliminar en background sin bloquear
            Promise.all(projectsToDelete.map(projectId => 
                deleteDoc(doc(db, 'projects', projectId))
                    .then(() => console.log(`✅ Proyecto ${projectId} eliminado`))
                    .catch(error => console.error(`❌ Error eliminando proyecto ${projectId}:`, error))
            )).then(() => {
                console.log(`✅ Limpieza completada. ${projectsToDelete.length} proyectos eliminados.`);
                if (typeof showNotification === 'function') {
                    showNotification(`✅ Se eliminaron ${projectsToDelete.length} proyectos automáticamente.`, 'success');
                }
            });
        }
        
        // Procesar TODOS los proyectos válidos (con o sin eliminación)
        allProjectsData = validProjects.map(project => {
            const studentEmail = (project.userEmail || project.id || '').toLowerCase();
            const userExists = activeUsers.has(studentEmail);
            const studentName = userNames[studentEmail] || project.userName || project.userEmail || project.id;
            
            // Calcular progreso
            let totalFields = 0;
            let completedFields = 0;
            let moduleProgress = [];
            
            for (let i = 1; i <= 5; i++) {
                const moduleData = project[`module_${i}`] || {};
                const moduleFieldCount = Object.keys(PROJECT_STRUCTURE[i].fields).length;
                const moduleCompletedFields = Object.values(moduleData).filter(field => 
                    field && (field.approved || (field.answer && field.answer.trim && field.answer.trim().length > 0))
                ).length;
                
                totalFields += moduleFieldCount;
                completedFields += moduleCompletedFields;
                
                const isCompleted = moduleCompletedFields >= moduleFieldCount;
                const hasProgress = moduleCompletedFields > 0;
                moduleProgress.push({ 
                    completed: isCompleted, 
                    hasProgress,
                    count: moduleCompletedFields,
                    total: moduleFieldCount
                });
            }
            
            const overallProgress = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
            
            return {
                ...project,
                studentName,
                studentEmail,
                userExists,
                totalFields,
                completedFields,
                overallProgress,
                moduleProgress
            };
        });

        // Actualizar estadísticas
        updateStats(allProjectsData, userNames);
        
        // Renderizar proyectos
        renderProjects(allProjectsData);

    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #dc2626;"><i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">Error al cargar proyectos</p></div>';
    }
}

// Función para actualizar estadísticas
function updateStats(projects, userNames) {
    const totalProjects = projects.length;
    const activeUserProjects = projects.filter(p => p.userExists).length;
    const completedProjects = projects.filter(p => p.overallProgress === 100).length;
    
    document.getElementById('stat-total').textContent = totalProjects;
    document.getElementById('stat-active').textContent = activeUserProjects;
    document.getElementById('stat-completed').textContent = completedProjects;
    document.getElementById('stat-deleted').textContent = deletedProjectsCount;
}

// Función para renderizar proyectos
function renderProjects(projects) {
    const container = document.getElementById('projectsList');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;"><i class="fas fa-info-circle" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">No hay proyectos que coincidan con los filtros</p></div>';
        return;
    }
    
    container.innerHTML = projects.map(project => {
        const userStatusBadge = project.userExists 
            ? '<span class="user-status-badge active"><i class="fas fa-check-circle"></i> Activo</span>'
            : '<span class="user-status-badge deleted"><i class="fas fa-exclamation-triangle"></i> Usuario Eliminado</span>';
        
        const cardClass = project.userExists ? 'project-card' : 'project-card user-deleted';
        
        return `
            <div class="${cardClass}" data-email="${project.studentEmail}" data-program="${project.program || ''}" data-progress="${project.overallProgress}" data-user-exists="${project.userExists}">
                <div class="project-header">
                    <div class="project-info">
                        <div class="project-student">
                            ${project.studentName}
                            ${userStatusBadge}
                        </div>
                        <div class="project-program">${project.program || project.userProgram || 'Programa'}</div>
                        <div class="project-metadata">
                            <div class="project-metadata-item">
                                <i class="fas fa-envelope"></i>
                                ${project.userEmail || project.id}
                            </div>
                            <div class="project-metadata-item">
                                <i class="fas fa-clock"></i>
                                ${formatProjectDate(project.lastUpdated)}
                            </div>
                            <div class="project-metadata-item">
                                <i class="fas fa-chart-line"></i>
                                ${project.completedFields}/${project.totalFields} campos
                            </div>
                        </div>
                    </div>
                    <div class="project-actions" style="display: flex; gap: 0.5rem; flex-direction: column;">
                        <button class="btn-review" onclick="reviewProject('${project.id}')">
                            <i class="fas fa-eye"></i> Revisar Proyecto
                        </button>
                        ${!project.userExists ? `
                            <button class="btn-delete-project" onclick="deleteProject('${project.id}', '${project.studentName}')">
                                <i class="fas fa-trash"></i> Eliminar Proyecto
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="project-progress">
                    ${project.moduleProgress.map((p, i) => 
                        `<div class="progress-step ${p.completed ? 'completed' : p.hasProgress ? 'in-progress' : ''}" title="Módulo ${i+1}: ${p.count}/${p.total} campos">${i + 1}</div>`
                    ).join('')}
                </div>
                <div style="margin: 0.75rem 0;">
                    <div style="background: #e2e8f0; border-radius: 999px; height: 10px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: ${project.overallProgress}%; transition: width 0.3s;"></div>
                    </div>
                </div>
                <div style="font-size: 0.9rem; color: #64748b; font-weight: 600;">
                    Progreso: ${project.overallProgress}%
                </div>
            </div>
        `;
    }).join('');
}

// Función para filtrar proyectos
function filterProjects() {
    const searchTerm = document.getElementById('searchProject')?.value.toLowerCase() || '';
    const filterProgram = document.getElementById('filterProgram')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    
    let filtered = allProjectsData.filter(project => {
        // Filtro de búsqueda
        const matchesSearch = !searchTerm || 
            project.studentName.toLowerCase().includes(searchTerm) ||
            project.studentEmail.toLowerCase().includes(searchTerm);
        
        // Filtro de programa
        const matchesProgram = !filterProgram || 
            (project.program || '').toLowerCase() === filterProgram.toLowerCase();
        
        // Filtro de estado
        let matchesStatus = true;
        if (filterStatus === 'active') {
            matchesStatus = project.userExists;
        } else if (filterStatus === 'completed') {
            matchesStatus = project.overallProgress === 100;
        } else if (filterStatus === 'in-progress') {
            matchesStatus = project.overallProgress > 0 && project.overallProgress < 100;
        }
        
        return matchesSearch && matchesProgram && matchesStatus;
    });
    
    renderProjects(filtered);
}

// Función para eliminar proyecto de usuario eliminado
async function deleteProject(projectId, studentName) {
    if (!confirm(`¿Estás seguro de eliminar el proyecto de "${studentName}"?\n\nEste usuario ya no existe en el sistema. Esta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const docRef = doc(db, 'projects', projectId);
        await window.deleteDoc(docRef);
        
        alert('✅ Proyecto eliminado correctamente');
        loadProjects(); // Recargar lista
    } catch (error) {
        console.error('Error eliminando proyecto:', error);
        alert('❌ Error al eliminar proyecto: ' + error.message);
    }
}

// Función para revisar un proyecto específico
async function reviewProject(projectId) {
    try {
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists) {
            alert('Proyecto no encontrado');
            return;
        }
        
        const project = docSnap.data();
        
        // Buscar nombre del estudiante
        let studentName = project.userName || project.userEmail || projectId;
        try {
            const userEmail = project.userEmail || projectId;
            const usersSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', userEmail), limit(1)));
            if (!usersSnapshot.empty) {
                const userData = usersSnapshot.docs[0].data();
                studentName = userData.name || studentName;
            }
        } catch (e) {
            console.log('No se pudo obtener nombre del usuario');
        }
        
        // Construir el contenido de los módulos
        let modulesHtml = '';
        for (let i = 1; i <= 5; i++) {
            const moduleData = project[`module_${i}`];
            if (moduleData && typeof moduleData === 'object' && Object.keys(moduleData).length > 0) {
                modulesHtml += `
                    <div class="project-step">
                        <div class="project-step-header">
                            <h4>Módulo ${i}: ${MODULE_TITLES[i]}</h4>
                        </div>
                        <div class="project-conversation">
                            ${Object.entries(moduleData).map(([fieldName, fieldData]) => {
                                const answerValue = fieldData.answer || '';
                                const originalValue = fieldData.original || '';
                                const isAnswerPlaceholder = isPlaceholderAnswer(answerValue);
                                
                                const answer = (isAnswerPlaceholder && originalValue && !isPlaceholderAnswer(originalValue)) 
                                    ? originalValue 
                                    : (answerValue || originalValue || '');
                                const isPlaceholder = isPlaceholderAnswer(answer);
                                const wasRecovered = isAnswerPlaceholder && !isPlaceholder;
                                
                                // Determinar estado y estilos
                                let statusIcon = '';
                                let statusClass = '';
                                let borderColor = '';
                                let bgColor = '';
                                
                                if (isPlaceholder) {
                                    statusIcon = '<span class="status-badge error">⚠️</span>';
                                    statusClass = 'error';
                                    borderColor = '#ef4444';
                                    bgColor = '#fef2f2';
                                } else if (fieldData.approved) {
                                    statusIcon = '<span class="status-badge approved">✅</span>';
                                    statusClass = 'approved';
                                    borderColor = '#10b981';
                                    bgColor = '#f0fdf4';
                                } else {
                                    statusIcon = '<span class="status-badge pending">⏳</span>';
                                    statusClass = 'pending';
                                    borderColor = '#f59e0b';
                                    bgColor = '#fffbeb';
                                }
                                
                                const displayAnswer = isPlaceholder 
                                    ? `<span style="color: #dc2626; font-style: italic;">⚠️ Respuesta no válida (placeholder): "${answerValue}"<br><small>El estudiante debe editar esta respuesta.</small></span>` 
                                    : (wasRecovered ? `<span style="color: #3b82f6;">📝 Respuesta original (IA con error): </span>${answer}` : answer);
                                
                                return `
                                    <div class="conversation-item" style="background: ${bgColor}; border-left: 4px solid ${borderColor};">
                                        <strong style="color: #1e3a8a;">
                                            <i class="fas fa-comment-dots" style="color: ${borderColor};"></i>
                                            ${fieldName.replace(/_/g, ' ')}
                                            ${statusIcon}
                                        </strong>
                                        <p style="margin: 0; color: #334155;">${displayAnswer}</p>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        if (!modulesHtml) {
            modulesHtml = '<div style="text-align: center; padding: 4rem; color: #94a3b8;"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i><p style="font-size: 1.125rem; font-weight: 600;">Este proyecto aún no tiene contenido.</p></div>';
        }
        
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'project-modal';
        modal.innerHTML = `
            <div class="project-modal-content">
                <div class="project-modal-header">
                    <div>
                        <h3><i class="fas fa-folder-open"></i> Proyecto de ${studentName}</h3>
                        <span class="student-email"><i class="fas fa-envelope"></i> ${project.userEmail || projectId}</span>
                    </div>
                    <button class="project-modal-close" onclick="this.closest('.project-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="project-modal-body">
                    ${modulesHtml}
                </div>
                
                <div class="feedback-section">
                    <h4>Comentarios del Docente</h4>
                    <textarea id="projectFeedback" placeholder="Escribe tus comentarios, recomendaciones y feedback para el estudiante..."></textarea>
                    <button class="btn btn-primary" onclick="saveProjectFeedback('${projectId}', this)">
                        <i class="fas fa-paper-plane"></i> Guardar Comentarios
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cargar feedback existente
        loadProjectFeedback(projectId);
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
    } catch (error) {
        console.error('Error reviewing project:', error);
        alert('Error al cargar el proyecto');
    }
}

// Función para guardar comentarios del docente
async function saveProjectFeedback(projectId, button) {
    const feedback = document.getElementById('projectFeedback').value.trim();
    if (!feedback) {
        alert('Por favor escribe un comentario');
        return;
    }
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    // Obtener el email del usuario actual desde el contexto global
    const currentUser = window.currentUser || JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    
    try {
        await setDoc(doc(db, 'project_feedback', projectId), {
            feedback,
            teacherEmail: currentUser?.email || 'admin@charlotte.com',
            timestamp: new Date()
        }, { merge: true });
        
        // Mostrar mensaje de éxito con animación
        button.innerHTML = '<i class="fas fa-check-circle"></i> ¡Guardado!';
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        
        setTimeout(() => {
            button.closest('.project-modal').remove();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving feedback:', error);
        alert('Error al guardar comentarios');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-paper-plane"></i> Guardar Comentarios';
    }
}

// Función para cargar feedback existente
async function loadProjectFeedback(projectId) {
    try {
        const docRef = doc(db, 'project_feedback', projectId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists) {
            const data = docSnap.data();
            const feedbackEl = document.getElementById('projectFeedback');
            if (feedbackEl) {
                feedbackEl.value = data.feedback || '';
            }
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
    }
}

// Exportar funciones globalmente
window.loadProjects = loadProjects;
window.reviewProject = reviewProject;
window.saveProjectFeedback = saveProjectFeedback;
window.loadProjectFeedback = loadProjectFeedback;
window.getStepDescription = getStepDescription;
window.filterProjects = filterProjects;
window.deleteProject = deleteProject;

// Exportar como módulo ES6 para compatibilidad
export default {
    name: 'proyectos',
    init: function() {
        console.log('Proyectos module initialized');
        this.exposeToGlobal();
    },
    exposeToGlobal: function() {
        if (typeof window.loadProjects !== 'function') {
            window.loadProjects = loadProjects;
        }
        if (typeof window.loadProjectFeedback !== 'function') {
            window.loadProjectFeedback = loadProjectFeedback;
        }
        console.log('✅ Funciones de Proyectos expuestas al ámbito global');
    }
};

console.log('✅ Módulo de Proyectos Estudiantiles cargado');
