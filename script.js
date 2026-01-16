// Evitar ejecución múltiple del script
if (window.charlotteScriptLoaded) {
  console.log('Charlotte script already loaded, skipping...');
} else {
  window.charlotteScriptLoaded = true;
}
// Manejo del modal y acceso de estudiantes (validación real con API)
let studentAccessBtn, studentModal, closeModal, loginForm, loginMessage, studentArea, welcomeMsg, logoutBtn;
let tabLogin, tabRegister, registerForm;
let confirmTokenLabel, confirmInput, confirmOk, confirmCancel, confirmModal, confirmText;
let uiInitialized = false;
let confirmCallback = null;

const API_BASE = '/api';

function openModal(){ if(studentModal) studentModal.setAttribute('aria-hidden','false'); }
function closeModalFn(){ if(studentModal) studentModal.setAttribute('aria-hidden','true'); }

async function apiLogin(email, password){
  const resp = await fetch(`${API_BASE}/login`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email, password })
  });
  if(!resp.ok){
    const err = await resp.json().catch(()=>({message:'Error'}));
    throw new Error(err.message || 'Error de autenticación');
  }
  return resp.json();
}

async function apiRegister(name, email, password){
  const resp = await fetch(`${API_BASE}/register`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name, email, password })
  });
  if(!resp.ok){
    const err = await resp.json().catch(()=>({message:'Error'}));
    throw new Error(err.message || 'Error de registro');
  }
  return resp.json();
}

function initUI(){
  if(uiInitialized) return;
  uiInitialized = true;
  studentAccessBtn = document.getElementById('studentAccessBtn');
  studentModal = document.getElementById('studentModal');
  closeModal = document.getElementById('closeModal');
  loginForm = document.getElementById('loginForm');
  loginMessage = document.getElementById('loginMessage');
  studentArea = document.getElementById('studentArea');
  welcomeMsg = document.getElementById('welcomeMsg');
  logoutBtn = document.getElementById('logoutBtn');
  tabLogin = document.getElementById('tabLogin');
  tabRegister = document.getElementById('tabRegister');
  registerForm = document.getElementById('registerForm');

  confirmTokenLabel = document.getElementById('confirmTokenLabel');
  confirmInput = document.getElementById('confirmInput');
  confirmOk = document.getElementById('confirmOk');
  confirmCancel = document.getElementById('confirmCancel');
  confirmModal = document.getElementById('confirmModal');
  confirmText = document.getElementById('confirmText');

  if(studentAccessBtn) studentAccessBtn.addEventListener('click', openModal);
  if(closeModal) closeModal.addEventListener('click', closeModalFn);
  if(studentModal) studentModal.addEventListener('click',(e)=>{ if(e.target===studentModal) closeModalFn(); });

  if(tabLogin && tabRegister && loginForm && registerForm){
    function showLoginTab(){ if(tabLogin && tabRegister){ tabLogin.classList.add('active'); tabRegister.classList.remove('active'); } if(loginForm) loginForm.hidden=false; if(registerForm) registerForm.hidden=true; if(loginMessage) loginMessage.textContent=''; }
    function showRegisterTab(){ if(tabRegister && tabLogin){ tabRegister.classList.add('active'); tabLogin.classList.remove('active'); } if(loginForm) loginForm.hidden=true; if(registerForm) registerForm.hidden=false; if(loginMessage) loginMessage.textContent=''; }
    tabLogin.addEventListener('click', showLoginTab);
    tabRegister.addEventListener('click', showRegisterTab);
  }

  if(loginForm){
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); if(loginMessage) loginMessage.textContent='';
      const email = (loginForm.email && loginForm.email.value) ? loginForm.email.value.trim() : '';
      const password = (loginForm.password && loginForm.password.value) ? loginForm.password.value.trim() : '';
      if(!email || !password){ if(loginMessage) loginMessage.textContent = 'Introduce email y contraseña válidos.'; return; }
      try{
        const data = await apiLogin(email, password);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('student', JSON.stringify(data.user));
        showStudentArea(data.user);
        if(loginMessage) loginMessage.textContent = 'Acceso correcto.';
      } catch (err) {
        if(loginMessage) loginMessage.textContent = err.message || 'Error al iniciar sesión.';
      }
    });
  }

  if(registerForm){
    registerForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = (registerForm.name && registerForm.name.value) ? registerForm.name.value.trim() : '';
      const email = (registerForm.email && registerForm.email.value) ? registerForm.email.value.trim() : '';
      const password = (registerForm.password && registerForm.password.value) ? registerForm.password.value : '';
      const confirm = (registerForm.confirm && registerForm.confirm.value) ? registerForm.confirm.value : '';
      if(!name || !email || !password){ if(loginMessage) loginMessage.textContent = 'Rellena todos los campos.'; return; }
      if(password.length < 6){ if(loginMessage) loginMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
      if(password !== confirm){ if(loginMessage) loginMessage.textContent = 'Las contraseñas no coinciden.'; return; }
      try{
        const data = await apiRegister(name, email, password);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('student', JSON.stringify(data.user));
        showStudentArea(data.user);
        if(loginMessage) loginMessage.textContent = 'Cuenta creada y sesión iniciada.';
      } catch (err){ if(loginMessage) loginMessage.textContent = err.message || 'Error al registrarse.'; }
    });
  }

  if(logoutBtn){ logoutBtn.addEventListener('click', ()=>{ localStorage.removeItem('student'); localStorage.removeItem('authToken'); hideStudentArea(); if(loginMessage) loginMessage.textContent='Sesión cerrada.'; const adminLink = document.getElementById('adminLink'); if(adminLink) adminLink.setAttribute('hidden',''); }); }

  // Confirm modal handlers
  if(confirmCancel){ confirmCancel.addEventListener('click', ()=>{ if(confirmModal) confirmModal.setAttribute('aria-hidden','true'); confirmCallback = null; }); }
  if(confirmOk){ confirmOk.addEventListener('click', async ()=>{ if(typeof confirmCallback === 'function'){ try{ await confirmCallback(); }catch(e){ console.error(e); } } if(confirmModal) confirmModal.setAttribute('aria-hidden','true'); confirmCallback = null; }); }
  if(confirmModal){ confirmModal.addEventListener('click', (e)=>{ if(e.target === confirmModal) { confirmModal.setAttribute('aria-hidden','true'); confirmCallback = null; } }); }

  if(confirmInput){
    confirmInput.addEventListener('input', ()=>{
      const val = (confirmInput.value || '').trim().toUpperCase();
      if(val === (confirmRequiredWord || 'CONFIRMAR').toUpperCase()){
        if(confirmOk) confirmOk.removeAttribute('disabled');
      } else { if(confirmOk) confirmOk.setAttribute('disabled',''); }
    });
    confirmInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); if(confirmOk && !confirmOk.hasAttribute('disabled')) confirmOk.click(); } });
  }
}

