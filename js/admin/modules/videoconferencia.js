// ============================================
// MÓDULO DE GESTIÓN DE SALAS DE VIDEOCONFERENCIA
// Para el panel de administración
// ============================================

export default {
  init
};

export async function init() {
  console.log('🎥 Inicializando módulo de videoconferencia...');
  
  // Exponer funciones globalmente
  window.videoRooms = {
    loadRooms,
    showCreateModal,
    editRoom,
    viewRoom,
    deleteRoom,
    toggleActive,
    copyLink
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
  
  console.log('✅ Módulo de videoconferencia inicializado');
}

// ============================================
// CARGAR Y MOSTRAR SALAS
// ============================================

async function loadRooms() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No hay token de autenticación');
    showError('No estás autenticado');
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
    displayRooms(data.rooms || []);
  } catch (err) {
    console.error('❌ Error cargando salas:', err);
    showError(`Error cargando salas: ${err.message}`);
  }
}

function displayRooms(rooms) {
  const container = document.getElementById('roomsContainer');
  if (!container) return;

  if (rooms.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-video fa-3x"></i>
        <p>No hay salas de videoconferencia</p>
        <button class="btn btn-primary" onclick="videoRooms.showCreateModal()">
          <i class="fas fa-plus"></i> Crear Primera Sala
        </button>
      </div>
    `;
    return;
  }

  let html = `
    <div class="section-header">
      <h3>Salas de Videoconferencia</h3>
      <button class="btn btn-primary" onclick="videoRooms.showCreateModal()">
        <i class="fas fa-plus"></i> Nueva Sala
      </button>
    </div>
    <div class="rooms-grid">
  `;

  rooms.forEach(room => {
    const statusClass = room.isActive ? 'active' : 'inactive';
    const statusText = room.isActive ? 'Activa' : 'Inactiva';
    
    html += `
      <div class="room-card ${statusClass}">
        <div class="room-header">
          <h4>${escapeHtml(room.name)}</h4>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="room-body">
          <p class="room-description">${escapeHtml(room.description) || 'Sin descripción'}</p>
          <div class="room-stats">
            <div class="stat">
              <i class="fas fa-users"></i>
              <span>${room.currentParticipants || 0} / ${room.maxParticipants}</span>
            </div>
            <div class="stat">
              <i class="fas fa-calendar"></i>
              <span>${formatDate(room.createdAt)}</span>
            </div>
          </div>
          <div class="room-link">
            <input type="text" readonly value="${window.location.origin}/videoconferencia.html?room=${room.roomId}" 
                   id="link-${room.roomId}" class="room-link-input">
            <button class="btn btn-sm" onclick="videoRooms.copyLink('${room.roomId}')" title="Copiar enlace">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        <div class="room-actions">
          <button class="btn btn-sm btn-info" onclick="videoRooms.viewRoom('${room.roomId}')">
            <i class="fas fa-eye"></i> Ver
          </button>
          <button class="btn btn-sm btn-warning" onclick="videoRooms.editRoom('${room.roomId}')">
            <i class="fas fa-edit"></i> Editar
          </button>
          ${room.isActive ? 
            `<button class="btn btn-sm btn-secondary" onclick="videoRooms.toggleActive('${room.roomId}', false)">
              <i class="fas fa-pause"></i> Desactivar
            </button>` :
            `<button class="btn btn-sm btn-success" onclick="videoRooms.toggleActive('${room.roomId}', true)">
              <i class="fas fa-play"></i> Activar
            </button>`
          }
          <button class="btn btn-sm btn-danger" onclick="videoRooms.deleteRoom('${room.roomId}')">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ============================================
// CREAR SALA
// ============================================

function showCreateModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Crear Nueva Sala de Videoconferencia</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form id="createRoomForm">
          <div class="form-group">
            <label for="roomName">Nombre de la Sala *</label>
            <input type="text" id="roomName" name="name" required 
                   placeholder="ej. Clase de Panadería - Semana 1">
          </div>
          <div class="form-group">
            <label for="roomDescription">Descripción</label>
            <textarea id="roomDescription" name="description" rows="3"
                      placeholder="Descripción de la sala o propósito"></textarea>
          </div>
          <div class="form-group">
            <label for="maxParticipants">Máximo de Participantes</label>
            <input type="number" id="maxParticipants" name="maxParticipants" 
                   min="2" max="100" value="50">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-plus"></i> Crear Sala
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('createRoomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createRoom(new FormData(e.target));
    modal.remove();
  });
}

