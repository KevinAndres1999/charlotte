// ============================================
// MÓDULO DE VIDEOCONFERENCIA PARA ESTUDIANTES
// Solo permite ver y unirse a salas
// ============================================

export default {
  init
};

let autoRefreshInterval = null;

export async function init() {
  console.log('🎥 Inicializando módulo de videoconferencia para estudiantes...');
  
  // Exponer funciones globalmente
  window.studentVideoRooms = {
    loadRooms,
    joinRoom
  };
  
  // Inicializar cuando se muestra la sección
  const videoSection = document.getElementById('videoconferencia');
  if (videoSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('active')) {
          console.log('✅ Sección de videoconferencia activada, cargando salas...');
          loadRooms();
          startAutoRefresh();
        } else {
          stopAutoRefresh();
        }
      });
    });
    
    observer.observe(videoSection, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Cargar si ya está activo
    if (videoSection.classList.contains('active')) {
      console.log('✅ Sección ya activa, cargando salas...');
      loadRooms();
      startAutoRefresh();
    }
  }
  
  console.log('✅ Módulo de videoconferencia para estudiantes inicializado');
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshInterval = setInterval(() => {
    loadRooms(true); // silent refresh
  }, 30000); // cada 30 segundos
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// ============================================
// CARGAR Y MOSTRAR SALAS (SOLO ACTIVAS)
// ============================================

async function loadRooms(silent = false) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('❌ No hay token de autenticación');
    if (!silent) showMessage('No estás autenticado. Por favor, cierra sesión e inicia sesión nuevamente.', 'error');
    return;
  }
  
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';
  const container = document.getElementById('studentRoomsContainer');

  if (!silent && container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #64748b;">
        <i class="fas fa-spinner fa-spin fa-2x" style="color: #3b82f6; margin-bottom: 15px;"></i>
        <p>Cargando salas disponibles...</p>
      </div>
    `;
  }

  try {
    const response = await fetch(`${apiBase}/rooms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Error cargando salas: ${response.status}`);

    const data = await response.json();
    const activeRooms = (data.rooms || []).filter(room => room.isActive);
    displayRooms(activeRooms);
  } catch (err) {
    console.error('❌ Error cargando salas:', err);
    if (!silent) showMessage(`Error cargando salas: ${err.message}`, 'error');
  }
}

function displayRooms(rooms) {
  const container = document.getElementById('studentRoomsContainer');
  if (!container) return;

  if (rooms.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 4rem; margin-bottom: 15px;">📹</div>
        <p style="color: #64748b; font-size: 1.1rem; margin-bottom: 8px; font-weight: 600;">No hay clases en vivo ahora</p>
        <p style="color: #94a3b8; font-size: 0.9rem;">Las salas aparecerán aquí cuando tu instructor inicie una clase</p>
        <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 10px;"><i class="fas fa-sync-alt"></i> Se actualiza automáticamente cada 30 segundos</p>
      </div>
    `;
    return;
  }

  let html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">`;

  rooms.forEach(room => {
    const participants = room.currentParticipants || 0;
    const isFull = participants >= room.maxParticipants;
    
    html += `
      <div style="background: white; border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); border: 2px solid #e2e8f0; transition: all 0.3s ease;"
           onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='#3b82f6'; this.style.boxShadow='0 8px 20px rgba(59,130,246,0.15)';"
           onmouseout="this.style.transform=''; this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 2px 10px rgba(0,0,0,0.08)';">
        
        <!-- Encabezado -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="flex: 1; min-width: 0;">
            <h4 style="color: #1e3a8a; font-size: 1.1rem; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <i class="fas fa-broadcast-tower" style="color: #3b82f6; font-size: 0.9rem;"></i> ${escapeHtml(room.name)}
            </h4>
          </div>
          <span style="background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; margin-left: 8px;">
            ● EN VIVO
          </span>
        </div>
        
        <!-- Descripción -->
        <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 14px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(room.description) || 'Sin descripción'}
        </p>
        
        <!-- Estadísticas -->
        <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <span style="display: flex; align-items: center; gap: 5px; color: ${isFull ? '#ef4444' : '#64748b'}; font-size: 0.85rem;">
            <i class="fas fa-users"></i> ${participants} / ${room.maxParticipants}
            ${isFull ? '<span style="color:#ef4444;font-size:0.75rem;">(Llena)</span>' : ''}
          </span>
          <span style="display: flex; align-items: center; gap: 5px; color: #64748b; font-size: 0.85rem;">
            <i class="fas fa-clock"></i> ${formatDate(room.createdAt)}
          </span>
        </div>
        
        <!-- Botón -->
        <button 
          onclick="window.studentVideoRooms.joinRoom('${room.roomId}')"
          ${isFull ? 'disabled' : ''}
          style="width: 100%; padding: 12px; border-radius: 10px; font-weight: 600; 
                 background: ${isFull ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6, #1e40af)'};
                 color: ${isFull ? '#94a3b8' : 'white'}; 
                 border: none; cursor: ${isFull ? 'not-allowed' : 'pointer'}; 
                 font-size: 0.95rem; transition: opacity 0.2s;"
          ${!isFull ? 'onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'"' : ''}>
          <i class="fas ${isFull ? 'fa-ban' : 'fa-sign-in-alt'}"></i>
          ${isFull ? 'Sala Llena' : 'Unirse a la Clase'}
        </button>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ============================================
// UNIRSE A SALA
// ============================================

function joinRoom(roomId) {
  console.log('📹 Uniendo a sala:', roomId);
  const roomUrl = `${window.location.origin}/videoconferencia.html?room=${roomId}`;
  
  // En móvil, abrir en la misma ventana para mejor experiencia
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = roomUrl;
  } else {
    window.open(roomUrl, '_blank', 'width=1200,height=800');
  }
}

// ============================================
// UTILIDADES
// ============================================

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-ES');
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function showMessage(message, type = 'info') {
  // Implementación básica de mensajes
  const bgColors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6'
  };
  
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColors[type] || bgColors.info};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  div.textContent = message;
  document.body.appendChild(div);
  
  setTimeout(() => {
    div.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => div.remove(), 300);
  }, 3000);
}
