/**
 * Módulo de Cobros - Charlotte Admin
 * 
 * Este módulo contiene todas las funciones relacionadas con la gestión de cobros.
 * Migrado desde admin.html (líneas 10456-11720)
 * 
 * Dependencias:
 * - Firebase Firestore (db - global desde admin.html)
 * - Variables globales: allApprovedUsers, temasClasesGuardados, showNotification
 */

// Referencia a db global declarada en admin.html
// No redeclarar aquí para evitar conflicto de variables

// Estado del módulo
let cobrosSedeActual = 'Carapungo';
let cobrosHorarioActual = 'Sábado Matutina';
let cobrosProgramaActual = 'Panadería';
let cobrosEstudiantesFiltrados = [];
let cobrosSeleccionados = new Set();
let vistaTablaActiva = false;
let temasClasesGuardados = {};

// Inicializar sección de cobros
async function initCobrosSection() {
    const fechaInput = document.getElementById('cobros-fecha');
    if (fechaInput) {
        const hoy = new Date();
        fechaInput.value = hoy.toISOString().split('T')[0];
    }
    
    // Esperar a que los usuarios estén disponibles
    let intentos = 0;
    while ((!window.allApprovedUsers || window.allApprovedUsers.length === 0) && intentos < 10) {
        console.log(`Esperando usuarios... intento ${intentos + 1}/10`);
        if (typeof loadUsuariosAprobados === 'function') {
            await loadUsuariosAprobados();
        }
        if (!window.allApprovedUsers || window.allApprovedUsers.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 500ms
        }
        intentos++;
    }
    
    cargarEstudiantesCobros();
}

// Cambiar sede
function cambiarSedeCobros(sede) {
    cobrosSedeActual = sede;
    
    // Actualizar tabs visuales
    const tabCarapungo = document.getElementById('tab-sede-carapungo');
    const tabSangolqui = document.getElementById('tab-sede-sangolqui');
    
    if (tabCarapungo) {
        tabCarapungo.style.background = sede === 'Carapungo' ? '#10b981' : '#f3f4f6';
        tabCarapungo.style.color = sede === 'Carapungo' ? 'white' : '#374151';
    }
    if (tabSangolqui) {
        tabSangolqui.style.background = sede === 'Sangolquí' ? '#10b981' : '#f3f4f6';
        tabSangolqui.style.color = sede === 'Sangolquí' ? 'white' : '#374151';
    }
    
    cobrosSeleccionados.clear();
    cargarEstudiantesCobros();
}

// Cambiar horario
function cambiarHorarioCobros(horario) {
    cobrosHorarioActual = horario;
    
    // Actualizar tabs visuales
    const tabs = {
        'Sábado Matutina': 'tab-horario-sab-mat',
        'Sábado Vespertina': 'tab-horario-sab-vesp',
        'Domingo Matutina': 'tab-horario-dom-mat'
    };
    
    Object.keys(tabs).forEach(h => {
        const tab = document.getElementById(tabs[h]);
        if (tab) {
            if (h === horario) {
                tab.style.background = '#dbeafe';
                tab.style.color = '#1e40af';
                tab.style.borderBottom = '3px solid #3b82f6';
            } else {
                tab.style.background = 'transparent';
                tab.style.color = '#6b7280';
                tab.style.borderBottom = '3px solid transparent';
            }
        }
    });
    
    cobrosSeleccionados.clear();
    cargarEstudiantesCobros();
}

// Cambiar programa
function cambiarProgramaCobros(programa) {
    cobrosProgramaActual = programa;
    
    // Actualizar tabs visuales
    const tabs = {
        'Panadería': 'tab-programa-panaderia',
        'Belleza': 'tab-programa-belleza',
        'Todos': 'tab-programa-todos'
    };
    
    Object.keys(tabs).forEach(p => {
        const tab = document.getElementById(tabs[p]);
        if (tab) {
            if (p === programa) {
                tab.style.background = '#a855f7';
                tab.style.color = 'white';
            } else {
                tab.style.background = '#f3e8ff';
                tab.style.color = '#7c3aed';
            }
        }
    });
    
    cobrosSeleccionados.clear();
    cargarEstudiantesCobros();
}

