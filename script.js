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

let confirmRequiredWord = 'CONFIRMAR';

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

if (confirmCancel) confirmCancel.addEventListener('click', ()=>{ closeConfirm(); });
if (confirmOk) confirmOk.addEventListener('click', async ()=>{
  if(typeof confirmCallback === 'function'){
    try{ await confirmCallback(); }catch(e){ console.error(e); }
  }
  closeConfirm();
});
// Cerrar al hacer click fuera
if (confirmModal) confirmModal.addEventListener('click', (e)=>{ if(e.target === confirmModal) closeConfirm(); });

// Habilitar el botón Confirmar sólo si el usuario escribe la palabra configurada (case-insensitive)
if (confirmInput) {
  confirmInput.addEventListener('input', ()=>{
    const val = (confirmInput.value || '').trim().toUpperCase();
    if(val === (confirmRequiredWord || 'CONFIRMAR').toUpperCase()){
      if (confirmOk) confirmOk.removeAttribute('disabled');
    } else {
      if (confirmOk) confirmOk.setAttribute('disabled','');
    }
  });
  // Permitir Enter para confirmar cuando esté habilitado
  confirmInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      if (confirmOk && !confirmOk.hasAttribute('disabled')) confirmOk.click();
    }
  });
}
// fin de script

// Filtrado genérico por programa utilizado por admin/estudiante
function filterByProgram(items) {
  try {
    if (!Array.isArray(items)) return items;
    // Preferencia de filtro en página (busca selects comunes)
    const sel = document.getElementById('filterPrograma') || document.getElementById('programFilter') || null;
    const value = sel ? (sel.value || '') : '';
    if (!value || value === 'Todos') return items;
    return items.filter(it => {
      const prog = (it.programa || it.program || it.programName || '').toString();
      return prog === value || prog.includes(value);
    });
  } catch (e) {
    console.error('filterByProgram error', e);
    return items;
  }
}
