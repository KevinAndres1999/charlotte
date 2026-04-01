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
let participants = new Map(); // socketId -> { userName, isAdmin, isMuted }
let isAudioMuted = false;
let isVideoOff = false;
let isScreenSharing = false;
let currentPanel = null;
let currentLayout = 'grid';  // 'grid' | 'spotlight' | 'admin-only'
let pinnedVideoId = null;    // 'local' | socketId | null
let viewOptionsOpen = false;

// Race condition fix: esperar a que el stream local esté listo
let localStreamReady = false;
let _localStreamWaiters = [];

function waitForLocalStream() {
  if (localStreamReady) return Promise.resolve();
  return new Promise(resolve => _localStreamWaiters.push(resolve));
}

// Notificaciones: máximo 3 apiladas, con timers controlados
const _activeNotifications = [];

// Calidad de red: interval que corre cada 5s cuando hay peers
let _qualityInterval = null;

// Grabación
let mediaRecorder = null;
let _recordedChunks = [];
let isRecording = false;
let _recordingCanvas = null;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación
  const token = localStorage.getItem('authToken');
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
  const token = localStorage.getItem('authToken');
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
      token: localStorage.getItem('authToken')
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

  socket.on('room-joined', async ({ roomId, participants: existingParticipants }) => {
    console.log('Unido a la sala:', roomId, 'Participantes:', existingParticipants);

    // Poblar el Map de participantes con los que ya están en la sala
    existingParticipants.forEach(p => {
      participants.set(p.socketId, { userName: p.userName, isAdmin: p.isAdmin || false, isMuted: false });
    });

    // Mostrar interfaz de videoconferencia
    document.getElementById('roomSelection').style.display = 'none';
    document.getElementById('videoConference').style.display = 'flex';

    // Mostrar el nombre de sala si vino por parámetro URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomNameFromUrl = urlParams.get('roomName');
    if (roomNameFromUrl) {
      document.getElementById('roomName').textContent = decodeURIComponent(roomNameFromUrl);
    }

    // Iniciar stream local
    await startLocalStream();

    // Conectar con participantes existentes
    for (const participant of existingParticipants) {
      await createPeerConnection(participant.socketId, true);
    }
  });

  socket.on('user-joined', async ({ socketId, userName, isAdmin }) => {
    console.log('Nuevo usuario:', userName, socketId);
    participants.set(socketId, { userName, isAdmin: !!isAdmin, isMuted: false });
    await createPeerConnection(socketId, false);
    updateParticipantCount();
    showNotification(`${userName} se unió a la sala`);
    if (navigator.vibrate) navigator.vibrate(50);
  });

  socket.on('user-left', ({ socketId, userName }) => {
    console.log('Usuario salió:', userName, socketId);
    participants.delete(socketId);
    removePeerConnection(socketId);
    updateParticipantCount();
    showNotification(`${userName} salió de la sala`);
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
  
  // ===== EVENTOS DE MEJORAS =====
  
  // Mano levantada
  socket.on('hand-raised', ({ socketId, userName, raised }) => {
    showHandRaisedNotification(userName, raised);
    updateParticipantHandStatus(socketId, raised);
  });
  
  // Reacciones
  socket.on('reaction', ({ socketId, userName, reaction }) => {
    showReactionNotification(userName, reaction);
  });
  
  // Modo solo escuchar
  socket.on('listen-only-mode', ({ socketId, userName, enabled }) => {
    updateUserListenOnlyMode(socketId, enabled);
    showNotification(`${userName} está en modo solo escuchar`);
  });
  
  // Notificación de nueva sala (para estudiantes)
  socket.on('new-room-available', ({ roomName, roomId }) => {
    showNotification(`Nueva sala disponible: ${roomName}`);
  });
  
  // Control del admin: silenciar participante (el servidor envía solo a este socket)
  socket.on('mute-participant', ({ reason }) => {
    isAudioMuted = true;
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = false);
    }
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.classList.add('muted');
      muteBtn.querySelector('i').className = 'fas fa-microphone-slash';
    }
    const localAudioIcon = document.getElementById('local-audio-icon');
    if (localAudioIcon) localAudioIcon.className = 'fas fa-microphone-slash audio-muted';
    showNotification(`🔇 Has sido silenciado: ${reason || 'por el administrador'}`);
  });
  
  // Control del admin: expulsar participante
  socket.on('kick-participant', ({ reason }) => {
    alert(`Has sido expulsado de la sala: ${reason || 'Expulsado por el administrador'}`);
    leaveRoom();
  });

  // Estado de habla: indicador en tiempo real de quién habla
  socket.on('user-speaking', ({ socketId, speaking }) => {
    const wrapper = document.getElementById(`video-${socketId}`);
    if (wrapper) {
      wrapper.style.boxShadow = speaking
        ? '0 0 0 3px #4CAF50, 0 4px 15px rgba(76,175,80,0.4)'
        : '';
      wrapper.style.transition = 'box-shadow 0.2s ease';
    }
  });

  // Error del servidor
  socket.on('error', ({ message }) => {
    showNotification('Error: ' + message);
  });
}