// Cargar estudiantes filtrados por sede y horario
async function cargarEstudiantesCobros() {
    const container = document.getElementById('cobros-lista-estudiantes');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; color: #6b7280;"><i class="fas fa-spinner fa-spin"></i> Cargando estudiantes...</p>';
    
    try {
        // Cargar temas de clases si no están cargados
        if (Object.keys(temasClasesGuardados).length === 0) {
            await cargarTemasClases();
        }
        
        // Intentar cargar usuarios con reintentos
        let intentos = 0;
        const maxIntentos = 5;
        
        while ((!window.allApprovedUsers || window.allApprovedUsers.length === 0) && intentos < maxIntentos) {
            console.log(`⏳ Intento ${intentos + 1}/${maxIntentos} de cargar usuarios...`);
            
            if (typeof loadUsuariosAprobados === 'function') {
                await loadUsuariosAprobados();
            }
            
            // Esperar un momento antes de verificar
            if (!window.allApprovedUsers || window.allApprovedUsers.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            intentos++;
        }
        
        // Verificar que window.allApprovedUsers está disponible
        if (!window.allApprovedUsers || !Array.isArray(window.allApprovedUsers) || window.allApprovedUsers.length === 0) {
            console.error('❌ No se pudieron cargar los estudiantes después de', maxIntentos, 'intentos');
            if (typeof showNotification === 'function') {
                showNotification('Error cargando estudiantes. Intenta recargar la sección de Usuarios primero.', 'error');
            }
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #dc2626;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="margin: 0 0 1rem 0; font-weight: 600;">No se pudieron cargar los estudiantes</p>
                    <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-sync"></i> Recargar Página
                    </button>
                </div>
            `;
            return;
        }
        
        console.log(`✅ ${window.allApprovedUsers.length} estudiantes cargados`);
        
        // Filtrar por sede, horario y programa
        cobrosEstudiantesFiltrados = window.allApprovedUsers.filter(u => {
            const matchSede = u.sede === cobrosSedeActual;
            const matchHorario = u.horario === cobrosHorarioActual;
            
            // Filtrar por programa
            let matchPrograma = true;
            if (cobrosProgramaActual !== 'Todos') {
                const userPrograma = (u.programa || '').toLowerCase();
                if (cobrosProgramaActual === 'Panadería') {
                    matchPrograma = userPrograma.includes('panadería') || userPrograma.includes('panaderia') || userPrograma.includes('pan');
                } else if (cobrosProgramaActual === 'Belleza') {
                    matchPrograma = userPrograma.includes('belleza') || userPrograma.includes('cosmetología') || userPrograma.includes('cosmetologia') || userPrograma.includes('estética') || userPrograma.includes('estetica');
                }
            }
            
            return matchSede && matchHorario && matchPrograma;
        });
        
        // Ordenar alfabéticamente
        cobrosEstudiantesFiltrados.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        // Renderizar según la vista activa
        if (vistaTablaActiva) {
            renderTabla40Clases();
        } else {
            renderCobrosEstudiantes();
        }
        actualizarResumenCobros();
    } catch (error) {
        console.error('Error cargando estudiantes para cobros:', error);
        container.innerHTML = '<p style="text-align: center; color: #ef4444;">Error al cargar estudiantes</p>';
    }
}

// Renderizar lista de estudiantes para cobros
function renderCobrosEstudiantes() {
    const container = document.getElementById('cobros-lista-estudiantes');
    const fechaInput = document.getElementById('cobros-fecha');
    if (!container || !fechaInput) return;
    
    const fechaSeleccionada = fechaInput.value;
    
    if (cobrosEstudiantesFiltrados.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-users-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="margin: 0;">No hay estudiantes de ${cobrosProgramaActual} en ${cobrosSedeActual} - ${cobrosHorarioActual}</p>
            </div>
        `;
        return;
    }
    
    const hoy = new Date();
    const clasesDelCurso = generarFechasClases(cobrosHorarioActual);
    
    container.innerHTML = cobrosEstudiantesFiltrados.map(user => {
        const historial = user.historialPagos || [];
        
        // Contar solo pagos que corresponden a las clases del curso
        let cuotasPagadas = 0;
        let clasesPasadas = 0;
        
        clasesDelCurso.forEach(clase => {
            if (clase.fecha <= hoy) {
                clasesPasadas++;
                const pago = historial.find(p => p.fecha && p.fecha.split('T')[0] === clase.fechaStr);
                if (pago && pago.estado === 'pagado') {
                    cuotasPagadas++;
                }
            }
        });
        
        const totalClases = clasesPasadas;
        const debe = totalClases - cuotasPagadas;
        
        // Verificar estado en la fecha seleccionada
        const pagoHoy = historial.find(p => p.fecha && p.fecha.split('T')[0] === fechaSeleccionada);
        const yaPagoHoy = pagoHoy && pagoHoy.estado === 'pagado';
        const pendienteHoy = pagoHoy && pagoHoy.estado === 'pendiente';
        
        // Tipo de pago del estudiante
        const tipoPago = user.tipoPago || 'semanal';
        const esMensual = tipoPago === 'mensual';
        
        // Color según deuda
        let statusColor, statusBg, statusIcon;
        if (debe >= 2) {
            statusColor = '#dc2626'; statusBg = '#fef2f2'; statusIcon = 'exclamation-triangle';
        } else if (debe === 1) {
            statusColor = '#f59e0b'; statusBg = '#fffbeb'; statusIcon = 'exclamation-circle';
        } else {
            statusColor = '#10b981'; statusBg = '#ecfdf5'; statusIcon = 'check-circle';
        }
        
        const isSelected = cobrosSeleccionados.has(user.id);
        
        return `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: ${isSelected ? '#dbeafe' : 'white'}; border: 2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}; border-radius: 12px; margin-bottom: 0.75rem; transition: all 0.2s;">
                <input type="checkbox" id="cobro-check-${user.id}" ${isSelected ? 'checked' : ''} 
                       onclick="cobrosModule.toggleCobroSeleccion('${user.id}')"
                       style="width: 20px; height: 20px; cursor: pointer; accent-color: #3b82f6;">
                
                <div style="width: 45px; height: 45px; background: linear-gradient(135deg, ${esMensual ? '#f59e0b, #d97706' : '#6366f1, #8b5cf6'}); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.1rem;" title="${esMensual ? 'Pago Mensual' : 'Pago Semanal'}">
                    ${(user.name || 'U').charAt(0).toUpperCase()}
                </div>
                
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 0.95rem; color: #1f2937;">
                        ${user.name || 'Sin nombre'}
                        ${esMensual ? '<span style="font-size: 0.7rem; background: #fef3c7; color: #92400e; padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: 0.5rem;">MENSUAL</span>' : ''}
                    </h4>
                    <p style="margin: 0; font-size: 0.8rem; color: #6b7280;">${user.programa || ''}</p>
                </div>
                
                <div style="text-align: center; padding: 0.5rem 1rem; background: ${statusBg}; border-radius: 8px; min-width: 80px;">
                    <p style="margin: 0; font-size: 0.7rem; color: ${statusColor}; font-weight: 600;">
                        <i class="fas fa-${statusIcon}"></i> ${debe > 0 ? `Debe ${debe}` : 'Al día'}
                    </p>
                    <p style="margin: 0; font-size: 0.75rem; color: #6b7280;">${cuotasPagadas}/${totalClases} ${esMensual ? 'meses' : 'cuotas'}</p>
                </div>
                
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${yaPagoHoy ? `
                        <div style="padding: 0.5rem 1rem; background: #ecfdf5; color: #059669; border-radius: 8px; font-size: 0.8rem; font-weight: 600;">
                            <i class="fas fa-check"></i> Pagó
                        </div>
                        <button onclick="cobrosModule.quitarPagoFecha('${user.id}', '${fechaSeleccionada}')" style="padding: 0.5rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;" title="Quitar pago">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : pendienteHoy ? `
                        <div style="padding: 0.5rem 1rem; background: #fef3c7; color: #92400e; border-radius: 8px; font-size: 0.8rem; font-weight: 600;">
                            <i class="fas fa-clock"></i> Pendiente
                        </div>
                        <button onclick="cobrosModule.cobrarIndividual('${user.id}')" style="padding: 0.5rem 0.75rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;" title="Marcar como pagado">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="cobrosModule.quitarPagoFecha('${user.id}', '${fechaSeleccionada}')" style="padding: 0.5rem 0.75rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;" title="Quitar">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : `
                        <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
                            <button onclick="cobrarMonto('${user.id}', '16')" style="padding: 0.4rem 0.6rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600;" title="Cobrar $16">$16</button>
                            <button onclick="cobrarMonto('${user.id}', '35')" style="padding: 0.4rem 0.6rem; background: #06b6d4; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600;" title="Cobrar $35">$35</button>
                            <button onclick="cobrarMonto('${user.id}', '70')" style="padding: 0.4rem 0.6rem; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600;" title="Cobrar $70">$70</button>
                            <button onclick="abrirModalMontoPersonalizado('${user.id}')" style="padding: 0.4rem 0.6rem; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600;" title="Monto personalizado"><i class="fas fa-plus"></i></button>
                        </div>
                        <button onclick="cobrosModule.marcarPendiente('${user.id}')" style="padding: 0.5rem 1rem; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500;" title="Marcar como pendiente">
                            <i class="fas fa-clock"></i> Pendiente
                        </button>
                    `}
                </div>
                
                <button onclick="cobrosModule.editarTipoPagoUsuario('${user.id}')" style="padding: 0.5rem 0.75rem; background: ${esMensual ? '#f59e0b' : '#8b5cf6'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;" title="Cambiar tipo de pago">
                    <i class="fas fa-${esMensual ? 'calendar-alt' : 'calendar-week'}"></i>
                </button>
                
                <button onclick="cobrosModule.verHistorialCobrosUsuario('${user.id}')" style="padding: 0.5rem 0.75rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;" title="Ver historial">
                    <i class="fas fa-history"></i>
                </button>
            </div>
        `;
    }).join('');
    
    actualizarContadorCobrosSeleccionados();
}

// Cobrar con monto específico (botones rápidos desde lista)
async function cobrarMonto(userId, montoFijo) {
    const fecha = document.getElementById('cobros-fecha')?.value;
    const tema = document.getElementById('cobros-tema')?.value || 'Clase semanal';
    
    if (!fecha) {
        if (typeof showNotification === 'function') showNotification('Selecciona una fecha', 'warning');
        return;
    }
    
    try {
        const userRef = window.window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const monto = parseFloat(montoFijo);
        
        const historialPagos = userData.historialPagos || [];
        historialPagos.push({
            concepto: tema,
            monto: monto,
            estado: 'pagado',
            fecha: new Date(fecha + 'T12:00:00').toISOString(),
            registradoPor: 'admin',
            sede: cobrosSedeActual,
            horario: cobrosHorarioActual
        });
        
        await userRef.update({ 
            historialPagos,
            estadoPagos: 'pagos_al_dia'
        });
        
        // Actualizar datos locales
        const userIndex = window.allApprovedUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            window.allApprovedUsers[userIndex].historialPagos = historialPagos;
        }
        
        // Actualizar en cobrosEstudiantesFiltrados
        const filteredUserIndex = cobrosEstudiantesFiltrados.findIndex(u => u.id === userId);
        if (filteredUserIndex !== -1) {
            cobrosEstudiantesFiltrados[filteredUserIndex].historialPagos = historialPagos;
        }
        
        if (typeof showNotification === 'function') showNotification(`Cobro registrado: $${monto}`, 'success');
        
        // Re-renderizar la vista activa
        if (vistaTablaActiva) {
            renderTabla40Clases();
        } else {
            renderCobrosEstudiantes();
        }
        actualizarResumenCobros();
    } catch (error) {
        console.error('Error cobrando:', error);
        if (typeof showNotification === 'function') showNotification('Error al registrar cobro', 'error');
    }
}

// Abrir modal de monto personalizado desde lista
function abrirModalMontoPersonalizado(userId) {
    const user = window.allApprovedUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modalHtml = `
        <div id="montoPersonalizadoModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 350px;">
                <div class="modal-header">
                    <h2><i class="fas fa-dollar-sign"></i> Monto Personalizado</h2>
                    <span class="close" onclick="document.getElementById('montoPersonalizadoModal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong>${user.name}</strong></p>
                    <div class="form-group" style="margin: 1.5rem 0;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Ingresa el monto a cobrar:</label>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.25rem; color: #3b82f6;">$</span>
                            <input 
                                type="number" 
                                id="montoPersonalizadoInput" 
                                placeholder="0" 
                                min="1" 
                                step="0.01"
                                style="flex: 1; padding: 0.75rem; border: 2px solid #3b82f6; border-radius: 8px; font-size: 1rem; outline: none;"
                            >
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="text-align: right; padding: 1rem; border-top: 1px solid #eee;">
                    <button onclick="document.getElementById('montoPersonalizadoModal').remove()" style="margin-right: 10px; padding: 0.75rem 1.25rem; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
                    <button onclick="cobrarMonto('${userId}', document.getElementById('montoPersonalizadoInput').value); document.getElementById('montoPersonalizadoModal').remove();" style="padding: 0.75rem 1.25rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;"><i class="fas fa-save"></i> Cobrar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('montoPersonalizadoInput').focus();
}

// Marcar como pendiente
async function marcarPendiente(userId) {
    const fechaInput = document.getElementById('cobros-fecha');
    const temaInput = document.getElementById('cobros-tema');
    
    const fecha = fechaInput?.value;
    const tema = temaInput?.value || obtenerTemaClase(fecha) || 'Clase semanal';
    
    if (!fecha) {
        if (typeof showNotification === 'function') showNotification('Selecciona una fecha', 'warning');
        return;
    }
    
    try {
        const userRef = window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        // Obtener monto: primero del campo personalizado del formulario, sino del estudiante
        let monto = parseFloat(document.getElementById('cobros-monto')?.value);
        if (!monto || isNaN(monto) || monto <= 0) {
            monto = userData.montoPersonalizado || 16;
        }
        
        const historialPagos = userData.historialPagos || [];
        historialPagos.push({
            concepto: tema,
            monto: monto,
            estado: 'pendiente',
            fecha: new Date(fecha + 'T12:00:00').toISOString(),
            registradoPor: 'admin',
            sede: cobrosSedeActual,
            horario: cobrosHorarioActual
        });
        
        await userRef.update({ 
            historialPagos,
            estadoPagos: 'pagos_pendientes'
        });
        
        // Actualizar datos locales
        const userIndex = window.allApprovedUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            window.allApprovedUsers[userIndex].historialPagos = historialPagos;
            window.allApprovedUsers[userIndex].estadoPagos = 'pagos_pendientes';
        }
        
        // Actualizar en cobrosEstudiantesFiltrados
        const filteredUserIndex = cobrosEstudiantesFiltrados.findIndex(u => u.id === userId);
        if (filteredUserIndex !== -1) {
            cobrosEstudiantesFiltrados[filteredUserIndex].historialPagos = historialPagos;
            cobrosEstudiantesFiltrados[filteredUserIndex].estadoPagos = 'pagos_pendientes';
        }
        
        if (typeof showNotification === 'function') showNotification('Marcado como pendiente', 'warning');
        
        // Re-renderizar la vista activa
        if (vistaTablaActiva) {
            renderTabla40Clases();
        } else {
            renderCobrosEstudiantes();
        }
        actualizarResumenCobros();
    } catch (error) {
        console.error('Error marcando pendiente:', error);
        if (typeof showNotification === 'function') showNotification('Error al marcar pendiente', 'error');
    }
}

// Quitar pago de una fecha específica
async function quitarPagoFecha(userId, fechaStr) {
    const user = window.allApprovedUsers.find(u => u.id === userId);
    if (!user) return;
    
    const confirmar = confirm(`¿Quitar registro de ${user.name} del ${fechaStr}?`);
    if (!confirmar) return;
    
    try {
        const historial = user.historialPagos || [];
        const nuevoHistorial = historial.filter(p => !(p.fecha && p.fecha.split('T')[0] === fechaStr));
        
        await window.window.db.collection('users').doc(userId).update({ historialPagos: nuevoHistorial });
        
        // Actualizar datos locales
        const userIndex = window.allApprovedUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            window.allApprovedUsers[userIndex].historialPagos = nuevoHistorial;
        }
        
        // Actualizar en cobrosEstudiantesFiltrados
        const filteredUserIndex = cobrosEstudiantesFiltrados.findIndex(u => u.id === userId);
        if (filteredUserIndex !== -1) {
            cobrosEstudiantesFiltrados[filteredUserIndex].historialPagos = nuevoHistorial;
        }
        
        if (typeof showNotification === 'function') showNotification('Pago eliminado', 'success');
        
        // Re-renderizar la vista activa
        if (vistaTablaActiva) {
            renderTabla40Clases();
        } else {
            renderCobrosEstudiantes();
        }
        actualizarResumenCobros();
    } catch (error) {
        console.error('Error eliminando registro:', error);
        if (typeof showNotification === 'function') showNotification('Error al eliminar registro', 'error');
    }
}

// Editar tipo de pago del usuario
function editarTipoPagoUsuario(userId) {
    const user = window.allApprovedUsers.find(u => u.id === userId);
    if (!user) return;
    
    const montoActual = user.montoPersonalizado || user.tipoPago || '';
    
    const modalHtml = `
        <div id="tipoPagoModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-dollar-sign"></i> Configurar Monto de Pago</h2>
                    <span class="close" onclick="document.getElementById('tipoPagoModal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong>${user.name}</strong></p>
                    <div class="form-group" style="margin: 1.5rem 0;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">¿Cuánto paga este estudiante?</label>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.25rem; color: #3b82f6;">$</span>
                            <input 
                                type="number" 
                                id="montoPago" 
                                value="${montoActual}" 
                                placeholder="Ingresa el monto" 
                                min="1" 
                                step="0.01"
                                style="flex: 1; padding: 0.75rem; border: 2px solid #3b82f6; border-radius: 8px; font-size: 1rem; outline: none;"
                            >
                        </div>
                        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #6b7280;">Ingresa el valor exacto que el estudiante debe pagar por clase, quincena o mes.</p>
                    </div>
                </div>
                <div class="modal-footer" style="text-align: right; padding: 1rem; border-top: 1px solid #eee;">
                    <button onclick="document.getElementById('tipoPagoModal').remove()" style="margin-right: 10px; padding: 0.75rem 1.25rem; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
                    <button onclick="cobrosModule.guardarMontoPago('${userId}')" style="padding: 0.75rem 1.25rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;"><i class="fas fa-save"></i> Guardar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('montoPago').focus();
}

// Guardar monto personalizado de pago
async function guardarMontoPago(userId) {
    const monto = parseFloat(document.getElementById('montoPago')?.value);
    
    if (!monto || monto <= 0 || isNaN(monto)) {
        if (typeof showNotification === 'function') showNotification('Ingresa un monto válido mayor a 0', 'warning');
        return;
    }
    
    try {
        await window.window.db.collection('users').doc(userId).update({ 
            montoPersonalizado: monto,
            tipoPago: 'personalizado'
        });
        
        const userIndex = window.allApprovedUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            window.allApprovedUsers[userIndex].montoPersonalizado = monto;
            window.allApprovedUsers[userIndex].tipoPago = 'personalizado';
        }
        
        // Actualizar en cobrosEstudiantesFiltrados
        const filteredUserIndex = cobrosEstudiantesFiltrados.findIndex(u => u.id === userId);
        if (filteredUserIndex !== -1) {
            cobrosEstudiantesFiltrados[filteredUserIndex].montoPersonalizado = monto;
            cobrosEstudiantesFiltrados[filteredUserIndex].tipoPago = 'personalizado';
        }
        
        if (typeof showNotification === 'function') showNotification(`Monto de pago configurado: $${monto}`, 'success');
        document.getElementById('tipoPagoModal').remove();
        
        // Re-renderizar la vista activa
        if (vistaTablaActiva) {
            renderTabla40Clases();
        } else {
            renderCobrosEstudiantes();
        }
    } catch (error) {
        console.error('Error guardando monto:', error);
        if (typeof showNotification === 'function') showNotification('Error al guardar', 'error');
    }
}