// Si los componentes se cargan dinámicamente, esperar al evento; si no, inicializar en DOMContentLoaded
document.addEventListener('componentsLoaded', ()=>{ try{ initUI(); }catch(e){ console.error('initUI error', e); } });

// Variable global para la palabra de confirmación
var confirmRequiredWord = 'CONFIRMAR';
// Fix: Ensure no duplicate declarations

function showStudentArea(student){
  // Cerrar modal y mostrar panel de estudiante
  closeModalFn();
  loginForm.hidden = true;
  studentArea.hidden = false;
  welcomeMsg.textContent = `Bienvenido, ${student.name}`;
  const adminLink = document.getElementById('adminLink');
  if(student.role === 'admin'){
    adminLink.removeAttribute('hidden');
    document.getElementById('admin').hidden = false;
    fetchAdminUsers();
    fetchAdminSettings();
  } else {
    if(adminLink) adminLink.setAttribute('hidden', '');
    document.getElementById('admin').hidden = true;
  }
  // Mostrar panel de estudiante fuera del modal
  const sd = document.getElementById('student-dashboard');
  const profileEl = document.getElementById('studentProfile');
  if(sd){
    sd.classList.remove('hidden');
    if(profileEl){
      profileEl.innerHTML = `<strong>Nombre:</strong> ${student.name}<br><strong>Email:</strong> ${student.email}<br><strong>Rol:</strong> ${student.role}`;
    }
    // logout button in dashboard
    const studentLogout = document.getElementById('studentLogoutBtn');
    if(studentLogout){
      studentLogout.addEventListener('click', ()=>{ logout(); });
    }
  }
}

