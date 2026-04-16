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

        // Consultar asistencias del estudiante
        const asistenciasQuery = window.query(
            window.collection(window.db, 'asistencias'),
            window.where('estudianteEmail', '==', currentUser.email),
            window.orderBy('fecha', 'desc')
        );

        const asistenciasSnapshot = await window.getDocs(asistenciasQuery);
        const asistencias = [];

        asistenciasSnapshot.forEach(doc => {
            asistencias.push({
                id: doc.id,
                ...doc.data()
            });
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

        // Consultar pagos del estudiante
        const pagosQuery = window.query(
            window.collection(window.db, 'pagos'),
            window.where('estudianteEmail', '==', currentUser.email),
            window.orderBy('fecha', 'desc')
        );

        const pagosSnapshot = await window.getDocs(pagosQuery);
        const pagos = [];

        pagosSnapshot.forEach(doc => {
            pagos.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Calcular totales
        let totalPagado = 0;
        let totalPendiente = 0;
        let saldoActual = 0;

        pagos.forEach(p => {
            if (p.estado === 'pagado') {
                totalPagado += p.monto || 0;
            } else if (p.estado === 'pendiente') {
                totalPendiente += p.monto || 0;
            }
        });

        saldoActual = totalPagado - totalPendiente;

        // Actualizar cards de resumen
        document.getElementById('saldoActual').textContent = `$${saldoActual.toLocaleString('es-CO')}`;
        document.getElementById('totalPagado').textContent = `$${totalPagado.toLocaleString('es-CO')}`;
        document.getElementById('totalPendiente').textContent = `$${totalPendiente.toLocaleString('es-CO')}`;

        // Calcular porcentaje de pagos
        const totalTransacciones = totalPagado + totalPendiente;
        const porcentajePagado = totalTransacciones > 0 ? Math.round((totalPagado / totalTransacciones) * 100) : 0;

        // Actualizar card de progreso
        const progressPercent = document.getElementById('progressPagosPercent');
        const progressText = document.getElementById('progressPagosText');
        const progressFill = document.getElementById('progressPagosFill');

        if (progressPercent) progressPercent.textContent = porcentajePagado + '%';
        if (progressText) {
            if (totalPendiente > 0) {
                progressText.textContent = `$${totalPendiente.toLocaleString('es-CO')} pendiente`;
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
                const fecha = p.fecha ? new Date(p.fecha.toDate ? p.fecha.toDate() : p.fecha).toLocaleDateString('es-ES') : 'N/A';
                const estado = p.estado || 'Sin especificar';
                const estadoColor = estado === 'pagado' ? '#10b981' : '#ef4444';
                const monto = p.monto || 0;
                
                return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 1rem;">${fecha}</td>
                        <td style="padding: 1rem;">${p.concepto || 'Pago'}</td>
                        <td style="padding: 1rem; text-align: right; font-weight: 600;">$${monto.toLocaleString('es-CO')}</td>
                        <td style="padding: 1rem; text-align: center;">
                            <span style="background-color: ${estadoColor}20; color: ${estadoColor}; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.85rem; font-weight: 600; text-transform: capitalize;">
                                ${estado}
                            </span>
                        </td>
                        <td style="padding: 1rem; color: #64748b; font-size: 0.9rem;">${p.referencia || '-'}</td>
                    </tr>
                `;
            }).join('');
        }

        showToastNotification('Pagos cargados', 'success');

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