// Obtener tema de clase guardado
function obtenerTemaClase(fechaStr) {
    const key = `${cobrosSedeActual}_${cobrosHorarioActual}`;
    const temas = temasClasesGuardados[key] || {};
    return temas[fechaStr] || '';
}

// Calcular clases desde el 31 de mayo 2025
function calcularClasesDesdeInicio(horario) {
    const fechaInicio = new Date('2025-05-31');
    const hoy = new Date();
    let clases = 0;
    
    const diaSemana = horario && horario.toLowerCase().includes('domingo') ? 0 : 6;
    
    let fecha = new Date(fechaInicio);
    while (fecha <= hoy) {
        if (fecha.getDay() === diaSemana) {
            clases++;
        }
        fecha.setDate(fecha.getDate() + 1);
    }
    
    return clases;
}

// Toggle selección de estudiante para cobro
function toggleCobroSeleccion(userId) {
    if (cobrosSeleccionados.has(userId)) {
        cobrosSeleccionados.delete(userId);
    } else {
        cobrosSeleccionados.add(userId);
    }
    
    // Actualizar visual
    const checkbox = document.getElementById('cobro-check-' + userId);
    if (checkbox) checkbox.checked = cobrosSeleccionados.has(userId);
    
    actualizarContadorCobrosSeleccionados();
}

// Seleccionar todos los que no han pagado hoy
function seleccionarTodosCobros() {
    const fechaSeleccionada = document.getElementById('cobros-fecha')?.value;
    if (!fechaSeleccionada) return;
    
    cobrosEstudiantesFiltrados.forEach(user => {
        const historial = user.historialPagos || [];
        const yaPagoHoy = historial.some(p => 
            p.fecha && p.fecha.split('T')[0] === fechaSeleccionada && p.estado === 'pagado'
        );
        
        if (!yaPagoHoy) {
            cobrosSeleccionados.add(user.id);
        }
    });
    
    renderCobrosEstudiantes();
}

// Actualizar contador de seleccionados
function actualizarContadorCobrosSeleccionados() {
    const counter = document.getElementById('cobros-seleccionados-count');
    if (counter) {
        counter.textContent = `${cobrosSeleccionados.size} seleccionados`;
    }
}

// Cobrar a un estudiante individual
async function cobrarIndividual(userId) {
    const fechaInput = document.getElementById('cobros-fecha');
    const temaInput = document.getElementById('cobros-tema');
    
    const fecha = fechaInput?.value;
    const tema = temaInput?.value || 'Clase semanal';
    
    if (!fecha) {
        if (typeof showNotification === 'function') showNotification('Selecciona una fecha', 'warning');
        return;
    }
    
    try {
        const userRef = window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        // Obtener monto: primero del campo personalizado del formulario, sino del estudiante
        let monto = parseFloat(document.getElementById('cobros-monto')?.value);
        if (!monto || isNaN(monto) || monto <= 0) {
            monto = userData.montoPersonalizado || 16;
        }
        
        const historialPagos = userData.historialPagos || [];
        historialPagos.push({
            concepto: tema,
            monto: monto,
            estado: 'pagado',
            fecha: new Date(fecha + 'T12:00:00').toISOString(),
            registradoPor: 'admin',
            sede: cobrosSedeActual,
            horario: cobrosHorarioActual
        });
        
        await userRef.update({ 
            historialPagos,
            estadoPagos: 'pagos_al_dia'
        });
        
        // Actualizar datos locales
        const userIndex = window.allApprovedUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            window.allApprovedUsers[userIndex].historialPagos = historialPagos;
        }
        
        // Actualizar en cobrosEstudiantesFiltrados
        const filteredUserIndex = cobrosEstudiantesFiltrados.findIndex(u => u.id === userId);
        if (filteredUserIndex !== -1) {
            cobrosEstudiantesFiltrados[filteredUserIndex].historialPagos = historialPagos;
        }
        
        if (typeof showNotification === 'function') showNotification(`Cobro registrado: $${monto}`, 'success');
        
        // Re-renderizar la vista activa
        if (vistaTablaActiva) {
            renderTabla40Clases();
        } else {
            renderCobrosEstudiantes();
        }
        actualizarResumenCobros();
    } catch (error) {
        console.error('Error cobrando:', error);
        if (typeof showNotification === 'function') showNotification('Error al registrar cobro', 'error');
    }
}