// ============================================
// WEBRTC - PEER CONNECTIONS
// ============================================

async function createPeerConnection(socketId, isInitiator) {
  console.log('Creando conexión peer:', socketId, 'Iniciador:', isInitiator);

  // Esperar que el stream local esté disponible (fix race condition)
  await waitForLocalStream();

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

  // Manejar cambios de conexión (incluyendo 'disconnected' temporal)
  let _disconnectTimer = null;
  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    console.log('Estado de conexión con', socketId, ':', state);
    if (state === 'failed' || state === 'closed') {
      clearTimeout(_disconnectTimer);
      removePeerConnection(socketId);
    } else if (state === 'disconnected') {
      // Puede recuperarse solo en ~5s; esperamos antes de limpiar
      _disconnectTimer = setTimeout(() => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          removePeerConnection(socketId);
        }
      }, 5000);
    } else if (state === 'connected') {
      clearTimeout(_disconnectTimer);
      // Iniciar monitoreo de calidad si no estaba activo
      if (!_qualityInterval) _startQualityMonitoring();
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
  // Si el video que se va era el enfocado, volver a modo cuadrícula
  if (currentLayout !== 'grid' && pinnedVideoId === socketId) {
    setLayoutMode('grid');
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

    // Marcar stream como listo y resolver esperas pendientes (fix race condition)
    localStreamReady = true;
    _localStreamWaiters.forEach(resolve => resolve());
    _localStreamWaiters = [];

    // Agregar video local a la interfaz
    addLocalVideo(localStream);

    // Agregar tracks a todas las conexiones existentes
    await Promise.all([...peerConnections.values()].map(async pc => {
      for (const track of localStream.getTracks()) {
        const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
        if (sender) {
          await sender.replaceTrack(track).catch(() => {});
        } else {
          pc.addTrack(track, localStream);
        }
      }
    }));

    // Iniciar detección de nivel de audio (indicador de quien habla)
    setupAudioLevelDetection(localStream);

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
  
  // Botón para enfocar (spotlight)
  const pinOverlay = document.createElement('div');
  pinOverlay.className = 'video-pin-overlay';
  pinOverlay.innerHTML = '<button class="video-pin-btn-overlay" onclick="event.stopPropagation(); pinVideoById(\'local\')" title="Enfocar este video"><i class="fas fa-thumbtack"></i> Enfocar</button>';
  
  wrapper.appendChild(video);
  wrapper.appendChild(label);
  wrapper.appendChild(pinOverlay);
  
  // Doble toque para enfocar en móvil
  let lastTap = 0;
  wrapper.addEventListener('touchend', () => {
    const now = Date.now();
    if (now - lastTap < 300) pinVideoById('local');
    lastTap = now;
  });
  
  videosGrid.insertBefore(wrapper, videosGrid.firstChild);
}

function addRemoteVideo(socketId, stream) {
  const videosGrid = document.getElementById('videosGrid');
  const thumbnailsStrip = document.getElementById('thumbnailsStrip');
  
  // Obtener nombre del participante del Map
  const participantData = participants.get(socketId);
  const displayName = participantData ? participantData.userName : 'Participante';
  
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
      <span>${escapeHtml(displayName)}</span>
    `;

    // Indicador de calidad de red
    const qualityBadge = document.createElement('div');
    qualityBadge.className = 'connection-quality';
    qualityBadge.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:white;padding:3px 7px;border-radius:5px;font-size:11px;display:flex;align-items:center;gap:4px;';
    qualityBadge.innerHTML = '<i class="fas fa-signal" style="color:#4CAF50;"></i>';
    
    // Botón para enfocar
    const pinOverlay = document.createElement('div');
    pinOverlay.className = 'video-pin-overlay';
    pinOverlay.innerHTML = `<button class="video-pin-btn-overlay" onclick="event.stopPropagation(); pinVideoById('${socketId}')" title="Enfocar este video"><i class="fas fa-thumbtack"></i> Enfocar</button>`;
    
    wrapper.appendChild(video);
    wrapper.appendChild(label);
    wrapper.appendChild(qualityBadge);
    wrapper.appendChild(pinOverlay);
    
    // Doble toque para enfocar en móvil
    let lastTap = 0;
    wrapper.addEventListener('touchend', () => {
      const now = Date.now();
      if (now - lastTap < 300) pinVideoById(socketId);
      lastTap = now;
    });
    
    // Colocar en el contenedor correcto según el modo actual
    if (currentLayout === 'spotlight' && thumbnailsStrip) {
      wrapper.onclick = () => switchSpotlightTo(wrapper.id);
      thumbnailsStrip.appendChild(wrapper);
    } else {
      videosGrid.appendChild(wrapper);
    }
  } else {
    // Actualizar stream si ya existe
    const video = wrapper.querySelector('video');
    video.srcObject = stream;
    // Actualizar nombre si ahora lo tenemos
    const nameSpan = wrapper.querySelector('.video-label span:last-child');
    if (nameSpan && displayName !== 'Participante') nameSpan.textContent = displayName;
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
    userId: currentUserId,
    isAdmin: typeof window.isUserAdmin !== 'undefined' && window.isUserAdmin
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
  window.location.href = 'videoconferencia.html';
}

// ============================================
// LEVANTAR MANO
// ============================================

let isHandRaised = false;

function toggleRaiseHand() {
  isHandRaised = !isHandRaised;
  
  const btn = document.getElementById('raiseHandBtn');
  if (isHandRaised) {
    btn.style.background = '#FF5722';
    btn.style.color = '#fff';
  } else {
    btn.style.background = '#FFC107';
    btn.style.color = '';
  }
  
  // Feedback háptico en móvil
  if (navigator.vibrate) navigator.vibrate(isHandRaised ? [50, 30, 50] : 30);
  
  // Mostrar indicador visual en nuestro propio video
  const localWrapper = document.getElementById('local-video-wrapper');
  if (localWrapper) {
    let handIndicator = localWrapper.querySelector('.hand-indicator');
    if (!handIndicator) {
      handIndicator = document.createElement('div');
      handIndicator.className = 'hand-indicator';
      handIndicator.innerHTML = '<i class="fas fa-hand-paper"></i>';
      handIndicator.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #FF5722; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10;';
      localWrapper.appendChild(handIndicator);
    }
    handIndicator.style.display = isHandRaised ? 'flex' : 'none';
  }
  
  // Notificar a otros participantes
  if (socket && currentRoomId) {
    socket.emit('hand-raised', {
      roomId: currentRoomId,
      raised: isHandRaised,
      userName: currentUserName
    });
  }
  
  showNotification(isHandRaised ? 'Mano levantada ✋' : 'Mano bajada');
}

function showHandRaisedNotification(userName, raised) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${raised ? '#FF5722' : '#4CAF50'};
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.innerHTML = `<i class="fas fa-hand-paper"></i> ${userName} ${raised ? 'levantó la mano' : 'bajó la mano'}`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function updateParticipantHandStatus(socketId, raised) {
  // Actualizar en el Map
  if (participants.has(socketId)) {
    participants.get(socketId).handRaised = raised;
  }

  // Actualizar indicador visual en el video
  const videoWrapper = document.getElementById(`video-${socketId}`);
  if (!videoWrapper) return;
  
  let handIndicator = videoWrapper.querySelector('.hand-indicator');
  if (!handIndicator && raised) {
    handIndicator = document.createElement('div');
    handIndicator.className = 'hand-indicator';
    handIndicator.innerHTML = '✋';
    handIndicator.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #FF5722; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10; font-size: 18px;';
    videoWrapper.appendChild(handIndicator);
  } else if (handIndicator) {
    handIndicator.style.display = raised ? 'flex' : 'none';
  }

  // Actualizar lista de participantes si está abierta
  if (currentPanel === 'participants') {
    updateParticipantsList();
  }
}

// ============================================
// REACCIONES RÁPIDAS
// ============================================

function sendReaction(reaction) {
  // Feedback háptico en móvil
  if (navigator.vibrate) navigator.vibrate(40);

  // Mostrar reacción localmente primero (instantáneo)
  showReactionNotification(currentUserName, reaction);
  
  // También mostrar en nuestro video
  const localWrapper = document.getElementById('local-video-wrapper');
  if (localWrapper) {
    const reactionEl = document.createElement('div');
    reactionEl.textContent = reaction;
    reactionEl.style.cssText = 'position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); font-size: 36px; animation: floatUp 2s ease forwards; pointer-events: none; z-index: 10;';
    localWrapper.appendChild(reactionEl);
    setTimeout(() => reactionEl.remove(), 2000);
  }
  
  // Enviar al servidor
  if (socket && currentRoomId) {
    socket.emit('reaction', {
      roomId: currentRoomId,
      reaction: reaction,
      userName: currentUserName
    });
  }
  
  // Ocultar panel de reacciones
  document.getElementById('reactionsPanel').style.display = 'none';
}

function showReactionNotification(userName, reaction) {
  // Mostrar notificación flotante
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 72px;
    z-index: 1000;
    animation: floatUp 2s ease forwards;
    pointer-events: none;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
  `;
  notification.textContent = reaction;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 2000);
}

