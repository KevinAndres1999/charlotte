export function showToast(message, type = 'info', timeout = 3500){
  let container = document.getElementById('toast-container');
  if(!container){
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.right = '18px';
    container.style.top = '18px';
    container.style.zIndex = 99999;
    document.body.appendChild(container);
  }

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  el.style.background = type==='error'? '#ef4444' : type==='success'? '#16a34a' : '#0b63a6';
  el.style.color = '#fff';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '10px';
  el.style.boxShadow = '0 8px 30px rgba(11,74,134,0.12)';
  el.style.marginTop = '8px';
  el.style.fontWeight = '700';
  el.style.maxWidth = '320px';
  el.style.opacity = '0';
  el.style.transition = 'opacity .18s ease, transform .18s ease';
  container.appendChild(el);
  requestAnimationFrame(()=>{ el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
  setTimeout(()=>{
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(()=>el.remove(), 250);
  }, timeout);
}