// Cobrar a todos los seleccionados
async function cobrarSeleccionados() {
    if (cobrosSeleccionados.size === 0) {
        if (typeof showNotification === 'function') showNotification('Selecciona al menos un estudiante', 'warning');
        return;
    }
    
    const fechaInput = document.getElementById('cobros-fecha');
    const temaInput = document.getElementById('cobros-tema');
    const montoInput = document.getElementById('cobros-monto');
    
    const fecha = fechaInput?.value;
    const tema = temaInput?.value || 'Clase semanal';
    const montoFormulario = parseFloat(montoInput?.value);
    
    if (!fecha) {
        if (typeof showNotification === 'function') showNotification('Selecciona una fecha', 'warning');
        return;
    }
    
    const confirmacion = confirm(`¿Registrar cobros a ${cobrosSeleccionados.size} estudiantes?\n\nFecha: ${fecha}\nTema: ${tema}\n\nEl monto será: ${montoFormulario && montoFormulario > 0 ? '$' + montoFormulario + ' (personalizado)' : 'el configurado de cada estudiante'}`);
    if (!confirmacion) return;
    
    let cobrados = 0;
    let errores = 0;
    let montoTotal = 0;
    
    for (const userId of cobrosSeleccionados) {
        try {
            const userRef = window.db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            
            // Prioridad: monto del formulario > monto del estudiante > default 16
            let monto = montoFormulario;
            if (!monto || isNaN(monto) || monto <= 0) {
                monto = userData.montoPersonalizado || 16;
            }
            
            const historialPagos = userData.historialPagos || [];
            historialPagos.push({
                concepto: tema,
                monto: monto,
                estado: 'pagado',
                fecha: new Date(fecha + 'T12:00:00').toISOString(),
                registradoPor: 'admin',
                sede: cobrosSedeActual,
                horario: cobrosHorarioActual
            });
            
            await userRef.update({ 
                historialPagos,
                estadoPagos: 'pagos_al_dia'
            });
            
            // Actualizar datos locales
            const userIndex = window.allApprovedUsers.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                window.allApprovedUsers[userIndex].historialPagos = historialPagos;
            }
            
            cobrados++;
            montoTotal += monto;
        } catch (error) {
            console.error('Error cobrando a:', userId, error);
            errores++;
        }
    }
    
    if (typeof showNotification === 'function') showNotification(`Cobrados: ${cobrados}, Errores: ${errores}. Total: $${montoTotal}`, cobrados > 0 ? 'success' : 'error');
    cobrosSeleccionados.clear();
    
    // Re-renderizar la vista activa
    if (vistaTablaActiva) {
        renderTabla40Clases();
    } else {
        renderCobrosEstudiantes();
    }
    actualizarResumenCobros();
}

// Actualizar resumen de cobros
function actualizarResumenCobros() {
    const fechaInput = document.getElementById('cobros-fecha');
    const montoInput = document.getElementById('cobros-monto');
    
    const fechaSeleccionada = fechaInput?.value;
    const monto = parseFloat(montoInput?.value) || 16;
    
    const totalGrupo = cobrosEstudiantesFiltrados.length;
    let pagaronHoy = 0;
    let recaudado = 0;
    
    cobrosEstudiantesFiltrados.forEach(user => {
        const historial = user.historialPagos || [];
        const pagoHoy = historial.find(p => 
            p.fecha && p.fecha.split('T')[0] === fechaSeleccionada && p.estado === 'pagado'
        );
        if (pagoHoy) {
            pagaronHoy++;
            recaudado += pagoHoy.monto || monto;
        }
    });
    
    const totalEl = document.getElementById('cobros-total-grupo');
    const pagaronEl = document.getElementById('cobros-pagaron-hoy');
    const recaudadoEl = document.getElementById('cobros-recaudado');
    const pendientesEl = document.getElementById('cobros-pendientes');
    
    if (totalEl) totalEl.textContent = totalGrupo;
    if (pagaronEl) pagaronEl.textContent = pagaronHoy;
    if (recaudadoEl) recaudadoEl.textContent = '$' + recaudado;
    if (pendientesEl) pendientesEl.textContent = totalGrupo - pagaronHoy;
}

// Ver historial de cobros de un usuario
function verHistorialCobrosUsuario(userId) {
    if (typeof verHistorialPagos === 'function') {
        verHistorialPagos(userId);
    }
}

// Cargar historial de clases
async function cargarClasesHistorial() {
    const container = document.getElementById('cobros-historial-container');
    const lista = document.getElementById('cobros-historial-lista');
    
    if (!container || !lista) return;
    
    container.style.display = 'block';
    lista.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</p>';
    
    try {
        // Recopilar todas las fechas y temas únicos de los pagos
        const clasesMap = new Map();
        
        window.allApprovedUsers.forEach(user => {
            if (user.sede === cobrosSedeActual && user.horario === cobrosHorarioActual) {
                const historial = user.historialPagos || [];
                historial.forEach(pago => {
                    if (pago.fecha) {
                        const fechaKey = pago.fecha.split('T')[0];
                        if (!clasesMap.has(fechaKey)) {
                            clasesMap.set(fechaKey, {
                                fecha: fechaKey,
                                tema: pago.concepto || 'Sin tema',
                                pagos: 0,
                                total: 0
                            });
                        }
                        if (pago.estado === 'pagado') {
                            const clase = clasesMap.get(fechaKey);
                            clase.pagos++;
                            clase.total += pago.monto || 0;
                        }
                    }
                });
            }
        });
        
        // Ordenar por fecha descendente
        const clasesArray = Array.from(clasesMap.values()).sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        );
        
        if (clasesArray.length === 0) {
            lista.innerHTML = '<p style="text-align: center; color: #6b7280;">No hay registros de clases</p>';
            return;
        }
        
        lista.innerHTML = clasesArray.map(clase => `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 10px; margin-bottom: 0.75rem;">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
                    <span style="font-size: 1.1rem; font-weight: 700;">${new Date(clase.fecha).getDate()}</span>
                    <span style="font-size: 0.6rem; text-transform: uppercase;">${new Date(clase.fecha).toLocaleDateString('es', { month: 'short' })}</span>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 0.95rem; color: #1f2937;">${clase.tema}</h4>
                    <p style="margin: 0; font-size: 0.8rem; color: #6b7280;">${new Date(clase.fecha).toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-size: 1rem; font-weight: 700; color: #10b981;">$${clase.total}</p>
                    <p style="margin: 0; font-size: 0.75rem; color: #6b7280;">${clase.pagos} pagos</p>
                </div>
                <button onclick="cobrosModule.cargarClaseEspecifica('${clase.fecha}')" style="padding: 0.5rem 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando historial:', error);
        lista.innerHTML = '<p style="text-align: center; color: #ef4444;">Error al cargar historial</p>';
    }
}

// Cargar una clase específica
function cargarClaseEspecifica(fecha) {
    const fechaInput = document.getElementById('cobros-fecha');
    const historialContainer = document.getElementById('cobros-historial-container');
    
    if (fechaInput) fechaInput.value = fecha;
    if (historialContainer) historialContainer.style.display = 'none';
    renderCobrosEstudiantes();
    actualizarResumenCobros();
}

// Exportar reporte de cobros del día
function exportarCobrosDelDia() {
    const fechaInput = document.getElementById('cobros-fecha');
    const temaInput = document.getElementById('cobros-tema');
    
    const fecha = fechaInput?.value;
    const tema = temaInput?.value || 'Clase semanal';
    
    const headers = ['Nombre', 'Email', 'Programa', 'Pagó', 'Monto', 'Debe Cuotas'];
    const rows = cobrosEstudiantesFiltrados.map(user => {
        const historial = user.historialPagos || [];
        const pagoHoy = historial.find(p => p.fecha && p.fecha.split('T')[0] === fecha && p.estado === 'pagado');
        const cuotasPagadas = historial.filter(p => p.estado === 'pagado').length;
        const totalClases = calcularClasesDesdeInicio(user.horario);
        const debe = totalClases - cuotasPagadas;
        
        return [
            user.name || '',
            user.email || '',
            user.programa || '',
            pagoHoy ? 'Sí' : 'No',
            pagoHoy ? pagoHoy.monto : 0,
            debe
        ];
    });
    
    let csv = `Reporte de Cobros - ${cobrosSedeActual} - ${cobrosHorarioActual}\n`;
    csv += `Fecha: ${fecha}\n`;
    csv += `Tema: ${tema}\n\n`;
    csv += headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cobros_${cobrosSedeActual}_${fecha}.csv`;
    link.click();
    
    if (typeof showNotification === 'function') showNotification('Reporte exportado', 'success');
}

// Toggle entre vista lista y tabla
function toggleVistaTabla() {
    vistaTablaActiva = !vistaTablaActiva;
    const btn = document.getElementById('btn-vista-tabla');
    const listaContainer = document.getElementById('cobros-lista-estudiantes');
    const tablaContainer = document.getElementById('cobros-tabla-container');
    
    if (vistaTablaActiva) {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-list"></i> Vista Lista';
            btn.style.background = '#3b82f6';
        }
        if (listaContainer) listaContainer.style.display = 'none';
        if (tablaContainer) tablaContainer.style.display = 'block';
        renderTabla40Clases();
    } else {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-table"></i> Vista Tabla 40 Clases';
            btn.style.background = '#8b5cf6';
        }
        if (listaContainer) listaContainer.style.display = 'block';
        if (tablaContainer) tablaContainer.style.display = 'none';
    }
}

