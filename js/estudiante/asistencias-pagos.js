// Utilidades para acceder a Firebase desde window (inicializado en app.js)

// Helper para mostrar notificaciones
function showToastNotification(message, type = 'info') {
    if (window.showToast && typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// =================== ASISTENCIAS ===================

async function loadAsistencias() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        showToastNotification('Usuario no autenticado', 'error');
        return;
    }

    const tableBody = document.getElementById('asistenciasTableBody');
    if (!tableBody) return;

    try {
        showToastNotification('Cargando asistencias...', 'info');

        // Consultar asistencias del estudiante SIN orderBy (evitar requerimiento de índice)
        const asistenciasQuery = window.query(
            window.collection(window.db, 'asistencias'),
            window.where('estudianteEmail', '==', currentUser.email)
        );

        const asistenciasSnapshot = await window.getDocs(asistenciasQuery);
        const asistencias = [];

        asistenciasSnapshot.forEach(doc => {
            asistencias.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Ordenar por fecha descendente en JavaScript
        asistencias.sort((a, b) => {
            const fechaA = new Date(a.fecha || 0).getTime();
            const fechaB = new Date(b.fecha || 0).getTime();
            return fechaB - fechaA;  // Descendente (más reciente primero)
        });

        // Calcular estadísticas
        let presente = 0;
        let ausente = 0;
        let justificada = 0;

        asistencias.forEach(a => {
            if (a.estado === 'presente') presente++;
            else if (a.estado === 'ausente') ausente++;
            else if (a.estado === 'justificada') justificada++;
        });

        const total = asistencias.length;
        const porcentaje = total > 0 ? Math.round((presente / total) * 100) : 0;

        // Actualizar estadísticas
        document.getElementById('asistenciaTotal').textContent = porcentaje + '%';
        document.getElementById('asistenciaPresente').textContent = presente;
        document.getElementById('asistenciaAusente').textContent = ausente;
        document.getElementById('asistenciaJustificada').textContent = justificada;

        // Renderizar tabla
        if (asistencias.length === 0) {
            tableBody.innerHTML = `
                <tr style="text-align: center; padding: 2rem; color: #94a3b8;">
                    <td colspan="4">No hay registros de asistencia</td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = asistencias.map(a => {
                const fecha = a.fecha ? new Date(a.fecha.toDate ? a.fecha.toDate() : a.fecha).toLocaleDateString('es-ES') : 'N/A';
                const estado = a.estado || 'Sin especificar';
                const estadoColor = estado === 'presente' ? '#10b981' : estado === 'ausente' ? '#ef4444' : '#f59e0b';
                
                return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 1rem;">${fecha}</td>
                        <td style="padding: 1rem;">${a.claseNombre || 'Clase'}</td>
                        <td style="padding: 1rem; text-align: center;">
                            <span style="background-color: ${estadoColor}20; color: ${estadoColor}; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.85rem; font-weight: 600; text-transform: capitalize;">
                                ${estado}
                            </span>
                        </td>
                        <td style="padding: 1rem; color: #64748b;">${a.observaciones || '-'}</td>
                    </tr>
                `;
            }).join('');
        }

        // Actualizar card de progreso
        const progressPercent = document.getElementById('progressAsistenciasPercent');
        const progressText = document.getElementById('progressAsistenciasText');
        const progressFill = document.getElementById('progressAsistenciasFill');

        if (progressPercent) progressPercent.textContent = porcentaje + '%';
        if (progressText) progressText.textContent = `${presente} de ${total} clases`;
        
        // Actualizar círculo de progreso
        if (progressFill) {
            const circumference = 2 * Math.PI * 30;
            const offset = circumference - (porcentaje / 100) * circumference;
            progressFill.style.strokeDashoffset = offset;
        }

        showToastNotification('Asistencias cargadas', 'success');

    } catch (error) {
        console.error('Error cargando asistencias:', error);
        tableBody.innerHTML = `
            <tr style="text-align: center; padding: 2rem; color: #ef4444;">
                <td colspan="4">Error al cargar asistencias: ${error.message}</td>
            </tr>
        `;
        showToastNotification('Error al cargar asistencias', 'error');
    }
}

// =================== PAGOS ===================

