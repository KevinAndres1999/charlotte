import { getDoc, setDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

export function init(db) {
    // Usar getOpenRouterApiKey de window (definida en app.js)
    // Si no está disponible, retornar vacío
    const getOpenRouterApiKey = async () => {
        if (window.getOpenRouterApiKey && typeof window.getOpenRouterApiKey === 'function') {
            return await window.getOpenRouterApiKey();
        }
        return '';
    };

    // =================== SISTEMA DE CHAT CONVERSACIONAL ===================
    let projectData = {};
    let projectChat = [];
    let projectConversations = [];
    let awaitingApproval = false;
    let currentSuggestion = null;
    let userProgram = null;

    // Definir la estructura del proyecto final por módulos
    const projectStructure = {
        1: { // MÓDULO 1: IDENTIFICACIÓN DEL NEGOCIO
            title: "Capítulo 1: Identificación del Negocio",
            fields: {
                nombre_negocio: {
                    label: "Nombre del Negocio",
                    question: "¿Cuál será el nombre de tu negocio?",
                    validation: (answer) => answer.length >= 3,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO REAL: "Panadería Artesanal Del Sabor" - Nombre que transmite tradición, calidad y el arte de hacer pan. Evita nombres muy largos o difíciles de recordar.' :
                        '💡 EJEMPLO REAL: "Belleza Integral Luanna" - Combina el concepto de belleza con el nombre personalizado. Evita nombres muy genéricos como "Salón de Belleza".'
                },
                eslogan: {
                    label: "Eslogan",
                    question: "¿Cuál será el eslogan de tu negocio?",
                    validation: (answer) => answer.length >= 5,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO REAL: "El sabor que recuerda a casa" - Un eslogan emotivo que conecta con la nostalgia y la calidez del hogar. Debe ser memorable y reflejar tu esencia.' :
                        '💡 EJEMPLO REAL: "Donde tu belleza shine" - Un eslogan moderno y positivo que motiva a verse bien. Debe ser corto y fácil de recordar.'
                },
                descripcion: {
                    label: "Descripción del Negocio",
                    question: "Describe brevemente qué hace tu negocio y qué lo hace especial",
                    validation: (answer) => answer.length >= 20,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO ESTRUCTURADO: "Panadería artesanal especializada en productos frescos elaborados daily con harina orgánica y masa madre. Nuestra diferenciación: horneado en el momento, ingredientes locales de proveedores conocidos y productos sin conservantes. Ambiente acogedor donde el cliente puede ver la preparación."' :
                        '💡 EJEMPLO ESTRUCTURADO: "Estudio de belleza integral que ofrece tratamientos faciales, manicure, peinados y maquillaje profesional. Diferenciación: usamos productos orgánicos certificados, ambiente relajante con música suave, y horarios extendidos para comodidad de profesionales ocupadas."'
                },
                mision: {
                    label: "Misión",
                    question: "¿Cuál es la misión de tu negocio?",
                    validation: (answer) => answer.length >= 15,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO ESTRUCTURADO: "Brindar a nuestra comunidad acceso a productos de panadería artesanales de la más alta calidad, elaborados con ingredientes locales sostenibles, garantizando que cada cliente experimente el verdadero sabor del pan recién horneado mientras apoyamos a productores locales."' :
                        '💡 EJEMPLO ESTRUCTURADO: "Transformar la confianza y belleza de cada cliente mediante servicios de estética personalizados, utilizando productos de alta gama y técnicas innovadoras, en un ambiente donde se sientan únicos y mimados."'
                },
                vision: {
                    label: "Visión",
                    question: "¿Cuál es la visión de tu negocio a 2 años?",
                    validation: (answer) => answer.length >= 15,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO ESTRUCTURADO: "Convertirnos en la panadería de referencia en nuestra ciudad, reconocidos por la calidad premium de nuestros productos y el servicio al cliente excepcional, logrando expandrirnos a 3 sucursales y emplear a 15 personas especializadas."' :
                        '💡 EJEMPLO ESTRUCTURADO: "Posicionarnos como el estudio de belleza más recomendado en la zona, con una base de clientas fidelizadas que nos recomiendan activamente, planificando abrir una segunda sucursal en 3 años."'
                }
            }
        },
        2: { // MÓDULO 2: ANÁLISIS DE MERCADO Y CLIENTES
            title: "Capítulo 2: Análisis de Mercado y Clientes",
            fields: {
                cliente_ideal: {
                    label: "Perfil del Cliente Ideal",
                    question: "Describe a tu cliente ideal (edad, género, profesión, intereses, etc.)",
                    validation: (answer) => answer.length >= 30,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO ESTRUCTURADO: "Perfil: Mujeres de 30-50 años, profesionales o amas de casa, nivel socioeconómico medio-alto. Características: Valoran productos naturales y saludables, tienen poder adquisitivo para invertir en calidad, buscan experiencias gourmet. Comportamiento: Compran para ocasiones especiales y uso diario familiar, sensibles a promociones por redes sociales."' :
                        '💡 EJEMPLO ESTRUCTURADO: "Mujeres de 25-45 años, profesionales o emprendedoras. Características: Valoran la imagen personal, tienen poco tiempo pero buscan resultados efectivos, dispuestas a invertir en cuidado personal. Comportamiento: Agendan citas con anticipación, refieren a amigas, buscan paquetes de servicios."'
                },
                competencia: {
                    label: "Análisis de Competencia",
                    question: "Menciona 2-3 competidores principales y qué hacen mejor/peor que tú",
                    validation: (answer) => answer.length >= 50,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO ESTRUCTURADO: "1) Panadería La Familiar: Buena ubicación centro comercial, productos variados, pero masa congelada. MI VENTAJA: masa fresca diaria. 2) Supermercado-local: Precios bajos, horarios amplios, pero calidad baja. MI VENTAJA: productos artesanales premium. 3) Delivery apps: Comodidad, pero comisiones altas. MI VENTAJA: atención personalizada y productos únicos."' :
                        '💡 EJEMPLO ESTRUCTURADO: "1) Salones de belleza tradicionales: Precios accesibles, mucha trayectoria, pero horarios rígidos. MI VENTAJA: horarios flexibles y ambiente moderno. 2) Spas: Experiencia premium, pero precios muy altos. MI VENTAJA: relación calidad-precio. 3) Freelancers a domicilio: Precios bajos, pero sin estructura. MI VENTAJA: local profesional con esterilización."'
                },
                propuesta_valor: {
                    label: "Propuesta Única de Valor",
                    question: "¿Qué te diferencia de la competencia? ¿Cuál es tu ventaja única?",
                    validation: (answer) => answer.length >= 20,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO: "Somos la única panadería en la zona que usa masa madre cultivada artesanalmente por más de 30 años, horneada 2 veces al día (mañana y tarde) para garantizar frescura. Además, ofrecems degustaciones gratuitas y talleres de panadería."' :
                        '💡 EJEMPLO: "Somos el único studio en la zona que ofrece diagnóstico facial gratuito con cámara de análisis,使用的是 tecnología de última generación para personalización exacta de tratamientos."'
                }
            }
        },
        3: { // MÓDULO 3: OPERACIONES Y PROCESOS
            title: "Capítulo 3: Operaciones y Procesos",
            fields: {
                servicios_principales: {
                    label: "Servicios/Productos Principales",
                    question: "Lista tus 3-4 servicios o productos principales",
                    validation: (answer) => {
                        // Más flexible: al menos 20 caracteres Y mencionar al menos 2 productos/servicios
                        const hasMinimumLength = answer.length >= 20;
                        const hasMultipleItems = answer.split(/[,;]/).length >= 2 || answer.toLowerCase().includes(' y ') || answer.toLowerCase().includes(' y ');
                        return hasMinimumLength && hasMultipleItems;
                    },
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO ESTRUCTURADO: "1) Pan de masa madre ($n): Pan artesanal de fermentación lenta 48h. 2) Croissants de mantequilla ($c/u): Tradicionales franceses, hojaldre perfecto. 3) Pasteles personalizados (desde $n): Decorados para bodas y cumpleaños. 4) Pan dulce artesanal ($p): Recetas familiares exclusivas."' :
                        '💡 EJEMPLO ESTRUCTURADO: "1) Tratamientos faciales (desde $n): Limpieza, hidratación y rejuvenecimiento. 2) Manicure y pedicura (desde $c/u): Semipermanente y tradicional. 3) Peinados para eventos (desde $n): Recogidos y ondas. 4) Maquillaje social (desde $n): Para fiestas y eventos especiales."'
                },
                proceso_estrella: {
                    label: "Proceso de tu Servicio/Producto Estrella",
                    question: "Describe paso a paso cómo produces o realizas tu servicio/producto principal",
                    validation: (answer) => answer.length >= 50,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO ESTRUCTURADO (para un pastel personalizado): "Paso 1: Consulta con el cliente (30 min) - conocer ocasión, gustos, preferencias alimentarias. Paso 2: Diseño y presupuesto (15 min) - presentar propuestas visuales. Paso 3: Preparación base (2 horas) - hornear bizcocho, preparar buttercream. Paso 4: Decoración (3-4 horas) - fondant, decorados, personalización. Paso 5: Empaque y entrega (30 min) - caja térmica, transporte seguro."' :
                        '💡 EJEMPLO ESTRUCTURADO (para tratamiento facial): "Paso 1: Recepción y更衣 (10 min) - cambiar bata,卸妆. Paso 2: Análisis de piel (15 min) - usar lámpara LED para evaluar condición. Paso 3: Limpieza profunda (20 min) - desincrustación de impurezas. Paso 4: Tratamiento específico (30 min) - según necesidad del cliente. Paso 5: Hidratación y protector (15 min) - sellar tratamiento. Paso 6: Recomendaciones hogar (10 min) - indicar rutina diaria."'
                },
                recursos_necesarios: {
                    label: "Recursos Necesarios",
                    question: "Lista los equipos, insumos y recursos principales que necesitas",
                    validation: (answer) => answer.length >= 30,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO ESTRUCTURADO: "EQUIPOS: Horno convector (~$800), Amasadora profesional (~$400), Batidora de pedestal (~$200), Refrigerador mostrador (~$600). INSUMOS: Harina orgánica (25kg/$50), Mantequilla premium (10kg/$80), Levadura fresca ($15/kg), Huevos农场 ($4/docena). OTROS: Empaques biodegradables, Uniformes, Cámara de celular para fotos productos."' :
                        '💡 EJEMPLO ESTRUCTURADO: "EQUIPOS: Silla reclinable profesional (~$300), Lámpara LED de análisis (~$150), Cama estética (~$400), Esterilizador UV (~$100). INSUMOS: Cremas faciales profesionales (~$200-kit), Esmaltes semipermanentes (~$80-kit), Productos desechables (guantes, batas) (~$50/mes). OTROS: Camilla de cambio, Espejo grande, Decoración ambientadora."'
                }
            }
        },
        4: { // MÓDULO 4: PLAN DE MARKETING Y VENTAS
            title: "Capítulo 4: Plan de Marketing y Ventas",
            fields: {
                canales_venta: {
                    label: "Canales de Venta",
                    question: "¿Cómo venderás tus productos/servicios? (ej: local físico, redes sociales, etc.)",
                    validation: (answer) => answer.length >= 20,
                    example: (program) => program === 'panaderia' ?
                        '💡 EJEMPLO: "1) LOCAL FÍSICO: En calle principal del barrio, visibilidad alta. 2) WHATSAPP: Pedidos personalizados, entrega a domicilio. 3) FERIAS: Presencia en mercados locales los domingos."' :
                        '💡 EJEMPLO: "1) ESTUDIO: Solo con cita previa, ambiente exclusivo. 2) INSTAGRAM: Portafolio de trabajos, agendar. 3) WHATSAPP: Citas y promociones."'
                },
                estrategia_redes: {
                    label: "Estrategia en Redes Sociales",
                    question: "Describe tu estrategia de marketing digital (redes sociales, contenido, etc.)",
                    validation: (answer) => answer.length >= 40,
                    example: (program) => program === 'panaderia' ?
                        'Ejemplo: "Instagram: Fotos de productos diarios, Stories del proceso de elaboración, Reels de recetas"' :
                        'Ejemplo: "Instagram: Antes/después de tratamientos, Tips de belleza, Stories de la rutina diaria del estudio"'
                },
                campaña_lanzamiento: {
                    label: "Campaña de Lanzamiento",
                    question: "Describe tu plan para atraer los primeros clientes",
                    validation: (answer) => answer.length >= 30,
                    example: (program) => program === 'panaderia' ?
                        'Ejemplo: "Día de apertura: Degustaciones gratuitas, Descuentos 20% primera semana, Flyers en el barrio"' :
                        'Ejemplo: "Primeras 10 clientas: 30% descuento + Foto profesional incluida para sus redes sociales"'
                }
            }
        },
        5: { // MÓDULO 5: FINANZAS BÁSICAS
            title: "Capítulo 5: Finanzas Básicas",
            fields: {
                inversion_inicial: {
                    label: "Inversión Inicial Estimada",
                    question: "Lista los principales gastos de inversión inicial con montos aproximados",
                    validation: (answer) => answer.length >= 40,
                    example: (program) => program === 'panaderia' ?
                        'Ejemplo: "Horno industrial: $2000, Amasadora: $800, Materias primas iniciales: $300, Remodelación local: $1500"' :
                        'Ejemplo: "Equipos profesionales: $1200, Productos iniciales: $400, Remodelación estudio: $1000, Marketing inicial: $300"'
                },
                precio_venta: {
                    label: "Precio de Venta y Utilidad",
                    question: "Define el precio de tu producto/servicio estrella y calcula la utilidad aproximada",
                    validation: (answer) => answer.length >= 30,
                    example: (program) => program === 'panaderia' ?
                        'Ejemplo: "Pan de masa madre: Costo $2, Precio venta $5, Utilidad $3 por unidad"' :
                        'Ejemplo: "Corte de cabello: Costo $3, Precio venta $15, Utilidad $12 por servicio"'
                },
                proyeccion_ventas: {
                    label: "Proyección de Ventas (3 meses)",
                    question: "Estima tus ventas para los primeros 3 meses de operación",
                    validation: (answer) => answer.length >= 30,
                    example: (program) => program === 'panaderia' ?
                        'Ejemplo: "Mes 1: 200 unidades/día, Mes 2: 250 unidades/día, Mes 3: 300 unidades/día"' :
                        'Ejemplo: "Mes 1: 8 servicios/semana, Mes 2: 12 servicios/semana, Mes 3: 15 servicios/semana"'
                }
            }
        }
    };

    // Variables para el sistema de consultoría
    let currentField = null;
    let currentModule = 1;
    let awaitingStudentResponse = false;
    let awaitingImprovement = false;
    let awaitingModification = false;
    
    // Variables para el modo de revisión de módulos
    window.moduleFieldsToReview = null;
    window.currentReviewModule = null;

    // ===== SISTEMA DE CONSULTORÍA INTERACTIVA =====
    // Funciones para el nuevo sistema de consultoría

    function startConsultation() {
        currentModule = 1;
        currentField = null;

        // Mostrar mensaje de bienvenida SIN PREGUNTA
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        
        // Determinar el programa basado en el usuario actual
        let programName = 'Belleza Integral'; // default
        if (currentUser && currentUser.programa) {
            const programa = currentUser.programa.toLowerCase();
            if (programa.includes('panader') || programa.includes('pasteler') || programa.includes('panadería') || programa.includes('pastelería')) {
                programName = 'Panadería y Pastelería';
            } else if (programa.includes('bellez') || programa.includes('estetic') || programa.includes('belleza')) {
                programName = 'Belleza Integral';
            }
        }

        addChatMessage(`¡Hola ${currentUser?.name || 'estudiante'}! Soy Charlotte, tu consultora especializada en emprendimiento para ${programName}. Vamos a crear juntos tu proyecto de negocio paso a paso, desarrollando un plan sólido y profesional.`, 'ai');

        // Mostrar el primer campo INMEDIATAMENTE sin delay
        setTimeout(() => {
            showNextField();
        }, 1000);
    }

    function showNextField() {
        const module = projectStructure[currentModule];
        if (!module) {
            // Proyecto completado
            completeConsultationProject();
            return;
        }

        // Verificar si el módulo actual está completo
        const moduleData = projectData[currentModule] || {};
        const fields = Object.keys(module.fields);
        const completedFieldsInModule = fields.filter(fieldKey => 
            moduleData[fieldKey]?.approved || (moduleData[fieldKey]?.answer && moduleData[fieldKey]?.answer.trim().length > 0)
        );

        if (completedFieldsInModule.length >= fields.length) {
            // Módulo completado, pasar al siguiente
            currentModule++;
            currentField = null;
            addChatMessage(`¡Excelente! Has completado el ${module.title}. Pasemos al siguiente módulo.`, 'ai');
            setTimeout(() => showNextField(), 2000);
            return;
        }

        // Encontrar el siguiente campo incompleto
        const nextIncompleteField = fields.find(fieldKey => 
            !moduleData[fieldKey] || (!moduleData[fieldKey]?.approved && (!moduleData[fieldKey]?.answer || moduleData[fieldKey]?.answer.trim().length === 0))
        );

        if (nextIncompleteField) {
            currentField = nextIncompleteField;
        } else {
            // Todos los campos están completos, pasar al siguiente módulo
            currentModule++;
            currentField = null;
            addChatMessage(`¡Excelente! Has completado el ${module.title}. Pasemos al siguiente módulo.`, 'ai');
            setTimeout(() => showNextField(), 2000);
            return;
        }

        const field = module.fields[currentField];

        // Mostrar información del campo
        addChatMessage(`${module.title} - ${field.label}`, 'ai');
        addChatMessage(field.question, 'ai');

        // Mostrar ejemplo si existe
        if (field.example) {
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            let program = 'belleza'; // default
            if (currentUser && currentUser.programa) {
                const programa = currentUser.programa.toLowerCase();
                if (programa.includes('panader') || programa.includes('pasteler') || programa.includes('panadería') || programa.includes('pastelería')) {
                    program = 'panaderia';
                } else if (programa.includes('bellez') || programa.includes('estetic') || programa.includes('belleza')) {
                    program = 'belleza';
                }
            }
            const example = field.example(program);
            addChatMessage(`💡 ${example}`, 'ai');
        }

        // Habilitar input para respuesta
        showInputForField(field);
    }

    function showInputForField(field) {
        const inputContainer = document.getElementById('projectInputContainer');
        const input = document.getElementById('projectInput');

        inputContainer.style.display = 'block';
        input.focus();
        input.placeholder = 'Escribe tu respuesta aquí...';

        // Marcar que estamos esperando respuesta del estudiante
        awaitingStudentResponse = true;
    }

    function processStudentResponse(response) {
        if (!currentField || !currentModule) return;

        const module = projectStructure[currentModule];
        const field = module.fields[currentField];

        // Validar respuesta
        if (!field.validation(response)) {
            addChatMessage(`Tu respuesta es muy corta o no cumple con los requisitos. Por favor, proporciona una respuesta más detallada.`, 'ai');
            return;
        }

        // Guardar respuesta como aprobada (la IA puede sugerir mejoras pero la respuesta es válida)
        if (!projectData[currentModule]) projectData[currentModule] = {};
        projectData[currentModule][currentField] = {
            answer: response,
            approved: true, // Marcar como aprobado inmediatamente
            timestamp: new Date().toISOString()
        };

        // Analizar respuesta con IA para sugerencias de mejora (opcional)
        analyzeResponseWithAI(response, field);

        saveProjectProgress();
    }

    function extractOptionsFromAnalysis(analysis) {
        const options = [];
        const lines = analysis.split('\n');

        // Buscar patrones comunes de opciones numeradas
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Buscar líneas que empiecen con números (1., 1), (1:, etc.)
            const optionMatch = line.match(/^(\d+)[\.\:\)\s]+(.+)$/i);
            if (optionMatch) {
                const optionNumber = parseInt(optionMatch[1]);
                let optionText = optionMatch[2].trim();

                // Remover caracteres de puntuación al final
                optionText = optionText.replace(/[.,;:!?]$/, '');

                options.push({
                    number: optionNumber,
                    text: optionText
                });
            }

            // Buscar patrones como "Opción 1:", "Option 1:", etc.
            const opcionMatch = line.match(/^(?:Opción|Option|MEJORA)\s+(\d+)[\:\s]+(.+)$/i);
            if (opcionMatch && !options.find(opt => opt.number === parseInt(opcionMatch[1]))) {
                const optionNumber = parseInt(opcionMatch[1]);
                let optionText = opcionMatch[2].trim();

                // Remover caracteres de puntuación al final
                optionText = optionText.replace(/[.,;:!?]$/, '');

                options.push({
                    number: optionNumber,
                    text: optionText
                });
            }
            
            // Buscar patrones como "NUEVA OPCIÓN 1:", "NUEVA OPCION 1:", etc. (para showMoreOptions)
            const nuevaOpcionMatch = line.match(/^(?:NUEVA\s+)?OPCION(?:IÓN)?\s+(\d+)[\:\s]+(.+)$/i);
            if (nuevaOpcionMatch && !options.find(opt => opt.number === parseInt(nuevaOpcionMatch[1]))) {
                const optionNumber = parseInt(nuevaOpcionMatch[1]);
                let optionText = nuevaOpcionMatch[2].trim();

                // Remover caracteres de puntuación al final
                optionText = optionText.replace(/[.,;:!?]$/, '');

                options.push({
                    number: optionNumber,
                    text: optionText
                });
            }
        }

        // Ordenar opciones por número
        options.sort((a, b) => a.number - b.number);

        return options;
    }

    // ===== HISTORIAL DE CHAT CON IA =====
    let aiChatHistory = [];
    
    // Función para guardar historial en localStorage
    function saveChatHistory() {
        try {
            localStorage.setItem('ai_chat_history', JSON.stringify(aiChatHistory));
        } catch(e) {
            console.warn('No se pudo guardar historial:', e);
        }
    }
    
    // Función para cargar historial
    function loadChatHistory() {
        try {
            const saved = localStorage.getItem('ai_chat_history');
            if (saved) {
                aiChatHistory = JSON.parse(saved);
            }
        } catch(e) {
            console.warn('No se pudo cargar historial:', e);
        }
    }
    
    // Inicializar historial al cargar
    loadChatHistory();

    // ===== ANÁLISIS DE IA MEJORADO =====
    async function analyzeResponseWithAI(response, field) {
        try {
            showTypingIndicator();

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            
            // Obtener contexto del estudiante
            let programName = 'Belleza Integral';
            let sectorTips = '';
            let studentName = 'Estudiante';
            
            if (currentUser) {
                studentName = currentUser.displayName || currentUser.name || currentUser.email.split('@')[0];
                
                if (currentUser.programa) {
                    const programa = currentUser.programa.toLowerCase();
                    if (programa.includes('panader') || programa.includes('pasteler')) {
                        programName = 'Panadería y Pastelería';
                        sectorTips = `Ejemplos para panadería: productos artesanales, masas madre, pasteles personalizados, pan dulce, repostería fina.`;
                    } else if (programa.includes('bellez') || programa.includes('estetic')) {
                        programName = 'Belleza Integral';
                        sectorTips = `Ejemplos para belleza: tratamientos faciales, manicure, peinados, maquillaje profesional, asesoría de imagen.`;
                    }
                }
            }
            
            // Obtener progreso del estudiante
            const progreso = getProjectProgress();
            const modulosCompletados = Object.keys(progreso).filter(k => progreso[k] > 0).length;
            
            // Construir historial para contexto
            const historyContext = aiChatHistory.slice(-5).map(msg => 
                `${msg.role === 'user' ? studentName : 'Charlotte'}: ${msg.content}`
            ).join('\n');

            const prompt = `Eres Charlotte, consultora especializada en emprendimiento para ${programName}.

${historyContext ? `CONVERSACIÓN RECIENTE:\n${historyContext}\n` : ''}
=== INFORMACIÓN DEL ESTUDIANTE ===
- Nombre: ${studentName}
- Programa: ${programName}
- Módulos completados: ${modulosCompletados}/5
- Campo actual: ${field.label}
- Respuesta original del estudiante: "${response}"

${sectorTips}

INSTRUCCIONES OBLIGATORIAS - MUY IMPORTANTE:
1. La respuesta original del estudiante es: "${response}"
2. Debes TOMAR esa respuesta y MEJORARLA profesionalmente
3. Las 3 opciones deben ser versiones MEJORADAS de esa respuesta específica
4. NO inventes nuevos conceptos - MEJORA los que el estudiante ya dio
5. Cada opción debe mantener la esencia de lo que el estudiante escribió
6. Mejora la redacción, hazla más profesional, pero conserva las ideas principales

Formato obligatorio - cada línea debe empezar con "MEJORA":
MEJORA 1: [primera versión mejorada de "${response}"]
MEJORA 2: [segunda versión mejorada de "${response}"]
MEJORA 3: [tercera versión mejorada de "${response}"]

Responde ONLY con las 3 mejoras de la respuesta original.`;

            // Obtener API key de forma unificada
            let apiKey = await getOpenRouterApiKey();

            if (!apiKey || apiKey === 'sk-or-v1-fake-key') {
                hideTypingIndicator();
                addChatMessage('✅ Tu respuesta ha sido guardada correctamente.', 'ai');
                awaitingImprovement = false;
                currentSuggestion = null;
                // Continuar al siguiente campo después de un delay
                setTimeout(() => {
                    showNextField();
                }, 1500);
                return;
            }

            const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'Charlotte Educational Platform'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 600,
                    temperature: 0.7
                })
            });

            const data = await aiResponse.json();
            const analysis = data.choices[0].message.content;

            // Guardar en historial
            aiChatHistory.push({ role: 'user', content: response, field: field.label });
            aiChatHistory.push({ role: 'assistant', content: analysis });
            if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20);
            saveChatHistory();
            
            // Guardar análisis en Firebase
            saveAIAnalysisToFirebase(response, field.label, analysis);

            hideTypingIndicator();
            addChatMessage(`💡 ${analysis}`, 'ai');

            // Guardar análisis
            const options = extractOptionsFromAnalysis(analysis);
            if (options && options.length > 0) {
                awaitingImprovement = true;
                currentSuggestion = {
                    field: currentField,
                    original: response,
                    analysis: analysis,
                    options: options,
                    type: 'options'
                };
                
                // Mostrar las opciones numeradas y las instrucciones
                addChatMessage('📋 He analizado tu respuesta y te ofrezco las siguientes opciones de mejora:', 'ai');
                options.forEach(opt => {
                    addChatMessage(`${opt.number}. ${opt.text}`, 'ai');
                });
                addChatMessage('💡 Para elegir una opción, escribe el número (1, 2 o 3) O escribe "original" para mantener tu respuesta escrita tal como la enviaste.', 'ai');
            } else {
                addChatMessage(`✅ ¡Excelente! Tu respuesta ha sido aprobada.`, 'ai');
            }

        } catch (error) {
            console.error('Error analizando respuesta:', error);
            hideTypingIndicator();
            addChatMessage('✅ Tu respuesta ha sido guardada correctamente.', 'ai');
            awaitingImprovement = false;
            currentSuggestion = null;
            // Continuar al siguiente campo después de un delay
            setTimeout(() => {
                showNextField();
            }, 1500);
        }
    }
    
    // Función para obtener progreso del proyecto
    function getProjectProgress() {
        const progress = {};
        for (let i = 1; i <= 5; i++) {
            if (projectData[i]) {
                progress[i] = Object.keys(projectData[i]).length;
            } else {
                progress[i] = 0;
            }
        }
        return progress;
    }
    
    // Función para guardar análisis en Firebase
    async function saveAIAnalysisToFirebase(response, field, analysis) {
        try {
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            if (!currentUser || !currentUser.email) return;
            
            const analysisData = {
                response: response,
                field: field,
                analysis: analysis,
                timestamp: new Date().toISOString(),
                module: currentModule
            };
            
            // Guardar en Firestore si está disponible
            if (window.db && window.db.app) {
                const { doc, setDoc } = window;
                await setDoc(doc(window.db, 'ai_analysis', currentUser.email), {
                    lastAnalysis: analysisData,
                    email: currentUser.email
                }, { merge: true });
            }
        } catch(e) {
            console.warn('No se pudo guardar análisis en Firebase:', e);
        }
    }

    function saveSelectedOption(selectedValue, choiceType) {
        // Guardar la respuesta seleccionada
        projectData[currentModule][currentField].answer = selectedValue;
        projectData[currentModule][currentField].approved = true;
        projectData[currentModule][currentField].choiceType = choiceType;
        
        addChatMessage(`✅ ¡Perfecto! He guardado: "${selectedValue}"`, 'ai');
        addChatMessage('Verificando guardado en la base de datos...', 'ai');
        
        // Guardar y verificar en Firebase
        saveProjectProgress();
        
        // Pequeña pausa para asegurar el guardado
        setTimeout(() => {
            addChatMessage('✅ Guardado confirmado. ¡Excelente elección!', 'ai');
            awaitingImprovement = false;
            currentSuggestion = null;
            setTimeout(() => showNextField(), 2000);
        }, 1500);
    }

    function completeConsultationProject() {
        addChatMessage('🎉 ¡Felicitaciones! Has completado todos los módulos de tu proyecto.', 'ai');
        addChatMessage('Ahora voy a generar tu documento final completo...', 'ai');

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        
        // Determinar el programa basado en el usuario actual
        let programName = 'Belleza Integral'; // default
        if (currentUser && currentUser.programa) {
            const programa = currentUser.programa.toLowerCase();
            if (programa.includes('panader') || programa.includes('pasteler') || programa.includes('panadería') || programa.includes('pastelería')) {
                programName = 'Panadería y Pastelería';
            } else if (programa.includes('bellez') || programa.includes('estetic') || programa.includes('belleza')) {
                programName = 'Belleza Integral';
            }
        }

        let document = `# PROYECTO DE CREACIÓN DE NEGOCIO
## ${projectData[1]?.nombre_negocio?.answer || 'Nombre del Negocio'}

**Presentado por:** ${currentUser?.name || 'Estudiante'}
**Programa:** ${programName}
**Fecha:** ${new Date().toLocaleDateString()}

---

## ÍNDICE
1. Introducción
${Object.keys(projectStructure).map(moduleNum => {
    const module = projectStructure[moduleNum];
    return `${moduleNum + 1}. ${module.title}`;
}).join('\n')}
${Object.keys(projectStructure).length + 2}. Conclusión

---

## 1. INTRODUCCIÓN
Este documento presenta el plan de negocio completo desarrollado durante el proceso de consultoría interactiva.

`;

        // Agregar cada módulo
        Object.keys(projectStructure).forEach(moduleNum => {
            const module = projectStructure[moduleNum];
            document += `## ${parseInt(moduleNum) + 1}. ${module.title}\n\n`;

            Object.keys(module.fields).forEach(fieldKey => {
                const field = module.fields[fieldKey];
                const answer = projectData[moduleNum]?.[fieldKey]?.answer;
                if (answer) {
                    document += `**${field.label}:**\n${answer}\n\n`;
                }
            });
        });

        document += `## ${Object.keys(projectStructure).length + 2}. CONCLUSIÓN
Proyecto completado exitosamente con la asesoría de Charlotte, tutora virtual especializada en emprendimiento.

**Fecha de finalización:** ${new Date().toLocaleDateString()}
**Estado:** Completado ✅
`;

        // Guardar documento
        if (document && document.trim().length > 0) {
            projectData.finalDocument = document;
            saveProjectProgress();
        } else {
            console.error('Error: Documento final está vacío');
            addChatMessage('Hubo un error generando el documento final. Inténtalo de nuevo.', 'ai');
            return;
        }

        // Mostrar opciones para descargar
        addChatMessage('📄 Tu documento final está listo. ¿Qué deseas hacer?', 'ai');
        addChatMessage('• Escribe "descargar" para descargar el documento\n• Escribe "vista previa" para ver el documento completo\n• Escribe "reiniciar" para empezar un nuevo proyecto', 'ai');
    }

    async function showMoreOptions() {
        showTypingIndicator();
        try {
            const apiKey = await getOpenRouterApiKey();
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            const programName = currentUser?.programa || 'Panadería y Pastelería';
            
            const newOptionsPrompt = `Eres Charlotte, consultora especializada en emprendimiento para ${programName}.

El estudiante actualmente está en el campo: "${currentSuggestion?.field || 'N/A'}"
Su respuesta original fue: "${currentSuggestion?.original || 'N/A'}"

El estudiante ha solicitado más opciones o opciones diferentes.

INSTRUCCIONES:
1. Genera 3 opciones COMPLETAMENTE DIFERENTES a las anteriores
2. Las nuevas opciones deben ser más variadas y diversas en enfoque y estilo
3. Cada opción debe ser única y diferente

Formato obligatorio:
NUEVA OPCIÓN 1: [nueva opción]
NUEVA OPCIÓN 2: [nueva opción]
NUEVA OPCIÓN 3: [nueva opción]

Responde ONLY con las 3 nuevas opciones.`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{ role: 'user', content: newOptionsPrompt }],
                    max_tokens: 500,
                    temperature: 0.9
                })
            });

            const data = await response.json();
            const newOptionsResponse = data.choices[0].message.content;

            // Extraer las nuevas opciones y actualizar currentSuggestion
            const newOptions = extractOptionsFromAnalysis(newOptionsResponse);
            if (newOptions && newOptions.length > 0 && currentSuggestion) {
                currentSuggestion.options = newOptions;
                currentSuggestion.analysis = newOptionsResponse;
            }

            hideTypingIndicator();
            addChatMessage(`💡 Aquí tienes nuevas opciones:\n\n${newOptionsResponse}`, 'ai');
            addChatMessage('Elige la opción que más te guste (1, 2 o 3), escribe "más opciones" si necesitas otras, o escribe "original" para mantener tu respuesta escrita.', 'ai');
        } catch (error) {
            hideTypingIndicator();
            addChatMessage('Lo siento, no pude generar más opciones en este momento. Por favor elige una de las opciones anteriores o continúa.', 'ai');
        }
    }

    // Función para manejar comandos especiales
    function handleConsultationCommand(command) {
        console.log('DEBUG handleConsultationCommand: comando=', command);
        // Verificación robusta del parámetro command
        if (command === null || command === undefined) {
            console.error('handleConsultationCommand: comando es null o undefined', command);
            return;
        }

        // Si es un objeto con propiedad value (como un input), extraer el valor
        let commandStr = command;
        if (typeof command === 'object' && command.value !== undefined) {
            commandStr = command.value;
        }

        // Convertir a string y verificar
        commandStr = String(commandStr || '').trim();

        if (!commandStr) {
            console.error('handleConsultationCommand: comando está vacío después de conversión', command);
            return;
        }

        const cmd = commandStr.toLowerCase().trim();

        // PRIORIDAD 1: Modo de revisión - el usuario quiere editar un campo específico
        if (window.moduleFieldsToReview && window.moduleFieldsToReview.length > 0) {
            console.log('MODO REVISIÓN: moduleFieldsToReview disponible con', window.moduleFieldsToReview.length, 'campos');
            const moduleFields = window.moduleFieldsToReview;
            
            // Detectar si es un número
            const numberMatch = cmd.match(/^(\d+)$/);
            if (numberMatch) {
                const selectedIndex = parseInt(numberMatch[1]) - 1; // Convertir a índice (0-based)
                
                if (selectedIndex >= 0 && selectedIndex < moduleFields.length) {
                    // Campo válido seleccionado - iniciar edición
                    const selectedField = moduleFields[selectedIndex];
                    
                    // Configurar el módulo y campo actual
                    currentModule = selectedField.module;
                    currentField = selectedField.field;
                    
                    // Limpiar el modo de revisión
                    window.moduleFieldsToReview = null;
                    window.currentReviewModule = null;
                    
                    // Obtener la información del campo
                    const module = projectStructure[currentModule];
                    const field = module.fields[currentField];
                    
                    addChatMessage(`✏️ Editando: ${field.label}`, 'ai');
                    addChatMessage('Tu respuesta anterior era:', 'ai');
                    addChatMessage('"' + selectedField.answer + '"', 'ai');
                    addChatMessage('\n' + field.question, 'ai');
                    
                    // Mostrar ejemplo
                    if (field.example) {
                        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
                        let program = 'belleza';
                        if (currentUser && currentUser.programa) {
                            const programa = currentUser.programa.toLowerCase();
                            if (programa.includes('panader') || programa.includes('pasteler') || programa.includes('panadería') || programa.includes('pastelería')) {
                                program = 'panaderia';
                            } else if (programa.includes('bellez') || programa.includes('estetic') || programa.includes('belleza')) {
                                program = 'belleza';
                            }
                        }
                        const example = field.example(program);
                        addChatMessage(`💡 ${example}`, 'ai');
                    }
                    
                    // Habilitar input
                    showInputForField(field);
                    return;
                } else {
                    addChatMessage('Número no válido. Por favor elige un número entre 1 y ' + moduleFields.length + '.', 'ai');
                    return;
                }
            } else if (cmd === 'continuar') {
                // Continuar sin editar
                window.moduleFieldsToReview = null;
                window.currentReviewModule = null;
                addChatMessage('Continuando con el proyecto...', 'ai');
                setTimeout(() => showNextField(), 1500);
                return;
            } else if (cmd === 'cancelar') {
                // Cancelar y volver
                window.moduleFieldsToReview = null;
                window.currentReviewModule = null;
                addChatMessage('Operación cancelada.', 'ai');
                return;
            } else {
                addChatMessage('No entendí tu respuesta. Escribe un número (1-' + moduleFields.length + ') para editar esa respuesta, "continuar" para seguir, o "cancelar" para volver.', 'ai');
                return;
            }
        }

        // PRIORIDAD 2: Comandos cuando se está mejorando una respuesta
        if (cmd === 'modificar' && awaitingImprovement) {
            addChatMessage('Por favor, escribe tu respuesta modificada:', 'ai');
            awaitingModification = true;
        } else if (cmd === 'continuar' && awaitingImprovement && currentSuggestion?.type === 'no_ai') {
            // Caso sin IA - guardar respuesta original
            saveSelectedOption(currentSuggestion.original, 'original_no_ai');
        } else if (cmd === 'continuar' && awaitingImprovement) {
            // Aprobar la respuesta original
            saveSelectedOption(currentSuggestion.original, 'original');
        } else if (cmd === 'original' && awaitingImprovement) {
            // Elegir la respuesta original - guardar directamente
            if (currentSuggestion && currentSuggestion.original) {
                saveSelectedOption(currentSuggestion.original, 'original');
            } else {
                addChatMessage('No hay una respuesta original para guardar. Escribe "continuar" para seguir.', 'ai');
            }
        } else if (awaitingImprovement && currentSuggestion?.type === 'options') {
            // Mejorar reconocimiento de opciones - más flexible
            const cmdLower = cmd.toLowerCase().trim();
            
            // Detectar si es un número directo (1, 2, 3)
            const directNumberMatch = cmdLower.match(/^(\d+)$/);
            const directNumber = directNumberMatch ? parseInt(directNumberMatch[1]) : null;
            
            // Detectar si es una opción con texto (opción 1, la opcion 1, etc.)
            const optionMatch = cmdLower.match(/(?:la\s+|elijo\s+|escojo\s+|el\s+)?(?:opcion|opción|opc)\s*(\d+)/i);
            const optionNumber = optionMatch ? parseInt(optionMatch[1]) : null;
            
            // Usar el número encontrado (prioridad al número directo)
            const foundNumber = directNumber || optionNumber;
            
            if (foundNumber && ['1', '2', '3'].includes(String(foundNumber))) {
                // Elegir una opción numerada
                const selectedOption = currentSuggestion.options.find(opt => opt.number === foundNumber);
                if (selectedOption) {
                    saveSelectedOption(selectedOption.text, `opcion_${foundNumber}`);
                } else {
                    addChatMessage('Opción no válida. Por favor elige 1, 2, 3 u "original".', 'ai');
                }
            } else if (cmd === 'revisar' || cmd === 'ver' || cmd === 'ver opciones') {
                addChatMessage('Tu respuesta actual es: "' + currentSuggestion.original + '"', 'ai');
                if (currentSuggestion.options && currentSuggestion.options.length > 0) {
                    addChatMessage('Opciones disponibles:', 'ai');
                    currentSuggestion.options.forEach(opt => {
                        addChatMessage(`${opt.number}. ${opt.text}`, 'ai');
                    });
                    addChatMessage('¿Cuál eliges? (responde solo el número: 1, 2, 3)', 'ai');
                } else {
                    addChatMessage('¿Quieres modificarla o continuar? (responde "modificar" o "continuar")', 'ai');
                }
            } else {
                addChatMessage('No entendí tu respuesta. Por favor responde solo con el número: 1, 2, o 3. También puedes escribir "original", "revisar" o "continuar".', 'ai');
            }
        } else if (cmd === 'descargar') {
            downloadFinalDocument();
        } else if (cmd === 'vista previa') {
            showDocumentPreview();
        } else if (cmd === 'reiniciar') {
            if (confirm('¿Estás seguro de que quieres reiniciar el proyecto? Se perderá todo el progreso.')) {
                resetProject();
            }
        }
    }

    function downloadFinalDocument() {
        const finalDoc = projectData.finalDocument;
        if (!finalDoc) {
            addChatMessage('No hay documento final disponible.', 'ai');
            return;
        }

        const blob = new Blob([finalDoc], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proyecto-negocio.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addChatMessage('📥 Documento descargado exitosamente.', 'ai');
    }

    function showDocumentPreview() {
        const finalDoc = projectData.finalDocument;
        if (!finalDoc) {
            addChatMessage('No hay documento final disponible.', 'ai');
            return;
        }

        // Mostrar en un modal o nueva ventana
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(`
            <html>
            <head>
                <title>Vista Previa - Proyecto de Negocio</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                    pre { white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <pre>${finalDoc}</pre>
            </body>
            </html>
        `);
    }

    // Hacer las funciones globales inmediatamente
    // (las funciones se definirán después pero se asignarán aquí)
    window.sendProjectMessage = null; // placeholder
    window.addChatMessage = null;
    window.replaceLastMessage = null;
    window.saveProjectData = null;
    window.updateProjectSummary = null;
    window.loadProjectData = null;
    window.getStepDescription = null;
    // Mantener completeProject, previewProjectBook y printProjectBook disponibles
    // window.completeProject = null; // Eliminado para permitir completar proyecto
    // window.previewProjectBook = null; // Eliminado para permitir vista previa
    // window.printProjectBook = null; // Eliminado para permitir impresión
    window.loadExistingProjects = null;
    window.updateProjectChat = null;
    // =================== NUEVAS FUNCIONES PARA WIZARD MEJORADO ===================
    // Función para actualizar el wizard-steps visual
    function updateWizardSteps() {
        const steps = document.querySelectorAll('.wizard-steps .step[data-step]');
        
        steps.forEach(stepElement => {
            const stepNum = parseInt(stepElement.getAttribute('data-step'));
            const moduleData = projectData[stepNum] || projectData[String(stepNum)] || {};
            const moduleFields = projectStructure[stepNum]?.fields || {};
            const fieldKeys = Object.keys(moduleFields);
            const totalFields = fieldKeys.length;
            const completedFields = Object.values(moduleData).filter(field => 
                field && (field.approved || (field.answer && field.answer.trim && field.answer.trim().length > 0))
            ).length;
            
            const isCompleted = completedFields >= totalFields && totalFields > 0;
            const isCurrent = stepNum === currentModule;
            const hasProgress = completedFields > 0;
            
            // Limpiar clases previas
            stepElement.classList.remove('active', 'completed', 'hidden');
            
            // Agregar clase según estado
            if (isCompleted) {
                stepElement.classList.add('completed');
            }
            if (isCurrent) {
                stepElement.classList.add('active');
            }
            
            // Actualizar el status del paso
            const statusElement = stepElement.querySelector('.step-status');
            if (statusElement) {
                statusElement.classList.remove('in-progress', 'completed', 'pending');
                
                if (isCompleted) {
                    statusElement.innerHTML = '<i class="fas fa-check"></i> Completado';
                    statusElement.classList.add('completed');
                } else if (isCurrent) {
                    statusElement.innerHTML = '<i class="fas fa-play"></i> En progreso (' + completedFields + '/' + totalFields + ')';
                    statusElement.classList.add('in-progress');
                } else if (hasProgress) {
                    statusElement.innerHTML = '<i class="fas fa-clock"></i> ' + completedFields + '/' + totalFields + ' campos';
                    statusElement.classList.add('in-progress');
                } else {
                    statusElement.innerHTML = '<i class="fas fa-circle"></i> Pendiente';
                    statusElement.classList.add('pending');
                }
            }
        });
    }
    
    // Función para ir a un módulo específico
    function goToModule(moduleNum) {
        // Verificar si el módulo está disponible (si tiene acceso)
        const previousModuleData = projectData[moduleNum - 1] || projectData[String(moduleNum - 1)] || {};
        const previousModuleFields = projectStructure[moduleNum - 1]?.fields || {};
        const prevFieldKeys = Object.keys(previousModuleFields);
        const prevCompletedFields = Object.values(previousModuleData).filter(field => 
            field && (field.approved || (field.answer && field.answer.trim && field.answer.trim().length > 0))
        ).length;
        
        // Permitir ir a módulo 1 siempre, o si el anterior está completo, o si ya tiene progreso en ese módulo
        const moduleData = projectData[moduleNum] || projectData[String(moduleNum)] || {};
        const hasProgressInModule = Object.keys(moduleData).length > 0;
        
        if (moduleNum === 1 || prevCompletedFields >= prevFieldKeys.length || hasProgressInModule) {
            currentModule = moduleNum;
            currentField = null;
            
            const moduleTitle = projectStructure[moduleNum]?.title || 'Módulo ' + moduleNum;
            
            // Si el módulo tiene respuestas guardadas, mostrar opción de revisión
            if (hasProgressInModule) {
                reviewModuleResponses(moduleNum);
            } else {
                // Módulo sin respuestas - iniciar normalmente
                addChatMessage('¡Vamos al ' + moduleTitle + '! Te guiaré paso a paso por este módulo.', 'ai');
                updateWizardSteps();
                updateProjectSummary();
                showNextField();
            }
        } else {
            addChatMessage('Para acceder al Módulo ' + moduleNum + ', primero debes completar el módulo anterior.', 'ai');
        }
    }
    
    // Función para revisar las respuestas de un módulo específico
    function reviewModuleResponses(moduleNum) {
        const module = projectStructure[moduleNum];
        const moduleData = projectData[moduleNum] || {};
        const moduleTitle = module?.title || 'Módulo ' + moduleNum;
        
        // Recopilar las respuestas del módulo
        const moduleFields = [];
        const allFields = Object.keys(module.fields);
        
        for (const [fieldKey, fieldData] of Object.entries(moduleData)) {
            if (fieldData.answer && module.fields[fieldKey]) {
                moduleFields.push({
                    module: moduleNum,
                    field: fieldKey,
                    label: module.fields[fieldKey].label,
                    answer: fieldData.answer
                });
            }
        }
        
        // Verificar campos pendientes
        const pendingFields = allFields.filter(fieldKey => 
            !moduleData[fieldKey] || !moduleData[fieldKey].answer
        );
        
        addChatMessage('📋 **' + moduleTitle + '**\n\nEstas son tus respuestas guardadas:', 'ai');
        
        // Mostrar respuestas actuales
        let responseMsg = '';
        moduleFields.forEach((item, index) => {
            const answerPreview = item.answer.length > 80 
                ? item.answer.substring(0, 80) + '...' 
                : item.answer;
            responseMsg += '**' + (index + 1) + '. ' + item.label + ':**\n"' + answerPreview + '"\n\n';
        });
        
        if (pendingFields.length > 0) {
            responseMsg += '⏳ *Campos pendientes: ' + pendingFields.length + '*\n\n';
        }
        
        responseMsg += '**¿Qué deseas hacer?**\n';
        responseMsg += '• Escribe un **número (1-' + moduleFields.length + ')** para editar esa respuesta\n';
        responseMsg += '• Escribe **"continuar"** para seguir donde lo dejaste\n';
        responseMsg += '• Escribe **"cancelar"** para volver';
        
        addChatMessage(responseMsg, 'ai');
        
        // Guardar los campos del módulo para poder editarlos
        window.moduleFieldsToReview = moduleFields;
        window.currentReviewModule = moduleNum;
        
        // Asegurar que los flags de respuesta estén en false para que el mensaje vaya a handleConsultationCommand
        awaitingStudentResponse = false;
        awaitingImprovement = false;
        
        // Habilitar input para que el usuario pueda responder
        const input = document.getElementById('projectInput');
        if (input) {
            input.focus();
            input.placeholder = 'Escribe el número del campo que quieres editar...';
        }
    }

    async function initProjectWizard() {
        // Cargar API key de Firebase si no está en localStorage
        await loadApiKeyFromFirebase();
        
        // Cargar datos del proyecto si existen (ahora busca en localStorage Y Firebase)
        const hasExistingData = await loadProjectData();

        if (hasExistingData) {
            // Usuario tiene progreso guardado - mostrar resumen y continuar
            showProgressSummary();
        } else {
            // No hay datos en ningún lado - comenzar consultoría
            startConsultation();
        }
    }

    // Función para cargar la API key desde Firebase
    async function loadApiKeyFromFirebase() {
        const existingKey = localStorage.getItem('openrouter_api_key');
        if (existingKey && existingKey !== 'sk-or-v1-fake-key') {
            console.log('API key ya disponible en localStorage');
            return;
        }
        
        // Intentar cargar desde Firebase
        try {
            if (window.db && window.getDoc && window.doc) {
                const configDoc = await window.getDoc(window.doc(window.db, 'config', 'openrouter'));
                if (configDoc.exists()) {
                    const apiKey = configDoc.data().apiKey;
                    if (apiKey) {
                        localStorage.setItem('openrouter_api_key', apiKey);
                        console.log('API key cargada desde Firebase');
                    }
                }
            }
        } catch (e) {
            console.warn('No se pudo cargar API key desde Firebase:', e);
        }
    }

    function showProgressSummary() {
        // Asegurar que userProgram esté determinado si no se cargó
        if (!userProgram) {
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            if (currentUser && currentUser.programa) {
                const programa = currentUser.programa.toLowerCase();
                if (programa.includes('panader') || programa.includes('pasteler') || programa.includes('panadería') || programa.includes('pastelería')) {
                    userProgram = 'panaderia';
                } else if (programa.includes('bellez') || programa.includes('estetic') || programa.includes('belleza')) {
                    userProgram = 'belleza';
                } else {
                    userProgram = 'belleza'; // default
                }
                // Guardar el programa determinado
                saveProjectProgress();
            }
        }

        // Calcular progreso basado en el nuevo sistema
        let totalFields = 0;
        let completedFields = 0;
        let lastCompletedModule = 1;
        let lastCompletedField = null;

        Object.keys(projectStructure).forEach(moduleNum => {
            const module = projectStructure[moduleNum];
            const moduleData = projectData[moduleNum] || {};

            Object.keys(module.fields).forEach(fieldKey => {
                totalFields++;
                // Contar como completado si está aprobado O si tiene una respuesta válida
                if (moduleData[fieldKey]?.approved || (moduleData[fieldKey]?.answer && moduleData[fieldKey]?.answer.trim().length > 0)) {
                    completedFields++;
                    lastCompletedModule = parseInt(moduleNum);
                    lastCompletedField = fieldKey;
                }
            });
        });

        const progressPercent = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        addChatMessage(`¡Bienvenido de vuelta, ${currentUser?.name || 'estudiante'}!`, 'ai');
        addChatMessage(`📊 Progreso actual: ${completedFields}/${totalFields} campos completados (${progressPercent}%)`, 'ai');

        if (completedFields === totalFields) {
            // Proyecto completado
            addChatMessage('🎉 ¡Tu proyecto está completo!', 'ai');
            addChatMessage('Puedes descargar tu documento final escribiendo "descargar" o ver una vista previa con "vista previa".', 'ai');
            return;
        }

        // Determinar dónde continuar
        if (lastCompletedField) {
            // Encontrar el siguiente campo después del último completado
            const module = projectStructure[lastCompletedModule];
            const fields = Object.keys(module.fields);
            const lastFieldIndex = fields.indexOf(lastCompletedField);

            if (lastFieldIndex + 1 < fields.length) {
                // Continuar en el mismo módulo
                currentModule = lastCompletedModule;
                currentField = fields[lastFieldIndex + 1];
            } else {
                // Pasar al siguiente módulo
                currentModule = lastCompletedModule + 1;
                currentField = null;
            }
        } else {
            // Empezar desde el principio
            currentModule = 1;
            currentField = null;
        }

        addChatMessage('¿Quieres continuar desde donde te quedaste?', 'ai');
        setTimeout(() => {
            showNextField();
        }, 2000);
    }

    // ===== FUNCIÓN PARA CAMBIAR EL PASO ACTIVO DEL WIZARD =====
    function setProjectStep(stepNum) {
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.remove('active', 'hidden');
            const sNum = parseInt(step.dataset.step);
            if (sNum === stepNum) {
                step.classList.add('active');
            } else if (sNum > stepNum) {
                step.classList.add('hidden');
            }
        });
    }

    async function sendProjectMessage() {
        const input = document.getElementById('projectInput');
        const message = input.value.trim();

        if (!message) return;

        // Evitar mensajes duplicados consecutivos del usuario
        const chat = document.getElementById('projectChat');
        const lastUserMessage = chat?.lastElementChild;
        if (lastUserMessage?.classList?.contains('user') && lastUserMessage.textContent === message) {
            console.log('Mensaje duplicado ignorado');
            return;
        }

        // Limpiar input inmediatamente
        input.value = '';

        // Agregar mensaje del usuario al chat
        addChatMessage(message, 'user');

        // Si estamos esperando respuesta del estudiante para un campo
        if (awaitingStudentResponse) {
            if (awaitingModification) {
                // Procesar respuesta modificada
                processModifiedResponse(message);
            } else {
                // Procesar respuesta inicial
                processStudentResponse(message);
            }
            awaitingStudentResponse = false;
            return;
        }

        // Si estamos esperando decisión sobre mejora
        if (awaitingImprovement) {
            // El usuario ha elegido una opción (1, 2, 3), "original", "modificar", etc.
            // Procesar directamente sin análisis de IA
            handleConsultationCommand(message);
            return;
        }

        // Si no estamos esperando nada, ignorar el mensaje
        console.log('Mensaje ignorado (no se esperaba respuesta):', message);
    }

    function processModifiedResponse(newResponse) {
        if (!currentField || !currentModule || !currentSuggestion) return;

        const field = projectStructure[currentModule].fields[currentField];

        // Validar nueva respuesta
        if (!field.validation(newResponse)) {
            addChatMessage('Tu respuesta modificada aún necesita más detalles. Por favor, inténtalo de nuevo.', 'ai');
            return;
        }

        // Actualizar respuesta
        projectData[currentModule][currentField].answer = newResponse;
        projectData[currentModule][currentField].approved = true;

        addChatMessage('✅ ¡Excelente! Tu respuesta modificada ha sido aprobada.', 'ai');

        awaitingModification = false;
        awaitingImprovement = false;
        currentSuggestion = null;

        saveProjectProgress();

        // Continuar al siguiente campo
        setTimeout(() => {
            showNextField();
        }, 2000);
    }

    // ===== FUNCIONES DEL SISTEMA DE CONVERSACIÓN (MIGRADAS DESDE BACKUP) =====
    
    async function processConversationResponse(userResponse, question, step) {
        // Agregar respuesta del usuario al chat
        addChatMessage(userResponse, 'user');

        // El siguiente step debería ser 'analysis'
        const nextStepIndex = currentConversationStep + 1;
        const nextStep = question.conversationFlow[nextStepIndex];

        if (nextStep && nextStep.type === 'analysis') {
            // Realizar análisis de IA
            await performAIAnalysis(userResponse, question, nextStep);
        }
    }

    async function performAIAnalysis(userResponse, question, analysisStep) {
        try {
            // Intentar obtener la API key
            let apiKey = await getOpenRouterApiKey();
            
            // Si no hay key, continuar sin ella
            if (!apiKey) {
            }

            if (!apiKey) {
                // Sin API key, guardar directamente
                saveResponseAndContinue(userResponse, question);
                return;
            }

            showTypingIndicator();

            const prompt = analysisStep.aiPrompt
                .replace('{sector}', (userProgram || 'belleza') === 'panaderia' ? 'Panadería y Pastelería' : 'Belleza Integral');

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'Charlotte Educational Platform'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [
                        {
                            role: 'system',
                            content: `Eres Charlotte, tutora especializada en emprendimiento. Analiza respuestas de estudiantes y decide si son excelentes o necesitan mejoras.`
                        },
                        {
                            role: 'user',
                            content: `Pregunta: "${question.conversationFlow[currentConversationStep].message}"
Respuesta del estudiante: "${userResponse}"

${prompt}`
                        }
                    ],
                    max_tokens: 300,
                    temperature: 0.7
                })
            });

            hideTypingIndicator();

            if (!response.ok) {
                saveResponseAndContinue(userResponse, question);
                return;
            }

            const data = await response.json();
            const analysis = data.choices[0].message.content;

            // Procesar el análisis
            await processAIAnalysisResult(analysis, userResponse, question);

        } catch (error) {
            console.error('Error en análisis de IA:', error);
            saveResponseAndContinue(userResponse, question);
        }
    }

    async function processAIAnalysisResult(analysis, userResponse, question) {
        if (analysis.toUpperCase().includes('EXCELENTE:') || analysis.toUpperCase().includes('APROBADO:')) {
            // Respuesta excelente - guardar directamente
            const approvedResponse = analysis.split(/EXCELENTE:|APROBADO:/)[1].trim() || userResponse;
            addChatMessage(`¡Excelente! ${getPositiveFeedback ? getPositiveFeedback(question.id) : '¡Muy bien!'}`, 'ai');
            saveResponseAndContinue(approvedResponse, question);
        } else {
            // Necesita mejoras - mostrar opciones
            await showImprovementOptions(analysis, userResponse, question);
        }
    }

    async function showImprovementOptions(analysis, userResponse, question) {
        // Extraer opciones del análisis de IA
        const options = extractOptionsFromAnalysis(analysis);
        
        // Extraer opciones del análisis de IA y mostrarlas numeradas
        const optionsStep = {
            type: 'options',
            analysis: analysis,
            originalResponse: userResponse,
            question: question,
            options: options
        };

        // Mostrar análisis y opciones
        addChatMessage(analysis, 'ai');
        
        // Mostrar las opciones numeradas y las instrucciones
        if (options && options.length > 0) {
            addChatMessage('📋 He analizado tu respuesta y te ofrezco las siguientes opciones de mejora:', 'ai');
            options.forEach(opt => {
                addChatMessage(`${opt.number}. ${opt.text}`, 'ai');
            });
            addChatMessage('💡 Para elegir una opción, escribe el número (1, 2 o 3) O escribe "original" para mantener tu respuesta escrita tal como la enviaste.', 'ai');
        }

        // Agregar step de opciones al conversationFlow
        if (question.conversationFlow) {
            question.conversationFlow.splice(currentConversationStep + 2, 0, optionsStep);
            currentConversationStep++;
            askCurrentQuestion();
        }
    }

    async function processOptionSelection(selectedOption, question) {
        // Mejorar reconocimiento de opciones - más flexible
        const optStr = String(selectedOption || '').toLowerCase().trim();
        
        // Detectar si es un número directo (1, 2, 3)
        const directNumberMatch = optStr.match(/^(\d+)$/);
        const directNumber = directNumberMatch ? parseInt(directNumberMatch[1]) : null;
        
        // Detectar si es una opción con texto (opción 1, la opcion 1, etc.)
        const optionMatch = optStr.match(/(?:la\s+|elijo\s+|escojo\s+|el\s+)?(?:opcion|opción|opc)\s*(\d+)/i);
        const optionNumber = optionMatch ? parseInt(optionMatch[1]) : null;
        
        // Usar el número encontrado (prioridad al número directo)
        const foundNumber = directNumber || optionNumber;
        
        if (!foundNumber || foundNumber < 1 || foundNumber > 3) {
            addChatMessage('Por favor, elige una opción válida. Responde solo con el número: 1, 2 o 3.', 'ai');
            return;
        }

        // Extraer la opción seleccionada del análisis anterior
        const optionsStep = question.conversationFlow ? question.conversationFlow.find(step => step.type === 'options') : null;
        if (optionsStep && optionsStep.analysis) {
            const selectedOptionText = extractOptionFromAnalysis(optionsStep.analysis, foundNumber);
            if (selectedOptionText) {
                // Llamar a la IA para generar la respuesta final mejorada
                showTypingIndicator();
                try {
                    const apiKey = await getOpenRouterApiKey();
                    const improvementPrompt = `Eres Charlotte, consultora especializada en emprendimiento.

El estudiante ha elegido la opción ${foundNumber} para el campo "${currentSuggestion?.field || question.id}".

Opción elegida: "${selectedOptionText}"

INSTRUCCIONES:
1. Reconoce la elección del estudiante de manera positiva
2. Confirma la opción elegida
3. Da una respuesta FINAL mejorada y profesional basada en la opción seleccionada
4. No des más opciones - esta es la respuesta final

Responde con la confirmación y la respuesta final mejorada.`;

                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'google/gemini-2.0-flash-001',
                            messages: [{ role: 'user', content: improvementPrompt }],
                            max_tokens: 400,
                            temperature: 0.7
                        })
                    });

                    const data = await response.json();
                    const finalResponse = data.choices[0].message.content;

                    hideTypingIndicator();
                    addChatMessage(finalResponse, 'ai');
                    saveResponseAndContinue(selectedOptionText, question);
                    awaitingImprovement = false;
                    currentSuggestion = null;
                    return;
                } catch (error) {
                    hideTypingIndicator();
                    addChatMessage(`¡Perfecta elección! Has seleccionado: "${selectedOptionText}"`, 'ai');
                    saveResponseAndContinue(selectedOptionText, question);
                    awaitingImprovement = false;
                    currentSuggestion = null;
                    return;
                }
            }
        }

        // Fallback si no se puede extraer la opción
        addChatMessage(`¡Perfecta elección! Has seleccionado la opción ${foundNumber}.`, 'ai');
        saveResponseAndContinue(`Opción ${foundNumber} seleccionada`, question);
    }

    function extractOptionFromAnalysis(analysis, optionNumber) {
        // Extraer opción numerada del análisis
        const lines = analysis.split('\n');
        const optionRegex = new RegExp(`^${optionNumber}[\)\.:]\\s*(.+)`);
        
        for (const line of lines) {
            const match = line.match(optionRegex);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }

    async function reviewStudentResponse(userResponse, question) {
        // Para el módulo 0 (presentación), guardar directamente sin revisión
        if (currentModule === 1) {
            saveResponseAndContinue(userResponse, question);
            return;
        }

        try {
            // Unificar: usar getOpenRouterApiKey() para obtener la API key
            let apiKey = await getOpenRouterApiKey();
            
            if (!apiKey) {
                // Si no hay API key, guardar directamente
                saveResponseAndContinue(userResponse, question);
                return;
            }

            // Mostrar indicador de escritura
            showTypingIndicator();

            const currentProgram = userProgram || 'belleza';
            const prompt = `Eres Charlotte, tutora especializada en emprendimiento para ${currentProgram === 'panaderia' ? 'Panadería y Pastelería' : 'Belleza Integral'}.

Tu tarea es revisar CRÍTICAMENTE la respuesta del estudiante y decidir si realmente está bien o necesita mejoras significativas.

Pregunta actual: "${question.question}"
Respuesta del estudiante: "${userResponse}"

INSTRUCCIONES ESTRICTAS PARA REVISIÓN:
- Revisa ORTOGRAFÍA: Corrige errores como "apasteria" → "pastelería", "l" → "la", faltas de acentos
- Revisa GRAMÁTICA: Asegúrate de que las frases estén bien construidas y sean profesionales
- Revisa CREATIVIDAD: ¿Es original? ¿Transmite valor único? ¿Es memorable para un negocio?
- Revisa ESPECIFICIDAD: ¿Responde exactamente a lo pedido? ¿Es lo suficientemente detallado?
- Revisa PROFESIONALISMO: ¿Suena como un negocio real o parece amateur?

SOLO APRUEBA si la respuesta es EXCELENTE (sin errores, creativa, profesional, memorable).
Si hay CUALQUIER problema (ortografía, gramática, falta de creatividad, vaguedad, etc.), NO apruebes.

FORMATO DE RESPUESTA:
- Si APRUEBAS (solo respuestas perfectas): "APROBADO: [respuesta del estudiante]"
- Si RECHAZAS: Explica amablemente pero FIRMEMENTE qué mejorar, da EJEMPLOS concretos, y sugiere una versión mejorada específica.

Sé constructivo pero EXIGENTE - tu objetivo es crear proyectos PROFESIONALES de calidad.`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'Charlotte Educational Platform'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres Charlotte, tutora de emprendimiento嚴格审核回复。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            hideTypingIndicator();

            if (!response.ok) {
                saveResponseAndContinue(userResponse, question);
                return;
            }

            const data = await response.json();
            const review = data.choices[0].message.content;

            // Procesar la revisión
            if (review.toUpperCase().includes('APROBADO:')) {
                const approvedResponse = review.split('APROBADO:')[1].trim();
                addChatMessage(`¡Excelente! ${getPositiveFeedback ? getPositiveFeedback(question.id) : 'Tu respuesta es perfecta!'}`, 'ai');
                saveResponseAndContinue(approvedResponse || userResponse, question);
            } else {
                // Mostrar sugerencias de mejora
                addChatMessage(review, 'ai');
                awaitingImprovement = true;
                addChatMessage('¿Qué prefieres? Escribe "mejorar" para ver opciones o "continuar" para guardar tu respuesta actual.', 'ai');
            }

        } catch (error) {
            console.error('Error revisando respuesta:', error);
            saveResponseAndContinue(userResponse, question);
        }
    }

    function getPositiveFeedback(questionId) {
        const feedbacks = {
            'nombre_negocio': '¡Un nombre muy profesional y memorable!',
            'eslogan': '¡Eslogan creativo y efectivo!',
            'descripcion': '¡Descripción clara y profesional!',
            'mision': '¡Misión inspiradora!',
            'vision': '¡Visión a largo plazo muy clara!',
            'cliente_ideal': '¡Perfecto entendimiento de tu cliente!',
            'competencia': '¡Análisis de competencia muy útil!',
            'propuesta_valor': '¡Propuesta de valor única y convincente!'
        };
        return feedbacks[questionId] || '¡Muy bien!继续前进！';
    }

    function saveResponseAndContinue(response, question) {
        // Guardar la respuesta
        if (!projectData[currentModule]) {
            projectData[currentModule] = {};
        }
        
        projectData[currentModule][question.id] = {
            answer: response,
            approved: true,
            timestamp: new Date().toISOString()
        };

        saveProjectProgress();

        // Continuar al siguiente paso
        setTimeout(() => {
            // Continuar con el siguiente campo o pregunta
            if (currentConversationStep !== undefined && question.conversationFlow) {
                currentConversationStep++;
                askCurrentQuestion();
            } else {
                showNextField();
            }
        }, 1500);
    }

    function askCurrentQuestion() {
        const currentQuestions = projectQuestions[currentModule]?.questions || [];
        const question = currentQuestions[currentQuestionIndex];

        if (!question) {
            addChatMessage('No hay más preguntas en este módulo. Escribe "siguiente" para continuar.', 'ai');
            return;
        }

        // Si la pregunta tiene conversationFlow, usarlo
        if (question.conversationFlow) {
            const currentStep = question.conversationFlow[currentConversationStep];

            if (!currentStep) {
                // Se completó el conversationFlow de esta pregunta
                nextQuestion();
                return;
            }

            if (currentStep.type === 'info') {
                // Mostrar información educativa
                const message = typeof currentStep.message === 'function' ? currentStep.message() : currentStep.message;
                addChatMessage(message, 'ai');
                // Pasar automáticamente al siguiente step después de un delay
                setTimeout(() => {
                    currentConversationStep++;
                    askCurrentQuestion();
                }, 3000);
            } else if (currentStep.type === 'question') {
                // Mostrar la pregunta
                addChatMessage(currentStep.message, 'ai');
                // Marcar que estamos esperando respuesta del estudiante
                awaitingStudentResponse = true;
            } else if (currentStep.type === 'analysis') {
                // Este step se maneja después de recibir la respuesta del estudiante
                // No debería llegar aquí en askCurrentQuestion
            } else if (currentStep.type === 'options') {
                // Las opciones ya se mostraron, esperar selección del estudiante
            }
        } else {
            // Fallback para preguntas sin conversationFlow (como el módulo 0)
            let questionText = question.question;
            if (question.id === 'sector_choice') {
                questionText = questionText.replace('{name}', getUserName());
            }
            addChatMessage(questionText, 'ai');
        }
    }

    function saveToFirebase(category, data) {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

        if (db && user.email) {
            try {
                const projectRef = doc(db, 'projects', user.email);
                const updateData = {};
                updateData[`${category}`] = data;

                setDoc(projectRef, updateData, { merge: true })
                    .then(() => {
                        console.log(`✅ Datos guardados en Firebase: ${category}`);
                    })
                    .catch(error => {
                        console.warn('⚠️ Error guardando en Firebase (continuando sin guardar):', error.message);
                        // No mostrar error al usuario, solo log
                    });
            } catch (error) {
                console.warn('⚠️ Error al preparar datos para Firebase:', error.message);
            }
        }
    }

    function getUserName() {
        // Primero intentar obtener el nombre de las respuestas del proyecto
        if (projectData[1] && projectData[1].user_info && projectData[1].user_info.original) {
            return projectData[1].user_info.original.trim();
        }

        // Si no hay respuesta del proyecto, usar el nombre del usuario logueado
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        return user.displayName || user.name || user.email || 'Estudiante';
    }

    function showTypingIndicator() {
        const chat = document.getElementById('projectChat');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai typing';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <small>Charlotte está escribiendo...</small>
        `;
        chat.appendChild(typingDiv);
        chat.scrollTop = chat.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingDiv = document.getElementById('typingIndicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    // Definir los prompts específicos para cada módulo
    const stepPrompts = {
                2: `Eres Charlotte, tutor especializado en emprendimiento para ${getUserProgram()}. Estás guiando al estudiante en el MÓDULO 1: IDEA Y NICHOS (Capítulo 1 del Proyecto).

INSTRUCCIONES IMPORTANTES:
- Si ofreces opciones al estudiante, SIEMPRE indica al final: "Para elegir una opción, escribe el número (por ejemplo: 1, 2 o 3) o escribe 'original' para mantener tu respuesta escrita"
- No saludes de nuevo si ya has saludado antes en esta conversación

INSTRUCCIONES ESPECÍFICAS:
1. Paso 1.1: Nombre del Negocio y Eslogan
2. Paso 1.2: Descripción Clara del Negocio (¿Qué vas a vender? ¿Servicios concretos?)
3. Paso 1.3: Definición de tu Nicho Específico

EJEMPLOS PARA ${getUserProgram().toUpperCase()}:
${getUserProgram().includes('panader') ? 
'- Pastelería especializada en tortas personalizadas sin azúcar\n- Panadería artesanal con entregas a domicilio\n- Repostería vegana y saludable' :
'- Salón de belleza integral con servicios completos\n- Barbería especializada en hombres\n- Maquillaje profesional para eventos'}

TAREA: El estudiante debe escribir una página con estos tres puntos.

CONVERSACIÓN ACTUAL:
${projectConversations.map(msg => `${msg.role === 'user' ? 'Estudiante' : 'Charlotte'}: ${msg.content}`).join('\n')}

Responde de manera académica y práctica. Incluye ejemplos específicos del sector y guía paso a paso.`,

                3: `Eres Charlotte, tutor especializado en emprendimiento para ${getUserProgram()}. Estás guiando en el MÓDULO 2: ANÁLISIS DE MERCADO Y CLIENTE (Capítulo 2).

INSTRUCCIONES ESPECÍFICAS:
1. Paso 2.1: Perfil de tu Cliente Ideal (edad, gustos, hábitos, ubicación)
2. Paso 2.2: Análisis de la Competencia (¿Quiénes son? ¿Qué hacen bien/mal?)
3. Paso 2.3: Propuesta Única de Valor (¿Por qué te elegirían?)

TAREA: Realizar un cuadro comparativo con 3 competidores y definir la PUV.

EJEMPLOS DE PUV PARA ${getUserProgram().toUpperCase()}:
${getUserProgram().includes('panader') ?
'- Ingredientes 100% naturales y orgánicos\n- Personalización total de diseños\n- Entregas gratuitas en zona local' :
'- Servicio completo en un solo lugar\n- Productos premium y profesionales\n- Ambiente relajante y moderno'}

CONVERSACIÓN ACTUAL:
${projectConversations.map(msg => `${msg.role === 'user' ? 'Estudiante' : 'Charlotte'}: ${msg.content}`).join('\n')}

Ayuda al estudiante a crear un análisis de mercado profesional. Incluye ejemplos específicos y guía para el cuadro comparativo.`,

                4: `Eres Charlotte, tutor especializado en emprendimiento para ${getUserProgram()}. Estás guiando en el MÓDULO 3: OPERACIONES Y PROCESOS (Capítulo 3 - MUY IMPORTANTE).

INSTRUCCIONES ESPECÍFICAS:
1. Paso 3.1: Lista de Productos/Servicios Principal con precios estimados
2. Paso 3.2: Descripción del Proceso de Producción/Atención (paso a paso)
3. Paso 3.3: Recursos Necesarios (equipos, insumos, mobiliario)

TAREA: Lista de ingredientes/insumos clave y diagrama de flujo del proceso principal.

EJEMPLOS PARA ${getUserProgram().toUpperCase()}:
${getUserProgram().includes('panader') ?
'Proceso de producción de torta:\n1. Recepción de pedido\n2. Selección de ingredientes\n3. Preparación de masa\n4. Horneado\n5. Decoración\n6. Empaque y entrega' :
'Proceso de manicure:\n1. Consulta inicial\n2. Preparación de uñas\n3. Aplicación de esmalte\n4. Secado y acabado\n5. Consejos de cuidado'}

CONVERSACIÓN ACTUAL:
${projectConversations.map(msg => `${msg.role === 'user' ? 'Estudiante' : 'Charlotte'}: ${msg.content}`).join('\n')}

Enfócate en los aspectos operativos específicos del sector. Este módulo es crucial para el éxito del negocio.`,

                5: `Eres Charlotte, tutor especializado en emprendimiento para ${getUserProgram()}. Estás guiando en el MÓDULO 4: MARKETING Y VENTAS (Capítulo 4).

INSTRUCCIONES ESPECÍFICAS:
1. Paso 4.1: Canales de Venta (tienda física, redes sociales, WhatsApp)
2. Paso 4.2: Estrategia en Redes Sociales (plataformas y contenido)
3. Paso 4.3: Ideas de Promoción para el Lanzamiento

TAREA: Crear un calendario de contenidos para la primera semana.

EJEMPLOS PARA ${getUserProgram().toUpperCase()}:
${getUserProgram().includes('panader') ?
'Contenido en redes:\n- Reels mostrando decoración de tortas\n- Stories con proceso de horneado\n- Fotos de productos terminados\n- Testimonios de clientes' :
'Contenido en redes:\n- Videos tutoriales de peinados\n- Before/after de tratamientos\n- Tips de belleza diarios\n- Historias de clientes'}

CONVERSACIÓN ACTUAL:
${projectConversations.map(msg => `${msg.role === 'user' ? 'Estudiante' : 'Charlotte'}: ${msg.content}`).join('\n')}

Ayuda al estudiante a crear estrategias de marketing efectivas y realistas para su sector.`,

                6: `Eres Charlotte, tutor especializado en emprendimiento para ${getUserProgram()}. Estás guiando en el MÓDULO 5: FINANZAS BÁSICAS (Capítulo 5).

INSTRUCCIONES ESPECÍFICAS:
1. Paso 5.1: Inversión Inicial Estimada
2. Paso 5.2: Precio de Venta Definitivo (costo + % ganancia)
3. Paso 5.3: Proyección de Ventas Mensual (primeros 3 meses)

TAREA: Completar tabla simple con costos, precios y proyección.

CÁLCULOS BÁSICOS PARA ${getUserProgram().toUpperCase()}:
${getUserProgram().includes('panader') ?
'Ejemplo torta personalizada:\n- Costo ingredientes: $15.000\n- Costo mano de obra: $10.000\n- Costo empaque/entrega: $5.000\n- Total costo: $30.000\n- Precio venta: $60.000 (100% ganancia)' :
'Ejemplo manicure:\n- Costo productos: $3.000\n- Costo mano de obra: $7.000\n- Costo alquiler/local: $5.000\n- Total costo: $15.000\n- Precio venta: $25.000 (67% ganancia)'}

CONVERSACIÓN ACTUAL:
${projectConversations.map(msg => `${msg.role === 'user' ? 'Estudiante' : 'Charlotte'}: ${msg.content}`).join('\n')}

Enseña conceptos financieros básicos de manera práctica. Incluye cálculos realistas para el sector.`
            };

    async function sendProjectChatMessage(message) {
        try {
            // Intentar obtener la API key desde localStorage, window, o Firebase
            let apiKey = localStorage.getItem('openrouter_api_key') || window.OPENROUTER_API_KEY || '';
            
            // Si no hay key, intentar obtener desde Firebase
            if (!apiKey && window.db) {
                try {
                    const configDoc = await window.getDoc(window.doc(window.db, 'config', 'openrouter'));
                    if (configDoc.exists && configDoc.data().apiKey) {
                        apiKey = configDoc.data().apiKey;
                        console.log('✅ API key cargada desde Firebase');
                    }
                } catch(e) {
                    console.warn('No se pudo obtener API key de Firebase:', e);
                }
            }

            if (!apiKey || apiKey === 'sk-or-v1-fake-key') {
                addChatMessage('❌ La IA no está configurada. Pide al administrador que configure la API key de OpenRouter en el panel de admin.', 'ai');
                return;
            }

            // Mostrar indicador de escritura
            showTypingIndicator();

            const prompt = stepPrompts[currentModule] || `Eres un consultor empresarial especializado en ${getUserProgram()}. Estás en el paso ${currentModule}: ${getStepDescription(currentModule)}

INSTRUCCIONES IMPORTANTES:
- Si ofreces opciones al estudiante, SIEMPRE indica al final: "Para elegir una opción, escribe el número (por ejemplo: 1, 2 o 3) o escribe 'original' para mantener tu respuesta escrita"
- No saludes de nuevo si ya has saludado antes en esta conversación
- Mantén un registro de lo que ya has dicho

CONVERSACIÓN ACTUAL:
${projectConversations.map(msg => `${msg.role === 'user' ? 'Estudiante' : 'Tú'}: ${msg.content}`).join('\n')}

Responde de manera útil y motivadora, guiando al estudiante paso a paso.`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [
                        { role: 'system', content: 'Eres Charlotte, un tutor especializado en emprendimiento práctico para estudiantes de formación técnica en Panadería/Pastelería y Belleza Integral. Tu rol es guiar a cada estudiante, paso a paso, en la creación de un documento de proyecto de negocio completo y viable (su "tesis" práctica), que será el entregable final de su capacitación. Debes adaptar tu guía a cada sector específico (Panadería o Belleza). Sé académica, paciente, motivadora y muy estructurada. Incluye ejemplos específicos del sector correspondiente.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 800,
                    temperature: 0.7
                })
            });

            hideTypingIndicator();

            if (!response.ok) {
                throw new Error('Error en la API de IA');
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            // Reemplazar mensaje de loading
            replaceLastMessage(aiResponse, 'ai');

            // Agregar a conversaciones globales
            projectConversations.push({ role: 'user', content: message });
            projectConversations.push({ role: 'assistant', content: aiResponse });

            // Guardar en projectData
            saveProjectData(message, aiResponse);

        } catch (error) {
            console.error('Error:', error);
            replaceLastMessage('Lo siento, hubo un error. Inténtalo de nuevo.', 'ai');
        }
    }

    function processMarkdown(text) {
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^###+\s*(.*$)/gm, '<h4>$1</h4>')
            .replace(/^##+\s*(.*$)/gm, '<h3>$1</h3>')
            .replace(/^#+\s*(.*$)/gm, '<h2>$1</h2>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }

    function addChatMessage(message, type, messageType) {
        const chat = document.getElementById('projectChat');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;

        // Procesar markdown para respuestas de IA
        let processedMessage = message;
        if (type === 'ai') {
            processedMessage = processMarkdown(message);
        }

        // Si es una sugerencia, ya viene procesada
        if (messageType === 'suggestion' || processedMessage.includes('<div') || processedMessage.includes('<br>') || processedMessage.includes('<strong>') || processedMessage.includes('<h4>')) {
            messageDiv.innerHTML = processedMessage;
        } else {
            messageDiv.textContent = processedMessage;
        }

        chat.appendChild(messageDiv);
        chat.scrollTop = chat.scrollHeight;
        projectConversations.push({ role: type === 'user' ? 'user' : 'assistant', content: message });
    }

    function replaceLastMessage(newMessage, type, messageType) {
        const chat = document.getElementById('projectChat');
        const lastMessage = chat.lastElementChild;
        if (lastMessage) {
            lastMessage.className = `chat-message ${type}`;

            // Si es una sugerencia o contiene HTML, usar innerHTML para renderizar las etiquetas
            if (messageType === 'suggestion' || newMessage.includes('<div') || newMessage.includes('<br>') || newMessage.includes('<strong>')) {
                lastMessage.innerHTML = newMessage;
            } else {
                lastMessage.textContent = newMessage;
            }
        }
    }

    function getUserProgram() {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        return user.programa || 'negocios';
    }

    function getStepDescription(step) {
        const descriptions = {
            1: 'MÓDULO 0: Inicio - Presentación y sector',
            2: 'MÓDULO 1: Idea y Nichos',
            3: 'MÓDULO 2: Análisis de Mercado y Cliente',
            4: 'MÓDULO 3: Operaciones y Procesos',
            5: 'MÓDULO 4: Marketing y Ventas',
            6: 'MÓDULO 5: Finanzas Básicas'
        };
        return descriptions[step] || '';
    }

    function saveProjectData(userMessage, aiResponse) {
        if (!projectData[currentModule]) {
            projectData[currentModule] = [];
        }
        projectData[currentModule].push({
            user: userMessage,
            ai: aiResponse,
            timestamp: new Date().toISOString()
        });
        
        // Guardar automáticamente
        saveProjectProgress();
    }

    // Función para sanitizar datos antes de enviar a Firestore
    function sanitizeForFirestore(data) {
        if (data === null || data === undefined) {
            return null;
        }

        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
            return data;
        }

        if (data instanceof Date) {
            return data.toISOString();
        }

        if (Array.isArray(data)) {
            return data.map(item => sanitizeForFirestore(item)).filter(item => item !== null);
        }

        if (typeof data === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                const sanitizedValue = sanitizeForFirestore(value);
                if (sanitizedValue !== null && sanitizedValue !== undefined) {
                    sanitized[key] = sanitizedValue;
                }
            }
            return sanitized;
        }

        // Para cualquier otro tipo (funciones, símbolos, etc.), devolver null
        return null;
    }

    // Función para guardar el progreso automáticamente
    function saveProjectProgress() {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        if (!user.email) return;

        const projectKey = `project_${user.email}`;
        const progressData = {
            projectData: projectData,
            currentModule: currentModule,
            currentField: currentField,
            awaitingStudentResponse: awaitingStudentResponse,
            awaitingImprovement: awaitingImprovement,
            awaitingModification: awaitingModification,
            currentSuggestion: currentSuggestion,
            userProgram: userProgram,
            lastSaved: new Date().toISOString()
        };
        
        // Solo incluir finalDocument si existe
        if (projectData.finalDocument) {
            progressData.finalDocument = projectData.finalDocument;
        }

        localStorage.setItem(projectKey, JSON.stringify(progressData));

        // También guardar en Firebase
        if (db && user.email) {
            const firebaseData = {
                conversations: sanitizeForFirestore(projectConversations) || [],
                currentModule: currentModule,
                currentField: currentField,
                userProgram: userProgram,
                lastUpdated: new Date().toISOString(),
                userId: user.email || user.id,
                userEmail: user.email,
                program: user.programa || 'negocios'
            };

            // Guardar cada módulo como campo de nivel superior (module_1, module_2, etc.)
            // Evita el problema de Firestore con claves numéricas en mapas anidados
            for (let m = 1; m <= 5; m++) {
                if (projectData[m] && Object.keys(projectData[m]).length > 0) {
                    firebaseData[`module_${m}`] = sanitizeForFirestore(projectData[m]);
                } else {
                    firebaseData[`module_${m}`] = {};
                }
            }
            
            // Solo incluir finalDocument si existe
            if (projectData.finalDocument) {
                firebaseData.finalDocument = projectData.finalDocument;
            }
            
            try {
                setDoc(doc(db, 'projects', user.email), firebaseData);
                console.log('💾 Guardado en Firebase con keys:', Object.keys(firebaseData).filter(k => k.startsWith('module_')));
            } catch (error) {
                console.warn('Error guardando en Firestore (continuando sin guardar):', error.message);
            }
        }

        updateProjectSummary();
        updateWizardSteps();
    }

    function restoreProgressData(progressData) {
        // Cargar datos del proyecto
        if (progressData.projectData && Object.keys(progressData.projectData).length > 0) {
            projectData = progressData.projectData;
        } else if (progressData.data && Object.keys(progressData.data).length > 0) {
            // Firebase guarda projectData bajo la clave 'data'
            projectData = progressData.data;
        }

        // Debug: mostrar exactamente qué se restauró
        console.log('🔄 restoreProgressData - projectData keys:', Object.keys(projectData));
        console.log('🔄 restoreProgressData - projectData completo:', JSON.stringify(projectData).substring(0, 500));
        for (let m = 1; m <= 5; m++) {
            const mData = projectData[m] || projectData[String(m)];
            if (mData) {
                console.log(`🔄 Módulo ${m}:`, Object.keys(mData), 'campos con approved:', Object.values(mData).filter(f => f && f.approved).length);
            } else {
                console.log(`🔄 Módulo ${m}: sin datos`);
            }
        }

        // Restaurar estado del sistema de consultoría
        if (progressData.currentModule) {
            currentModule = progressData.currentModule;
        }
        if (progressData.currentField) {
            currentField = progressData.currentField;
        }
        if (progressData.awaitingStudentResponse !== undefined) {
            awaitingStudentResponse = progressData.awaitingStudentResponse;
        }
        if (progressData.awaitingImprovement !== undefined) {
            awaitingImprovement = progressData.awaitingImprovement;
        }
        if (progressData.awaitingModification !== undefined) {
            awaitingModification = progressData.awaitingModification;
        }
        if (progressData.currentSuggestion) {
            currentSuggestion = progressData.currentSuggestion;
        }
        if (progressData.userProgram) {
            userProgram = progressData.userProgram;
        }
        if (progressData.finalDocument) {
            projectData.finalDocument = progressData.finalDocument;
        }

        updateProjectSummary();
        updateWizardSteps();
    }

    async function loadProjectData() {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        if (!user.email) {
            currentModule = 1;
            currentField = null;
            return false;
        }
        const projectKey = `project_${user.email}`;

        let localData = null;
        let firebaseData = null;
        let localTimestamp = null;
        let firebaseTimestamp = null;

        // Helper: contar campos con datos reales en un projectData
        function countRealFields(pData) {
            if (!pData || typeof pData !== 'object') return 0;
            let count = 0;
            for (const key of Object.keys(pData)) {
                const mod = pData[key];
                if (mod && typeof mod === 'object' && key !== 'finalDocument') {
                    for (const fieldVal of Object.values(mod)) {
                        if (fieldVal && (fieldVal.approved || (fieldVal.answer && fieldVal.answer.length > 0))) {
                            count++;
                        }
                    }
                }
            }
            return count;
        }

        // 1. Cargar desde localStorage
        const saved = localStorage.getItem(projectKey);
        if (saved) {
            try {
                localData = JSON.parse(saved);
                localTimestamp = localData.lastSaved ? new Date(localData.lastSaved).getTime() : 0;
                const localFieldCount = countRealFields(localData.projectData);
                console.log('📦 localStorage - timestamp:', localData.lastSaved || 'sin fecha', '- campos con datos:', localFieldCount);
            } catch (e) {
                console.warn('⚠️ Error parseando localStorage:', e.message);
            }
        }

        // 2. Siempre intentar cargar desde Firebase
        try {
            console.log('🔍 Buscando proyecto en Firebase para:', user.email);
            const docRef = doc(db, 'projects', user.email);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const rawData = docSnap.data();
                console.log('☁️ Firebase raw keys:', Object.keys(rawData));
                
                // Reconstruir projectData desde los campos module_1..module_5
                let projectContent = {};
                let foundNewFormat = false;
                
                for (let m = 1; m <= 5; m++) {
                    // Formato nuevo: module_1, module_2, etc.
                    if (rawData[`module_${m}`] && typeof rawData[`module_${m}`] === 'object' && Object.keys(rawData[`module_${m}`]).length > 0) {
                        projectContent[m] = rawData[`module_${m}`];
                        foundNewFormat = true;
                    }
                }
                
                // Si no hay formato nuevo, intentar migrar datos existentes
                // El campo 'data' con claves numéricas no se lee bien con docSnap.data()
                // Pero podemos intentar leer los subcampos individualmente
                if (!foundNewFormat && rawData.data !== undefined) {
                    console.log('🔄 Intentando migración: leyendo subcampos de data...');
                    
                    // Intentar acceder al campo data como mapa completo
                    const dataField = rawData.data;
                    if (dataField && typeof dataField === 'object') {
                        // Verificar si tiene subcampos con cualquier tipo de clave
                        for (const key of Object.keys(dataField)) {
                            const moduleNum = parseInt(key);
                            if (!isNaN(moduleNum) && moduleNum >= 1 && moduleNum <= 5) {
                                projectContent[moduleNum] = dataField[key];
                                foundNewFormat = true;
                            }
                        }
                    }
                    
                    // Si data está vacío por el bug de Firestore, intentar leer 
                    // cada subcampo directamente usando getDoc con field path
                    if (!foundNewFormat) {
                        console.log('⚠️ data está vacío (bug de Firestore con claves numéricas)');
                        console.log('🔄 Los datos existen en Firebase pero no se pueden leer con el SDK cliente');
                        console.log('🔄 Ejecutando migración forzada...');
                        
                        // Usar la API de Firestore para leer subcampos específicos
                        // Firestore REST API puede leer campos anidados que el SDK no puede
                        try {
                            const projectId = window.FIREBASE_CONFIG?.projectId || db.app?.options?.projectId || 'charlotte-a0d47';
                            if (projectId) {
                                const apiUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/projects/${encodeURIComponent(user.email)}?mask.fieldPaths=data`;
                                console.log('🌐 Intentando REST API:', apiUrl);
                                const restResponse = await fetch(apiUrl);
                                if (restResponse.ok) {
                                    const restData = await restResponse.json();
                                    console.log('🌐 REST API respuesta recibida');
                                    
                                    // Parsear la estructura de Firestore REST API
                                    if (restData.fields && restData.fields.data && restData.fields.data.mapValue) {
                                        const dataMap = restData.fields.data.mapValue.fields;
                                        if (dataMap) {
                                            for (let m = 1; m <= 5; m++) {
                                                const moduleKey = String(m);
                                                if (dataMap[moduleKey] && dataMap[moduleKey].mapValue) {
                                                    const moduleFields = dataMap[moduleKey].mapValue.fields;
                                                    if (moduleFields) {
                                                        projectContent[m] = {};
                                                        for (const [fieldName, fieldData] of Object.entries(moduleFields)) {
                                                            if (fieldData.mapValue && fieldData.mapValue.fields) {
                                                                const f = fieldData.mapValue.fields;
                                                                projectContent[m][fieldName] = {
                                                                    answer: f.answer?.stringValue || '',
                                                                    approved: f.approved?.booleanValue || false,
                                                                    choiceType: f.choiceType?.stringValue || undefined,
                                                                    timestamp: f.timestamp?.stringValue || undefined
                                                                };
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            
                                            const migratedCount = countRealFields(projectContent);
                                            if (migratedCount > 0) {
                                                console.log('✅ Migración REST exitosa! Campos recuperados:', migratedCount);
                                                
                                                // Re-guardar en formato nuevo (module_1, module_2, etc.)
                                                const migrateData = {};
                                                for (let m = 1; m <= 5; m++) {
                                                    if (projectContent[m]) {
                                                        migrateData[`module_${m}`] = projectContent[m];
                                                    }
                                                }
                                                try {
                                                    await setDoc(docRef, migrateData, { merge: true });
                                                    console.log('✅ Datos migrados al formato nuevo en Firebase');
                                                } catch (migErr) {
                                                    console.warn('⚠️ Error migrando formato:', migErr.message);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (restError) {
                            console.warn('⚠️ REST API falló:', restError.message);
                        }
                    }
                }
                
                const fbFieldCount = countRealFields(projectContent);
                console.log('☁️ Firebase módulos encontrados:', Object.keys(projectContent), '- campos con datos:', fbFieldCount);
                
                firebaseData = rawData;
                firebaseData._projectContent = projectContent;
                firebaseTimestamp = rawData.lastUpdated ? new Date(rawData.lastUpdated).getTime() : 0;
                console.log('☁️ Firebase - timestamp:', rawData.lastUpdated || 'sin fecha');
            } else {
                console.log('ℹ️ No se encontró proyecto en Firebase para:', user.email);
            }
        } catch (error) {
            console.warn('⚠️ Error cargando desde Firebase:', error.message);
        }

        // 3. Decidir cuál fuente usar
        // PRIORIDAD: datos con contenido real > timestamp más reciente > cualquier dato
        let chosenSource = null;
        let sourceName = '';

        const localFieldCount = localData ? countRealFields(localData.projectData) : 0;
        const firebaseFieldCount = firebaseData ? countRealFields(firebaseData._projectContent) : 0;

        console.log('🔀 Comparación - localStorage:', localFieldCount, 'campos vs Firebase:', firebaseFieldCount, 'campos');

        // Construir fuente Firebase en formato estándar
        const firebaseSource = firebaseData ? {
            projectData: firebaseData._projectContent || {},
            currentModule: firebaseData.currentModule || 1,
            currentField: firebaseData.currentField || null,
            userProgram: firebaseData.userProgram || null,
            finalDocument: firebaseData.finalDocument || null,
            lastSaved: firebaseData.lastUpdated
        } : null;

        if (firebaseFieldCount > 0 && localFieldCount > 0) {
            // Ambos tienen datos reales - usar el más reciente
            if (firebaseTimestamp >= localTimestamp) {
                chosenSource = firebaseSource;
                sourceName = 'Firebase (más reciente, ambos con datos)';
            } else {
                chosenSource = localData;
                sourceName = 'localStorage (más reciente, ambos con datos)';
            }
        } else if (firebaseFieldCount > 0) {
            // Solo Firebase tiene datos reales
            chosenSource = firebaseSource;
            sourceName = 'Firebase (tiene datos, localStorage vacío)';
        } else if (localFieldCount > 0) {
            // Solo localStorage tiene datos reales
            chosenSource = localData;
            sourceName = 'localStorage (tiene datos, Firebase vacío)';
        } else if (firebaseData) {
            // Ninguno tiene campos pero Firebase existe
            chosenSource = firebaseSource;
            sourceName = 'Firebase (sin campos completados)';
        } else if (localData) {
            // Ninguno tiene campos pero localStorage existe
            chosenSource = localData;
            sourceName = 'localStorage (sin campos completados)';
        }

        if (chosenSource) {
            console.log('✅ Usando datos de:', sourceName);
            restoreProgressData(chosenSource);

            // Sincronizar a localStorage
            localStorage.setItem(projectKey, JSON.stringify({
                projectData: chosenSource.projectData || {},
                currentModule: chosenSource.currentModule || 1,
                currentField: chosenSource.currentField || null,
                userProgram: chosenSource.userProgram || null,
                finalDocument: chosenSource.finalDocument || null,
                lastSaved: new Date().toISOString()
            }));
            if (sourceName.includes('Firebase')) {
                console.log('💾 Datos de Firebase sincronizados a localStorage');
            }
            return true;
        }

        // 4. Si no hay datos en ningún lado, comenzar desde el principio
        console.log('🆕 No hay datos guardados, comenzando desde cero');
        currentModule = 1;
        currentField = null;
        return false;
    }

    function updateProjectSummary() {
        const summary = document.getElementById('projectSummary');
        if (!summary) {
            console.warn('⚠️ updateProjectSummary: elemento #projectSummary no encontrado');
            return;
        }
        console.log('📊 updateProjectSummary llamado, projectData keys:', Object.keys(projectData));
        let html = '';
        let totalFields = 0;
        let completedFields = 0;

        for (let module = 1; module <= 5; module++) {
            // Manejar claves numéricas y string
            const moduleData = projectData[module] || projectData[String(module)] || {};
            const moduleFields = projectStructure[module]?.fields || {};
            const fieldKeys = Object.keys(moduleFields);
            // Contar campos completados: aprobados O con respuesta válida
            const moduleCompletedFields = Object.values(moduleData).filter(field => field && (field.approved || (field.answer && field.answer.trim && field.answer.trim().length > 0))).length;
            console.log(`📊 Módulo ${module}: ${moduleCompletedFields}/${fieldKeys.length} completados, data keys:`, Object.keys(moduleData));

            totalFields += fieldKeys.length;
            completedFields += moduleCompletedFields;

            const isCompleted = moduleCompletedFields >= fieldKeys.length;
            const isCurrent = module === currentModule;

            html += `
                <div class="summary-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                    <h4>${projectStructure[module]?.title || `Módulo ${module}`}</h4>
                    <div class="step-progress">
                        ${isCompleted ? '<i class="fas fa-check-circle"></i> Completado' : isCurrent ? '<i class="fas fa-play-circle"></i> En progreso' : '<i class="fas fa-circle"></i> Pendiente'}
                        <span class="step-count">(${moduleCompletedFields}/${fieldKeys.length})</span>
                    </div>
                    ${moduleCompletedFields > 0 ? `<p>Campos completados: ${moduleCompletedFields}</p>` : ''}
                </div>
            `;
        }

        // Agregar progreso general
        const overallProgress = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
        html = `
            <div class="overall-progress">
                <h4>Progreso General</h4>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${overallProgress}%"></div>
                </div>
                <p>${completedFields} de ${totalFields} campos completados (${overallProgress}%)</p>
            </div>
            ${html}
        `;

        summary.innerHTML = html;

        // Mostrar botón de completar si todos los módulos están completados
        const completeBtn = document.getElementById('completeProjectBtn');
        if (completedFields >= totalFields && totalFields > 0) {
            completeBtn.style.display = 'inline-block';
        }
    }

    function resetProject() {
        console.log('🔄 Iniciando proceso de reinicio del proyecto...');
        
        if (!confirm('¿Estás seguro de que quieres reiniciar el proyecto? Se perderán todos los datos y conversaciones actuales.')) {
            console.log('Reinicio cancelado por el usuario');
            return;
        }

        console.log('✅ Usuario confirmó el reinicio');

        // Limpiar variables del sistema de consultoría
        projectData = {};
        projectChat = [];
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
        if (user.email) {
            const projectKey = `project_${user.email}`;
            localStorage.removeItem(projectKey);
            console.log('✅ LocalStorage limpiado');
        }

        // Limpiar Firebase - eliminar documento completo
        if (window.db && user.email) {
            try {
                const { doc: docFn, deleteDoc } = window.firebaseFirestore;
                if (docFn && deleteDoc) {
                    const docRef = docFn(window.db, 'projects', user.email);
                    deleteDoc(docRef)
                        .then(() => console.log('✅ Proyecto eliminado de Firebase'))
                        .catch(error => console.warn('⚠️ Error eliminando proyecto de Firebase:', error.message));
                }
            } catch (error) {
                console.warn('⚠️ Error al preparar eliminación en Firebase:', error.message);
            }
        }

        // Limpiar UI
        const chatElement = document.getElementById('projectChat');
        if (chatElement) {
            chatElement.innerHTML = '';
        }
        
        const summaryElement = document.getElementById('projectSummary');
        if (summaryElement) {
            summaryElement.innerHTML = '';
        }

        // Ocultar botones de acciones
        const completeBtn = document.getElementById('completeProjectBtn');
        if (completeBtn) completeBtn.style.display = 'none';
        
        const previewBtn = document.getElementById('previewProjectBtn');
        if (previewBtn) previewBtn.style.display = 'none';
        
        const printBtn = document.getElementById('printProjectBtn');
        if (printBtn) printBtn.style.display = 'none';

        // Reinicializar pasos del wizard
        const steps = document.querySelectorAll('.step');
        if (steps && steps.length > 0) {
            steps.forEach((step, index) => {
                step.classList.remove('active', 'hidden');
                if (index === 0) {
                    step.classList.add('active');
                } else {
                    step.classList.add('hidden');
                }
            });
        }

        // Actualizar vista del proyecto
        if (typeof updateProjectView === 'function') {
            updateProjectView();
        }

        // Mostrar mensaje de éxito
        alert('✅ Proyecto reiniciado exitosamente. Puedes comenzar de nuevo.');
        
        console.log('✅ Proceso de reinicio completado');
    }

    function updateProjectChat() {
        const chat = document.getElementById('projectChat');
        chat.innerHTML = '';
        
        projectConversations.forEach(conv => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${conv.role === 'user' ? 'user' : 'ai'}`;
            messageDiv.textContent = conv.content;
            chat.appendChild(messageDiv);
        });
        
        chat.scrollTop = chat.scrollHeight;
    }

    async function loadExistingProjects() {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser) return;
        
        // Siempre intentar cargar desde Firebase para asegurar datos actualizados
        // const hasLocalData = Object.keys(projectData).some(key => projectData[key] && Object.keys(projectData[key]).length > 0);
        // if (hasLocalData) return;
        
        try {
            // Intentar cargar directamente por ID del documento (user.email)
            const docRef = window.doc(window.db, 'projects', currentUser.email || currentUser.id);
            const docSnap = await window.getDoc(docRef);
            
            if (docSnap.exists()) {
                const project = docSnap.data();
                console.log('Proyecto cargado desde Firebase:', project);
                
                // Cargar datos del proyecto de consultoría si existen
                if (project.data) {
                    projectData = project.data;
                }
                if (project.currentModule) {
                    currentModule = project.currentModule;
                }
                if (project.currentField) {
                    currentField = project.currentField;
                }
                if (project.userProgram) {
                    userProgram = project.userProgram;
                }
                if (project.finalDocument) {
                    projectData.finalDocument = project.finalDocument;
                }
                
                projectConversations = (project.conversations || []).map(conv => {
                    // Normalize conversation format
                    if (conv.message && conv.type) {
                        return {
                            role: conv.type === 'user' ? 'user' : 'assistant',
                            content: conv.message
                        };
                    }
                    return conv; // Already in correct format
                });
                
                // Mostrar botones de vista previa e impresión
                document.getElementById('previewProjectBtn').style.display = 'inline-block';
                document.getElementById('printProjectBtn').style.display = 'inline-block';
                document.getElementById('completeProjectBtn').style.display = 'none';
                
                // Actualizar el chat con las conversaciones existentes
                updateProjectChat();
                updateProjectSummary();
                
                // Si hay datos del proyecto de consultoría, mostrar resumen de progreso
                if (project.data && Object.keys(project.data).length > 0) {
                    showProgressSummary();
                } else {
                    // Mensaje informativo para proyectos de chat sin consultoría
                    addChatMessage('Proyecto cargado exitosamente. Puedes ver el resumen o imprimirlo.', 'ai');
                }
            }
        } catch (error) {
            console.error('Error al cargar proyectos existentes:', error);
            throw error; // Re-lanzar el error para que initProjectWizard lo maneje
        }
    }

    async function completeProject() {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
            alert('Debes iniciar sesión para completar el proyecto');
            return;
        }

        try {
            // Usar merge: true para no sobrescribir los datos de los módulos existentes
            const completionData = {
                userId: currentUser.email || currentUser.id,
                userName: currentUser.displayName || currentUser.name || currentUser.email,
                completedAt: new Date().toISOString(),
                conversations: sanitizeForFirestore(projectConversations),
                summary: sanitizeForFirestore(generateProjectSummary()),
                status: 'completed'
            };

            await setDoc(doc(db, 'projects', currentUser.email || currentUser.id), completionData, { merge: true });
            
            // Mostrar botones de vista previa e impresión
            document.getElementById('previewProjectBtn').style.display = 'inline-block';
            document.getElementById('printProjectBtn').style.display = 'inline-block';
            document.getElementById('completeProjectBtn').style.display = 'none';
            
            alert('¡Proyecto completado exitosamente! Ahora puedes imprimirlo.');
        } catch (error) {
            console.error('Error al completar proyecto:', error);
            alert('Error al guardar el proyecto. Inténtalo de nuevo.');
        }
    }

    function generateProjectSummary() {
        const summary = {};
        projectConversations.forEach((conv, index) => {
            const step = Math.floor(index / 10) + 1;
            if (!summary[step]) summary[step] = [];
            summary[step].push(conv);
        });
        return summary;
    }

    // ===== FUNCIÓN PARA MOSTRAR MODAL DE CARGA DEL PLAN DE NEGOCIO =====
    function showPlanLoadingModal(messageText) {
        const loadingModal = document.createElement('div');
        loadingModal.id = 'planLoadingModal';
        loadingModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; color: white; font-family: 'Segoe UI', Arial, sans-serif;
        `;
        loadingModal.innerHTML = `
            <div style="text-align: center; max-width: 500px; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📝</div>
                <div style="font-size: 22px; margin-bottom: 10px; font-weight: 600;">${messageText || 'Generando tu Plan de Negocio con IA...'}</div>
                <div id="planLoadingStatus" style="font-size: 14px; color: #aaa; margin-bottom: 20px;">Recopilando tus respuestas...</div>
                <div style="width: 300px; height: 6px; background: #333; border-radius: 3px; overflow: hidden; margin: 0 auto;">
                    <div id="planProgressBar" style="width: 5%; height: 100%; background: linear-gradient(90deg, #4CAF50, #45d37a); transition: width 0.5s; border-radius: 3px;"></div>
                </div>
                <div id="planProgressText" style="margin-top: 10px; font-size: 13px; color: #888;">Esto puede tomar 30-60 segundos...</div>
            </div>
        `;
        document.body.appendChild(loadingModal);
        return loadingModal;
    }

    function updatePlanLoadingProgress(percent, statusText) {
        const bar = document.getElementById('planProgressBar');
        const status = document.getElementById('planLoadingStatus');
        if (bar) bar.style.width = percent + '%';
        if (status && statusText) status.textContent = statusText;
    }

    function removePlanLoadingModal() {
        const modal = document.getElementById('planLoadingModal');
        if (modal && document.body.contains(modal)) document.body.removeChild(modal);
    }

    // ===== GENERAR PLAN DE NEGOCIO CON IA =====
    async function generateProjectWithAI(mode) {
        const loadingModal = showPlanLoadingModal('Charlotte está elaborando tu Plan de Negocio...');

        try {
            // Obtener API key de Firebase primero
            let apiKeyFromFirebase = '';
            console.log('🔍 Intentando obtener API key de Firebase...');
            console.log('window.db disponible:', !!window.db);
            
            // Mostrar qué proyecto de Firebase se está usando
            if (window.db && window.db.app) {
                console.log('🔥 Proyecto Firebase:', window.db.app.options.projectId);
            }
            
            if (window.db) {
                try {
                    console.log('📡 Consultando Firestore...');
                    
                    // Intentar primero en coleccion 'config'
                    let configDoc = await window.getDoc(window.doc(window.db, 'config', 'openrouter'));
                    console.log('📄 raw configDoc:', configDoc);
                    console.log('📄 configDoc.type:', configDoc?.constructor?.name);
                    console.log('📄 configDoc.exists():', configDoc?.exists());
                    
                    // Método alternativo: verificar si tiene datos
                    const hasData = configDoc && configDoc.exists && configDoc.exists();
                    console.log('📄 hasData:', hasData);
                    
                    if (hasData) {
                        const data = configDoc.data();
                        console.log('📄 data:', data);
                        if (data && data.apiKey) {
                            apiKeyFromFirebase = data.apiKey;
                            console.log('✅ API key cargada desde Firebase');
                        }
                    }
                    
                    // Si no existe, intentar en coleccion 'configuracion'
                    if (!apiKeyFromFirebase) {
                        console.log('📄 Intentando en configuracion...');
                        let configDoc2 = await window.getDoc(window.doc(window.db, 'configuracion', 'openrouter'));
                        console.log('📄 configDoc2.exists():', configDoc2?.exists());
                        
                        if (configDoc2 && configDoc2.exists && configDoc2.exists()) {
                            const data2 = configDoc2.data();
                            console.log('📄 data2:', data2);
                            if (data2 && data2.apiKey) {
                                apiKeyFromFirebase = data2.apiKey;
                                console.log('✅ API key cargada desde configuracion');
                            }
                        }
                    }
                } catch(e) {
                    console.error('❌ Error completo:', e);
                }
            } else {
                console.log('⚠️ Firebase no está disponible (window.db es undefined)');
            }

            // 1. Recopilar TODAS las respuestas del estudiante
            updatePlanLoadingProgress(10, 'Recopilando tus 17 respuestas...');

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            const userName = currentUser ? (currentUser.displayName || currentUser.name || currentUser.email) : 'Estudiante';
            const userProgram = currentUser ? currentUser.programa || 'panaderia' : 'panaderia';
            const programName = userProgram.includes('panader') || userProgram.includes('pasteler')
                ? 'Panadería y Pastelería' : 'Belleza Integral';
            const currentDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

            // Recopilar TODAS las respuestas de los 5 módulos
            const respuestas = {
                // Módulo 1 – Identificación
                nombre_negocio: projectData[1]?.nombre_negocio?.answer || '',
                eslogan: projectData[1]?.eslogan?.answer || '',
                descripcion: projectData[1]?.descripcion?.answer || '',
                mision: projectData[1]?.mision?.answer || '',
                vision: projectData[1]?.vision?.answer || '',
                // Módulo 2 – Mercado
                cliente_ideal: projectData[2]?.cliente_ideal?.answer || '',
                competencia: projectData[2]?.competencia?.answer || '',
                propuesta_valor: projectData[2]?.propuesta_valor?.answer || '',
                // Módulo 3 – Operaciones
                servicios_principales: projectData[3]?.servicios_principales?.answer || '',
                proceso_estrella: projectData[3]?.proceso_estrella?.answer || '',
                recursos_necesarios: projectData[3]?.recursos_necesarios?.answer || '',
                // Módulo 4 – Marketing
                canales_venta: projectData[4]?.canales_venta?.answer || '',
                estrategia_redes: projectData[4]?.estrategia_redes?.answer || '',
                campaña_lanzamiento: projectData[4]?.campaña_lanzamiento?.answer || '',
                // Módulo 5 – Finanzas
                inversion_inicial: projectData[5]?.inversion_inicial?.answer || '',
                precio_venta: projectData[5]?.precio_venta?.answer || '',
                proyeccion_ventas: projectData[5]?.proyeccion_ventas?.answer || ''
            };

            // Verificar que hay datos suficientes
            const respuestasLlenas = Object.values(respuestas).filter(r => r.trim().length > 0).length;
            if (respuestasLlenas < 5) {
                removePlanLoadingModal();
                alert('No hay suficientes respuestas para generar el plan. Completa al menos los primeros módulos.');
                return;
            }

            updatePlanLoadingProgress(20, 'Enviando datos a la IA para análisis...');

            // 2. Construir el MEGA PROMPT para la IA
            const megaPrompt = `Eres Charlotte, experta en creación de planes de negocio para emprendedores del sector "${programName}".

TAREA: Genera un PLAN DE NEGOCIO COMPLETO, PROFESIONAL y ÚNICO basado EXCLUSIVAMENTE en las respuestas reales del estudiante. NO inventes datos. Transforma y expande sus respuestas en contenido profesional.

===== DATOS DEL ESTUDIANTE =====
Nombre: ${userName}
Programa: ${programName}
Fecha: ${currentDate}

===== RESPUESTAS DEL ESTUDIANTE (17 preguntas) =====

MÓDULO 1 – IDENTIFICACIÓN DEL NEGOCIO:
1. Nombre del negocio: "${respuestas.nombre_negocio}"
2. Eslogan: "${respuestas.eslogan}"
3. Descripción del negocio: "${respuestas.descripcion}"
4. Misión: "${respuestas.mision}"
5. Visión: "${respuestas.vision}"

MÓDULO 2 – ANÁLISIS DE MERCADO:
6. Perfil del cliente ideal: "${respuestas.cliente_ideal}"
7. Análisis de competencia: "${respuestas.competencia}"
8. Propuesta de valor única: "${respuestas.propuesta_valor}"

MÓDULO 3 – OPERACIONES:
9. Productos/servicios principales: "${respuestas.servicios_principales}"
10. Proceso del producto/servicio estrella: "${respuestas.proceso_estrella}"
11. Recursos necesarios: "${respuestas.recursos_necesarios}"

MÓDULO 4 – MARKETING:
12. Canales de venta: "${respuestas.canales_venta}"
13. Estrategia en redes sociales: "${respuestas.estrategia_redes}"
14. Campaña de lanzamiento: "${respuestas.campaña_lanzamiento}"

MÓDULO 5 – FINANZAS:
15. Inversión inicial: "${respuestas.inversion_inicial}"
16. Precio de venta y utilidad: "${respuestas.precio_venta}"
17. Proyección de ventas (3 meses): "${respuestas.proyeccion_ventas}"

===== INSTRUCCIONES DE GENERACIÓN =====

Genera el plan de negocio con EXACTAMENTE esta estructura en formato Markdown. Cada sección debe ser EXTENSA (mínimo 2-3 párrafos por subsección). Usa los datos reales del estudiante para crear contenido único y personalizado:

# PLAN DE NEGOCIO COMPLETO

## "NOMBRE_DEL_NEGOCIO" - [Subtítulo descriptivo basado en la descripción]

---

## 1. RESUMEN EJECUTIVO
(Párrafo completo de 150-200 palabras que sintetice TODO el plan: qué es el negocio, a quién sirve, cuánto necesita de inversión, qué lo diferencia, proyecciones. Basado 100% en las respuestas.)

---

## 2. CAPÍTULO 1: IDENTIDAD CORPORATIVA

### 2.1. Nombre y Posicionamiento
(Analiza el nombre elegido, su significado, qué transmite al mercado)

### 2.2. Descripción del Negocio
(Expande la descripción del estudiante de forma profesional, detalla los servicios/productos)

### 2.3. Filosofía Empresarial
- **Misión:** (Toma la misión del estudiante, mejórala profesionalmente sin cambiar su esencia)
- **Visión:** (Toma la visión del estudiante, hazla más aspiracional sin cambiar su esencia)

### 2.4. Valores Implícitos
(Deduce 4-5 valores corporativos que se desprenden de las respuestas del estudiante. Cada uno con nombre y descripción de 1 línea.)

---

## 3. CAPÍTULO 2: ANÁLISIS DE MERCADO

### 3.1. Perfil del Cliente Ideal
(Toma la respuesta del cliente ideal y crea un perfil completo con: Características demográficas, Necesidades y deseos, Comportamiento de compra. Todo basado en lo que dijo el estudiante.)

### 3.2. Análisis de la Competencia
(Toma la respuesta de competencia y crea una tabla comparativa: Aspecto | Competidor | Este Negocio. Analiza fortalezas y debilidades de cada uno.)

### 3.3. Propuesta de Valor Única
(Transforma la propuesta de valor del estudiante en una propuesta profesional con componentes de valor y diferenciadores clave.)

---

## 4. CAPÍTULO 3: OPERACIONES Y PROCESOS

### 4.1. Catálogo de Productos/Servicios
(Toma los servicios/productos principales y organízalos en un catálogo profesional con descripciones detalladas de cada uno.)

### 4.2. Proceso Productivo Estándar
(Toma el proceso estrella del estudiante y conviértelo en un diagrama de fases con tiempos, pasos detallados y consideraciones técnicas.)

### 4.3. Recursos Necesarios
(Organiza los recursos mencionados por el estudiante en categorías: A. Inversión Fija, B. Insumos de Consumo, C. Recursos Digitales.)

---

## 5. CAPÍTULO 4: ESTRATEGIA DE MARKETING

### 5.1. Canales de Venta Integrados
(Toma los canales de venta del estudiante y estructura un modelo de distribución con proceso de venta paso a paso.)

### 5.2. Estrategia en Redes Sociales
(Expande la estrategia del estudiante con plan de contenido específico para cada plataforma que mencionó.)

### 5.3. Campaña de Lanzamiento
(Transforma la campaña del estudiante en un plan detallado con: oferta, condiciones, acciones complementarias, objetivos medibles.)

---

## 6. CAPÍTULO 5: PLAN FINANCIERO

### 6.1. Inversión Inicial
(Toma los datos de inversión del estudiante y organízalos en una tabla con distribución porcentual.)

### 6.2. Estructura de Precios
(Analiza el precio de venta y utilidad que dio el estudiante. Crea estructura de costos y márgenes.)

### 6.3. Proyecciones Financieras
(Toma la proyección del estudiante y crea un desglose mes a mes para el primer trimestre con ingresos estimados.)

### 6.4. Punto de Equilibrio
(Calcula el punto de equilibrio basado en los datos reales que proporcionó el estudiante.)

---

## 7. CONCLUSIONES Y RECOMENDACIONES

### 7.1. Fortalezas del Proyecto
(Lista 4-5 fortalezas basadas en las respuestas reales del estudiante.)

### 7.2. Riesgos Identificados
(Lista 3-4 riesgos reales basados en el tipo de negocio y sector.)

### 7.3. Recomendaciones de Implementación
(Recomendaciones a corto plazo 0-3 meses y mediano plazo 3-6 meses. Específicas para ESTE negocio.)

### 7.4. Reflexión Final
(Párrafo de cierre de 100-150 palabras que resuma la viabilidad del proyecto basándose en los datos reales del estudiante.)

---

REGLAS OBLIGATORIAS:
1. TODO el contenido debe estar basado en las 17 respuestas del estudiante. NO inventes datos que el estudiante no proporcionó.
2. Si el estudiante mencionó números específicos (precios, cantidades, inversiones), ÚSALOS tal cual.
3. Si el estudiante mencionó competidores específicos, ÚSALOS por nombre.
4. Si el estudiante describió su cliente ideal, USA esa descripción exacta como base.
5. Cada sección debe tener mínimo 2 párrafos sustanciales.
6. Usa formato Markdown estricto con ##, ###, **, -, |tabla|.
7. El documento debe ser mínimo 3000 palabras.
8. NO uses frases genéricas como "según estudios del sector". Usa solo la información del estudiante.
9. Las tablas deben usar formato Markdown: | Col1 | Col2 |
10. Escribe en español profesional pero accesible.`;

            // 3. Llamar a la IA
            updatePlanLoadingProgress(30, 'La IA está analizando tu negocio...');

            const apiKey = apiKeyFromFirebase || localStorage.getItem('openrouter_api_key') || window.OPENROUTER_API_KEY || '';
            console.log('API Key disponible:', apiKey ? 'Sí' : 'No');
            console.log('API Key primeros 20 chars:', apiKey ? apiKey.substring(0, 20) + '...' : 'N/A');
            
            if (!apiKey || apiKey === 'sk-or-v1-fake-key') {
                removePlanLoadingModal();
                alert('❌ La IA no está configurada. Pide al administrador que configure la API key de OpenRouter en el panel de admin.');
                return;
            }

            // Simular progreso mientras la IA trabaja
            let aiProgress = 30;
            const progressTimer = setInterval(() => {
                aiProgress += 2;
                if (aiProgress > 85) aiProgress = 85;
                const messages = [
                    'La IA está analizando tu negocio...',
                    'Elaborando el resumen ejecutivo...',
                    'Construyendo la identidad corporativa...',
                    'Analizando tu mercado objetivo...',
                    'Estructurando las operaciones...',
                    'Diseñando la estrategia de marketing...',
                    'Calculando proyecciones financieras...',
                    'Redactando conclusiones...',
                    'Finalizando el documento...'
                ];
                const msgIdx = Math.min(Math.floor((aiProgress - 30) / 7), messages.length - 1);
                updatePlanLoadingProgress(aiProgress, messages[msgIdx]);
            }, 2000);

            const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Cursos Charlotte'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres Charlotte, una consultora empresarial experta en crear planes de negocio detallados, profesionales y únicos. Generas documentos extensos y bien estructurados en formato Markdown. Cada plan que creas es completamente diferente porque se basa exclusivamente en los datos específicos de cada estudiante.'
                        },
                        { role: 'user', content: megaPrompt }
                    ],
                    max_tokens: 16000,
                    temperature: 0.7
                })
            });

            console.log('Respuesta de IA - Status:', aiResponse.status);
            console.log('Respuesta de IA - OK:', aiResponse.ok);

            clearInterval(progressTimer);

            if (!aiResponse.ok) {
                const errorData = await aiResponse.json().catch(() => ({}));
                throw new Error(`Error de IA: ${aiResponse.status} - ${errorData.error?.message || 'Error desconocido'}`);
            }

            updatePlanLoadingProgress(90, 'Formateando tu documento profesional...');

            const data = await aiResponse.json();
            const planMarkdown = data.choices[0].message.content;

            // 4. Convertir Markdown a HTML profesional
            updatePlanLoadingProgress(95, 'Aplicando diseño profesional...');

            const planHTML = convertPlanToHTML(planMarkdown, userName, programName, currentDate, respuestas.nombre_negocio);

            updatePlanLoadingProgress(100, '¡Plan de negocio listo!');

            // 5. Abrir el documento
            setTimeout(() => {
                removePlanLoadingModal();

                const outputWindow = window.open('', '_blank');
                if (!outputWindow) {
                    alert('Tu navegador bloqueó la ventana emergente. Habilita las ventanas emergentes e intenta de nuevo.');
                    return;
                }
                outputWindow.document.write(planHTML);
                outputWindow.document.close();

                if (mode === 'print') {
                    setTimeout(() => outputWindow.print(), 1000);
                }
            }, 500);

        } catch (error) {
            console.error('Error generando plan de negocio:', error);
            removePlanLoadingModal();
            alert('Error al generar el plan: ' + error.message);
        }
    }

    // ===== CONVERTIR MARKDOWN DE LA IA A HTML PROFESIONAL =====
    function convertPlanToHTML(markdown, userName, programName, currentDate, businessName) {
        // Limpiar el markdown
        let content = markdown.trim();

        // Convertir tablas Markdown a HTML
        content = content.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, function(match, header, rows) {
            const headers = header.split('|').map(h => h.trim()).filter(h => h);
            let table = '<table><thead><tr>';
            headers.forEach(h => { table += `<th>${h}</th>`; });
            table += '</tr></thead><tbody>';
            rows.trim().split('\n').forEach(row => {
                const cells = row.split('|').map(c => c.trim()).filter(c => c);
                table += '<tr>';
                cells.forEach(c => { table += `<td>${c}</td>`; });
                table += '</tr>';
            });
            table += '</tbody></table>';
            return table;
        });

        // Convertir headers Markdown a HTML
        content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        content = content.replace(/^## (\d+\..+)$/gm, '<h2 class="chapter-heading">$1</h2>');
        content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Convertir negrita y cursiva
        content = content.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Convertir listas
        content = content.replace(/^- (.+)$/gm, '<li>$1</li>');
        content = content.replace(/^(\d+)\. (.+)$/gm, '<li class="numbered">$2</li>');

        // Agrupar <li> consecutivos en <ul>
        content = content.replace(/((?:<li[^>]*>.+<\/li>\s*)+)/g, '<ul>$1</ul>');

        // Convertir separadores
        content = content.replace(/^---+$/gm, '<hr class="section-divider">');

        // Convertir párrafos (líneas que no son tags HTML)
        content = content.split('\n').map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<')) return trimmed;
            return `<p>${trimmed}</p>`;
        }).join('\n');

        // Limpiar párrafos vacíos
        content = content.replace(/<p>\s*<\/p>/g, '');

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plan de Negocio - ${businessName || 'Proyecto Final'}</title>
    <style>
        @page { size: A4; margin: 2.5cm 2cm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.8; color: #1a1a2e; background: #fff;
            max-width: 900px; margin: 0 auto; padding: 2cm;
        }
        /* === PORTADA === */
        .cover-page {
            page-break-after: always; text-align: center;
            min-height: 90vh; display: flex; flex-direction: column;
            justify-content: center; padding: 3cm 1cm;
            border: 3px double #1a1a2e;
        }
        .cover-page .institute { font-size: 13pt; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 3cm; }
        .cover-page .doc-type { font-size: 14pt; color: #666; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 1cm; }
        .cover-page .business-name { font-size: 28pt; font-weight: bold; color: #1a1a2e; margin-bottom: 0.5cm; text-transform: uppercase; }
        .cover-page .subtitle { font-size: 14pt; color: #444; font-style: italic; margin-bottom: 3cm; }
        .cover-page .student-info { font-size: 12pt; line-height: 2; }
        .cover-page .student-info strong { color: #1a1a2e; }

        /* === CONTENIDO === */
        h1 { font-size: 22pt; text-align: center; margin: 2cm 0 1cm; color: #1a1a2e; text-transform: uppercase; letter-spacing: 1px; page-break-before: always; }
        h1:first-of-type { page-break-before: avoid; }
        h2 { font-size: 16pt; color: #1a1a2e; margin: 1.5cm 0 0.5cm; padding-bottom: 0.3cm; border-bottom: 2px solid #1a1a2e; }
        h2.chapter-heading { page-break-before: always; font-size: 18pt; margin-top: 2cm; }
        h3 { font-size: 13pt; color: #333; margin: 1cm 0 0.4cm; }
        p { text-align: justify; margin-bottom: 0.6cm; font-size: 12pt; }
        strong { color: #1a1a2e; }
        ul { margin: 0.4cm 0 0.8cm 1.2cm; }
        li { margin-bottom: 0.3cm; font-size: 12pt; }
        li.numbered { list-style: decimal; }
        hr.section-divider { border: none; border-top: 1px solid #ccc; margin: 1.5cm 0; }

        /* === TABLAS === */
        table {
            width: 100%; border-collapse: collapse; margin: 0.8cm 0;
            font-size: 11pt; page-break-inside: avoid;
        }
        th { background: #1a1a2e; color: #fff; padding: 10px 12px; text-align: left; font-weight: 600; }
        td { padding: 8px 12px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f8f9fa; }
        tr:hover { background: #e8f4f8; }

        /* === CAJAS ESPECIALES === */
        blockquote {
            background: #f0f4ff; border-left: 4px solid #1a1a2e;
            padding: 1cm; margin: 0.8cm 0; font-style: italic; color: #333;
        }

        /* === PIE DE PÁGINA === */
        .footer-note {
            page-break-before: always; text-align: center;
            padding-top: 3cm; font-style: italic; color: #666;
            border-top: 2px solid #1a1a2e; margin-top: 2cm;
        }

        /* === IMPRESIÓN === */
        @media print {
            body { padding: 0; max-width: none; }
            .cover-page { height: 100vh; }
            h2.chapter-heading { page-break-before: always; }
            .no-print { display: none !important; }
        }

        /* === BOTÓN IMPRIMIR === */
        .print-btn {
            position: fixed; top: 20px; right: 20px;
            background: #1a1a2e; color: #fff; border: none;
            padding: 12px 24px; border-radius: 8px; cursor: pointer;
            font-size: 14px; font-weight: 600; z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s;
        }
        .print-btn:hover { background: #2d2d5e; transform: translateY(-2px); }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / PDF</button>

    <!-- PORTADA -->
    <div class="cover-page">
        <div class="institute">ESCUELA DE CAPACITACIÓN Y EMPRENDIMIENTO CHARLOTTE</div>
        <div class="doc-type">Proyecto Final de Emprendimiento</div>
        <div class="doc-type">Plan de Negocio</div>
        <div class="business-name">"${businessName || 'Mi Negocio'}"</div>
        <div class="subtitle">${programName}</div>
        <div class="student-info">
            <strong>Presentado por:</strong> ${userName}<br>
            <strong>Programa:</strong> ${programName === 'Panadería y Pastelería' ? 'Maestro de Taller en Panadería y Pastelería' : 'Maestro de Taller en Belleza Integral'}<br>
            <strong>Tutora Virtual:</strong> Charlotte<br>
            <strong>Fecha:</strong> ${currentDate}
        </div>
    </div>

    <!-- CONTENIDO GENERADO POR IA -->
    ${content}

    <!-- PIE FINAL -->
    <div class="footer-note">
        <strong>Documento elaborado con base en la información proporcionada por el estudiante durante el proceso de tutoría interactiva.</strong><br><br>
        Este plan de negocio fue generado mediante la metodología estructurada de la tutora virtual Charlotte, utilizando exclusivamente las respuestas y datos proporcionados por ${userName}.<br><br>
        <strong>Versión Final — ${currentDate}</strong>
    </div>
</body>
</html>`;
    }

    // ===== FUNCIONES PÚBLICAS QUE LLAMAN AL GENERADOR CON IA =====
    async function previewProjectBook() {
        alert('Iniciando vista previa...');
        console.log('previewProjectBook llamado');
        try {
            await generateProjectWithAI('preview');
        } catch (e) {
            console.error('Error en previewProjectBook:', e);
            alert('Error: ' + e.message);
        }
    }

    async function printProjectBook() {
        alert('Iniciando impresión...');
        console.log('printProjectBook llamado');
        try {
            await generateProjectWithAI('print');
        } catch (e) {
            console.error('Error en printProjectBook:', e);
            alert('Error: ' + e.message);
        }
    }

    function extractBusinessName() {
        // Extract business name from projectData first, then from conversations
        if (projectData && projectData[1] && projectData[1].nombre_negocio && projectData[1].nombre_negocio.answer) {
            return projectData[1].nombre_negocio.answer;
        }

        // Fallback: extract from projectConversations
        if (!projectConversations || !Array.isArray(projectConversations)) return null;

        // Look for business name in conversations
        for (let conv of projectConversations) {
            // Check user responses first
            if (conv.role === 'user' && conv.content) {
                // Look for quoted text
                const quotes = conv.content.match(/"([^"]+)"/g);
                if (quotes && quotes.length > 0) {
                    return quotes[0].replace(/"/g, '');
                }

                // Look for naming patterns
                const namePatterns = /(se llama|llamarse|nombre.*es|mi negocio.*es|negocio.*es)\s*([^.!?]+)/i;
                const match = conv.content.match(namePatterns);
                if (match) {
                    return match[2].trim();
                }
            }

            // Check AI responses
            if (conv.role === 'assistant' && conv.content) {
                // Look for AI confirming the name
                const aiPatterns = /(tu negocio se llamará|el nombre.*será|negocio.*"|llamarse)\s*["']([^"']+)["']/i;
                const match = conv.content.match(aiPatterns);
                if (match) {
                    return match[2].trim();
                }

                // Look for quoted names in AI responses
                const quotes = conv.content.match(/"([^"]+)"/g);
                if (quotes && quotes.length > 0) {
                    // Filter out common phrases, look for business-like names
                    for (let quote of quotes) {
                        const name = quote.replace(/"/g, '');
                        if (name.length > 3 && !name.toLowerCase().includes('charlotte') && !name.toLowerCase().includes('tutora')) {
                            return name;
                        }
                    }
                }
            }
        }

        return null;
    }

    function extractBusinessInfo(type) {
        // Extract business information from projectData fields and conversations
        let module = 1;
        let fieldKeywords = [];

        switch(type) {
            case 'description':
                module = 1;
                fieldKeywords = ['descripcion', 'description', 'business_description'];
                break;
            case 'mission':
                module = 1;
                fieldKeywords = ['mision', 'mission', 'business_mission'];
                break;
            case 'vision':
                module = 1;
                fieldKeywords = ['vision', 'business_vision'];
                break;
            case 'introduction':
                module = 1;
                fieldKeywords = ['nombre_negocio', 'name', 'business_name'];
                break;
            case 'market_analysis':
                module = 2;
                fieldKeywords = ['cliente_ideal', 'competencia', 'propuesta_valor', 'market', 'mercado', 'analysis', 'analisis'];
                break;
            case 'operations':
                module = 3;
                fieldKeywords = ['servicios_principales', 'proceso_estrella', 'recursos_necesarios', 'operations', 'operaciones', 'process', 'proceso'];
                break;
            case 'marketing':
                module = 4;
                fieldKeywords = ['canales_venta', 'estrategia_redes', 'campaña_lanzamiento', 'marketing', 'mercadeo', 'strategy', 'estrategia'];
                break;
            case 'finance':
            case 'conclusion':
                module = 5;
                fieldKeywords = ['inversion_inicial', 'precio_venta', 'proyeccion_ventas', 'finance', 'finanzas', 'financial', 'conclusion', 'conclusion'];
                break;
        }

        // First try to extract from projectData fields
        if (projectData && projectData[module]) {
            const fields = Object.keys(projectData[module]);

            // Find fields that match the keywords
            for (let keyword of fieldKeywords) {
                const matchingField = fields.find(field => field.toLowerCase().includes(keyword.toLowerCase()));
                if (matchingField && projectData[module][matchingField].answer) {
                    return projectData[module][matchingField].answer;
                }
            }

            // If no specific field found, combine all answers from the module
            const answers = Object.values(projectData[module]).map(field => field.answer).filter(answer => answer);
            if (answers.length > 0) {
                const content = answers.join(' ').substring(0, 1500);
                return content;
            }
        }

        // Fallback: extract from conversations (rough approximation by conversation segments)
        if (projectConversations && Array.isArray(projectConversations)) {
            // Divide conversations roughly by module (this is approximate)
            const conversationsPerModule = 20; // Rough estimate
            const startIndex = (module - 1) * conversationsPerModule;
            const endIndex = module * conversationsPerModule;
            const moduleConversations = projectConversations.slice(startIndex, endIndex);

            let relevantResponses = [];

            moduleConversations.forEach(conv => {
                if (conv.role === 'assistant' && conv.content && conv.content.length > 20) {
                    relevantResponses.push(conv.content);
                }
                if (conv.role === 'user' && conv.content && conv.content.length > 10) {
                    relevantResponses.push(conv.content);
                }
            });

            if (relevantResponses.length > 0) {
                const content = relevantResponses.join(' ').substring(0, 1500) + '...';
                return content;
            }
        }

        return null;
    }

    function generateProjectBookHTML() {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        const userName = currentUser ? (currentUser.displayName || currentUser.name || currentUser.email) : 'Kevin Andrés Núñez Ortiz';
        const userProgram = currentUser ? currentUser.programa || 'panaderia' : 'panaderia';
        const instituteName = 'ESCUELA DE CAPACITACIÓN Y EMPRENDIMIENTO CHARLOTTE';
        const courseName = userProgram === 'panaderia' ? 'MAESTRO DE TALLER EN PANADERÍA Y PASTELERÍA' :
                          userProgram === 'belleza' ? 'MAESTRO DE TALLER EN BELLEZA INTEGRAL' :
                          'MAESTRO DE TALLER EN EMPRENDIMIENTO';
        const currentDate = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Extract project information from projectData
        const businessName = extractBusinessName() || 'Nuestra Receta';
        const businessDescription = extractBusinessInfo('description') || 'la elaboración de tortas artesanales personalizadas para celebraciones especiales';

        // Extract and improve mission and vision based on student responses
        const rawMission = extractBusinessInfo('mission') || '';
        const rawVision = extractBusinessInfo('vision') || '';

        // Function to improve mission statement
        function improveMission(rawMission, businessName, businessDescription) {
            if (!rawMission || rawMission.trim() === '') {
                return `Ser el referente en ${businessDescription}, ofreciendo productos/servicios de calidad superior que satisfagan las necesidades de nuestros clientes con excelencia y compromiso.`;
            }

            // Improve the mission by making it more professional and complete
            let improved = rawMission.trim();

            // Add business name if not present
            if (!improved.toLowerCase().includes(businessName.toLowerCase())) {
                improved = `${businessName} se compromete a ${improved.toLowerCase()}`;
            }

            // Ensure it starts with action verb
            const actionVerbs = ['ser', 'ofrecer', 'brindar', 'proporcionar', 'desarrollar', 'crear', 'entregar'];
            const startsWithAction = actionVerbs.some(verb => improved.toLowerCase().startsWith(verb));
            if (!startsWithAction) {
                improved = `Ser ${improved.toLowerCase()}`;
            }

            // Capitalize first letter
            improved = improved.charAt(0).toUpperCase() + improved.slice(1);

            return improved;
        }

        // Function to improve vision statement
        function improveVision(rawVision, businessName, businessDescription) {
            if (!rawVision || rawVision.trim() === '') {
                return `Convertirnos en el líder del sector, reconocido por la innovación, calidad y satisfacción total de nuestros clientes.`;
            }

            // Improve the vision by making it more aspirational and forward-looking
            let improved = rawVision.trim();

            // Add future-oriented language if not present
            const futureWords = ['convertirnos', 'ser', 'liderar', 'expandir', 'crecer', 'desarrollar', 'implementar', 'establecer'];
            const hasFutureLanguage = futureWords.some(word => improved.toLowerCase().includes(word));
            if (!hasFutureLanguage) {
                improved = `Convertirnos en ${improved.toLowerCase()}`;
            }

            // Add time frame if not present
            if (!improved.toLowerCase().includes('202') && !improved.toLowerCase().includes('futuro') && !improved.toLowerCase().includes('líder')) {
                improved += ', estableciendo un estándar de excelencia en el mercado.';
            }

            // Capitalize first letter
            improved = improved.charAt(0).toUpperCase() + improved.slice(1);

            return improved;
        }

        const mission = improveMission(rawMission, businessName, businessDescription);
        const vision = improveVision(rawVision, businessName, businessDescription);

        const slogan = projectData && projectData[1] && projectData[1].eslogan ? projectData[1].eslogan.answer : '"Pastelería de calidad en la mesa de tu hogar"';

        // Extract additional information with more specific mappings
        const marketAnalysis = extractBusinessInfo('market_analysis') || '';
        const operations = extractBusinessInfo('operations') || '';
        const marketing = extractBusinessInfo('marketing') || '';
        const finance = extractBusinessInfo('finance') || '';

        // Parse market analysis components with more detail
        let clientProfile = '', competition = '', valueProposition = '';
        if (marketAnalysis) {
            if (projectData && projectData[2]) {
                clientProfile = projectData[2].cliente_ideal ? projectData[2].cliente_ideal.answer : `Nuestro cliente ideal es aquel que valora la calidad, la personalización y busca soluciones que se adapten a sus necesidades específicas. Es un cliente que entiende el valor de los productos/servicios diferenciados y está dispuesto a invertir en experiencias únicas.`;
                competition = projectData[2].competencia ? projectData[2].competencia.answer : `La competencia en el sector se caracteriza por enfoques tradicionales centrados en volumen y estandarización. Nuestra diferenciación radica en la especialización, la atención personalizada y el enfoque en la calidad artesanal.`;
                valueProposition = projectData[2].propuesta_valor ? projectData[2].propuesta_valor.answer : `Nuestra propuesta única combina calidad superior, personalización genuina y un servicio excepcional que va más allá de las expectativas convencionales.`;
            }
        }

        // Parse operations components with bakery-specific detail
        let mainServices = '', starProcess = '', resources = '';
        if (operations) {
            if (projectData && projectData[3]) {
                mainServices = projectData[3].servicios_principales ? projectData[3].servicios_principales.answer : `**Línea Principal de Productos/Servicios:**

Nuestros productos/servicios principales están diseñados para satisfacer las necesidades específicas de nuestro mercado objetivo, combinando calidad, innovación y personalización.`;
                starProcess = projectData[3].proceso_estrella ? projectData[3].proceso_estrella.answer : `**Proceso Principal:**

Contamos con un proceso optimizado que garantiza la calidad y consistencia en cada entrega. Este proceso ha sido desarrollado considerando las mejores prácticas del sector y las necesidades específicas de nuestros clientes.`;
                resources = projectData[3].recursos_necesarios ? projectData[3].recursos_necesarios.answer : `**Recursos Identificados:**

Hemos identificado los recursos necesarios para operar eficientemente, incluyendo equipos, insumos, tecnología y talento humano especializado.`;
            }
        }

        // Parse marketing components with detailed strategy
        let salesChannels = '', socialStrategy = '', launchCampaign = '';
        if (marketing) {
            if (projectData && projectData[4]) {
                salesChannels = projectData[4].canales_venta ? projectData[4].canales_venta.answer : `**Estrategia Multicanal:**

Implementamos una estrategia de distribución que combina canales digitales y tradicionales para maximizar el alcance y facilitar el acceso a nuestros productos/servicios.`;
                socialStrategy = projectData[4].estrategia_redes ? projectData[4].estrategia_redes.answer : `**Presencia Digital Estratégica:**

Desarrollamos una presencia digital sólida que nos permite conectar con nuestro público objetivo, compartir nuestro valor y construir una comunidad alrededor de nuestra marca.`;
                launchCampaign = projectData[4].campaña_lanzamiento ? projectData[4].campaña_lanzamiento.answer : `**Campaña de Lanzamiento:**

Hemos diseñado una campaña inicial que busca generar awareness, atraer primeros clientes y posicionar nuestra marca en el mercado.`;
            }
        }

        // Parse finance components with specific numbers
        let initialInvestment = '', pricing = '', salesProjection = '';
        if (finance) {
            if (projectData && projectData[5]) {
                initialInvestment = projectData[5].inversion_inicial ? projectData[5].inversion_inicial.answer : `**Inversión Inicial Estimada:**

La inversión inicial ha sido calculada considerando todos los aspectos necesarios para iniciar operaciones de manera eficiente y segura.`;
                pricing = projectData[5].precio_venta ? projectData[5].precio_venta.answer : `**Estructura de Precios:**

Nuestra estrategia de precios está diseñada para garantizar rentabilidad mientras mantenemos la competitividad y el valor percibido por nuestros clientes.`;
                salesProjection = projectData[5].proyeccion_ventas ? projectData[5].proyeccion_ventas.answer : `**Proyecciones de Ventas:**

Las proyecciones han sido elaboradas considerando el análisis de mercado, la capacidad operativa y las tendencias del sector.`;
            }
        }

        let html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PROYECTO FINAL DE EMPRENDIMIENTO - ${userName}</title>
            <style>
                @page {
                    size: A4;
                    margin: 2.5cm 2cm 2.5cm 2cm;
                    @bottom-right {
                        content: "Página " counter(page);
                    }
                }

                body {
                    font-family: 'Times New Roman', serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: none;
                    margin: 0;
                    padding: 0;
                    font-size: 12pt;
                }

                .title-page {
                    page-break-after: always;
                    text-align: center;
                    padding: 3cm;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .main-title {
                    font-size: 20pt;
                    font-weight: bold;
                    margin-bottom: 1cm;
                    text-transform: uppercase;
                }

                .subtitle {
                    font-size: 16pt;
                    font-weight: bold;
                    margin-bottom: 2cm;
                }

                .student-info {
                    font-size: 12pt;
                    margin-bottom: 1cm;
                }

                .institute-info {
                    font-size: 11pt;
                    margin-top: 2cm;
                }

                .toc {
                    page-break-before: always;
                    padding: 2cm;
                }

                .toc-title {
                    font-size: 16pt;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 1cm;
                    text-transform: uppercase;
                }

                .toc-section {
                    margin-bottom: 0.8cm;
                }

                .toc-item {
                    margin-bottom: 0.3cm;
                    margin-left: 1cm;
                }

                .chapter {
                    page-break-before: always;
                    padding: 2cm;
                    margin-bottom: 1cm;
                }

                .chapter:first-child {
                    page-break-before: avoid;
                }

                .chapter-title {
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 0.8cm;
                    border-bottom: 1px solid #666;
                    padding-bottom: 0.3cm;
                    text-transform: uppercase;
                }

                .section-title {
                    font-size: 12pt;
                    font-weight: bold;
                    margin-top: 0.8cm;
                    margin-bottom: 0.5cm;
                }

                .subsection-title {
                    font-size: 11pt;
                    font-weight: bold;
                    margin-top: 0.6cm;
                    margin-bottom: 0.3cm;
                }

                .content {
                    text-align: justify;
                    margin-bottom: 0.8cm;
                }

                .highlight-box {
                    background: #f8f9fa;
                    padding: 0.8cm;
                    margin: 0.5cm 0;
                    border-left: 4px solid #007bff;
                }

                .list-item {
                    margin-bottom: 0.3cm;
                    margin-left: 0.5cm;
                }

                .conclusion {
                    page-break-before: always;
                    padding: 2cm;
                }

                .final-note {
                    text-align: center;
                    font-style: italic;
                    margin-top: 2cm;
                    padding-top: 1cm;
                    border-top: 1px solid #666;
                }
            </style>
        </head>
        <body>
            <!-- Portada -->
            <div class="title-page">
                <div>
                    <div class="main-title">PROYECTO FINAL DE EMPRENDIMIENTO</div>
                    <div class="subtitle">PLAN DE NEGOCIO: "${businessName}"</div>

                    <div class="student-info">
                        <strong>Presentado por:</strong> ${userName}<br>
                        <strong>Programa:</strong> ${courseName}<br>
                        <strong>Tutora Virtual:</strong> Charlotte<br>
                        <strong>Fecha de Elaboración:</strong> ${currentDate}
                    </div>

                    <div class="institute-info">
                        ${instituteName}<br>
                        ${courseName}
                    </div>
                </div>
            </div>

            <!-- Índice Expandido -->
            <div class="toc">
                <div class="toc-title">ÍNDICE DETALLADO</div>

                <div class="toc-section">
                    <strong>1. INTRODUCCIÓN Y ANTECEDENTES</strong>
                    <div class="toc-item">1.1 Contexto del Proyecto</div>
                    <div class="toc-item">1.2 Antecedentes del Sector</div>
                    <div class="toc-item">1.3 Problemática Identificada</div>
                    <div class="toc-item">1.4 Objetivos del Proyecto</div>
                    <div class="toc-item">1.5 Metodología de Desarrollo</div>
                </div>

                <div class="toc-section">
                    <strong>2. IDENTIDAD CORPORATIVA Y MARCA</strong>
                    <div class="toc-item">2.1 Nombre y Denominación Social</div>
                    <div class="toc-item">2.2 Eslogan e Identidad Visual</div>
                    <div class="toc-item">2.3 Descripción del Negocio</div>
                    <div class="toc-item">2.4 Filosofía Empresarial</div>
                    <div class="toc-item">2.5 Valores Corporativos</div>
                    <div class="toc-item">2.6 Cultura Organizacional</div>
                </div>

                <div class="toc-section">
                    <strong>3. ANÁLISIS DEL ENTORNO</strong>
                    <div class="toc-item">3.1 Análisis PESTEL</div>
                    <div class="toc-item">3.2 Análisis del Sector</div>
                    <div class="toc-item">3.3 Tendencias del Mercado</div>
                    <div class="toc-item">3.4 Oportunidades y Amenazas</div>
                </div>

                <div class="toc-section">
                    <strong>4. ESTUDIO DE MERCADO DETALLADO</strong>
                    <div class="toc-item">4.1 Segmentación del Mercado</div>
                    <div class="toc-item">4.2 Perfil del Cliente Ideal</div>
                    <div class="toc-item">4.3 Análisis de la Demanda</div>
                    <div class="toc-item">4.4 Análisis Competitivo</div>
                    <div class="toc-item">4.5 Benchmarking</div>
                    <div class="toc-item">4.6 Propuesta de Valor Única</div>
                </div>

                <div class="toc-section">
                    <strong>5. ESTRATEGIA DE MARKETING</strong>
                    <div class="toc-item">5.1 Estrategia de Posicionamiento</div>
                    <div class="toc-item">5.2 Mix de Marketing (4P)</div>
                    <div class="toc-item">5.3 Estrategia Digital y Online</div>
                    <div class="toc-item">5.4 Plan de Comunicación</div>
                    <div class="toc-item">5.5 Estrategia de Precios</div>
                    <div class="toc-item">5.6 Plan de Lanzamiento</div>
                </div>

                <div class="toc-section">
                    <strong>6. OPERACIONES Y PROCESOS</strong>
                    <div class="toc-item">6.1 Diseño del Producto/Servicio</div>
                    <div class="toc-item">6.2 Procesos Operativos</div>
                    <div class="toc-item">6.3 Cadena de Valor</div>
                    <div class="toc-item">6.4 Gestión de Calidad</div>
                    <div class="toc-item">6.5 Tecnología y Equipamiento</div>
                    <div class="toc-item">6.6 Proveedores y Alianzas</div>
                </div>

                <div class="toc-section">
                    <strong>7. GESTIÓN DEL TALENTO HUMANO</strong>
                    <div class="toc-item">7.1 Estructura Organizacional</div>
                    <div class="toc-item">7.2 Perfiles de Puestos</div>
                    <div class="toc-item">7.3 Plan de Capacitación</div>
                    <div class="toc-item">7.4 Cultura y Motivación</div>
                    <div class="toc-item">7.5 Compensaciones y Beneficios</div>
                </div>

                <div class="toc-section">
                    <strong>8. ANÁLISIS FINANCIERO COMPLETO</strong>
                    <div class="toc-item">8.1 Inversión Inicial Detallada</div>
                    <div class="toc-item">8.2 Estructura de Costos</div>
                    <div class="toc-item">8.3 Análisis de Punto de Equilibrio</div>
                    <div class="toc-item">8.4 Proyecciones Financieras</div>
                    <div class="toc-item">8.5 Análisis de Riesgo Financiero</div>
                    <div class="toc-item">8.6 Fuentes de Financiamiento</div>
                </div>

                <div class="toc-section">
                    <strong>9. PLAN DE IMPLEMENTACIÓN</strong>
                    <div class="toc-item">9.1 Cronograma de Actividades</div>
                    <div class="toc-item">9.2 Plan de Contingencia</div>
                    <div class="toc-item">9.3 Indicadores de Seguimiento</div>
                    <div class="toc-item">9.4 Plan de Escalabilidad</div>
                </div>

                <div class="toc-section">
                    <strong>10. CONCLUSIONES Y RECOMENDACIONES</strong>
                    <div class="toc-item">10.1 Resumen Ejecutivo</div>
                    <div class="toc-item">10.2 Fortalezas del Proyecto</div>
                    <div class="toc-item">10.3 Recomendaciones Estratégicas</div>
                    <div class="toc-item">10.4 Próximos Pasos</div>
                    <div class="toc-item">10.5 Declaración de Viabilidad</div>
                </div>

                <div class="toc-section">
                    <strong>ANEXOS</strong>
                    <div class="toc-item">Anexo 1: Estados Financieros Proyectados</div>
                    <div class="toc-item">Anexo 2: Análisis de Sensibilidad</div>
                    <div class="toc-item">Anexo 3: Cronograma Detallado de Implementación</div>
                    <div class="toc-item">Anexo 4: Documentos de Soporte</div>
                    <div class="toc-item">Anexo 5: Referencias y Fuentes de Información</div>
                </div>
            </div>

            <!-- Capítulo 1: Introducción y Antecedentes Expandido -->
            <div class="chapter">
                <div class="chapter-title">1. INTRODUCCIÓN Y ANTECEDENTES</div>

                <div class="section-title">1.1 Contexto del Proyecto</div>
                <div class="content">
                    ${businessName} surge como respuesta a una necesidad identificada en el mercado local: ${businessDescription}. En un entorno empresarial cada vez más competitivo y digitalizado, este proyecto representa una oportunidad única para satisfacer demandas no atendidas por las ofertas tradicionales del mercado.
                </div>
                <div class="content">
                    El sector empresarial actual se caracteriza por una creciente demanda de productos y servicios personalizados, sostenibles y de alta calidad. ${businessName} se posiciona como una solución innovadora que combina tradición artesanal con tecnología moderna, atendiendo las necesidades específicas de un mercado que valora la autenticidad y la personalización.
                </div>

                <div class="section-title">1.2 Antecedentes del Sector</div>
                <div class="content">
                    El sector en el que se desarrolla ${businessName} ha experimentado una transformación significativa en los últimos años. La digitalización de los procesos comerciales, el aumento de la conciencia ambiental y los cambios en los hábitos de consumo han creado nuevas oportunidades para emprendimientos que se adapten a estas tendencias.
                </div>
                <div class="content">
                    Según estudios del sector, existe una creciente demanda de productos/servicios que ofrezcan experiencias únicas y personalizadas. Los consumidores actuales buscan no solo calidad, sino también historias, valores y conexiones emocionales con las marcas que eligen.
                </div>

                <div class="section-title">1.3 Problemática Identificada</div>
                <div class="content">
                    <strong>Problemática Principal:</strong> La oferta actual del mercado se caracteriza por productos/servicios estandarizados que no satisfacen las necesidades específicas de segmentos de clientes que buscan experiencias únicas y personalizadas.
                </div>
                <div class="content">
                    <strong>Problemas Específicos Identificados:</strong>
                    <div class="list-item">• Falta de opciones personalizadas en el mercado local</div>
                    <div class="list-item">• Baja diferenciación entre competidores directos</div>
                    <div class="list-item">• Ausencia de enfoque en la experiencia del cliente</div>
                    <div class="list-item">• Limitaciones en la capacidad de respuesta a demandas específicas</div>
                    <div class="list-item">• Oportunidades desaprovechadas en nichos de mercado especializados</div>
                </div>

                <div class="section-title">1.4 Objetivos del Proyecto</div>
                <div class="content">
                    <strong>Objetivo General:</strong> Establecer ${businessName} como líder en su segmento, ofreciendo productos/servicios de calidad superior que satisfagan las necesidades específicas del mercado objetivo.
                </div>
                <div class="content">
                    <strong>Objetivos Específicos:</strong>
                    <div class="list-item">• Desarrollar una oferta única y diferenciada en el mercado</div>
                    <div class="list-item">• Establecer relaciones sólidas con clientes satisfechos</div>
                    <div class="list-item">• Implementar procesos operativos eficientes y escalables</div>
                    <div class="list-item">• Generar rentabilidad sostenible a partir del primer año</div>
                    <div class="list-item">• Crear una marca reconocida y valorada en el sector</div>
                </div>

                <div class="section-title">1.5 Metodología de Desarrollo</div>
                <div class="content">
                    El desarrollo de este plan de negocio se realizó mediante una metodología estructurada en 6 módulos interactivos, guiados por la tutora virtual Charlotte. Cada módulo representa una fase fundamental del proceso de planificación empresarial:
                </div>
                <div class="content">
                    <strong>Módulo 1 - Identidad Empresarial:</strong> Definición de la esencia del negocio, misión, visión y valores corporativos.
                </div>
                <div class="content">
                    <strong>Módulo 2 - Análisis de Mercado:</strong> Estudio detallado del entorno competitivo, clientes potenciales y oportunidades de mercado.
                </div>
                <div class="content">
                    <strong>Módulo 3 - Operaciones:</strong> Diseño de procesos productivos, cadena de valor y recursos necesarios.
                </div>
                <div class="content">
                    <strong>Módulo 4 - Marketing:</strong> Desarrollo de estrategias comerciales, posicionamiento y planes de comunicación.
                </div>
                <div class="content">
                    <strong>Módulo 5 - Finanzas:</strong> Análisis de viabilidad económica, proyecciones financieras y estructura de costos.
                </div>
                <div class="content">
                    <strong>Módulo 6 - Implementación:</strong> Plan de ejecución, cronograma de actividades y estrategias de lanzamiento.
                </div>
            </div>

            <!-- Capítulo 2: Identidad Corporativa Expandido -->
            <div class="chapter">
                <div class="chapter-title">2. IDENTIDAD CORPORATIVA Y MARCA</div>

                <div class="section-title">2.1 Nombre y Denominación Social</div>
                <div class="content">
                    <strong>Nombre Comercial:</strong> ${businessName}<br>
                    <strong>Denominación Legal:</strong> ${businessName} S.A.S. (Sociedad por Acciones Simplificada)
                </div>
                <div class="content">
                    <strong>Análisis del Nombre:</strong> ${businessName ? `El nombre "${businessName}" ${businessName.length > 10 ? 'sugiere sofisticación y especialización' : 'transmite accesibilidad y cercanía'}. ${businessName.includes(' ') ? 'La combinación de palabras refleja la esencia del negocio.' : 'Su concisión facilita el recuerdo y la identificación de marca.'}` : ''}
                </div>
                <div class="content">
                    <strong>Disponibilidad de Dominio:</strong> Se ha verificado la disponibilidad de dominios relacionados como ${businessName.toLowerCase().replace(/\s+/g, '')}.com y variantes regionales.
                </div>

                <div class="section-title">2.2 Eslogan e Identidad Visual</div>
                <div class="content">
                    <strong>Eslogan Principal:</strong> "${slogan}"
                </div>
                <div class="content">
                    <strong>Paleta de Colores:</strong> La identidad visual se basa en colores que transmiten confianza, calidad y cercanía con el cliente objetivo.
                </div>
                <div class="content">
                    <strong>Tipografía:</strong> Se utilizará una combinación de fuentes serif para elementos formales y sans-serif para comunicaciones digitales.
                </div>
                <div class="content">
                    <strong>Elementos Gráficos:</strong> El logotipo incorpora elementos que representan la esencia del negocio y facilitan la identificación de marca.
                </div>

                <div class="section-title">2.3 Descripción del Negocio</div>
                <div class="content">
                    ${businessName} es un emprendimiento especializado en ${businessDescription}, que se diferencia por su enfoque en la calidad, personalización y atención al cliente. La empresa se posiciona como una alternativa innovadora en su sector, combinando tradición artesanal con soluciones modernas.
                </div>
                <div class="content">
                    <strong>Naturaleza Jurídica:</strong> ${businessName} operará como una Sociedad por Acciones Simplificada (S.A.S.), estructura jurídica que permite flexibilidad operativa y crecimiento futuro.
                </div>
                <div class="content">
                    <strong>Sector de Actividad:</strong> Servicios especializados en ${businessDescription}, con énfasis en la personalización y calidad superior.
                </div>

                <div class="section-title">2.4 Filosofía Empresarial</div>
                <div class="highlight-box">
                    <strong>Misión:</strong> ${mission}
                </div>
                <div class="highlight-box">
                    <strong>Visión:</strong> ${vision}
                </div>
                <div class="content">
                    <strong>Propósito Superior:</strong> Contribuir al bienestar de la comunidad ofreciendo productos/servicios que generan experiencias positivas y memorables.
                </div>

                <div class="section-title">2.5 Valores Corporativos</div>
                <div class="content">
                    <strong>Valores Fundamentales:</strong>
                    <div class="list-item">• <strong>Calidad Superior:</strong> Compromiso con la excelencia en cada entrega</div>
                    <div class="list-item">• <strong>Personalización:</strong> Atención individualizada a las necesidades de cada cliente</div>
                    <div class="list-item">• <strong>Innovación:</strong> Búsqueda constante de mejoras y soluciones creativas</div>
                    <div class="list-item">• <strong>Sostenibilidad:</strong> Responsabilidad ambiental y social</div>
                    <div class="list-item">• <strong>Integridad:</strong> Transparencia y honestidad en todas las relaciones</div>
                    <div class="list-item">• <strong>Compromiso:</strong> Dedicación total al servicio y satisfacción del cliente</div>
                </div>

                <div class="section-title">2.6 Cultura Organizacional</div>
                <div class="content">
                    <strong>Principios Culturales:</strong>
                    <div class="list-item">• Ambiente de trabajo colaborativo y motivador</div>
                    <div class="list-item">• Enfoque en el desarrollo profesional continuo</div>
                    <div class="list-item">• Comunicación abierta y transparente</div>
                    <div class="list-item">• Reconocimiento del mérito y esfuerzo</div>
                    <div class="list-item">• Compromiso con la responsabilidad social</div>
                </div>
                <div class="content">
                    <strong>Código de Conducta:</strong> ${businessName} establece un código de conducta que rige las relaciones con clientes, proveedores, colaboradores y la comunidad, asegurando prácticas éticas y responsables.
                </div>
            </div>

            <!-- Capítulo 3: Análisis del Entorno -->
            <div class="chapter">
                <div class="chapter-title">3. ANÁLISIS DEL ENTORNO</div>

                <div class="section-title">3.1 Análisis PESTEL</div>
                <div class="content">
                    <strong>Político:</strong> El entorno político actual es favorable para emprendimientos en el sector, con políticas de apoyo a la pequeña y mediana empresa. La estabilidad institucional y las normativas laborales facilitan la operación empresarial.
                </div>
                <div class="content">
                    <strong>Económico:</strong> La economía local presenta oportunidades de crecimiento en el sector servicios. El poder adquisitivo de la población objetivo permite el desarrollo de propuestas de valor premium con diferenciación en calidad y personalización.
                </div>
                <div class="content">
                    <strong>Social:</strong> Existe una creciente demanda de experiencias personalizadas y productos/servicios que generen conexiones emocionales. Los cambios en los hábitos de consumo favorecen propuestas innovadoras y sostenibles.
                </div>
                <div class="content">
                    <strong>Tecnológico:</strong> La transformación digital ofrece oportunidades para optimizar procesos operativos, mejorar la experiencia del cliente y expandir el alcance del negocio a través de canales digitales.
                </div>
                <div class="content">
                    <strong>Ecológico:</strong> La conciencia ambiental creciente demanda prácticas sostenibles. ${businessName} implementará procesos que minimicen el impacto ambiental y promuevan la responsabilidad ecológica.
                </div>
                <div class="content">
                    <strong>Legal:</strong> El marco legal actual es favorable para el desarrollo de emprendimientos, con normativas claras en materia laboral, tributaria y de protección al consumidor.
                </div>

                <div class="section-title">3.2 Análisis del Sector</div>
                <div class="content">
                    El sector de ${businessDescription} presenta características específicas que influyen en la estrategia de ${businessName}. La competencia se caracteriza por una oferta mayoritariamente estandarizada, creando oportunidades para propuestas diferenciadas.
                </div>
                <div class="content">
                    <strong>Tamaño del Mercado:</strong> El mercado local presenta un volumen significativo de demanda potencial, con oportunidades de crecimiento en segmentos específicos.
                </div>
                <div class="content">
                    <strong>Ciclo de Vida del Sector:</strong> El sector se encuentra en una fase de crecimiento, con oportunidades para innovadores que ofrezcan propuestas diferenciadas.
                </div>

                <div class="section-title">3.3 Tendencias del Mercado</div>
                <div class="content">
                    <strong>Tendencias Identificadas:</strong>
                    <div class="list-item">• Creciente demanda de personalización y experiencias únicas</div>
                    <div class="list-item">• Mayor valoración de la calidad y sostenibilidad</div>
                    <div class="list-item">• Transformación digital de los procesos de compra</div>
                    <div class="list-item">• Preferencia por proveedores locales y confiables</div>
                    <div class="list-item">• Búsqueda de conexiones emocionales con las marcas</div>
                </div>

                <div class="section-title">3.4 Oportunidades y Amenazas</div>
                <div class="content">
                    <strong>Oportunidades:</strong>
                    <div class="list-item">• Nicho de mercado con baja competencia en personalización</div>
                    <div class="list-item">• Crecimiento del poder adquisitivo del segmento objetivo</div>
                    <div class="list-item">• Avances tecnológicos que facilitan la operación</div>
                    <div class="list-item">• Tendencias favorables hacia la sostenibilidad</div>
                </div>
                <div class="content">
                    <strong>Amenazas:</strong>
                    <div class="list-item">• Entrada de nuevos competidores al mercado</div>
                    <div class="list-item">• Cambios en las preferencias del consumidor</div>
                    <div class="list-item">• Fluctuaciones económicas que afectan el poder adquisitivo</div>
                    <div class="list-item">• Cambios regulatorios que impacten la operación</div>
                </div>
            </div>

                <div class="section-title">3.1 Perfil del Cliente Ideal</div>
                <div class="content">
                    ${clientProfile}
                </div>

                <div class="section-title">3.2 Análisis Competitivo</div>
                <div class="content">
                    ${competition}
                </div>

                <div class="section-title">3.3 Propuesta de Valor</div>
                <div class="highlight-box">
                    ${valueProposition}
                </div>
            </div>

            <!-- Capítulo 4: Operaciones y Procesos Productivos -->
            <div class="chapter">
                <div class="chapter-title">4. OPERACIONES Y PROCESOS PRODUCTIVOS</div>

                <div class="section-title">4.1 Catálogo de Productos</div>
                <div class="content">
                    ${mainServices}
                </div>

                <div class="section-title">4.2 Proceso de Elaboración</div>
                <div class="content">
                    ${starProcess}
                </div>

                <div class="section-title">4.3 Recursos Necesarios</div>
                <div class="content">
                    ${resources}
                </div>
            </div>

            <!-- Capítulo 5: Estrategia Comercial y de Marketing -->
            <div class="chapter">
                <div class="chapter-title">5. ESTRATEGIA COMERCIAL Y DE MARKETING</div>

                <div class="section-title">5.1 Canales de Venta y Distribución</div>
                <div class="content">
                    ${salesChannels}
                </div>

                <div class="section-title">5.2 Estrategia Digital</div>
                <div class="content">
                    ${socialStrategy}
                </div>

                <div class="section-title">5.3 Plan de Lanzamiento</div>
                <div class="content">
                    ${launchCampaign}
                </div>
            </div>

            <!-- Capítulo 6: Análisis Financiero Completo -->
            <div class="chapter">
                <div class="chapter-title">6. ANÁLISIS FINANCIERO COMPLETO</div>

                <div class="section-title">6.1 Inversión Inicial Detallada</div>
                <div class="content">
                    ${initialInvestment}
                </div>
                <div class="content">
                    <strong>Desglose Detallado de Inversión:</strong>
                    <div class="list-item">• <strong>Activos Fijos:</strong> Equipamiento y mobiliario necesario para la operación</div>
                    <div class="list-item">• <strong>Capital de Trabajo:</strong> Inventarios iniciales y fondos para operación</div>
                    <div class="list-item">• <strong>Marketing Inicial:</strong> Campaña de lanzamiento y materiales promocionales</div>
                    <div class="list-item">• <strong>Infraestructura Digital:</strong> Desarrollo web y herramientas tecnológicas</div>
                    <div class="list-item">• <strong>Capital Humano:</strong> Capacitación inicial del equipo</div>
                </div>

                <div class="section-title">6.2 Estructura de Costos</div>
                <div class="content">
                    ${pricing}
                </div>
                <div class="content">
                    <strong>Costos Fijos Mensuales:</strong>
                    <div class="list-item">• Alquiler de local o espacio de trabajo</div>
                    <div class="list-item">• Servicios públicos (luz, agua, gas)</div>
                    <div class="list-item">• Salarios y prestaciones del personal</div>
                    <div class="list-item">• Seguro del negocio</div>
                    <div class="list-item">• Depreciación de equipos</div>
                </div>
                <div class="content">
                    <strong>Costos Variables:</strong>
                    <div class="list-item">• Materias primas y suministros</div>
                    <div class="list-item">• Servicios de terceros</div>
                    <div class="list-item">• Marketing y publicidad</div>
                    <div class="list-item">• Transporte y distribución</div>
                </div>

                <div class="section-title">6.3 Análisis de Punto de Equilibrio</div>
                <div class="content">
                    <strong>Cálculo del Punto de Equilibrio:</strong> El punto de equilibrio se alcanza cuando los ingresos igualan a los costos totales. Para ${businessName}, se estima que el punto de equilibrio se logrará con [X] unidades mensuales de producción/venta.
                </div>
                <div class="content">
                    <strong>Fórmula:</strong> Punto de Equilibrio = Costos Fijos / (Precio de Venta - Costo Variable Unitario)
                </div>
                <div class="content">
                    <strong>Análisis de Sensibilidad:</strong> Se ha realizado un análisis de sensibilidad considerando variaciones en precios, costos y volúmenes de venta para determinar la robustez del modelo financiero.
                </div>

                <div class="section-title">6.4 Proyecciones Financieras</div>
                <div class="content">
                    ${salesProjection}
                </div>
                <div class="content">
                    <strong>Estado de Resultados Proyectado:</strong>
                    <div class="list-item">• <strong>Ingresos:</strong> Proyección basada en análisis de mercado y capacidad operativa</div>
                    <div class="list-item">• <strong>Costos de Ventas:</strong> Costos directos asociados a la producción</div>
                    <div class="list-item">• <strong>Gastos Operativos:</strong> Gastos administrativos y de operación</div>
                    <div class="list-item">• <strong>Utilidad Neta:</strong> Resultado final después de impuestos</div>
                </div>

                <div class="section-title">6.5 Análisis de Riesgo Financiero</div>
                <div class="content">
                    <strong>Riesgos Identificados:</strong>
                    <div class="list-item">• Fluctuaciones en los precios de las materias primas</div>
                    <div class="list-item">• Cambios en la demanda del mercado</div>
                    <div class="list-item">• Competencia de nuevos entrantes</div>
                    <div class="list-item">• Problemas de cobro a clientes</div>
                    <div class="list-item">• Eventos imprevistos que afecten la operación</div>
                </div>
                <div class="content">
                    <strong>Estrategias de Mitigación:</strong>
                    <div class="list-item">• Diversificación de proveedores</div>
                    <div class="list-item">• Reserva financiera para contingencias</div>
                    <div class="list-item">• Seguro del negocio</div>
                    <div class="list-item">• Monitoreo continuo de indicadores financieros</div>
                </div>

                <div class="section-title">6.6 Fuentes de Financiamiento</div>
                <div class="content">
                    <strong>Capital Propio:</strong> Inversión inicial del emprendedor que representa el compromiso personal con el proyecto.
                </div>
                <div class="content">
                    <strong>Financiamiento Externo:</strong> Opciones de crédito bancario, líneas de factoring y posibles inversionistas ángeles para el crecimiento futuro.
                </div>
                <div class="content">
                    <strong>Apoyo Institucional:</strong> Posibles subsidios, incentivos y programas de apoyo a emprendimientos por parte de entidades gubernamentales y privadas.
                </div>
            </div>

            <!-- Capítulo 7: Gestión del Talento Humano -->
            <div class="chapter">
                <div class="chapter-title">7. GESTIÓN DEL TALENTO HUMANO</div>

                <div class="section-title">7.1 Estructura Organizacional</div>
                <div class="content">
                    <strong>Organigrama Inicial:</strong>
                    <div class="list-item">• <strong>Gerente General:</strong> Responsable de la dirección estratégica y operativa</div>
                    <div class="list-item">• <strong>Equipo de Producción:</strong> Personal especializado en la elaboración de productos/servicios</div>
                    <div class="list-item">• <strong>Equipo de Atención al Cliente:</strong> Gestión de relaciones con clientes</div>
                    <div class="list-item">• <strong>Área Administrativa:</strong> Gestión financiera y administrativa</div>
                </div>
                <div class="content">
                    La estructura organizacional está diseñada para ser flexible y escalable, permitiendo el crecimiento del equipo según las necesidades del negocio.
                </div>

                <div class="section-title">7.2 Perfiles de Puestos</div>
                <div class="content">
                    <strong>Requisitos Generales:</strong>
                    <div class="list-item">• Experiencia comprobable en el sector</div>
                    <div class="list-item">• Actitud positiva y orientada al servicio</div>
                    <div class="list-item">• Capacidad de trabajo en equipo</div>
                    <div class="list-item">• Compromiso con la calidad y la innovación</div>
                    <div class="list-item">• Disponibilidad para capacitación continua</div>
                </div>
                <div class="content">
                    <strong>Competencias Clave:</strong>
                    <div class="list-item">• Habilidades técnicas específicas del sector</div>
                    <div class="list-item">• Orientación al cliente y servicio</div>
                    <div class="list-item">• Capacidad de resolución de problemas</div>
                    <div class="list-item">• Adaptabilidad al cambio</div>
                    <div class="list-item">• Trabajo bajo presión</div>
                </div>

                <div class="section-title">7.3 Plan de Capacitación</div>
                <div class="content">
                    <strong>Capacitación Inicial:</strong>
                    <div class="list-item">• Inducción a la empresa y cultura organizacional</div>
                    <div class="list-item">• Entrenamiento en procesos operativos</div>
                    <div class="list-item">• Capacitación en atención al cliente</div>
                    <div class="list-item">• Formación en normas de calidad y seguridad</div>
                </div>
                <div class="content">
                    <strong>Desarrollo Continuo:</strong>
                    <div class="list-item">• Actualización técnica según tendencias del sector</div>
                    <div class="list-item">• Desarrollo de habilidades blandas</div>
                    <div class="list-item">• Participación en ferias y eventos del sector</div>
                    <div class="list-item">• Certificaciones relevantes para el área</div>
                </div>

                <div class="section-title">7.4 Cultura y Motivación</div>
                <div class="content">
                    <strong>Valores Organizacionales:</strong>
                    <div class="list-item">• Excelencia en el servicio al cliente</div>
                    <div class="list-item">• Innovación constante</div>
                    <div class="list-item">• Trabajo en equipo colaborativo</div>
                    <div class="list-item">• Responsabilidad y compromiso</div>
                    <div class="list-item">• Aprendizaje continuo</div>
                </div>
                <div class="content">
                    <strong>Sistema de Motivación:</strong>
                    <div class="list-item">• Reconocimiento público de logros</div>
                    <div class="list-item">• Oportunidades de crecimiento profesional</div>
                    <div class="list-item">• Participación en beneficios del negocio</div>
                    <div class="list-item">• Ambiente laboral positivo y saludable</div>
                </div>

                <div class="section-title">7.5 Compensaciones y Beneficios</div>
                <div class="content">
                    <strong>Salario Competitivo:</strong> Remuneración acorde al mercado y la responsabilidad del puesto.
                </div>
                <div class="content">
                    <strong>Beneficios Adicionales:</strong>
                    <div class="list-item">• Seguro médico y dental</div>
                    <div class="list-item">• Vacaciones remuneradas</div>
                    <div class="list-item">• Capacitación pagada</div>
                    <div class="list-item">• Bonos por desempeño</div>
                    <div class="list-item">• Participación en utilidades</div>
                </div>
                <div class="content">
                    <strong>Prestaciones Legales:</strong> Cumplimiento total con la legislación laboral vigente, incluyendo cesantías, prima de servicios y demás beneficios legales.
                </div>
            </div>

            <!-- Capítulo 9: Plan de Implementación -->
            <div class="chapter">
                <div class="chapter-title">9. PLAN DE IMPLEMENTACIÓN</div>

                <div class="section-title">9.1 Cronograma de Actividades</div>
                <div class="content">
                    <strong>Fase 1: Preparación (Mes 1)</strong>
                    <div class="list-item">• Constitución legal de la empresa</div>
                    <div class="list-item">• Adquisición y configuración de equipos</div>
                    <div class="list-item">• Selección y contratación de personal</div>
                    <div class="list-item">• Desarrollo de proveedores y alianzas</div>
                    <div class="list-item">• Diseño e implementación de plataforma digital</div>
                </div>
                <div class="content">
                    <strong>Fase 2: Puesta en Marcha (Mes 2)</strong>
                    <div class="list-item">• Capacitación del equipo</div>
                    <div class="list-item">• Pruebas de procesos operativos</div>
                    <div class="list-item">• Desarrollo de muestras de producto</div>
                    <div class="list-item">• Configuración de canales de venta</div>
                    <div class="list-item">• Preparación de campaña de lanzamiento</div>
                </div>
                <div class="content">
                    <strong>Fase 3: Lanzamiento (Mes 3)</strong>
                    <div class="list-item">• Activación de campaña promocional</div>
                    <div class="list-item">• Inicio de operaciones comerciales</div>
                    <div class="list-item">• Monitoreo de primeros pedidos</div>
                    <div class="list-item">• Recolección de feedback inicial</div>
                    <div class="list-item">• Ajustes operativos según resultados</div>
                </div>

                <div class="section-title">9.2 Plan de Contingencia</div>
                <div class="content">
                    <strong>Riesgos Operativos:</strong>
                    <div class="list-item">• Fallos en equipos: Mantenimiento preventivo y repuestos disponibles</div>
                    <div class="list-item">• Ausentismo del personal: Plan de reemplazos temporales</div>
                    <div class="list-item">• Problemas de suministro: Múltiples proveedores alternativos</div>
                    <div class="list-item">• Fallos tecnológicos: Sistemas de respaldo y soporte técnico</div>
                </div>
                <div class="content">
                    <strong>Riesgos Financieros:</strong>
                    <div class="list-item">• Reducción de ventas: Reserva financiera para 3 meses</div>
                    <div class="list-item">• Aumento de costos: Contratos con cláusulas de protección</div>
                    <div class="list-item">• Incumplimiento de clientes: Sistema de garantías y seguros</div>
                </div>

                <div class="section-title">9.3 Indicadores de Seguimiento</div>
                <div class="content">
                    <strong>Indicadores Operativos:</strong>
                    <div class="list-item">• Tasa de eficiencia productiva</div>
                    <div class="list-item">• Nivel de satisfacción del cliente</div>
                    <div class="list-item">• Tiempo promedio de entrega</div>
                    <div class="list-item">• Tasa de defectos o rechazos</div>
                </div>
                <div class="content">
                    <strong>Indicadores Financieros:</strong>
                    <div class="list-item">• Margen de contribución mensual</div>
                    <div class="list-item">• Punto de equilibrio alcanzado</div>
                    <div class="list-item">• ROI del proyecto</div>
                    <div class="list-item">• Flujo de caja operativo</div>
                </div>
                <div class="content">
                    <strong>Indicadores de Crecimiento:</strong>
                    <div class="list-item">• Número de clientes nuevos</div>
                    <div class="list-item">• Tasa de retención de clientes</div>
                    <div class="list-item">• Expansión de mercado</div>
                    <div class="list-item">• Desarrollo de nuevos productos</div>
                </div>

                <div class="section-title">9.4 Plan de Escalabilidad</div>
                <div class="content">
                    <strong>Escalabilidad Operativa:</strong>
                    <div class="list-item">• Automatización de procesos repetitivos</div>
                    <div class="list-item">• Optimización de la cadena de suministro</div>
                    <div class="list-item">• Expansión de capacidad productiva</div>
                    <div class="list-item">• Digitalización de procesos administrativos</div>
                </div>
                <div class="content">
                    <strong>Escalabilidad Comercial:</strong>
                    <div class="list-item">• Expansión geográfica progresiva</div>
                    <div class="list-item">• Desarrollo de canales de distribución</div>
                    <div class="list-item">• Alianzas estratégicas con complementarios</div>
                    <div class="list-item">• Internacionalización gradual</div>
                </div>
                <div class="content">
                    <strong>Escalabilidad Organizacional:</strong>
                    <div class="list-item">• Desarrollo de líderes internos</div>
                    <div class="list-item">• Implementación de sistemas de gestión</div>
                    <div class="list-item">• Cultura organizacional escalable</div>
                    <div class="list-item">• Procesos estandarizados y documentados</div>
                </div>
            </div>

            <!-- Capítulo 10: Conclusiones y Recomendaciones -->
            <div class="chapter">
                <div class="chapter-title">10. CONCLUSIONES Y RECOMENDACIONES</div>

                <div class="section-title">10.1 Resumen Ejecutivo</div>
                <div class="content">
                    El presente plan de negocio presenta una oportunidad sólida para el establecimiento y desarrollo de ${projectData.businessName}, un emprendimiento innovador en el sector ${projectData.businessType}. La propuesta se fundamenta en un análisis exhaustivo del mercado, una estrategia comercial bien definida y proyecciones financieras realistas que demuestran la viabilidad del proyecto.
                </div>
                <div class="content">
                    La inversión inicial requerida de ${projectData.initialInvestment} permitirá establecer una operación sostenible que genere utilidades desde el primer año de operación, con un retorno de inversión proyectado del ${projectData.roi}% anual. El modelo de negocio se basa en la diferenciación a través de la calidad, innovación y servicio al cliente excepcional.
                </div>

                <div class="section-title">10.2 Fortalezas del Proyecto</div>
                <div class="content">
                    <strong>Fortalezas Internas:</strong>
                    <div class="list-item">• Modelo de negocio innovador y diferenciador</div>
                    <div class="list-item">• Equipo emprendedor con experiencia complementaria</div>
                    <div class="list-item">• Tecnología y procesos optimizados</div>
                    <div class="list-item">• Estrategia de precios competitiva</div>
                    <div class="list-item">• Compromiso con la calidad y sostenibilidad</div>
                </div>
                <div class="content">
                    <strong>Ventajas Competitivas:</strong>
                    <div class="list-item">• Posicionamiento en nicho de mercado específico</div>
                    <div class="list-item">• Relaciones estratégicas con proveedores</div>
                    <div class="list-item">• Plataforma digital propia</div>
                    <div class="list-item">• Servicio al cliente personalizado</div>
                    <div class="list-item">• Capacidad de innovación continua</div>
                </div>

                <div class="section-title">10.3 Recomendaciones Estratégicas</div>
                <div class="content">
                    <strong>Recomendaciones a Corto Plazo (0-6 meses):</strong>
                    <div class="list-item">• Establecer alianzas estratégicas con proveedores clave</div>
                    <div class="list-item">• Desarrollar prototipos y validar conceptos con clientes potenciales</div>
                    <div class="list-item">• Implementar sistemas de gestión de calidad</div>
                    <div class="list-item">• Establecer presencia digital sólida</div>
                    <div class="list-item">• Capacitar al equipo en procesos operativos</div>
                </div>
                <div class="content">
                    <strong>Recomendaciones a Mediano Plazo (6-18 meses):</strong>
                    <div class="list-item">• Expandir canales de distribución</div>
                    <div class="list-item">• Desarrollar línea de productos complementarios</div>
                    <div class="list-item">• Implementar programa de fidelización de clientes</div>
                    <div class="list-item">• Optimizar procesos para reducción de costos</div>
                    <div class="list-item">• Explorar oportunidades de internacionalización</div>
                </div>
                <div class="content">
                    <strong>Recomendaciones a Largo Plazo (18+ meses):</strong>
                    <div class="list-item">• Diversificar portafolio de productos/servicios</div>
                    <div class="list-item">• Establecer franquicias o licencias</div>
                    <div class="list-item">• Desarrollar capacidades de I+D+i</div>
                    <div class="list-item">• Expandir operaciones a nuevos mercados</div>
                    <div class="list-item">• Implementar estrategias de sostenibilidad avanzadas</div>
                </div>

                <div class="section-title">10.4 Próximos Pasos</div>
                <div class="content">
                    <strong>Acciones Inmediatas:</strong>
                    <div class="list-item">• Constitución legal de la empresa</div>
                    <div class="list-item">• Apertura de cuentas bancarias corporativas</div>
                    <div class="list-item">• Registro de marca y propiedad intelectual</div>
                    <div class="list-item">• Desarrollo de prototipo mínimo viable</div>
                    <div class="list-item">• Inicio de campaña de crowdfunding o búsqueda de inversionistas</div>
                </div>
                <div class="content">
                    <strong>Seguimiento y Control:</strong>
                    <div class="list-item">• Establecimiento de indicadores clave de rendimiento (KPIs)</div>
                    <div class="list-item">• Implementación de sistema de reporte mensual</div>
                    <div class="list-item">• Revisiones trimestrales del plan de negocio</div>
                    <div class="list-item">• Ajustes estratégicos basados en resultados</div>
                    <div class="list-item">• Comunicación continua con stakeholders</div>
                </div>

                <div class="section-title">10.5 Declaración de Viabilidad</div>
                <div class="content">
                    Basado en el análisis exhaustivo realizado, se concluye que el proyecto ${projectData.businessName} presenta una viabilidad técnica, económica, financiera, comercial y operativa sólida. El emprendimiento cuenta con los recursos necesarios, un mercado receptivo y un equipo capaz de ejecutar la estrategia propuesta.
                </div>
                <div class="content">
                    La implementación exitosa del plan requerirá disciplina, adaptabilidad y compromiso. Con la ejecución adecuada de las estrategias delineadas, se proyecta que ${projectData.businessName} se convierta en un referente en su sector, generando valor sostenible para sus clientes, empleados y accionistas.
                </div>
            </div>

            <!-- ANEXOS -->
            <div class="chapter">
                <div class="chapter-title">ANEXOS</div>

                <div class="section-title">Anexo 1: Estados Financieros Proyectados</div>
                <div class="content">
                    <strong>Balance General Proyectado - Año 1</strong>
                    <table class="financial-table">
                        <tr><th>ACTIVO</th><th>Año 1</th></tr>
                        <tr><td>Activo Corriente</td><td>$ ${projectData.initialInvestment * 0.8}</td></tr>
                        <tr><td>Activo Fijo</td><td>$ ${projectData.initialInvestment * 0.2}</td></tr>
                        <tr><td><strong>TOTAL ACTIVO</strong></td><td><strong>$ ${projectData.initialInvestment}</strong></td></tr>
                        <tr><th>PASIVO Y PATRIMONIO</th><th></th></tr>
                        <tr><td>Pasivo Corriente</td><td>$ ${projectData.initialInvestment * 0.3}</td></tr>
                        <tr><td>Patrimonio</td><td>$ ${projectData.initialInvestment * 0.7}</td></tr>
                        <tr><td><strong>TOTAL PASIVO Y PATRIMONIO</strong></td><td><strong>$ ${projectData.initialInvestment}</strong></td></tr>
                    </table>
                </div>

                <div class="section-title">Anexo 2: Análisis de Sensibilidad</div>
                <div class="content">
                    <strong>Escenario Optimista (+20% ventas):</strong>
                    <div class="list-item">• Utilidad neta: $ ${Math.round(projectData.profit * 1.2)}</div>
                    <div class="list-item">• ROI: ${projectData.roi + 4}%</div>
                    <div class="list-item">• Punto de equilibrio: ${Math.round(projectData.breakEven * 0.9)} unidades</div>
                </div>
                <div class="content">
                    <strong>Escenario Pesimista (-20% ventas):</strong>
                    <div class="list-item">• Utilidad neta: $ ${Math.round(projectData.profit * 0.8)}</div>
                    <div class="list-item">• ROI: ${projectData.roi - 4}%</div>
                    <div class="list-item">• Punto de equilibrio: ${Math.round(projectData.breakEven * 1.1)} unidades</div>
                </div>
                <div class="content">
                    <strong>Escenario Base (proyección original):</strong>
                    <div class="list-item">• Utilidad neta: $ ${projectData.profit}</div>
                    <div class="list-item">• ROI: ${projectData.roi}%</div>
                    <div class="list-item">• Punto de equilibrio: ${projectData.breakEven} unidades</div>
                </div>

                <div class="section-title">Anexo 3: Cronograma Detallado de Implementación</div>
                <div class="content">
                    <table class="timeline-table">
                        <tr><th>Mes</th><th>Actividad Principal</th><th>Responsable</th><th>Presupuesto</th></tr>
                        <tr><td>1</td><td>Constitución legal y trámites</td><td>Gerente General</td><td>$ 2.000.000</td></tr>
                        <tr><td>1-2</td><td>Adquisición de equipos y local</td><td>Gerente de Operaciones</td><td>$ ${Math.round(projectData.initialInvestment * 0.4)}</td></tr>
                        <tr><td>2</td><td>Contratación y capacitación inicial</td><td>Gerente de Recursos Humanos</td><td>$ 3.000.000</td></tr>
                        <tr><td>2-3</td><td>Desarrollo de producto/servicio</td><td>Equipo Técnico</td><td>$ ${Math.round(projectData.initialInvestment * 0.3)}</td></tr>
                        <tr><td>3</td><td>Campaña de lanzamiento</td><td>Gerente de Marketing</td><td>$ 5.000.000</td></tr>
                        <tr><td>3+</td><td>Operaciones comerciales</td><td>Todo el equipo</td><td>Variable</td></tr>
                    </table>
                </div>

                <div class="section-title">Anexo 4: Documentos de Soporte</div>
                <div class="content">
                    <strong>Documentos Legales:</strong>
                    <div class="list-item">• Estatutos de la sociedad</div>
                    <div class="list-item">• Registro mercantil</div>
                    <div class="list-item">• Certificado de existencia y representación legal</div>
                    <div class="list-item">• Registro de marca</div>
                    <div class="list-item">• Contratos con proveedores principales</div>
                </div>
                <div class="content">
                    <strong>Documentos Técnicos:</strong>
                    <div class="list-item">• Especificaciones técnicas de productos</div>
                    <div class="list-item">• Diagramas de procesos operativos</div>
                    <div class="list-item">• Manuales de procedimientos</div>
                    <div class="list-item">• Certificaciones de calidad</div>
                    <div class="list-item">• Patentes y propiedad intelectual</div>
                </div>
                <div class="content">
                    <strong>Documentos Financieros:</strong>
                    <div class="list-item">• Estados financieros históricos</div>
                    <div class="list-item">• Presupuestos detallados</div>
                    <div class="list-item">• Análisis de costos</div>
                    <div class="list-item">• Proyecciones financieras completas</div>
                    <div class="list-item">• Plan de financiación</div>
                </div>

                <div class="section-title">Anexo 5: Referencias y Fuentes de Información</div>
                <div class="content">
                    <strong>Estudios de Mercado:</strong>
                    <div class="list-item">• Informes de la Cámara de Comercio</div>
                    <div class="list-item">• Estudios del DANE</div>
                    <div class="list-item">• Reportes de Euromonitor</div>
                    <div class="list-item">• Análisis de Statista</div>
                    <div class="list-item">• Investigaciones académicas del sector</div>
                </div>
                <div class="content">
                    <strong>Referencias Técnicas:</strong>
                    <div class="list-item">• Normas técnicas del sector</div>
                    <div class="list-item">• Estudios de viabilidad similares</div>
                    <div class="list-item">• Benchmarks del sector</div>
                    <div class="list-item">• Casos de éxito comparables</div>
                    <div class="list-item">• Consultorías especializadas</div>
                </div>
                <div class="content">
                    <strong>Marco Legal:</strong>
                    <div class="list-item">• Código de Comercio</div>
                    <div class="list-item">• Ley de Sociedades</div>
                    <div class="list-item">• Normas laborales</div>
                    <div class="list-item">• Regulaciones sectoriales</div>
                    <div class="list-item">• Tratados internacionales</div>
                </div>
            </div>

            <!-- Capítulo 7: Plan de Implementación y Conclusiones -->
            <div class="conclusion">
                <div class="chapter-title">7. PLAN DE IMPLEMENTACIÓN Y CONCLUSIONES</div>

                <div class="section-title">7.1 Cronograma Inicial</div>
                <div class="content">
                    <strong>Semana 1-2: Puesta en Marcha</strong>
                    <div class="list-item">• Adquisición y configuración de equipos</div>
                    <div class="list-item">• Establecimiento de proveedores</div>
                    <div class="list-item">• Desarrollo de plataforma digital básica</div>
                </div>
                <div class="content">
                    <strong>Semana 3-4: Pruebas y Ajustes</strong>
                    <div class="list-item">• Elaboración de muestras</div>
                    <div class="list-item">• Pruebas de procesos</div>
                    <div class="list-item">• Ajustes basados en resultados</div>
                </div>
                <div class="content">
                    <strong>Semana 5-6: Lanzamiento Oficial</strong>
                    <div class="list-item">• Activación campaña promocional</div>
                    <div class="list-item">• Inicio de operaciones comerciales</div>
                    <div class="list-item">• Monitoreo de primeros pedidos</div>
                </div>
                <div class="content">
                    <strong>Mes 2-3: Consolidación</strong>
                    <div class="list-item">• Evaluación de primeros resultados</div>
                    <div class="list-item">• Ajuste de procesos según feedback</div>
                    <div class="list-item">• Expansión de catálogo según demanda</div>
                </div>

                <div class="section-title">7.2 Conclusiones</div>
                <div class="content">
                    <strong>Fortalezas del Proyecto:</strong>
                    <div class="list-item">• Enfoque Especializado: Nicho claro según especialización del negocio</div>
                    <div class="list-item">• Modelo Digital: Adaptado a tendencias actuales de consumo</div>
                    <div class="list-item">• Proceso Validado: Metodología probada paso a paso</div>
                    <div class="list-item">• Inversión Controlada: Capital inicial accesible y bien distribuido</div>
                    <div class="list-item">• Diferenciación Clara: Propuesta de valor distintiva frente a competencia</div>
                </div>
                <div class="content">
                    <strong>Riesgos Identificados:</strong>
                    <div class="list-item">• Dependencia de Habilidades: Procesos que requieren especialización</div>
                    <div class="list-item">• Estacionalidad: Demanda variable según factores del mercado</div>
                    <div class="list-item">• Capacidad Limitada: Restricciones por procesos especializados</div>
                    <div class="list-item">• Competencia Indirecta: Opciones alternativas del mercado</div>
                </div>
                <div class="content">
                    <strong>Factores Clave de Éxito:</strong>
                    <div class="list-item">• Consistencia en calidad del producto/servicio</div>
                    <div class="list-item">• Cumplimiento de tiempos de entrega</div>
                    <div class="list-item">• Comunicación efectiva con clientes</div>
                    <div class="list-item">• Gestión eficiente de recursos</div>
                    <div class="list-item">• Adaptabilidad a necesidades específicas</div>
                </div>

                <div class="section-title">7.3 Recomendaciones</div>
                <div class="content">
                    <strong>Corto Plazo (Primeros 3 meses):</strong>
                    <div class="list-item">• Enfocarse en perfeccionar procesos básicos antes de expandir</div>
                    <div class="list-item">• Documentar cada proyecto para construir portafolio</div>
                    <div class="list-item">• Solicitar feedback sistemático para mejora continua</div>
                    <div class="list-item">• Establecer protocolos claros de comunicación con clientes</div>
                </div>
                <div class="content">
                    <strong>Mediano Plazo (3-6 meses):</strong>
                    <div class="list-item">• Evaluar necesidad de equipamiento adicional</div>
                    <div class="list-item">• Considerar colaboraciones estratégicas</div>
                    <div class="list-item">• Desarrollar sistema de clientes recurrentes</div>
                    <div class="list-item">• Implementar control de inventario más sofisticado</div>
                </div>
                <div class="content">
                    <strong>Consideraciones Estratégicas:</strong>
                    <div class="list-item">• Mantener equilibrio entre personalización y eficiencia</div>
                    <div class="list-item">• Establecer límites claros de personalización factible</div>
                    <div class="list-item">• Desarrollar sistema de precios que refleje valor real</div>
                    <div class="list-item">• Crear protocolos para manejo de expectativas</div>
                </div>
            </div>

            <!-- Reflexión Final -->
            <div class="final-note">
                <strong>REFLEXIÓN FINAL</strong><br><br>
                ${businessName} representa más que un negocio de pastelería; es un proyecto que busca conectar con las emociones y celebraciones de las personas. La combinación de tradición pastelera con un modelo de negocio moderno y centrado en el cliente crea una oportunidad genuina en el mercado local.<br><br>
                El éxito dependerá no solo de la habilidad té; es un proyecto que busca ${businessDescription ? 'conectar con las necesidades específicas del mercado' : 'satisfacer necesidades identificadas'}. El éxito dependerá de la capacidad para mantener los estándares de calidad, adaptarse a las necesidades del mercado y construir relaciones sólidas con los clientes
                ---
                <br><strong>Documento elaborado con base en la información validada durante el proceso de tutoría</strong>
                <br><strong>Versión Final - ${currentDate}</strong>
            </div>
        </body>
        </html>`;

        return html;
    }

    // Hacer las funciones globales (reasignar después de definirlas)
    window.completeProject = completeProject;
    window.previewProjectBook = previewProjectBook;
    window.printProjectBook = printProjectBook;
    window.loadExistingProjects = loadExistingProjects;
    window.updateProjectChat = updateProjectChat;
    window.sendProjectMessage = sendProjectMessage;
    window.addChatMessage = addChatMessage;
    window.replaceLastMessage = replaceLastMessage;
    window.saveProjectData = saveProjectData;
    window.updateProjectSummary = updateProjectSummary;
    window.loadProjectData = loadProjectData;
    window.getStepDescription = getStepDescription;
    window.resetProject = resetProject;
    window.goToModule = goToModule;
    window.setProjectStep = setProjectStep;
    window.saveProjectProgress = saveProjectProgress;

    // Exponer funciones de generación de plan de negocio al window (requerido por js/estudiante/modules/proyecto.js)
    window.generateProjectWithAI = generateProjectWithAI;
    window.showPlanLoadingModal = showPlanLoadingModal;
    window.updatePlanLoadingProgress = updatePlanLoadingProgress;
    window.removePlanLoadingModal = removePlanLoadingModal;

    // Configurar event listeners después de que todas las funciones estén disponibles
    // Configurar event listeners para los pasos
    document.querySelectorAll('.step').forEach(step => {
        step.addEventListener('click', () => {
            const stepNum = parseInt(step.dataset.step);
            // Solo permitir hacer clic en pasos que ya están desbloqueados
            if (!step.classList.contains('hidden')) {
                setProjectStep(stepNum);
            }
        });
    });

    // Configurar event listener para el botón de enviar mensaje
    const sendBtn = document.getElementById('sendProjectBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendProjectMessage);
    }

    // Configurar input del chat
    const input = document.getElementById('projectInput');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendProjectMessage();
        }
    });

    // Guardado automático cuando el usuario escribe
    let autoSaveTimeout;
    input.addEventListener('input', () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            saveProjectProgress();
        }, 2000); // Guardar automáticamente después de 2 segundos sin escribir
    });

    // ===== EXPOSICIÓN GLOBAL DE FUNCIONES =====
    // Exponer funciones del sistema de consultoría para acceso global
    window.startConsultation = startConsultation;
    window.showNextField = showNextField;
    window.processStudentResponse = processStudentResponse;
    window.saveResponseAndContinue = saveResponseAndContinue;
    window.getUserProgram = getUserProgram;
}