/**
 * Módulo de Proyectos Estudiantiles - Charlotte Admin
 * 
 * Funciones para gestionar la revisión de proyectos empresariales de estudiantes.
 */

// Usar db global de admin.html
const db = window.db;
const { doc, getDoc, getDocs, collection, setDoc, query, where, limit } = window;

// Definir estructura de campos por
// 4}0 módulo
const PROJECT_STRUCTURE = {
    1: { title: 'Identificación del Negocio', fields: { nombre_negocio: 1, tipo_negocio: 1, ubicacion: 1, descripcion: 1 } },
    2: { title: 'Análisis de Mercado', fields: { cliente_ideal: 1, competencia: 1, diferenciador: 1 } },
    3: { title: 'Operaciones y Procesos', fields: { procesos_clave: 1, proveedores: 1, equipamiento: 1 } },
    4: { title: 'Marketing y Ventas', fields: { canales_venta: 1, estrategia_precios: 1, promocion: 1 } },
    5: { title: 'Finanzas Básicas', fields: { inversion_inicial: 1, costos_fijos: 1, proyeccion_ventas: 1 } }
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
async function loadProjects() {
    const container = document.getElementById('projectsList');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">Cargando proyectos...</p></div>';

    try {
        const projectsRef = collection(db, 'projects');
        const snapshot = await getDocs(projectsRef);
        
        if (snapshot.empty) {
            container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;"><i class="fas fa-info-circle" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">No hay proyectos para revisar</p></div>';
            return;
        }

        const projects = [];
        snapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });

        // Obtener nombres de usuarios
        const userNames = {};
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.email) {
                userNames[userData.email.toLowerCase()] = userData.name || userData.email;
            }
            userNames[doc.id.toLowerCase()] = userData.name || doc.id;
        });

        container.innerHTML = projects.map(project => {
            // Contar campos completados
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
            
            const studentEmail = (project.userEmail || project.id || '').toLowerCase();
            const studentName = userNames[studentEmail] || project.userName || project.userEmail || project.id;
            
            return `
                <div class="project-card">
                    <div class="project-header">
                        <div>
                            <div class="project-student">${studentName}</div>
                            <div class="project-program">${project.program || project.userProgram || 'Programa'}</div>
                            <div style="font-size: 0.8rem; color: #94a3b8;">${project.userEmail || project.id}</div>
                        </div>
                        <div class="project-actions">
                            <button class="btn-review" onclick="reviewProject('${project.id}')">
                                <i class="fas fa-eye"></i> Revisar
                            </button>
                        </div>
                    </div>
                    <div class="project-progress">
                        ${moduleProgress.map((p, i) => 
                            `<div class="progress-step ${p.completed ? 'completed' : p.hasProgress ? 'in-progress' : ''}" title="Módulo ${i+1}: ${p.count}/${p.total} campos">${i + 1}</div>`
                        ).join('')}
                    </div>
                    <div style="margin: 0.75rem 0;">
                        <div style="background: #e2e8f0; border-radius: 999px; height: 8px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: ${overallProgress}%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; color: #64748b;">
                        ${completedFields}/${totalFields} campos (${overallProgress}%) • 
                        Última actualización: ${formatProjectDate(project.lastUpdated)}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #dc2626;"><i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">Error al cargar proyectos</p></div>';
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
                        <h4>Módulo ${i}: ${MODULE_TITLES[i]}</h4>
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
                                const approved = fieldData.approved && !isPlaceholder ? '✅' : (isPlaceholder ? '⚠️' : '⏳');
                                const borderColor = isPlaceholder ? '#dc2626' : (wasRecovered ? '#3b82f6' : (fieldData.approved ? '#10b981' : '#f59e0b'));
                                const displayAnswer = isPlaceholder 
                                    ? `<span style="color: #dc2626; font-style: italic;">⚠️ Respuesta no válida (placeholder): "${answerValue}"<br><small>El estudiante debe editar esta respuesta.</small></span>` 
                                    : (wasRecovered ? `<span style="color: #3b82f6;">📝 Respuesta original (IA con error): </span>${answer}` : answer);
                                return `
                                    <div class="conversation-item" style="margin-bottom: 1rem; padding: 1rem; background: ${isPlaceholder ? '#fef2f2' : '#f8fafc'}; border-radius: 8px; border-left: 3px solid ${borderColor};">
                                        <strong style="color: #1e3a8a;">${fieldName.replace(/_/g, ' ').toUpperCase()}</strong> ${approved}
                                        <p style="margin: 0.5rem 0 0 0; color: #334155;">${displayAnswer}</p>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        if (!modulesHtml) {
            modulesHtml = '<p style="color: #64748b; text-align: center; padding: 2rem;">Este proyecto aún no tiene contenido.</p>';
        }
        
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'project-modal';
        modal.innerHTML = `
            <div class="project-modal-content">
                <div class="project-modal-header">
                    <h3>Proyecto de ${studentName}</h3>
                    <span style="font-size: 0.85rem; color: #64748b;">${project.userEmail || projectId}</span>
                    <button onclick="this.closest('.project-modal').remove()">&times;</button>
                </div>
                
                ${modulesHtml}
                
                <div class="feedback-section">
                    <h4>Comentarios del Docente</h4>
                    <textarea id="projectFeedback" placeholder="Escribe tus comentarios y recomendaciones..."></textarea>
                    <button class="btn btn-primary" onclick="saveProjectFeedback('${projectId}', this)">
                        <i class="fas fa-save"></i> Guardar Comentarios
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cargar feedback existente
        loadProjectFeedback(projectId);
        
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
        
        alert('Comentarios guardados correctamente');
        button.closest('.project-modal').remove();
        
    } catch (error) {
        console.error('Error saving feedback:', error);
        alert('Error al guardar comentarios');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-save"></i> Guardar Comentarios';
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