async function loadPagos() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        showToastNotification('Usuario no autenticado', 'error');
        return;
    }

    const tableBody = document.getElementById('pagosTableBody');
    if (!tableBody) return;

    try {
        showToastNotification('Cargando información de pagos...', 'info');

        // Obtener el documento del usuario para acceder a historialPagos
        // Usar currentUser.id en lugar de currentUser.uid
        const userId = currentUser.id || currentUser.uid;
        if (!userId) {
            throw new Error('ID de usuario no disponible');
        }
        
        const userDocRef = window.doc(window.db, 'users', userId);
        const userDoc = await window.getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            throw new Error('Usuario no encontrado en la base de datos');
        }
        
        const userData = userDoc.data();
        const historialPagos = userData.historialPagos || [];
        
        // Ordenar por fecha descendente
        const pagos = historialPagos.sort((a, b) => {
            const fechaA = new Date(a.fecha || 0).getTime();
            const fechaB = new Date(b.fecha || 0).getTime();
            return fechaB - fechaA;  // Descendente (más reciente primero)
        });

        // Calcular totales
        let totalPagado = 0;
        let clasesAtrasadas = 0;

        pagos.forEach(p => {
            if (p.estado === 'pagado') {
                totalPagado += p.monto || 0;
            } else if (p.estado === 'pendiente') {
                // Verificar si es una clase atrasada (fecha en el pasado)
                const fechaPago = new Date(p.fecha);
                if (fechaPago < new Date()) {
                    clasesAtrasadas++;
                }
            }
        });

        // Calcular cuántas clases se han tomado (aproximadamente)
        const fechaInicio = new Date('2025-05-31');
        const hoy = new Date();
        const diasTranscurridos = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
        const semanasTranscurridas = Math.floor(diasTranscurridos / 7);
        const numeroClaseActual = Math.max(0, semanasTranscurridas);
        
        // Cálculo dinámico del saldo pendiente
        // Saldo pendiente = (número de clase × $16) - total pagado
        const COSTO_POR_CLASE = 16;
        const totalEsperado = numeroClaseActual * COSTO_POR_CLASE;
        const saldoPendiente = Math.max(0, totalEsperado - totalPagado);

        // Actualizar cards de resumen
        document.getElementById('saldoActual').textContent = `$${totalEsperado.toLocaleString('es-CO')}`;
        document.getElementById('totalPagado').textContent = `$${totalPagado.toLocaleString('es-CO')}`;
        document.getElementById('totalPendiente').textContent = saldoPendiente > 0 ? `$${saldoPendiente.toLocaleString('es-CO')}` : '$0';

        // Calcular porcentaje de pagos
        const porcentajePagado = totalEsperado > 0 ? Math.round((totalPagado / totalEsperado) * 100) : 100;

        // Actualizar card de progreso
        const progressPercent = document.getElementById('progressPagosPercent');
        const progressText = document.getElementById('progressPagosText');
        const progressFill = document.getElementById('progressPagosFill');

        if (progressPercent) progressPercent.textContent = porcentajePagado + '%';
        if (progressText) {
            if (saldoPendiente > 0) {
                const clasesRestantes = Math.ceil(saldoPendiente / COSTO_POR_CLASE);
                progressText.textContent = `$${saldoPendiente.toLocaleString('es-CO')} pendiente (${clasesRestantes} clase${clasesRestantes > 1 ? 's' : ''})`;
            } else {
                progressText.textContent = 'Todos los pagos al día';
            }
        }
        
        // Actualizar círculo de progreso
        if (progressFill) {
            const circumference = 2 * Math.PI * 30;
            const offset = circumference - (porcentajePagado / 100) * circumference;
            progressFill.style.strokeDashoffset = offset;
        }

        // Renderizar tabla
        if (pagos.length === 0) {
            tableBody.innerHTML = `
                <tr style="text-align: center; padding: 2rem; color: #94a3b8;">
                    <td colspan="5">No hay transacciones registradas</td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = pagos.map(p => {
                const fecha = p.fecha ? new Date(p.fecha).toLocaleDateString('es-ES') : 'N/A';
                const estado = p.estado || 'Sin especificar';
                const estadoColor = estado === 'pagado' ? '#10b981' : estado === 'pendiente' ? '#f59e0b' : '#ef4444';
                const estadoIcon = estado === 'pagado' ? '✓' : estado === 'pendiente' ? '⏳' : '✗';
                const monto = p.monto || 0;
                
                return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 1rem;">${fecha}</td>
                        <td style="padding: 1rem;">${p.concepto || 'Clase'}</td>
                        <td style="padding: 1rem; text-align: right; font-weight: 600;">$${monto.toLocaleString('es-CO')}</td>
                        <td style="padding: 1rem; text-align: center;">
                            <span style="background-color: ${estadoColor}20; color: ${estadoColor}; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.85rem; font-weight: 600; text-transform: capitalize;">
                                ${estadoIcon} ${estado}
                            </span>
                        </td>
                        <td style="padding: 1rem; color: #64748b; font-size: 0.9rem;">${p.sede || '-'} / ${p.horario || '-'}</td>
                    </tr>
                `;
            }).join('');
        }

        showToastNotification('Pagos cargados correctamente', 'success');

    } catch (error) {
        console.error('Error cargando pagos:', error);
        tableBody.innerHTML = `
            <tr style="text-align: center; padding: 2rem; color: #ef4444;">
                <td colspan="5">Error al cargar pagos: ${error.message}</td>
            </tr>
        `;
        showToastNotification('Error al cargar pagos', 'error');
    }
}

// Exponer funciones globalmente
window.loadAsistencias = loadAsistencias;
window.loadPagos = loadPagos;
