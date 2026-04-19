/**
 * Módulo de Proyecto Empresarial - Charlotte Estudiante
 * 
 * Funciones para gestionar el proyecto empresarial del estudiante (Mi Proyecto).
 */

// Variables globales del módulo (compartidas con el HTML)
let projectData = {};
let projectConversations = [];
let currentModule = 1;
let currentField = null;
let awaitingStudentResponse = false;
let awaitingImprovement = false;
let awaitingModification = false;
let currentSuggestion = null;
let userProgram = null;

// Estructura del proyecto
const PROJECT_STRUCTURE = {
    1: { 
        title: 'Identificación del Negocio',
        fields: {
            nombre_negocio: { label: 'Nombre del negocio', placeholder: 'Ej: Panadería Delicia' },
            eslogan: { label: 'Eslogan', placeholder: 'Tu eslogan empresarial' },
            descripcion: { label: 'Descripción del negocio', placeholder: 'Describe tu negocio en pocas palabras' },
            mision: { label: 'Misión', placeholder: '¿Cuál es la misión de tu empresa?' },
            vision: { label: 'Visión', placeholder: '¿Cuál es la visión a futuro?' }
        }
    },
    2: {
        title: 'Análisis de Mercado',
        fields: {
            cliente_ideal: { label: 'Cliente ideal', placeholder: '¿Quién es tu cliente ideal?' },
            competencia: { label: 'Competencia', placeholder: '¿Quiénes son tus competidores?' },
            propuesta_valor: { label: 'Propuesta de valor', placeholder: '¿Qué te hace diferente?' }
        }
    },
    3: {
        title: 'Operaciones',
        fields: {
            servicios_principales: { label: 'Servicios principales', placeholder: '¿Qué productos/servicios ofrecerás?' },
            proceso_estrella: { label: 'Proceso estrella', placeholder: 'Describe tu proceso principal' },
            recursos_necesarios: { label: 'Recursos necesarios', placeholder: '¿Qué recursos necesitas?' }
        }
    },
    4: {
        title: 'Marketing',
        fields: {
            canales_venta: { label: 'Canales de venta', placeholder: '¿Cómo venderás?' },
            estrategia_redes: { label: 'Estrategia en redes', placeholder: '¿Cómo usarás redes sociales?' },
            campaña_lanzamiento: { label: 'Campaña de lanzamiento', placeholder: 'Plan para lanzar tu negocio' }
        }
    },
    5: {
        title: 'Finanzas',
        fields: {
            inversion_inicial: { label: 'Inversión inicial', placeholder: '¿Cuánto necesitas invertir?' },
            precio_venta: { label: 'Precio de venta', placeholder: '¿A qué precio venderás?' },
            proyeccion_ventas: { label: 'Proyección de ventas', placeholder: '¿Cuáles son tus expectativas?' }
        }
    }
};

// Función para reiniciar el proyecto
function resetProject() {
    if (!confirm('¿Estás seguro de que quieres reiniciar el proyecto? Se perderán todos los datos y conversaciones actuales.')) {
        return;
    }

    // Limpiar variables
    projectData = {};
    projectConversations = [];
    currentModule = 1;
    currentField = null;
    awaitingStudentResponse = false;
    awaitingImprovement = false;
    awaitingModification = false;
    currentSuggestion = null;
    userProgram = null;

    // Limpiar localStorage
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const projectKey = `project_${user.email}`;
    localStorage.removeItem(projectKey);

    // Limpiar Firebase
    if (window.db && user.email) {
        try {
            const { doc, deleteDoc } = window.firebaseFirestore || {};
            if (!doc || !deleteDoc) {
                console.warn('Firebase no disponible');
                return;
            }
            const docRef = doc(window.db, 'projects', user.email);
            deleteDoc(docRef)
                .then(() => console.log('✅ Proyecto eliminado de Firebase'))
                .catch(error => console.warn('⚠️ Error eliminando proyecto:', error.message));
        } catch (error) {
            console.warn('⚠️ Error al preparar eliminación en Firebase:', error.message);
        }
    }

    // Limpiar UI
    const chatEl = document.getElementById('projectChat');
    const summaryEl = document.getElementById('projectSummary');
    if (chatEl) chatEl.innerHTML = '';
    if (summaryEl) summaryEl.innerHTML = '';

    // Ocultar botones
    const completeBtn = document.getElementById('completeProjectBtn');
    const previewBtn = document.getElementById('previewProjectBtn');
    const printBtn = document.getElementById('printProjectBtn');
    if (completeBtn) completeBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (printBtn) printBtn.style.display = 'none';

    // Reinicializar pasos
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'hidden');
        if (index === 0) {
            step.classList.add('active');
        } else {
            step.classList.add('hidden');
        }
    });

    currentModule = 1;
    currentField = null;

    alert('Proyecto reiniciado exitosamente. Puedes comenzar de nuevo.');
}