// Generar las 40 fechas de clases desde el 31 de mayo 2025
function generarFechasClases(horario) {
    const fechaInicio = new Date('2025-05-31');
    const clases = [];
    const totalClases = 40;
    
    const diaSemana = horario && horario.toLowerCase().includes('domingo') ? 0 : 6;
    
    let fecha = new Date(fechaInicio);
    while (fecha.getDay() !== diaSemana) {
        fecha.setDate(fecha.getDate() + 1);
    }
    
    for (let i = 0; i < totalClases; i++) {
        clases.push({
            numero: i + 1,
            fecha: new Date(fecha),
            fechaStr: fecha.toISOString().split('T')[0]
        });
        fecha.setDate(fecha.getDate() + 7);
    }
    
    return clases;
}

// Renderizar tabla de 40 clases
function renderTabla40Clases() {
    const headerContainer = document.getElementById('cobros-tabla-header');
    const bodyContainer = document.getElementById('cobros-tabla-body');
    
    if (!headerContainer || !bodyContainer) return;
    
    const clases = generarFechasClases(cobrosHorarioActual);
    const key = `${cobrosSedeActual}_${cobrosHorarioActual}`;
    const temas = temasClasesGuardados[key] || {};
    
    // Generar header
    let headerHtml = '<tr style="background: linear-gradient(135deg, #1e3a8a, #3730a3); color: white;">';
    headerHtml += '<th style="padding: 0.5rem; position: sticky; left: 0; background: #1e3a8a; z-index: 10; min-width: 150px; text-align: left;">Estudiante</th>';
    headerHtml += '<th style="padding: 0.5rem; min-width: 60px;">Total</th>';
    headerHtml += '<th style="padding: 0.5rem; min-width: 60px;">Debe</th>';
    
    clases.forEach((clase, i) => {
        const fechaCorta = clase.fecha.toLocaleDateString('es', { day: '2-digit', month: 'short' });
        const esHoy = clase.fechaStr === new Date().toISOString().split('T')[0];
        headerHtml += `<th style="padding: 0.25rem 0.5rem; min-width: 45px; font-size: 0.65rem; writing-mode: vertical-rl; text-orientation: mixed; height: 80px; ${esHoy ? 'background: #fbbf24; color: #1f2937;' : ''}" title="Clase ${i + 1}: ${clase.fechaStr}">${fechaCorta}</th>`;
    });
    headerHtml += '</tr>';
    
    // Segunda fila con números
    headerHtml += '<tr style="background: #f3f4f6;">';
    headerHtml += '<th style="position: sticky; left: 0; background: #f3f4f6; z-index: 10;"></th>';
    headerHtml += '<th></th><th></th>';
    clases.forEach((clase, i) => {
        const esHoy = clase.fechaStr === new Date().toISOString().split('T')[0];
        headerHtml += `<th style="padding: 0.25rem; font-size: 0.7rem; font-weight: 600; ${esHoy ? 'background: #fef3c7;' : ''}">${i + 1}</th>`;
    });
    headerHtml += '</tr>';
    
    // Tercera fila con temas
    headerHtml += '<tr style="background: #e0e7ff;">';
    headerHtml += '<th style="position: sticky; left: 0; background: #e0e7ff; z-index: 10; font-size: 0.75rem; color: #4338ca;"><i class="fas fa-book"></i> Temas</th>';
    headerHtml += '<th></th><th></th>';
    clases.forEach((clase, i) => {
        const tema = temas[clase.fechaStr] || '';
        const temaCorto = tema.length > 8 ? tema.substring(0, 6) + '..' : (tema || '—');
        headerHtml += `<th style="padding: 0.2rem; font-size: 0.6rem; color: #4338ca; cursor: pointer; max-width: 45px; overflow: hidden;" 
                           onclick="window.editarTemaClase('${clase.fechaStr}', ${i + 1})" 
                           title="${tema || 'Click para agregar tema'}">${temaCorto}</th>`;
    });
    headerHtml += '</tr>';
    
    headerContainer.innerHTML = headerHtml;
    
    // Generar body
    if (cobrosEstudiantesFiltrados.length === 0) {
        bodyContainer.innerHTML = '<tr><td colspan="43" style="text-align: center; padding: 2rem; color: #6b7280;">No hay estudiantes en este grupo</td></tr>';
        return;
    }
    
    let bodyHtml = '';
    const hoy = new Date();
    
    cobrosEstudiantesFiltrados.forEach((user, userIndex) => {
        const historial = user.historialPagos || [];
        const historialFechas = {};
        const historialPendientes = {};
        
        // Mapear pagos y pendientes (guardando objeto completo con monto)
        historial.forEach(p => {
            if (p.fecha) {
                const fechaKey = p.fecha.split('T')[0];
                if (p.estado === 'pagado') {
                    historialFechas[fechaKey] = p;
                } else if (p.estado === 'pendiente') {
                    historialPendientes[fechaKey] = p;
                }
            }
        });
        
        // Calcular total sumando los montos REALES del historial
        let totalPagado = 0;
        let clasesPasadas = 0;
        
        clases.forEach(clase => {
            if (clase.fecha <= hoy) {
                clasesPasadas++;
                if (historialFechas[clase.fechaStr]) {
                    totalPagado += (historialFechas[clase.fechaStr].monto || 0);
                }
            }
        });
        
        const debe = clasesPasadas - Object.keys(historialFechas).filter(f => {
            const fecha = new Date(f);
            return fecha <= hoy;
        }).length;
        
        const esMensual = user.tipoPago === 'mensual';
        
        let rowBg = userIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
        if (debe >= 5) rowBg = '#fef2f2';
        else if (debe >= 2) rowBg = '#fffbeb';
        
        bodyHtml += `<tr style="background: ${rowBg};">`;
        bodyHtml += `<td style="padding: 0.5rem; position: sticky; left: 0; background: ${rowBg}; z-index: 5; font-weight: 500; border-right: 2px solid #e5e7eb;">
            ${user.name || 'Sin nombre'}
            ${esMensual ? '<span style="font-size: 0.6rem; background: #fef3c7; color: #92400e; padding: 0.1rem 0.3rem; border-radius: 3px; margin-left: 0.3rem;">M</span>' : ''}
        </td>`;
        bodyHtml += `<td style="padding: 0.5rem; text-align: center; font-weight: 600; color: #059669;">$${totalPagado}</td>`;
        bodyHtml += `<td style="padding: 0.5rem; text-align: center; font-weight: 600; color: ${debe > 0 ? '#dc2626' : '#059669'};">${debe}</td>`;
        
        clases.forEach((clase) => {
            const pago = historialFechas[clase.fechaStr];
            const pendiente = historialPendientes[clase.fechaStr];
            const esHoy = clase.fechaStr === new Date().toISOString().split('T')[0];
            const esFuturo = clase.fecha > new Date();
            
            let cellContent = '';
            let cellStyle = 'padding: 0.25rem; text-align: center; cursor: pointer;';
            
            if (pago) {
                cellContent = '✓';
                cellStyle += ' background: #dcfce7; color: #059669; font-weight: bold;';
            } else if (pendiente) {
                cellContent = '⏳';
                cellStyle += ' background: #fef3c7; color: #b45309;';
            } else if (esFuturo) {
                cellContent = '·';
                cellStyle += ' background: #f3f4f6; color: #9ca3af;';
            } else {
                cellContent = '✗';
                cellStyle += ' background: #fee2e2; color: #dc2626;';
            }
            
            if (esHoy) {
                cellStyle += ' border: 2px solid #f59e0b;';
            }
            
            bodyHtml += `<td style="${cellStyle}" 
                             onclick="window.abrirModalPagoTabla('${user.id}', '${clase.fechaStr}', ${clase.numero})" 
                             title="Clase ${clase.numero}: ${clase.fechaStr}">${cellContent}</td>`;
        });
        
        bodyHtml += '</tr>';
    });
    
    // Fila de totales
    bodyHtml += '<tr style="background: linear-gradient(135deg, #1e3a8a, #3730a3); color: white; font-weight: 600;">';
    bodyHtml += '<td style="padding: 0.75rem; position: sticky; left: 0; background: #1e3a8a; z-index: 5;">TOTALES</td>';
    
    let totalRecaudado = 0;
    let totalDeuda = 0;
    const clasesPasadasTotal = clases.filter(c => c.fecha <= hoy).length;
    
    cobrosEstudiantesFiltrados.forEach(user => {
        const historial = user.historialPagos || [];
        let montoPagadoEnCurso = 0;
        let clasesPagadasEnCurso = 0;
        
        clases.forEach(clase => {
            if (clase.fecha <= hoy) {
                const pagado = historial.find(p => p.fecha && p.fecha.split('T')[0] === clase.fechaStr && p.estado === 'pagado');
                if (pagado) {
                    montoPagadoEnCurso += (pagado.monto || 0);
                    clasesPagadasEnCurso++;
                }
            }
        });
        
        totalRecaudado += montoPagadoEnCurso;
        totalDeuda += (clasesPasadasTotal - clasesPagadasEnCurso);
    });
    
    bodyHtml += `<td style="padding: 0.75rem; text-align: center;">$${totalRecaudado}</td>`;
    bodyHtml += `<td style="padding: 0.75rem; text-align: center;">${totalDeuda}</td>`;
    
    clases.forEach((clase) => {
        let pagosEnFecha = 0;
        let pendientesEnFecha = 0;
        cobrosEstudiantesFiltrados.forEach(user => {
            const historial = user.historialPagos || [];
            const pago = historial.find(p => p.fecha && p.fecha.split('T')[0] === clase.fechaStr && p.estado === 'pagado');
            const pendiente = historial.find(p => p.fecha && p.fecha.split('T')[0] === clase.fechaStr && p.estado === 'pendiente');
            if (pago) pagosEnFecha++;
            if (pendiente) pendientesEnFecha++;
        });
        bodyHtml += `<td style="padding: 0.25rem; text-align: center; font-size: 0.7rem;">${pagosEnFecha}${pendientesEnFecha > 0 ? `<span style="color: #f59e0b;">+${pendientesEnFecha}</span>` : ''}</td>`;
    });
    
    bodyHtml += '</tr>';
    bodyContainer.innerHTML = bodyHtml;
}