function logout(){
  localStorage.removeItem('student');
  localStorage.removeItem('authToken');
  // hide dashboard and admin link
  const sd = document.getElementById('student-dashboard'); if(sd) sd.classList.add('hidden');
  const adminLink = document.getElementById('adminLink'); if(adminLink) adminLink.setAttribute('hidden','');
  // hide modal student area
  hideStudentArea();
}

function hideStudentArea(){
  loginForm.hidden = false;
  studentArea.hidden = true;
}

logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('student');
  localStorage.removeItem('authToken');
  hideStudentArea();
  loginMessage.textContent = 'Sesión cerrada.';
  const adminLink = document.getElementById('adminLink');
  if(adminLink) adminLink.setAttribute('hidden', '');
});

// Al cargar, si hay token válido, solicitar perfil
window.addEventListener('DOMContentLoaded', async ()=>{
  // Animación de inicio: overlay con logo que se atenúa y oculta
  (function handleIntro(){
    const introOverlay = document.getElementById('introOverlay');
    if(!introOverlay) return;
    // Mostrar el logo brevemente, luego iniciar la atenuación (2s)
    const initialVisibleMs = 400;
    const fadeDurationMs = 2000; // duración de la transición (2s)
    setTimeout(()=>{
      try{ introOverlay.classList.add('intro-hidden'); }catch(e){}
      // después de la transición, ocultar del flujo
      setTimeout(()=>{ try{ introOverlay.style.display = 'none'; introOverlay.setAttribute('aria-hidden','true'); }catch(e){} }, fadeDurationMs);
    }, initialVisibleMs);
  })();

  // Si hay token, validar sesión y mostrar panel del estudiante sin abrir el modal
  const token = localStorage.getItem('authToken');
  if(!token) return;
  try{
    const resp = await fetch(`${API_BASE}/profile`, { headers: { Authorization: `Bearer ${token}` } });
    if(!resp.ok) throw new Error('Sesión inválida');
    const { user } = await resp.json();
    showStudentArea(user);
  } catch (err){
    localStorage.removeItem('authToken');
    localStorage.removeItem('student');
  }
  // Inicializar UI (fallback en caso de que no se usen componentes dinámicos)
  try{ initUI(); }catch(e){ console.error('initUI error on DOMContentLoaded', e); }
});

// Nota: el CTA del hero ahora navega a `cursos.html`; no es necesario el desplazamiento local.

// Admin: obtener lista de usuarios
async function fetchAdminUsers(){
  const container = document.getElementById('adminList');
  container.textContent = 'Cargando...';
  const token = localStorage.getItem('authToken');
  if(!token){ container.textContent = 'No autorizado'; return; }
  try{
    const resp = await fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    if(!resp.ok) throw new Error('No autorizado');
    const data = await resp.json();
    renderAdminUsers(data.users || []);
  }catch(err){
    container.textContent = err.message || 'Error';
  }
}

