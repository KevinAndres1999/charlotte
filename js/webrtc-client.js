// ============================================
// CLIENTE WEBRTC PARA VIDEOCONFERENCIAS
// ============================================

// Configuración
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

// Estado global
let socket = null;
let localStream = null;
let screenStream = null;
let currentRoomId = null;
let currentUserName = null;
let currentUserId = null;
let peerConnections = new Map(); // socketId -> RTCPeerConnection
let isAudioMuted = false;
let isVideoOff = false;
let isScreenSharing = false;
let currentPanel = null;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Decodificar token para obtener información del usuario
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentUserName = payload.name || 'Usuario';
    currentUserId = payload.email;
  } catch (err) {
    console.error('Error decodificando token:', err);
    currentUserName = 'Usuario';
  }

  // Cargar lista de salas
  await loadRooms();

  // Inicializar Socket.io
  initializeSocket();
});

// ============================================
// GESTIÓN DE SALAS
// ============================================

async function loadRooms() {
  const token = localStorage.getItem('token');
  const roomsList = document.getElementById('roomsList');
  const errorContainer = document.getElementById('errorContainer');
  const apiBase = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : '/api';

  try {
    const response = await fetch(`${apiBase}/rooms`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error cargando salas');
    }

    const data = await response.json();
    
    if (data.rooms.length === 0) {
      roomsList.innerHTML = '<p style="text-align: center; color: #666;">No hay salas disponibles</p>';
      return;
    }

    roomsList.innerHTML = data.rooms.map(room => `
      <div class="room-card" onclick="joinRoom('${room.roomId}', '${escapeHtml(room.name)}')">
        <h3>${escapeHtml(room.name)}</h3>
        <p>${escapeHtml(room.description) || 'Sin descripción'}</p>
        <div class="participants">
          <i class="fas fa-users"></i> 
          ${room.currentParticipants} / ${room.maxParticipants} participantes
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error cargando salas:', err);
    errorContainer.innerHTML = `
      <div class="error-message">
        Error cargando salas. Por favor, intenta de nuevo.
      </div>
    `;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// SOCKET.IO
// ============================================

function initializeSocket() {
  const backendURL = window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : window.location.origin;
  
  socket = io(backendURL, {
    auth: {
      token: localStorage.getItem('token')
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('Conectado al servidor Socket.io');
  });

  socket.on('disconnect', () => {
    console.log('Desconectado del servidor Socket.io');
  });

  socket.on('room-joined', async ({ roomId, participants }) => {
    console.log('Unido a la sala:', roomId);
    console.log('Participantes existentes:', participants);

    // Mostrar interfaz de videoconferencia
    document.getElementById('roomSelection').style.display = 'none';
    document.getElementById('videoConference').style.display = 'flex';

    // Iniciar stream local
    await startLocalStream();

    // Conectar con participantes existentes
    for (const participant of participants) {
      await createPeerConnection(participant.socketId, true);
    }
  });

  socket.on('user-joined', async ({ socketId, userName }) => {
    console.log('Nuevo usuario:', userName, socketId);
    await createPeerConnection(socketId, false);
    updateParticipantCount();
  });

  socket.on('user-left', ({ socketId, userName }) => {
    console.log('Usuario salió:', userName, socketId);
    removePeerConnection(socketId);
    updateParticipantCount();
  });

  socket.on('offer', async ({ from, offer }) => {
    console.log('Oferta recibida de:', from);
    const pc = peerConnections.get(from);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    }
  });

  socket.on('answer', async ({ from, answer }) => {
    console.log('Respuesta recibida de:', from);
    const pc = peerConnections.get(from);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  });

  socket.on('ice-candidate', async ({ from, candidate }) => {
    const pc = peerConnections.get(from);
    if (pc && candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

  socket.on('chat-message', ({ userName, message, timestamp }) => {
    addChatMessage(userName, message, timestamp);
  });

  socket.on('user-media-state', ({ socketId, audio, video }) => {
    updateUserMediaState(socketId, audio, video);
  });

  socket.on('room-closed', ({ message }) => {
    alert(message);
    leaveRoom();
  });

  socket.on('error', ({ message }) => {
    alert('Error: ' + message);
  });
}

// ============================================
// WEBRTC - PEER CONNECTIONS
// ============================================

async function createPeerConnection(socketId, isInitiator) {
  console.log('Creando conexión peer:', socketId, 'Iniciador:', isInitiator);

  const pc = new RTCPeerConnection(ICE_SERVERS);
  peerConnections.set(socketId, pc);

  // Agregar tracks locales
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  // Manejar ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        to: socketId,
        candidate: event.candidate
      });
    }
  };

  // Manejar tracks remotos
  pc.ontrack = (event) => {
    console.log('Track remoto recibido de:', socketId);
    const remoteStream = event.streams[0];
    addRemoteVideo(socketId, remoteStream);
  };

  // Manejar cambios de conexión
  pc.onconnectionstatechange = () => {
    console.log('Estado de conexión con', socketId, ':', pc.connectionState);
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      removePeerConnection(socketId);
    }
  };

  // Si somos iniciadores, crear oferta
  if (isInitiator) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: socketId, offer });
    } catch (err) {
      console.error('Error creando oferta:', err);
    }
  }

  return pc;
}

function removePeerConnection(socketId) {
  const pc = peerConnections.get(socketId);
  if (pc) {
    pc.close();
    peerConnections.delete(socketId);
  }
  removeRemoteVideo(socketId);
}

// ============================================
// STREAM LOCAL
// ============================================

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // Agregar video local a la interfaz
    addLocalVideo(localStream);

    // Agregar tracks a todas las conexiones existentes
    peerConnections.forEach(pc => {
      localStream.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, localStream);
        }
      });
    });

  } catch (err) {
    console.error('Error accediendo a medios:', err);
    alert('No se pudo acceder a la cámara o micrófono. Por favor, verifica los permisos.');
  }
}

// ============================================
// UI - VIDEOS
// ============================================

function addLocalVideo(stream) {
  const videosGrid = document.getElementById('videosGrid');
  
  const wrapper = document.createElement('div');
  wrapper.id = 'local-video-wrapper';
  wrapper.className = 'video-wrapper local-video';
  
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.muted = true; // Siempre silenciar el video local
  video.playsInline = true;
  
  const label = document.createElement('div');
  label.className = 'video-label';
  label.innerHTML = `
    <i class="fas fa-microphone" id="local-audio-icon"></i>
    <span>${currentUserName} (Tú)</span>
  `;
  
  wrapper.appendChild(video);
  wrapper.appendChild(label);
  videosGrid.insertBefore(wrapper, videosGrid.firstChild);
}

function addRemoteVideo(socketId, stream) {
  const videosGrid = document.getElementById('videosGrid');
  
  // Verificar si ya existe
  let wrapper = document.getElementById(`video-${socketId}`);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = `video-${socketId}`;
    wrapper.className = 'video-wrapper';
    
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    const label = document.createElement('div');
    label.className = 'video-label';
    label.innerHTML = `
      <i class="fas fa-microphone" id="audio-icon-${socketId}"></i>
      <span>Participante</span>
    `;
    
    wrapper.appendChild(video);
    wrapper.appendChild(label);
    videosGrid.appendChild(wrapper);
  } else {
    // Actualizar stream si ya existe
    const video = wrapper.querySelector('video');
    video.srcObject = stream;
  }
}

function removeRemoteVideo(socketId) {
  const wrapper = document.getElementById(`video-${socketId}`);
  if (wrapper) {
    wrapper.remove();
  }
}

function updateUserMediaState(socketId, audio, video) {
  const audioIcon = document.getElementById(`audio-icon-${socketId}`);
  if (audioIcon) {
    if (audio) {
      audioIcon.className = 'fas fa-microphone';
      audioIcon.style.color = '';
    } else {
      audioIcon.className = 'fas fa-microphone-slash audio-muted';
    }
  }
}

// ============================================
// CONTROLES
// ============================================

async function joinRoom(roomId, roomName) {
  currentRoomId = roomId;
  document.getElementById('roomName').textContent = roomName;

  socket.emit('join-room', {
    roomId,
    userName: currentUserName,
    userId: currentUserId
  });
}

function toggleMute() {
  if (!localStream) return;

  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    isAudioMuted = !audioTrack.enabled;

    const btn = document.getElementById('muteBtn');
    const icon = btn.querySelector('i');
    
    if (isAudioMuted) {
      btn.classList.add('muted');
      icon.className = 'fas fa-microphone-slash';
      document.getElementById('local-audio-icon').className = 'fas fa-microphone-slash audio-muted';
    } else {
      btn.classList.remove('muted');
      icon.className = 'fas fa-microphone';
      document.getElementById('local-audio-icon').className = 'fas fa-microphone';
    }

    // Notificar a otros participantes
    socket.emit('media-state-change', {
      roomId: currentRoomId,
      audio: !isAudioMuted,
      video: !isVideoOff
    });
  }
}

function toggleVideo() {
  if (!localStream) return;

  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    isVideoOff = !videoTrack.enabled;

    const btn = document.getElementById('videoBtn');
    const icon = btn.querySelector('i');
    
    if (isVideoOff) {
      btn.classList.add('off');
      icon.className = 'fas fa-video-slash';
    } else {
      btn.classList.remove('off');
      icon.className = 'fas fa-video';
    }

    // Notificar a otros participantes
    socket.emit('media-state-change', {
      roomId: currentRoomId,
      audio: !isAudioMuted,
      video: !isVideoOff
    });
  }
}

async function toggleScreenShare() {
  if (!isScreenSharing) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      
      // Reemplazar track de video en todas las conexiones
      peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Actualizar video local
      const localVideo = document.querySelector('#local-video-wrapper video');
      if (localVideo) {
        localVideo.srcObject = screenStream;
      }

      // Manejar cuando el usuario deja de compartir
      screenTrack.onended = () => {
        stopScreenShare();
      };

      isScreenSharing = true;
      const btn = document.getElementById('screenBtn');
      btn.classList.add('sharing');
      btn.querySelector('i').className = 'fas fa-stop';

      socket.emit('screen-share-started', { roomId: currentRoomId });

    } catch (err) {
      console.error('Error compartiendo pantalla:', err);
    }
  } else {
    stopScreenShare();
  }
}

function stopScreenShare() {
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }

  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    
    // Restaurar track de video original
    peerConnections.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });

    // Restaurar video local
    const localVideo = document.querySelector('#local-video-wrapper video');
    if (localVideo) {
      localVideo.srcObject = localStream;
    }
  }

  isScreenSharing = false;
  const btn = document.getElementById('screenBtn');
  btn.classList.remove('sharing');
  btn.querySelector('i').className = 'fas fa-desktop';

  socket.emit('screen-share-stopped', { roomId: currentRoomId });
}

function toggleChat() {
  const panel = document.getElementById('sidePanel');
  const chatPanel = document.getElementById('chatPanel');
  const participantsPanel = document.getElementById('participantsPanel');
  
  if (currentPanel === 'chat' && panel.classList.contains('open')) {
    closePanel();
  } else {
    panel.classList.add('open');
    chatPanel.style.display = 'flex';
    participantsPanel.style.display = 'none';
    document.getElementById('panelTitle').textContent = 'Chat';
    currentPanel = 'chat';
  }
}

function toggleParticipants() {
  const panel = document.getElementById('sidePanel');
  const chatPanel = document.getElementById('chatPanel');
  const participantsPanel = document.getElementById('participantsPanel');
  
  if (currentPanel === 'participants' && panel.classList.contains('open')) {
    closePanel();
  } else {
    panel.classList.add('open');
    chatPanel.style.display = 'none';
    participantsPanel.style.display = 'block';
    document.getElementById('panelTitle').textContent = 'Participantes';
    currentPanel = 'participants';
    updateParticipantsList();
  }
}

function closePanel() {
  document.getElementById('sidePanel').classList.remove('open');
  currentPanel = null;
}

function leaveRoom() {
  // Detener streams
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }

  // Cerrar todas las conexiones peer
  peerConnections.forEach(pc => pc.close());
  peerConnections.clear();

  // Desconectar socket de la sala
  if (socket) {
    socket.disconnect();
  }

  // Volver a inicio o lista de salas
  window.location.href = '/videoconferencia.html';
}

// ============================================
// CHAT
// ============================================

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (message && currentRoomId) {
    socket.emit('chat-message', {
      roomId: currentRoomId,
      message
    });
    input.value = '';
  }
}

function addChatMessage(userName, message, timestamp) {
  const chatMessages = document.getElementById('chatMessages');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  
  const time = new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  messageDiv.innerHTML = `
    <div class="sender">${escapeHtml(userName)}</div>
    <div class="text">${escapeHtml(message)}</div>
    <div class="time">${time}</div>
  `;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============================================
// PARTICIPANTES
// ============================================

function updateParticipantCount() {
  const count = peerConnections.size + 1; // +1 por el usuario local
  document.getElementById('participantCount').textContent = count;
}

function updateParticipantsList() {
  const list = document.getElementById('participantsList');
  
  let html = `
    <div class="participant-item">
      <i class="fas fa-user"></i>
      <strong>${currentUserName} (Tú)</strong>
    </div>
  `;
  
  peerConnections.forEach((pc, socketId) => {
    html += `
      <div class="participant-item">
        <i class="fas fa-user"></i>
        <span>Participante</span>
      </div>
    `;
  });
  
  list.innerHTML = html;
}

// ============================================
// MANEJO DE ERRORES
// ============================================

window.addEventListener('beforeunload', (e) => {
  if (currentRoomId) {
    // Limpiar antes de cerrar
    leaveRoom();
  }
});