function toggleReactionsPanel() {
  const panel = document.getElementById('reactionsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// ============================================
// MODO SOLO ESCUCHAR
// ============================================

let isListenOnlyMode = false;

async function toggleListenOnlyMode() {
  isListenOnlyMode = !isListenOnlyMode;
  
  const btn = document.getElementById('listenOnlyBtn');
  
  if (isListenOnlyMode) {
    // Desactivar cámara y micrófono
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = false);
      localStream.getAudioTracks().forEach(track => track.enabled = false);
    }
    
    if (btn) {
      btn.classList.add('active');
      btn.style.background = '#2196F3';
    }
    
    showNotification('Modo solo escuchar activado');
  } else {
    // Reactivar cámara y micrófono
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = true);
      localStream.getAudioTracks().forEach(track => track.enabled = true);
    }
    
    if (btn) {
      btn.classList.remove('active');
      btn.style.background = '';
    }
    
    showNotification('Modo solo escuchar desactivado');
  }
  
  // Notificar cambio
  if (socket && currentRoomId) {
    socket.emit('listen-only-mode', {
      roomId: currentRoomId,
      enabled: isListenOnlyMode,
      userName: currentUserName
    });
  }
}

// ============================================
// INDICADOR DE CALIDAD DE CONEXIÓN
// ============================================