async function fetchAdminSettings(){
  const token = localStorage.getItem('authToken');
  if(!token) return;
  try{
    const resp = await fetch(`${API_BASE}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
    if(!resp.ok) return;
    const data = await resp.json();
    confirmRequiredWord = (data.settings && data.settings.confirmWord) || 'CONFIRMAR';
    if(confirmTokenLabel) confirmTokenLabel.textContent = confirmRequiredWord;
    const input = document.getElementById('confirmWordInput');
    if(input) input.value = confirmRequiredWord;
    if(confirmInput) confirmInput.placeholder = `Escribe ${confirmRequiredWord}`;
  }catch(err){ console.error('Error cargando settings', err); }
}

// Guardar setting desde admin
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'saveConfirmWordBtn'){
    const val = (document.getElementById('confirmWordInput').value || '').trim();
    if(!val){ document.getElementById('saveConfirmStatus').textContent = 'Valor vacío'; return; }
    const token = localStorage.getItem('authToken');
    fetch(`${API_BASE}/admin/settings`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ confirmWord: val }) })
      .then(r => r.json())
      .then(j => {
        if(j.settings && j.settings.confirmWord){
          confirmRequiredWord = j.settings.confirmWord;
          if(confirmTokenLabel) confirmTokenLabel.textContent = confirmRequiredWord;
          if(confirmInput) confirmInput.placeholder = `Escribe ${confirmRequiredWord}`;
          document.getElementById('saveConfirmStatus').textContent = 'Guardado';
        } else {
          document.getElementById('saveConfirmStatus').textContent = j.message || 'Error';
        }
      }).catch(err => { document.getElementById('saveConfirmStatus').textContent = 'Error'; });
  }
});

function renderAdminUsers(users){
  const container = document.getElementById('adminList');
  if(!users.length){ container.innerHTML = '<p>No hay usuarios.</p>'; return; }
  const rows = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.email}</td>
      <td>${u.name}</td>
      <td>${u.role}</td>
      <td>${u.active ? 'Sí' : 'No'}</td>
      <td><button data-email="${u.email}" data-active="${u.active ? 1 : 0}" class="btn toggleActive">${u.active ? 'Desactivar' : 'Activar'}</button></td>
    </tr>
  `).join('');
  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>ID</th><th>Email</th><th>Nombre</th><th>Rol</th><th>Activo</th><th>Acción</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  // Attach handlers
  document.querySelectorAll('.toggleActive').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      const email = btn.getAttribute('data-email');
      const cur = parseInt(btn.getAttribute('data-active'), 10);
      const newVal = cur ? 0 : 1;
      // Abrir modal de confirmación
      openConfirm(`¿Deseas ${newVal ? 'activar' : 'desactivar'} la cuenta de ${email}?`, async () => {
        const token = localStorage.getItem('authToken');
        try{
          const r = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}/active`, {
            method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ active: newVal })
          });
          if(!r.ok) {
            const err = await r.json().catch(()=>({message:'Error'}));
            alert(err.message || 'Error');
            return;
          }
          fetchAdminUsers();
        }catch(err){ alert(err.message || 'Error'); }
      });
    });
  });
}

function openConfirm(message, onConfirm){
  confirmText.textContent = message;
  confirmCallback = onConfirm;
  if(confirmInput){ confirmInput.value = ''; confirmOk.setAttribute('disabled',''); }
  if(confirmTokenLabel) confirmTokenLabel.textContent = confirmRequiredWord;
  confirmModal.setAttribute('aria-hidden','false');
}
function closeConfirm(){
  confirmModal.setAttribute('aria-hidden','true');
  confirmCallback = null;
}

// ===== SISTEMA DE LAZY LOADING PARA MEJORAR RENDIMIENTO =====

class LazyImageLoader {
  constructor() {
    this.imageObserver = null;
    this.init();
  }

  init() {
    // Crear Intersection Observer para lazy loading
    this.imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.loadImage(img);
          observer.unobserve(img);
        }
      });
    }, {
      // Comenzar a cargar cuando la imagen esté a 50px de ser visible
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observar todas las imágenes con data-src
    this.observeImages();
  }

  observeImages() {
    // Buscar imágenes con data-src (lazy loading)
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      this.imageObserver.observe(img);
    });

    // También observar imágenes normales que no tienen lazy loading nativo
    const regularImages = document.querySelectorAll('img:not([data-src]):not([loading="lazy"])');
    regularImages.forEach(img => {
      // Solo aplicar lazy loading a imágenes que no están en el viewport inicial
      if (!this.isElementInViewport(img)) {
        this.convertToLazy(img);
      }
    });
  }

  convertToLazy(img) {
    // Convertir imagen normal a lazy loading
    const src = img.src;
    if (src && !img.hasAttribute('data-src')) {
      img.setAttribute('data-src', src);
      img.src = ''; // Remover src para evitar carga
      img.classList.add('lazy-loading');
      this.imageObserver.observe(img);
    }
  }

  loadImage(img) {
    const src = img.getAttribute('data-src');
    if (src) {
      img.src = src;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');

      // Agregar listener para manejar errores
      img.addEventListener('load', () => {
        img.classList.add('loaded');
      });

      img.addEventListener('error', () => {
        console.warn(`Failed to load image: ${src}`);
        img.classList.add('error');
      });
    }
  }

  isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
}

// Función para optimizar carga de imágenes en galerías
function optimizeGalleryImages() {
  const galleries = document.querySelectorAll('.gallery, .trabajos-grid, .image-gallery');
  galleries.forEach(gallery => {
    const images = gallery.querySelectorAll('img');
    images.forEach((img, index) => {
      // Cargar solo las primeras 3 imágenes inmediatamente
      if (index < 3) {
        if (img.hasAttribute('data-src')) {
          img.src = img.getAttribute('data-src');
          img.classList.add('lazy-loaded');
        }
      } else {
        // Las demás con lazy loading
        if (!img.hasAttribute('data-src') && img.src) {
          img.setAttribute('data-src', img.src);
          img.src = '';
          img.classList.add('lazy-loading');
        }
      }
    });
  });
}

// Inicializar lazy loading cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar lazy loading
  window.lazyImageLoader = new LazyImageLoader();

  // Optimizar galerías
  optimizeGalleryImages();

  // Re-observar imágenes cuando se cargue contenido dinámico
  const observeDynamicContent = () => {
    if (window.lazyImageLoader) {
      window.lazyImageLoader.observeImages();
    }
  };

  // Observar cambios en el DOM para nuevas imágenes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && (node.tagName === 'IMG' || node.querySelectorAll)) {
          const images = node.tagName === 'IMG' ? [node] : node.querySelectorAll('img');
          images.forEach(img => {
            if (window.lazyImageLoader && !img.hasAttribute('data-src') && img.src && !window.lazyImageLoader.isElementInViewport(img)) {
              window.lazyImageLoader.convertToLazy(img);
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

// ===== FIN SISTEMA DE LAZY LOADING =====

// ===== SISTEMA DE OPTIMIZACIÓN DE CONSULTAS FIREBASE =====

class FirebaseQueryOptimizer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  // Método para consultas con cache
  async queryWithCache(collectionName, queryConstraints = [], options = {}) {
    const cacheKey = this.generateCacheKey(collectionName, queryConstraints);
    const cached = this.getFromCache(cacheKey);

    if (cached && !options.forceRefresh) {
      return cached;
    }

    try {
      let queryRef = collection(db, collectionName);

      // Aplicar constraints
      if (queryConstraints.length > 0) {
        queryRef = query(queryRef, ...queryConstraints);
      }

      // Aplicar límite por defecto si no se especifica
      if (!queryConstraints.some(c => c.type === 'limit') && !options.noLimit) {
        queryRef = query(queryRef, limit(50));
      }

      const snapshot = await getDocs(queryRef);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Cachear resultado
      this.setCache(cacheKey, data);

      return data;
    } catch (error) {
      console.error(`Error querying ${collectionName}:`, error);
      throw error;
    }
  }

  // Método para consultas paralelas
  async parallelQueries(queries) {
    const promises = queries.map(({ collection: collectionName, constraints, options }) =>
      this.queryWithCache(collectionName, constraints, options)
    );

    try {
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Error in parallel queries:', error);
      throw error;
    }
  }

  // Método para consultas paginadas
  async queryPaginated(collectionName, queryConstraints = [], pageSize = 20, startAfter = null) {
    try {
      let queryRef = collection(db, collectionName);

      if (queryConstraints.length > 0) {
        queryRef = query(queryRef, ...queryConstraints);
      }

      queryRef = query(queryRef, limit(pageSize));

      if (startAfter) {
        queryRef = query(queryRef, startAfter(startAfter));
      }

      const snapshot = await getDocs(queryRef);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return {
        data,
        hasMore: snapshot.docs.length === pageSize,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error(`Error in paginated query for ${collectionName}:`, error);
      throw error;
    }
  }

  // Utilidades de cache
  generateCacheKey(collectionName, constraints) {
    const constraintsStr = constraints.map(c => JSON.stringify(c)).join('|');
    return `${collectionName}:${constraintsStr}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Eliminar cache expirado
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // Método para pre-cargar datos críticos
  async preloadCriticalData(user) {
    if (!user || !user.programa) return;

    const criticalQueries = [
      {
        collection: 'classes',
        constraints: [where('programa', '==', user.programa), limit(10)],
        options: { forceRefresh: false }
      },
      {
        collection: 'evaluaciones',
        constraints: [where('programa', '==', user.programa), limit(5)],
        options: { forceRefresh: false }
      }
    ];

    try {
      await this.parallelQueries(criticalQueries);
      console.log('Critical data preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload critical data:', error);
    }
  }
}

// Inicializar optimizador de consultas
window.firebaseOptimizer = new FirebaseQueryOptimizer();

// Función helper para consultas optimizadas
window.queryOptimized = (collectionName, constraints, options) =>
  window.firebaseOptimizer.queryWithCache(collectionName, constraints, options);

// Función helper para consultas paralelas
window.parallelQueries = (queries) =>
  window.firebaseOptimizer.parallelQueries(queries);

// ===== FIN SISTEMA DE OPTIMIZACIÓN DE CONSULTAS =====