// Función para actualizar el chat del proyecto
function updateProjectChat() {
    const chat = document.getElementById('projectChat');
    if (!chat) return;
    
    chat.innerHTML = '';
    
    projectConversations.forEach(conv => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${conv.role === 'user' ? 'user' : 'ai'}`;
        messageDiv.textContent = conv.content;
        chat.appendChild(messageDiv);
    });
    
    chat.scrollTop = chat.scrollHeight;
}

// Función para cargar proyectos existentes desde Firebase
async function loadExistingProjects() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;
    
    try {
        const { doc: docFn, getDoc } = window.firebaseFirestore;
        const docRef = docFn(window.db, 'projects', currentUser.email || currentUser.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const project = docSnap.data();
            console.log('Proyecto cargado desde Firebase:', project);
            
            // Cargar datos
            if (project.data) projectData = project.data;
            if (project.currentModule) currentModule = project.currentModule;
            if (project.currentField) currentField = project.currentField;
            if (project.userProgram) userProgram = project.userProgram;
            if (project.finalDocument) projectData.finalDocument = project.finalDocument;
            
            projectConversations = (project.conversations || []).map(conv => {
                if (conv.message && conv.type) {
                    return {
                        role: conv.type === 'user' ? 'user' : 'assistant',
                        content: conv.message
                    };
                }
                return conv;
            });

            // Mostrar botones
            const previewBtn = document.getElementById('previewProjectBtn');
            const printBtn = document.getElementById('printProjectBtn');
            const completeBtn = document.getElementById('completeProjectBtn');
            if (previewBtn) previewBtn.style.display = 'inline-block';
            if (printBtn) printBtn.style.display = 'inline-block';
            if (completeBtn) completeBtn.style.display = 'none';

            updateProjectChat();
            if (typeof updateProjectSummary === 'function') updateProjectSummary();
        }
    } catch (error) {
        console.error('Error al cargar proyectos existentes:', error);
    }
}

// Función para completar el proyecto
async function completeProject() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        alert('Debes iniciar sesión para completar el proyecto');
        return;
    }

    try {
        const completionData = {
            userId: currentUser.email || currentUser.id,
            userName: currentUser.displayName || currentUser.name || currentUser.email,
            completedAt: new Date().toISOString(),
            conversations: sanitizeForFirestore(projectConversations),
            summary: sanitizeForFirestore(typeof generateProjectSummary === 'function' ? generateProjectSummary() : {}),
            status: 'completed'
        };

        await window.setDoc(window.doc(window.db, 'projects', currentUser.email || currentUser.id), completionData, { merge: true });
        
        // Mostrar botones
        const previewBtn = document.getElementById('previewProjectBtn');
        const printBtn = document.getElementById('printProjectBtn');
        const completeBtn = document.getElementById('completeProjectBtn');
        if (previewBtn) previewBtn.style.display = 'inline-block';
        if (printBtn) printBtn.style.display = 'inline-block';
        if (completeBtn) completeBtn.style.display = 'none';
        
        alert('¡Proyecto completado exitosamente! Ya puedes generar tu plan de negocio.');
        
    } catch (error) {
        console.error('Error al completar proyecto:', error);
        alert('Error al completar el proyecto. Por favor intenta de nuevo.');
    }
}

// Función auxiliar para sanitizar datos para Firestore
function sanitizeForFirestore(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
    
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Date) {
            clean[key] = value.toISOString();
        } else if (typeof value === 'object' && value !== null) {
            clean[key] = sanitizeForFirestore(value);
        } else {
            clean[key] = value;
        }
    }
    return clean;
}

// Función para vista previa del proyecto
function previewProjectBook() {
    if (typeof generateProjectWithAI === 'function') {
        generateProjectWithAI('preview');
    } else {
        alert('Generando vista previa...');
    }
}

// Función para imprimir el proyecto
function printProjectBook() {
    if (typeof generateProjectWithAI === 'function') {
        generateProjectWithAI('print');
    } else {
        alert('Preparando para imprimir...');
    }
}

// Exportar funciones globalmente
window.resetProject = resetProject;
window.completeProject = completeProject;
window.previewProjectBook = previewProjectBook;
window.printProjectBook = printProjectBook;
window.updateProjectChat = updateProjectChat;
window.loadExistingProjects = loadExistingProjects;

// Exponer variables globales necesarias
window.projectData = projectData;
window.projectConversations = projectConversations;
window.currentModule = currentModule;

console.log('✅ Módulo de Proyecto Empresarial cargado');