function showConnectionQuality(pc, socketId) {
  if (!pc) return;
  
  pc.getStats().then(stats => {
    let quality = 'good';
    let ping = 0;
    let packetLoss = 0;
    
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        ping = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : 0;
      }
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        packetLoss = report.packetsLost || 0;
      }
    });
    
    // Determinar calidad
    if (ping > 300 || packetLoss > 10) {
      quality = 'poor';
    } else if (ping > 150 || packetLoss > 5) {
      quality = 'fair';
    }
    
    // Actualizar indicador visual
    const videoWrapper = document.getElementById(`video-${socketId}`);
    if (videoWrapper) {
      const qualityIndicator = videoWrapper.querySelector('.connection-quality');
      if (qualityIndicator) {
        qualityIndicator.className = `connection-quality ${quality}`;
        qualityIndicator.innerHTML = getQualityIcon(quality);
      }
    }
  });
}

function getQualityIcon(quality) {
  const icons = {
    good: '<i class="fas fa-signal" style="color: #4CAF50;"></i>',
    fair: '<i class="fas fa-signal" style="color: #FFC107;"></i>',
    poor: '<i class="fas fa-signal" style="color: #F44336;"></i>'
  };
  return icons[quality] || icons.good;
}

// ============================================
// NOTIFICACIONES
// ============================================

function showNotification(message, duration = 3000) {
  // Límite: máximo 3 notificaciones al mismo tiempo (eliminar la más antigua)
  if (_activeNotifications.length >= 3) {
    const oldest = _activeNotifications.shift();
    clearTimeout(oldest._timeout);
    oldest.remove();
  }

  const isMobile = window.innerWidth <= 768;
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    ${isMobile ? 'bottom: 100px; top: auto;' : 'top: 20px;'}
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.82);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    z-index: 9999;
    font-size: 14px;
    white-space: nowrap;
    max-width: 90vw;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
    animation: slideDown 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  _activeNotifications.push(notification);

  notification._timeout = setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      notification.remove();
      const idx = _activeNotifications.indexOf(notification);
      if (idx !== -1) _activeNotifications.splice(idx, 1);
    }, 300);
  }, duration);
}

function updateUserListenOnlyMode(socketId, enabled) {
  const videoWrapper = document.getElementById(`video-${socketId}`);
  if (videoWrapper) {
    if (enabled) {
      videoWrapper.style.opacity = '0.7';
      videoWrapper.style.borderColor = '#2196F3';
    } else {
      videoWrapper.style.opacity = '1';
      videoWrapper.style.borderColor = '';
    }
  }
}

// Añadir animaciones CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  @keyframes slideDown {
    from { transform: translate(-50%, -100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translate(-50%, 0); opacity: 1; }
    to { transform: translate(-50%, -100%); opacity: 0; }
  }
  @keyframes floatUp {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
  }