async function createRoom(formData) {
  const token = localStorage.getItem('token');
  if (!token) {
    showError('No hay token de autenticación');
    return;
  }
  
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';
  console.log('🔧 Creando sala con API:', apiBase);

  const data = {
    name: formData.get('name'),
    description: formData.get('description'),
    maxParticipants: parseInt(formData.get('maxParticipants'))
  };

  console.log('📤 Enviando datos:', data);

  try {
    const response = await fetch(`${apiBase}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('📥 Respuesta del servidor:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error del servidor:', errorData);
      throw new Error(`Error creando sala: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log('✅ Sala creada:', result);
    
    showSuccess('Sala creada exitosamente');
    loadRooms();
  } catch (err) {
    console.error('❌ Error creando sala:', err);
    showError(`Error creando sala: ${err.message}`);
  }
}

// ============================================
// EDITAR SALA
// ============================================

async function editRoom(roomId) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';

  try {
    const response = await fetch(`${apiBase}/rooms/${roomId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error cargando sala');
    }

    const { room } = await response.json();
    showEditModal(room);
  } catch (err) {
    console.error('Error cargando sala:', err);
    showError('Error cargando información de la sala');
  }
}

function showEditModal(room) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Editar Sala de Videoconferencia</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form id="editRoomForm">
          <input type="hidden" name="roomId" value="${room.roomId}">
          <div class="form-group">
            <label for="editRoomName">Nombre de la Sala *</label>
            <input type="text" id="editRoomName" name="name" required 
                   value="${escapeHtml(room.name)}">
          </div>
          <div class="form-group">
            <label for="editRoomDescription">Descripción</label>
            <textarea id="editRoomDescription" name="description" rows="3">${escapeHtml(room.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label for="editMaxParticipants">Máximo de Participantes</label>
            <input type="number" id="editMaxParticipants" name="maxParticipants" 
                   min="2" max="100" value="${room.maxParticipants}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('editRoomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateRoom(new FormData(e.target));
    modal.remove();
  });
}

async function updateRoom(formData) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';

  const roomId = formData.get('roomId');
  const data = {
    name: formData.get('name'),
    description: formData.get('description'),
    maxParticipants: parseInt(formData.get('maxParticipants'))
  };

  try {
    const response = await fetch(`${apiBase}/rooms/${roomId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Error actualizando sala');
    }

    showSuccess('Sala actualizada exitosamente');
    loadRooms();
  } catch (err) {
    console.error('Error actualizando sala:', err);
    showError('Error actualizando sala');
  }
}

// ============================================
// ACTIVAR/DESACTIVAR SALA
// ============================================

async function toggleActive(roomId, isActive) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';

  const action = isActive ? 'activar' : 'desactivar';
  if (!confirm(`¿Estás seguro de ${action} esta sala?`)) {
    return;
  }

  try {
    const response = await fetch(`${apiBase}/rooms/${roomId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive })
    });

    if (!response.ok) {
      throw new Error('Error actualizando estado de sala');
    }

    showSuccess(`Sala ${isActive ? 'activada' : 'desactivada'} exitosamente`);
    loadRooms();
  } catch (err) {
    console.error('Error actualizando estado:', err);
    showError('Error actualizando estado de la sala');
  }
}

// ============================================
// ELIMINAR SALA
// ============================================

async function deleteRoom(roomId) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';

  if (!confirm('¿Estás seguro de eliminar esta sala? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    const response = await fetch(`${apiBase}/rooms/${roomId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error eliminando sala');
    }

    showSuccess('Sala eliminada exitosamente');
    loadRooms();
  } catch (err) {
    console.error('Error eliminando sala:', err);
    showError('Error eliminando sala');
  }
}

// ============================================
// VER DETALLES DE SALA
// ============================================

async function viewRoom(roomId) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';

  try {
    const response = await fetch(`${apiBase}/rooms/${roomId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error cargando sala');
    }

    const { room, participants } = await response.json();
    showRoomDetails(room, participants);
  } catch (err) {
    console.error('Error cargando sala:', err);
    showError('Error cargando detalles de la sala');
  }
}

function showRoomDetails(room, participants) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  let participantsList = '';
  if (participants && participants.length > 0) {
    participantsList = participants.map(p => `
      <div class="participant-item">
        <i class="fas fa-user"></i>
        <span>${escapeHtml(p.userName)}</span>
      </div>
    `).join('');
  } else {
    participantsList = '<p class="text-muted">No hay participantes actualmente</p>';
  }

  modal.innerHTML = `
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h3>Detalles de la Sala</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="room-details">
          <div class="detail-group">
            <label>Nombre:</label>
            <p>${escapeHtml(room.name)}</p>
          </div>
          <div class="detail-group">
            <label>Descripción:</label>
            <p>${escapeHtml(room.description) || 'Sin descripción'}</p>
          </div>
          <div class="detail-group">
            <label>Estado:</label>
            <p><span class="status-badge ${room.isActive ? 'active' : 'inactive'}">
              ${room.isActive ? 'Activa' : 'Inactiva'}
            </span></p>
          </div>
          <div class="detail-group">
            <label>Capacidad:</label>
            <p>${room.maxParticipants} participantes</p>
          </div>
          <div class="detail-group">
            <label>Creada:</label>
            <p>${formatDate(room.createdAt)}</p>
          </div>
          <div class="detail-group">
            <label>Enlace de Acceso:</label>
            <div class="room-link">
              <input type="text" readonly value="${window.location.origin}/videoconferencia.html?room=${room.roomId}" 
                     id="modal-link-${room.roomId}" class="room-link-input">
              <button class="btn btn-sm" onclick="videoRooms.copyLink('${room.roomId}', 'modal-link-${room.roomId}')">
                <i class="fas fa-copy"></i> Copiar
              </button>
            </div>
          </div>
          <div class="detail-group">
            <label>Participantes Actuales (${participants.length}):</label>
            <div class="participants-list">
              ${participantsList}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
          Cerrar
        </button>
        <button class="btn btn-primary" onclick="window.open('/videoconferencia.html?room=${room.roomId}', '_blank')">
          <i class="fas fa-video"></i> Unirse a la Sala
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ============================================
// UTILIDADES
// ============================================

function copyLink(roomId, inputId = null) {
  const input = document.getElementById(inputId || `link-${roomId}`);
  if (input) {
    input.select();
    document.execCommand('copy');
    showSuccess('Enlace copiado al portapapeles');
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showSuccess(message) {
  // Implementar según el sistema de notificaciones del admin
  alert(message);
}

function showError(message) {
  // Implementar según el sistema de notificaciones del admin
  alert(message);
}

// ============================================
// FIN DEL MÓDULO
// Funciones exportadas globalmente en init()
// ============================================
