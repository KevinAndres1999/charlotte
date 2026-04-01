// ============================================
// MÓDULO DE VIDEOCONFERENCIA PARA ESTUDIANTES
// Solo permite ver y unirse a salas
// ============================================

export default {
  init
};

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
    }
  }
  
  console.log('✅ Módulo de videoconferencia para estudiantes inicializado');
}

// ============================================
// CARGAR Y MOSTRAR SALAS (SOLO ACTIVAS)
// ============================================

async function loadRooms() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('❌ No hay token de autenticación');
    showMessage('No estás autenticado. Por favor, cierra sesión e inicia sesión nuevamente.', 'error');
    return;
  }
  
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';
  console.log('🔧 Cargando salas desde:', apiBase);

  try {
    const response = await fetch(`${apiBase}/rooms`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📥 Respuesta del servidor:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Error del servidor:', errorData);
      throw new Error(`Error cargando salas: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Salas recibidas:', data);
    // Filtrar solo salas activas para estudiantes
    const activeRooms = (data.rooms || []).filter(room => room.isActive);
    displayRooms(activeRooms);
  } catch (err) {
    console.error('❌ Error cargando salas:', err);
    showMessage(`Error cargando salas: ${err.message}`, 'error');
  }
}

function displayRooms(rooms) {
  const container = document.getElementById('studentRoomsContainer');
  if (!container) return;

  if (rooms.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 40px;">
        <i class="fas fa-video fa-3x" style="color: #cbd5e1; margin-bottom: 20px;"></i>
        <p style="color: #64748b; font-size: 1.1rem;">No hay salas de videoconferencia disponibles en este momento</p>
        <p style="color: #94a3b8; font-size: 0.9rem;">Tu instructor creará salas cuando haya clases programadas</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="section-header" style="margin-bottom: 20px;">
      <h3 style="color: #1e3a8a;">Salas Disponibles</h3>
      <p style="color: #64748b;">Haz clic en "Unirse" para entrar a una videoconferencia</p>
    </div>
    <div class="rooms-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
  `;

  rooms.forEach(room => {
    html += `
      <div class="room-card" style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='';this.style.boxShadow='';">
        <div class="room-header" style="margin-bottom: 15px;">
          <h4 style="color: #1e3a8a; margin-bottom: 5px; font-size: 1.2rem;">
            <i class="fas fa-video" style="color: #3b82f6;"></i> ${escapeHtml(room.name)}
          </h4>
          <span class="status-badge" style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
            <i class="fas fa-circle" style="font-size: 0.5rem;"></i> Activa
          </span>
        </div>
        <div class="room-body" style="margin-bottom: 15px;">
          <p style="color: #64748b; margin-bottom: 15px;">${escapeHtml(room.description) || 'Sin descripción'}</p>
          <div class="room-stats" style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div class="stat" style="display: flex; align-items: center; gap: 5px; color: #64748b; font-size: 0.9rem;">
              <i class="fas fa-users"></i>
              <span>${room.currentParticipants || 0} / ${room.maxParticipants}</span>
            </div>
            <div class="stat" style="display: flex; align-items: center; gap: 5px; color: #64748b; font-size: 0.9rem;">
              <i class="fas fa-calendar"></i>
              <span>${formatDate(room.createdAt)}</span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="window.studentVideoRooms.joinRoom('${room.roomId}')" style="width: 100%; padding: 12px; border-radius: 8px; font-weight: 600; background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; border: none; cursor: pointer;">
          <i class="fas fa-sign-in-alt"></i> Unirse a la Sala
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
  // Abrir la sala en una nueva ventana
  const roomUrl = `${window.location.origin}/videoconferencia.html?room=${roomId}`;
  window.open(roomUrl, '_blank', 'width=1200,height=800');
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