// Modal para editar pago desde tabla
function abrirModalPagoTabla(userId, fechaStr, claseNum) {
    const user = cobrosEstudiantesFiltrados.find(u => u.id === userId);
    if (!user) return;
    
    const historial = user.historialPagos || [];
    const pagoExistente = historial.find(p => p.fecha && p.fecha.split('T')[0] === fechaStr);
    const estadoActual = pagoExistente ? pagoExistente.estado : 'ninguno';
    const montoActual = pagoExistente ? pagoExistente.monto : (user.tipoPago === 'mensual' ? 70 : 16);
    
    const key = `${cobrosSedeActual}_${cobrosHorarioActual}`;
    const temas = temasClasesGuardados[key] || {};
    const tema = temas[fechaStr] || `Clase ${claseNum}`;
    
    const modalHtml = `
        <div id="pagoTablaModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 420px;">
                <div class="modal-header">
                    <h2><i class="fas fa-dollar-sign"></i> Clase ${claseNum}</h2>
                    <span class="close" onclick="document.getElementById('pagoTablaModal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.2rem;">
                            ${(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1.1rem;">${user.name}</h4>
                            <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">${fechaStr} - ${tema}</p>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">
                            <i class="fas fa-dollar-sign" style="color: #3b82f6;"></i> <strong>Monto a Cobrar:</strong>
                        </label>
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <button onclick="document.getElementById('modal-pago-monto').value = 16; document.getElementById('modal-pago-monto').focus();" 
                                    style="flex: 1; padding: 0.75rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s;"
                                    onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                                $16
                            </button>
                            <button onclick="document.getElementById('modal-pago-monto').value = 35; document.getElementById('modal-pago-monto').focus();" 
                                    style="flex: 1; padding: 0.75rem; background: #06b6d4; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s;"
                                    onmouseover="this.style.background='#0891b2'" onmouseout="this.style.background='#06b6d4'">
                                $35
                            </button>
                            <button onclick="document.getElementById('modal-pago-monto').value = 70; document.getElementById('modal-pago-monto').focus();" 
                                    style="flex: 1; padding: 0.75rem; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s;"
                                    onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'">
                                $70
                            </button>
                        </div>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 1.25rem; color: #3b82f6; font-weight: 600;">$</span>
                            <input type="number" id="modal-pago-monto" value="${montoActual}" min="0" step="0.01" placeholder="Escribe el monto"
                                   style="width: 100%; padding: 0.85rem 0.85rem 0.85rem 2.25rem; font-size: 1.1rem; font-weight: 600; border: 2px solid #3b82f6; border-radius: 10px; box-sizing: border-box; outline: none; transition: all 0.2s;"
                                   onfocus="this.style.borderColor='#2563eb'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                                   onblur="this.style.borderColor='#3b82f6'; this.style.boxShadow='none'">
                        </div>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #6b7280;">
                            <i class="fas fa-info-circle"></i> Usa los botones rápidos o escribe el monto directamente
                        </p>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button onclick="
                            event.preventDefault();
                            event.stopPropagation();
                            const input = document.getElementById('modal-pago-monto');
                            let monto = ${montoActual};
                            if (input && input.value && !isNaN(input.value)) {
                                monto = parseFloat(input.value);
                            }
                            console.log('Guardando pago:', '${userId}', '${fechaStr}', ${claseNum}, 'pagado', monto);
                            window.guardarPagoTabla('${userId}', '${fechaStr}', ${claseNum}, 'pagado', monto);
                        " 
                                style="padding: 1rem; background: ${estadoActual === 'pagado' ? '#059669' : '#10b981'}; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;"
                                onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-check-circle"></i> ${estadoActual === 'pagado' ? 'PAGADO ✓' : 'Marcar como Pagado'}
                        </button>
                        
                        <button onclick="
                            event.preventDefault();
                            event.stopPropagation();
                            const input = document.getElementById('modal-pago-monto');
                            let monto = ${montoActual};
                            if (input && input.value && !isNaN(input.value)) {
                                monto = parseFloat(input.value);
                            }
                            console.log('Guardando pendiente:', '${userId}', '${fechaStr}', ${claseNum}, 'pendiente', monto);
                            window.guardarPagoTabla('${userId}', '${fechaStr}', ${claseNum}, 'pendiente', monto);
                        " 
                                style="padding: 1rem; background: ${estadoActual === 'pendiente' ? '#b45309' : '#f59e0b'}; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;"
                                onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-clock"></i> ${estadoActual === 'pendiente' ? 'PENDIENTE ⏳' : 'Marcar como Pendiente'}
                        </button>
                        
                        ${pagoExistente ? `
                            <button onclick="
                                event.preventDefault();
                                event.stopPropagation();
                                console.log('Eliminando pago:', '${userId}', '${fechaStr}');
                                window.eliminarPagoTabla('${userId}', '${fechaStr}');
                            " 
                                    style="padding: 0.75rem; background: #dc2626; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;"
                                    onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                                <i class="fas fa-trash"></i> Eliminar Registro
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer" style="text-align: right; padding: 1rem; border-top: 1px solid #eee;">
                    <button onclick="document.getElementById('pagoTablaModal').remove()" style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Enfocar el input automáticamente y seleccionar el texto
    setTimeout(() => {
        const input = document.getElementById('modal-pago-monto');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}

// Guardar pago desde modal de tabla
async function guardarPagoTabla(userId, fechaStr, claseNum, estado, montoParam) {
    // Si montoParam es un número válido, usarlo. Sino, leer del input o usar default
    let monto = 16;
    
    if (montoParam && !isNaN(montoParam) && parseFloat(montoParam) > 0) {
        monto = parseFloat(montoParam);
    } else {
        const inputValue = document.getElementById('modal-pago-monto')?.value;
        if (inputValue && !isNaN(inputValue)) {
            monto = parseFloat(inputValue);
        }
    }
    
    const key = `${cobrosSedeActual}_${cobrosHorarioActual}`;
    const temas = temasClasesGuardados[key] || {};
    const tema = temas[fechaStr] || `Clase ${claseNum}`;
    
    try {
        const userRef = window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        let historialPagos = (userData.historialPagos || []).filter(p => !(p.fecha && p.fecha.split('T')[0] === fechaStr));
        
        historialPagos.push({
            concepto: tema,
            monto: monto,
            estado: estado,
            fecha: new Date(fechaStr + 'T12:00:00').toISOString(),
            registradoPor: 'admin',
            sede: cobrosSedeActual,
            horario: cobrosHorarioActual
        });
        
        await userRef.update({ historialPagos });
        
        // Actualizar en allApprovedUsers
        const userIndex = window.allApprovedUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            window.allApprovedUsers[userIndex].historialPagos = historialPagos;
        }
        
        // Actualizar en cobrosEstudiantesFiltrados para reflejar cambios inmediatamente
        const filteredUserIndex = cobrosEstudiantesFiltrados.findIndex(u => u.id === userId);
        if (filteredUserIndex !== -1) {
            cobrosEstudiantesFiltrados[filteredUserIndex].historialPagos = historialPagos;
        }
        
        if (typeof showNotification === 'function') showNotification(`Marcado como ${estado} por $${monto}`, 'success');
        document.getElementById('pagoTablaModal')?.remove();
        
        // Re-renderizar la vista activa
        if (vistaTablaActiva) {
            renderTabla40Clases();
        } else {
            renderCobrosEstudiantes();
        }
        actualizarResumenCobros();
    } catch (error) {
        console.error('Error guardando pago:', error);
        if (typeof showNotification === 'function') showNotification('Error al guardar', 'error');
    }
}

// Eliminar pago desde modal de tabla
async function eliminarPagoTabla(userId, fechaStr) {
    const confirmar = confirm('¿Eliminar este registro de pago?');
    if (!confirmar) return;
    
    try {
        const userRef = window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const historialPagos = (userData.historialPagos || []).filter(p => !(p.fecha && p.fecha.split('T')[0] === fechaStr));
        
        await userRef.update({ historialPagos });
        
        // Actualizar en allApprovedUsers
        const userIndex = window.allApprovedUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            window.allApprovedUsers[userIndex].historialPagos = historialPagos;
        }
        
        // Actualizar en cobrosEstudiantesFiltrados para reflejar cambios inmediatamente
        const filteredUserIndex = cobrosEstudiantesFiltrados.findIndex(u => u.id === userId);
        if (filteredUserIndex !== -1) {
            cobrosEstudiantesFiltrados[filteredUserIndex].historialPagos = historialPagos;
        }
        
        if (typeof showNotification === 'function') showNotification('Registro eliminado', 'success');
        document.getElementById('pagoTablaModal')?.remove();
        
        // Re-renderizar la vista activa
        if (vistaTablaActiva) {
            renderTabla40Clases();
        } else {
            renderCobrosEstudiantes();
        }
        actualizarResumenCobros();
    } catch (error) {
        console.error('Error eliminando:', error);
        if (typeof showNotification === 'function') showNotification('Error al eliminar', 'error');
    }
}