`;
document.head.appendChild(style);

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
  if (!list) return;
  
  // Verificar si el usuario actual es admin decodificando el token
  let isAdmin = false;
  try {
    const token = localStorage.getItem('authToken');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      isAdmin = payload.role === 'admin';
    }
  } catch (e) {}

  const totalCount = peerConnections.size + 1;
  
  let html = `
    <div style="color: #666; font-size: 13px; margin-bottom: 10px;">
      <i class="fas fa-users"></i> ${totalCount} participante(s)
    </div>
    <div class="participant-item" style="background: #f0fdf4; border-left: 3px solid #22c55e;" data-socket-id="local">
      <i class="fas fa-user" style="color: #22c55e;"></i>
      <strong style="flex:1;">${escapeHtml(currentUserName)} (Tú)</strong>
      ${isAdmin ? '<span style="background:#3b82f6;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">ADMIN</span>' : ''}
    </div>
  `;
  
  if (peerConnections.size === 0) {
    html += `<p style="text-align:center;color:#94a3b8;font-size:13px;margin-top:15px;">Esperando otros participantes...</p>`;
  }

  peerConnections.forEach((pc, socketId) => {
    const participantData = participants.get(socketId);
    const userName = participantData ? participantData.userName : 'Participante';
    const isMuted = participantData ? participantData.isMuted : false;
    const hasHandRaised = participantData ? participantData.handRaised : false;
    
    html += `
      <div class="participant-item" data-socket-id="${socketId}" style="margin-top:8px;">
        <i class="fas fa-user" style="color:#667eea;"></i>
        <span style="flex:1;">${escapeHtml(userName)}</span>
        ${hasHandRaised ? '<span title="Mano levantada" style="color:#FF5722;">✋</span>' : ''}
        ${isMuted ? '<span title="Silenciado" style="color:#ef4444;"><i class="fas fa-microphone-slash"></i></span>' : ''}
        ${isAdmin ? `
          <div style="display:flex;gap:5px;margin-top:5px;">
            <button onclick="muteParticipant('${socketId}')" title="Silenciar" 
              style="background:#FFC107;color:white;border:none;padding:4px 8px;border-radius:5px;cursor:pointer;font-size:12px;">
              <i class="fas fa-microphone-slash"></i>
            </button>
            <button onclick="kickParticipant('${socketId}')" title="Expulsar"
              style="background:#f44336;color:white;border:none;padding:4px 8px;border-radius:5px;cursor:pointer;font-size:12px;">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  list.innerHTML = html;
}

// Función para silenciar un participante (solo admin)
function muteParticipant(socketId) {
  if (!socket || !currentRoomId) return;
  
  const reason = prompt('Razón para silenciar (opcional):');
  socket.emit('mute-participant', {
    roomId: currentRoomId,
    socketId: socketId,
    reason: reason || 'Silenciado por el administrador'
  });
  
  showNotification('Participante silenciado');
}


// Función para expulsar un participante (solo admin)
function kickParticipant(socketId) {
  if (!socket || !currentRoomId) return;
  
  if (confirm('¿Estás seguro de que quieres expulsar a este participante?')) {
    const reason = prompt('Razón para expulsar (opcional):');
    socket.emit('kick-participant', {
      roomId: currentRoomId,
      socketId: socketId,
      reason: reason || 'Expulsado por el administrador'
    });
    
    showNotification('Participante expulsado');
  }
}

// Actualizar estado de mano levantada de un participante
function updateParticipantHandStatus(socketId, raised) {
  const list = document.getElementById('participantsList');
  if (!list) return;
  
  const items = list.querySelectorAll('.participant-item');
  items.forEach(item => {
    if (item.dataset.socketId === socketId) {
      let handIndicator = item.querySelector('.hand-indicator');
      if (!handIndicator && raised) {
        handIndicator = document.createElement('span');
        handIndicator.className = 'hand-indicator';
        handIndicator.innerHTML = '<i class="fas fa-hand-paper"></i>';
        handIndicator.style.color = '#FF5722';
        handIndicator.style.marginLeft = '5px';
        item.appendChild(handIndicator);
      } else if (handIndicator && !raised) {
        handIndicator.remove();
      }
    }
  });
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

// ============================================
// OPCIONES DE VISTA / MENÚ
// ============================================

function toggleViewOptions() {
  const menu = document.getElementById('viewOptionsMenu');
  const btn  = document.getElementById('viewOptionsBtn');
  if (!menu || !btn) return;

  viewOptionsOpen = !viewOptionsOpen;
  menu.style.display = viewOptionsOpen ? 'block' : 'none';
  btn.classList.toggle('active', viewOptionsOpen);

  if (viewOptionsOpen) {
    // Mostrar opción de rotación si el navegador la soporta
    const rotOpt = document.getElementById('rotationOption');
    if (rotOpt && 'orientation' in screen) rotOpt.style.display = 'flex';

    // Cerrar al hacer clic fuera
    setTimeout(() => {
      document.addEventListener('click', _closeViewOptionsOutside, { once: true });
    }, 0);
  }
}

function _closeViewOptionsOutside(e) {
  const menu = document.getElementById('viewOptionsMenu');
  const btn  = document.getElementById('viewOptionsBtn');
  if (menu && !menu.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    menu.style.display = 'none';
    viewOptionsOpen = false;
    if (btn) btn.classList.remove('active');
  }
}

// ============================================
// LAYOUT (cuadrícula / spotlight / solo-admin)
// ============================================

function setLayoutMode(mode, forcedTargetId = null) {
  currentLayout = mode;

  // Actualizar ítem activo en el menú
  document.querySelectorAll('#viewOptionsMenu .view-option[data-mode]').forEach(opt => {
    opt.classList.toggle('active-option', opt.dataset.mode === mode);
  });

  if (mode === 'grid') {
    exitSpotlightMode();
    return;
  }

  // Resolver qué video mostrar en primer plano
  let targetId = forcedTargetId;
  if (!targetId) {
    const adminEntry = [...participants.entries()].find(([, d]) => d.isAdmin);
    if (mode === 'admin-only') {
      if (adminEntry) {
        targetId = adminEntry[0];
      } else {
        // ¿Soy yo el admin?
        try {
          const payload = JSON.parse(atob(localStorage.getItem('authToken').split('.')[1]));
          if (payload.role === 'admin') targetId = 'local';
        } catch (e) {}
      }
      if (!targetId) {
        showNotification('No hay ningún administrador en la sala ahora');
        currentLayout = 'grid';
        document.querySelectorAll('#viewOptionsMenu .view-option[data-mode]').forEach(opt => {
          opt.classList.toggle('active-option', opt.dataset.mode === 'grid');
        });
        return;
      }
    } else {
      // spotlight: admin → primer peer → local
      const firstPeer = peerConnections.size > 0 ? [...peerConnections.keys()][0] : null;
      targetId = adminEntry ? adminEntry[0] : (firstPeer || 'local');
    }
  }

  enterSpotlightMode(targetId, mode === 'admin-only');
}

function enterSpotlightMode(targetVideoId, hideOthers) {
  const videosGrid    = document.getElementById('videosGrid');
  const spotlightArea = document.getElementById('spotlightArea');
  const thumbnailsStrip = document.getElementById('thumbnailsStrip');
  if (!videosGrid || !spotlightArea || !thumbnailsStrip) return;

  const wrapperId = targetVideoId === 'local' ? 'local-video-wrapper' : `video-${targetVideoId}`;
  const pinnedWrapper = document.getElementById(wrapperId);
  if (!pinnedWrapper) {
    showNotification('Video no disponible en este momento');
    currentLayout = 'grid';
    return;
  }

  pinnedVideoId = targetVideoId;

  // Mover todos los wrappers: pinned → spotlightArea, resto → thumbnailsStrip (o dejar en grid si hideOthers)
  const wrappers = Array.from(videosGrid.querySelectorAll('.video-wrapper'));
  wrappers.forEach(wrapper => {
    if (wrapper === pinnedWrapper) {
      wrapper.onclick = null;
      spotlightArea.appendChild(wrapper);
    } else if (!hideOthers) {
      wrapper.onclick = () => switchSpotlightTo(wrapper.id);
      thumbnailsStrip.appendChild(wrapper);
    }
    // hideOthers: los no-pinned permanecen en videosGrid (oculto)
  });

  videosGrid.style.display = 'none';
  spotlightArea.style.display = 'block';
  thumbnailsStrip.style.display = hideOthers ? 'none' : 'flex';
}

function exitSpotlightMode() {
  const videosGrid    = document.getElementById('videosGrid');
  const spotlightArea = document.getElementById('spotlightArea');
  const thumbnailsStrip = document.getElementById('thumbnailsStrip');
  if (!videosGrid || !spotlightArea || !thumbnailsStrip) return;

  // Devolver todos los wrappers al grid
  [spotlightArea, thumbnailsStrip].forEach(container => {
    Array.from(container.children).forEach(child => {
      if (child.classList.contains('video-wrapper')) {
        child.onclick = null;
        videosGrid.appendChild(child);
      }
    });
  });

  videosGrid.style.display = '';
  spotlightArea.style.display = 'none';
  thumbnailsStrip.style.display = 'none';
  pinnedVideoId = null;
  currentLayout = 'grid';

  // Sincronizar menú
  document.querySelectorAll('#viewOptionsMenu .view-option[data-mode]').forEach(opt => {
    opt.classList.toggle('active-option', opt.dataset.mode === 'grid');
  });
}

function switchSpotlightTo(wrapperId) {
  const spotlightArea   = document.getElementById('spotlightArea');
  const thumbnailsStrip = document.getElementById('thumbnailsStrip');
  if (!spotlightArea || !thumbnailsStrip) return;

  const clickedWrapper    = document.getElementById(wrapperId);
  const currentSpotlighted = spotlightArea.querySelector('.video-wrapper');
  if (!clickedWrapper || !currentSpotlighted || currentSpotlighted === clickedWrapper) return;

  // Actual pinned → thumbnails
  currentSpotlighted.onclick = () => switchSpotlightTo(currentSpotlighted.id);
  thumbnailsStrip.appendChild(currentSpotlighted);

  // Clicked → spotlight
  clickedWrapper.onclick = null;
  spotlightArea.appendChild(clickedWrapper);

  pinnedVideoId = wrapperId === 'local-video-wrapper' ? 'local' : wrapperId.replace('video-', '');
}

// Enfocar un video por ID (llamado desde los botones "Enfocar" y doble-toque)
function pinVideoById(videoId) {
  if (currentLayout === 'grid') {
    setLayoutMode('spotlight', videoId);
  } else {
    const wrapperId = videoId === 'local' ? 'local-video-wrapper' : `video-${videoId}`;
    switchSpotlightTo(wrapperId);
  }
}

// ============================================
// PANTALLA COMPLETA
// ============================================

function toggleFullscreen() {
  const videoConference = document.getElementById('videoConference');
  const icon = document.getElementById('fullscreenIcon');
  const text = document.getElementById('fullscreenText');

  const isFullNow = document.fullscreenElement || document.webkitFullscreenElement;

  if (!isFullNow) {
    const reqFS = videoConference.requestFullscreen || videoConference.webkitRequestFullscreen;
    if (reqFS) {
      reqFS.call(videoConference).catch(() => {
        // Fallback iOS (no soporta Fullscreen API)
        _applyPseudoFullscreen(true);
      });
    } else {
      _applyPseudoFullscreen(true);
    }
  } else {
    const exitFS = document.exitFullscreen || document.webkitExitFullscreen;
    if (exitFS) exitFS.call(document);
    _applyPseudoFullscreen(false);
  }
}

function _applyPseudoFullscreen(active) {
  const videoConference = document.getElementById('videoConference');
  const icon = document.getElementById('fullscreenIcon');
  const text = document.getElementById('fullscreenText');
  if (!videoConference) return;
  videoConference.classList.toggle('pseudo-fullscreen', active);
  document.body.style.overflow = active ? 'hidden' : '';
  if (icon) icon.className = active ? 'fas fa-compress' : 'fas fa-expand';
  if (text) text.textContent = active ? 'Salir de pantalla completa' : 'Pantalla completa';
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    _applyPseudoFullscreen(false);
  } else {
    const icon = document.getElementById('fullscreenIcon');
    const text = document.getElementById('fullscreenText');
    if (icon) icon.className = 'fas fa-compress';
    if (text) text.textContent = 'Salir de pantalla completa';
  }
});

// ============================================
// ROTACIÓN DE PANTALLA (móvil)
// ============================================

async function toggleRotation() {
  const rotText = document.getElementById('rotationText');
  const rotIcon = document.getElementById('rotationIcon');
  try {
    const currentType = screen.orientation ? screen.orientation.type : '';
    if (currentType.includes('portrait') || currentType === '') {
      await screen.orientation.lock('landscape');
      if (rotText) rotText.textContent = 'Girar a vertical';
      if (rotIcon) rotIcon.className = 'fas fa-mobile-alt';
      showNotification('📱 Pantalla bloqueada en horizontal');
    } else {
      await screen.orientation.lock('portrait');
      if (rotText) rotText.textContent = 'Girar a horizontal';
      if (rotIcon) rotIcon.className = 'fas fa-sync-alt';
      showNotification('📱 Pantalla bloqueada en vertical');
    }
  } catch (err) {
    showNotification('💡 Gira el dispositivo manualmente y bloquea la rotación desde ajustes');
  }
}

// ============================================
// INDICADOR DE QUIÉN HABLA (Audio Level)
// ============================================

let _audioContext = null;
let _localSpeaking = false;

function setupAudioLevelDetection(stream) {
  try {
    _audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = _audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = _audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function detectLevel() {
      if (!localStream) return; // Stream cerrado, detener
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const speaking = avg > 18; // umbral calibrado

      if (speaking !== _localSpeaking) {
        _localSpeaking = speaking;
        // Borde verde en nuestro propio video
        const wrapper = document.getElementById('local-video-wrapper');
        if (wrapper) {
          wrapper.style.boxShadow = speaking ? '0 0 0 3px #4CAF50, 0 4px 15px rgba(76,175,80,0.4)' : '';
          wrapper.style.transition = 'box-shadow 0.15s ease';
        }
        // Notificar a otros participantes
        if (socket && currentRoomId) {
          socket.emit('speaking-state', { roomId: currentRoomId, speaking });
        }
      }
      requestAnimationFrame(detectLevel);
    }
    detectLevel();
  } catch (err) {
    console.warn('Audio level detection no disponible:', err);
  }
}

// ============================================
// MONITOREO DE CALIDAD DE RED
// ============================================

function _startQualityMonitoring() {
  if (_qualityInterval) return; // ya activo
  _qualityInterval = setInterval(async () => {
    for (const [socketId, pc] of peerConnections) {
      if (pc.connectionState !== 'connected') continue;
      try {
        const stats = await pc.getStats();
        let ping = 0, packetLoss = 0, quality = 'good';

        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            ping = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : 0;
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetLoss = report.packetsLost || 0;
          }
        });

        if (ping > 300 || packetLoss > 10) quality = 'poor';
        else if (ping > 150 || packetLoss > 5) quality = 'fair';

        // Actualizar badge visual en el video
        const wrapper = document.getElementById(`video-${socketId}`);
        if (wrapper) {
          const badge = wrapper.querySelector('.connection-quality');
          if (badge) {
            const colors = { good: '#4CAF50', fair: '#FFC107', poor: '#F44336' };
            badge.innerHTML = `<i class="fas fa-signal" style="color:${colors[quality]};"></i>`;
            badge.title = `Ping: ${ping}ms | Pérdida: ${packetLoss} paquetes`;
          }
        }

        // Adaptar calidad de video según red (solo si bitrate disponible)
        await _adjustVideoQuality(pc, socketId, ping);
      } catch (e) { /* pc cerrado */ }
    }

    // Detener si no hay conexiones
    if (peerConnections.size === 0) {
      clearInterval(_qualityInterval);
      _qualityInterval = null;
    }
  }, 5000); // cada 5 segundos
}

// ============================================
// CALIDAD DE VIDEO ADAPTATIVA
// ============================================

async function _adjustVideoQuality(pc, socketId, pingMs) {
  try {
    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (!videoSender) return;
    const params = videoSender.getParameters();
    if (!params.encodings || params.encodings.length === 0) return;

    const enc = params.encodings[0];
    if (pingMs > 400) {
      // Red muy lenta: 180p, 150kbps
      enc.maxBitrate = 150000;
      enc.scaleResolutionDownBy = 4;
    } else if (pingMs > 200) {
      // Red media: 360p, 400kbps
      enc.maxBitrate = 400000;
      enc.scaleResolutionDownBy = 2;
    } else {
      // Red buena: calidad máxima
      enc.maxBitrate = 1500000;
      enc.scaleResolutionDownBy = 1;
    }
    await videoSender.setParameters(params);
  } catch (e) { /* no soportado en este navegador */ }
}

// ============================================
// GRABACIÓN DE CLASES
// ============================================

async function toggleRecording() {
  if (!isRecording) {
    await _startRecording();
  } else {
    _stopRecording();
  }
}

async function _startRecording() {
  try {
    // Crear canvas que captura todos los videos visibles
    _recordingCanvas = document.createElement('canvas');
    _recordingCanvas.width = 1280;
    _recordingCanvas.height = 720;
    const ctx = _recordingCanvas.getContext('2d');
    const canvasStream = _recordingCanvas.captureStream(25);

    // Añadir audio local al stream de grabación
    if (localStream) {
      localStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
    }

    // Función que dibuja todos los videos en el canvas
    function drawFrame() {
      if (!isRecording) return;
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, _recordingCanvas.width, _recordingCanvas.height);

      // Recoger todos los elementos de video visibles
      const videos = [...document.querySelectorAll(
        '#videosGrid video, #spotlightArea video, #thumbnailsStrip video'
      )].filter(v => v.readyState >= 2);

      if (videos.length === 0) {
        requestAnimationFrame(drawFrame);
        return;
      }
      const cols = videos.length <= 1 ? 1 : videos.length <= 4 ? 2 : Math.ceil(Math.sqrt(videos.length));
      const rows = Math.ceil(videos.length / cols);
      const w = _recordingCanvas.width / cols;
      const h = _recordingCanvas.height / rows;

      videos.forEach((video, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.drawImage(video, col * w, row * h, w, h);
      });
      requestAnimationFrame(drawFrame);
    }
    drawFrame();

    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';

    _recordedChunks = [];
    mediaRecorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : {});
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(_recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clase-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('✅ Grabación guardada en tu dispositivo');
    };

    mediaRecorder.start(1000); // chunk cada 1s
    isRecording = true;

    const btn = document.getElementById('recordBtn');
    if (btn) {
      btn.style.background = '#f44336';
      btn.title = 'Detener grabación';
      btn.innerHTML = '<i class="fas fa-stop"></i>';
    }
    showNotification('🔴 Grabación iniciada');
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  } catch (err) {
    console.error('Error iniciando grabación:', err);
    showNotification('❌ No se pudo iniciar la grabación: ' + (err.message || err));
  }
}

function _stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording = false;
  _recordingCanvas = null;

  const btn = document.getElementById('recordBtn');
  if (btn) {
    btn.style.background = '#757575';
    btn.title = 'Grabar clase';
    btn.innerHTML = '<i class="fas fa-circle"></i>';
  }
  showNotification('⏹️ Grabación detenida. Descargando archivo...');
}