// Exportar tabla completa a Excel
function exportarTablaCompleta() {
    const clases = generarFechasClases(cobrosHorarioActual);
    const key = `${cobrosSedeActual}_${cobrosHorarioActual}`;
    const temas = temasClasesGuardados[key] || {};
    
    let headers = ['Estudiante', 'Tipo Pago', 'Total Pagado', 'Pendientes', 'Debe'];
    clases.forEach((clase, i) => {
        const tema = temas[clase.fechaStr] || '';
        headers.push(`${i + 1}: ${clase.fechaStr}${tema ? ' (' + tema + ')' : ''}`);
    });
    
    const rows = cobrosEstudiantesFiltrados.map(user => {
        const historial = user.historialPagos || [];
        const historialFechas = {};
        const historialPendientes = {};
        
        historial.forEach(p => {
            if (p.fecha) {
                const fechaKey = p.fecha.split('T')[0];
                if (p.estado === 'pagado') {
                    historialFechas[fechaKey] = p;
                } else if (p.estado === 'pendiente') {
                    historialPendientes[fechaKey] = p;
                }
            }
        });
        
        const cuotasPagadas = Object.keys(historialFechas).length;
        const cuotasPendientes = Object.keys(historialPendientes).length;
        const debe = clases.length - cuotasPagadas;
        const tipoPago = user.tipoPago || 'semanal';
        
        // Calcular total pagado sumando montos reales del historial
        const totalPagado = Object.values(historialFechas).reduce((sum, p) => sum + (p.monto || 0), 0);
        
        let row = [user.name || '', tipoPago, '$' + totalPagado, cuotasPendientes, debe];
        clases.forEach(clase => {
            if (historialFechas[clase.fechaStr]) {
                row.push('✓');
            } else if (historialPendientes[clase.fechaStr]) {
                row.push('⏳');
            } else {
                row.push('');
            }
        });
        
        return row;
    });
    
    let tsv = `Tabla de Cobros - ${cobrosSedeActual} - ${cobrosHorarioActual}\n\n`;
    tsv += headers.join('\t') + '\n';
    rows.forEach(row => {
        tsv += row.join('\t') + '\n';
    });
    
    const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tabla_40_clases_${cobrosSedeActual}_${cobrosHorarioActual.replace(/ /g, '_')}.xls`;
    link.click();
    
    if (typeof showNotification === 'function') showNotification('Tabla exportada a Excel', 'success');
}

// Cargar temas de clases desde Firestore
async function cargarTemasClases() {
    try {
        const doc = await window.window.db.collection('config').doc('temasClases').get();
        if (doc.exists) {
            temasClasesGuardados = doc.data() || {};
        }
    } catch (error) {
        console.log('No hay temas guardados aún');
    }
}

// Guardar tema de clase
async function guardarTemaClase(fechaStr, tema) {
    const key = `${cobrosSedeActual}_${cobrosHorarioActual}`;
    if (!temasClasesGuardados[key]) {
        temasClasesGuardados[key] = {};
    }
    temasClasesGuardados[key][fechaStr] = tema;
    
    try {
        await window.window.db.collection('config').doc('temasClases').set(temasClasesGuardados, { merge: true });
        if (typeof showNotification === 'function') showNotification('Tema guardado', 'success');
    } catch (error) {
        console.error('Error guardando tema:', error);
    }
}

// Modal para editar tema de clase
function editarTemaClase(fechaStr, claseNum) {
    const key = `${cobrosSedeActual}_${cobrosHorarioActual}`;
    const temas = temasClasesGuardados[key] || {};
    const temaActual = temas[fechaStr] || '';
    
    const modalHtml = `
        <div id="editTemaModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Editar Tema - Clase ${claseNum}</h2>
                    <span class="close" onclick="document.getElementById('editTemaModal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 1rem; color: #6b7280;">
                        <i class="fas fa-calendar"></i> ${fechaStr} | 
                        <i class="fas fa-map-marker-alt"></i> ${cobrosSedeActual} - ${cobrosHorarioActual}
                    </p>
                    <div class="form-group">
                        <label><strong>Tema de la clase:</strong></label>
                        <input type="text" id="input-tema-clase" value="${temaActual}" 
                               placeholder="Ej: Pan francés, Croissants, Decoración de pasteles..."
                               style="width: 100%; padding: 0.75rem; font-size: 1rem; border: 2px solid #e5e7eb; border-radius: 8px; box-sizing: border-box;">
                    </div>
                    <div style="margin-top: 1rem;">
                        <label style="font-weight: 500; color: #374151;">Temas sugeridos:</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                            ${['Pan francés', 'Croissants', 'Pan de chocolate', 'Galletas', 'Pasteles básicos', 'Decoración', 'Hojaldre', 'Empanadas', 'Bizcochos', 'Panes especiales'].map(t => 
                                `<button onclick="document.getElementById('input-tema-clase').value='${t}'" style="padding: 0.25rem 0.75rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 20px; font-size: 0.8rem; cursor: pointer;">${t}</button>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="text-align: right; padding: 1rem; border-top: 1px solid #eee;">
                    <button onclick="document.getElementById('editTemaModal').remove()" style="margin-right: 10px; padding: 0.75rem 1.25rem; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
                    <button onclick="cobrosModule.confirmarGuardarTema('${fechaStr}')" style="padding: 0.75rem 1.25rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer;"><i class="fas fa-save"></i> Guardar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('input-tema-clase')?.focus();
}

// Confirmar guardar tema
async function confirmarGuardarTema(fechaStr) {
    const tema = document.getElementById('input-tema-clase')?.value.trim();
    await guardarTemaClase(fechaStr, tema);
    document.getElementById('editTemaModal')?.remove();
    
    if (vistaTablaActiva) {
        renderTabla40Clases();
    }
}

// =================== ASISTENCIAS ===================

function cambiarSeccionCobros(seccion) {
    const tabCobros = document.getElementById('tab-seccion-cobros');
    const tabAsistencias = document.getElementById('tab-seccion-asistencias');
    const contenidoCobros = document.getElementById('seccion-cobros-content');
    const contenidoAsistencias = document.getElementById('seccion-asistencias-content');

    if (seccion === 'cobros') {
        tabCobros.style.background = '#10b981';
        tabCobros.style.color = 'white';
        tabCobros.style.borderBottom = '3px solid #059669';
        
        tabAsistencias.style.background = '#f3f4f6';
        tabAsistencias.style.color = '#374151';
        tabAsistencias.style.borderBottom = '3px solid transparent';
        
        contenidoCobros.style.display = 'block';
        contenidoAsistencias.style.display = 'none';
    } else if (seccion === 'asistencias') {
        tabCobros.style.background = '#f3f4f6';
        tabCobros.style.color = '#374151';
        tabCobros.style.borderBottom = '3px solid transparent';
        
        tabAsistencias.style.background = '#8b5cf6';
        tabAsistencias.style.color = 'white';
        tabAsistencias.style.borderBottom = '3px solid #7c3aed';
        
        contenidoCobros.style.display = 'none';
        contenidoAsistencias.style.display = 'block';
    }
}

async function cargarEstudiantesParaAsistencia() {
    const fecha = document.getElementById('asist-fecha')?.value;
    const sede = document.getElementById('asist-sede')?.value;
    const horario = document.getElementById('asist-horario')?.value;
    const programa = document.getElementById('asist-programa')?.value;

    if (!fecha || !sede || !horario || !programa) {
        showToast('Por favor completa todos los campos', 'error');
        return;
    }

    const lista = document.getElementById('asist-lista-estudiantes');
    lista.innerHTML = '<p style="text-align: center; color: #6b7280;">Cargando estudiantes...</p>';

    try {
        // Cargar estudiantes de Firestore
        const estudiantesQuery = query(
            collection(db, 'estudiantes'),
            where('programa', '==', programa),
            where('sede', '==', sede),
            where('horario', '==', horario)
        );

        const snapshot = await getDocs(estudiantesQuery);
        const estudiantes = [];

        snapshot.forEach(doc => {
            estudiantes.push({
                id: doc.id,
                email: doc.data().email,
                nombre: doc.data().nombre || 'Sin nombre',
                ...doc.data()
            });
        });

        // Actualizar contador
        document.getElementById('asist-total-esperados').textContent = estudiantes.length;

        // Renderizar lista de asistencia
        if (estudiantes.length === 0) {
            lista.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No hay estudiantes con estos criterios</p>';
            return;
        }

        lista.innerHTML = estudiantes.map(est => `
            <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="margin: 0; font-weight: 600; color: #0f2138;">${est.nombre}</p>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: #64748b;">${est.email}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <select class="asist-estado" data-email="${est.email}" style="padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 0.85rem; cursor: pointer;">
                        <option value="">-- Seleccionar --</option>
                        <option value="presente" style="color: #10b981;">Presente</option>
                        <option value="ausente" style="color: #ef4444;">Ausente</option>
                        <option value="justificada" style="color: #f59e0b;">Justificada</option>
                    </select>
                    <input type="text" class="asist-observaciones" data-email="${est.email}" placeholder="Observaciones" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.85rem; width: 150px;">
                </div>
            </div>
        `).join('');

        // Agregar listeners para actualizar contadores
        document.querySelectorAll('.asist-estado').forEach(select => {
            select.addEventListener('change', actualizarContadoresAsistencia);
        });

    } catch (error) {
        console.error('Error cargando estudiantes:', error);
        lista.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 2rem;">Error al cargar estudiantes: ${error.message}</p>`;
        showToast('Error al cargar estudiantes', 'error');
    }
}

function actualizarContadoresAsistencia() {
    const presentes = document.querySelectorAll('.asist-estado[value="presente"]').length;
    const ausentes = document.querySelectorAll('.asist-estado[value="ausente"]').length;
    const justificadas = document.querySelectorAll('.asist-estado[value="justificada"]').length;

    document.getElementById('asist-presentes').textContent = presentes;
    document.getElementById('asist-ausentes').textContent = ausentes;
    document.getElementById('asist-justificadas').textContent = justificadas;
}

function marcarTodosPresentes() {
    document.querySelectorAll('.asist-estado').forEach(select => {
        select.value = 'presente';
    });
    actualizarContadoresAsistencia();
}

async function guardarAsistencias() {
    const fecha = document.getElementById('asist-fecha')?.value;
    const sede = document.getElementById('asist-sede')?.value;
    const horario = document.getElementById('asist-horario')?.value;
    const programa = document.getElementById('asist-programa')?.value;
    const tema = document.getElementById('asist-tema')?.value;

    if (!fecha || !sede || !horario || !programa) {
        showToast('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    const selects = document.querySelectorAll('.asist-estado');
    if (selects.length === 0) {
        showToast('No hay estudiantes cargados', 'error');
        return;
    }

    try {
        showToast('Guardando asistencias...', 'info');

        // Preparar datos a guardar
        const asistenciasGuardar = [];
        selects.forEach(select => {
            const email = select.getAttribute('data-email');
            const estado = select.value;
            const observaciones = document.querySelector(`.asist-observaciones[data-email="${email}"]`)?.value || '';

            if (estado) {
                asistenciasGuardar.push({
                    estudianteEmail: email,
                    fecha: new Date(fecha),
                    sede: sede,
                    horario: horario,
                    programa: programa,
                    claseNombre: tema || 'Clase',
                    estado: estado,
                    observaciones: observaciones,
                    registradoEn: new Date(),
                    registradoPor: admin.auth().currentUser?.email || 'admin'
                });
            }
        });

        // Guardar en Firestore
        const batch = writeBatch(db);
        asistenciasGuardar.forEach(asistencia => {
            const docRef = doc(collection(db, 'asistencias'));
            batch.set(docRef, asistencia);
        });

        await batch.commit();

        showToast('Asistencias guardadas correctamente', 'success');

        // Limpiar formulario
        document.getElementById('asist-fecha').value = '';
        document.getElementById('asist-sede').value = '';
        document.getElementById('asist-horario').value = '';
        document.getElementById('asist-programa').value = '';
        document.getElementById('asist-tema').value = '';
        document.getElementById('asist-lista-estudiantes').innerHTML = '<p style="text-align: center; color: #6b7280;">Selecciona fecha, sede, horario y programa para cargar estudiantes</p>';
        document.getElementById('asist-total-esperados').textContent = '0';
        document.getElementById('asist-presentes').textContent = '0';
        document.getElementById('asist-ausentes').textContent = '0';
        document.getElementById('asist-justificadas').textContent = '0';

    } catch (error) {
        console.error('Error guardando asistencias:', error);
        showToast('Error al guardar asistencias', 'error');
    }
}

// Exponer funciones globalmente para acceso desde HTML
window.initCobrosSection = initCobrosSection;
window.cambiarSedeCobros = cambiarSedeCobros;
window.cambiarHorarioCobros = cambiarHorarioCobros;
window.cambiarProgramaCobros = cambiarProgramaCobros;
window.cargarEstudiantesCobros = cargarEstudiantesCobros;
window.cobrarIndividual = cobrarIndividual;
window.cobrarMonto = cobrarMonto;
window.abrirModalMontoPersonalizado = abrirModalMontoPersonalizado;
window.cobrarSeleccionados = cobrarSeleccionados;
window.marcarPendiente = marcarPendiente;
window.quitarPago = quitarPagoFecha;
window.quitarPagoFecha = quitarPagoFecha; // Alias para compatibilidad
window.editarTipoPagoUsuario = editarTipoPagoUsuario;
window.guardarMontoPago = guardarMontoPago;
window.renderTabla40Clases = renderTabla40Clases;
window.toggleCobroSeleccion = toggleCobroSeleccion;
window.abrirModalPagoTabla = abrirModalPagoTabla;
window.guardarPagoTabla = guardarPagoTabla;
window.cambiarSeccionCobros = cambiarSeccionCobros;
window.cargarEstudiantesParaAsistencia = cargarEstudiantesParaAsistencia;
window.marcarTodosPresentes = marcarTodosPresentes;
window.guardarAsistencias = guardarAsistencias;
window.eliminarPagoTabla = eliminarPagoTabla;
window.verHistorialCobrosUsuario = verHistorialCobrosUsuario;
window.cargarClaseEspecifica = cargarClaseEspecifica;
window.confirmarGuardarTema = confirmarGuardarTema;
window.editarTemaClase = editarTemaClase;
window.guardarTemaClase = guardarTemaClase;
window.toggleVistaTabla = toggleVistaTabla;

// Exportar el módulo
const cobrosModule = {
    // Estado
    getSede: () => cobrosSedeActual,
    getHorario: () => cobrosHorarioActual,
    getPrograma: () => cobrosProgramaActual,
    getEstudiantes: () => cobrosEstudiantesFiltrados,
    getSeleccionados: () => cobrosSeleccionados,
    
    // Inicialización
    init: initCobrosSection,
    
    // Cambios de filtro
    cambiarSede: cambiarSedeCobros,
    cambiarHorario: cambiarHorarioCobros,
    cambiarPrograma: cambiarProgramaCobros,
    
    // Carga de datos
    cargarEstudiantes: cargarEstudiantesCobros,
    cargarTemas: cargarTemasClases,
    
    // Renderizado
    renderLista: renderCobrosEstudiantes,
    renderTabla: renderTabla40Clases,
    
    // Acciones de cobro
    cobrarIndividual: cobrarIndividual,
    cobrarSeleccionados: cobrarSeleccionados,
    marcarPendiente: marcarPendiente,
    quitarPagoFecha: quitarPagoFecha,
    
    // Tipo de pago
    editarTipoPagoUsuario: editarTipoPagoUsuario,
    guardarMontoPago: guardarMontoPago,
    
    // Selección
    toggleCobroSeleccion: toggleCobroSeleccion,
    seleccionarTodos: seleccionarTodosCobros,
    
    // Historial
    verHistorialCobrosUsuario: verHistorialCobrosUsuario,
    cargarHistorial: cargarClasesHistorial,
    cargarClaseEspecifica: cargarClaseEspecifica,
    
    // Temas
    obtenerTema: obtenerTemaClase,
    editarTema: editarTemaClase,
    guardarTema: guardarTemaClase,
    confirmarGuardarTema: confirmarGuardarTema,
    
    // Utilidades
    toggleVista: toggleVistaTabla,
    exportarDia: exportarCobrosDelDia,
    exportarTabla: exportarTablaCompleta,
    
    // Pagos desde tabla
    abrirModalPagoTabla: abrirModalPagoTabla,
    guardarPagoTabla: guardarPagoTabla,
    eliminarPagoTabla: eliminarPagoTabla,
    
    // Getters para acceso externo
    temas: () => temasClasesGuardados
};

// Exponer módulo globalmente
window.cobrosModule = cobrosModule;

// Exportar como módulo ES6
export default cobrosModule;

