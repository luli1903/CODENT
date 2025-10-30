// /js/navbar-auth.js
import { getUser, isAdmin, onAuthStateChange, signOut } from '/auth.js';

const $ = (sel) => document.querySelector(sel);
const els = {
  login:  $('#btnOpenLogin'),
  admin:  $('#btnAdmin'),
  logout: $('#btnLogout'),
  modal:  $('#loginModal'),
};

function show(el){
  if(!el) return;
  el.hidden = false;
  el.classList.remove('d-none');
  // No fuerzo inline-block si no hace falta
  el.style.removeProperty('display');
}
function hide(el){
  if(!el) return;
  el.hidden = true;
  el.classList.add('d-none');
  el.style.setProperty('display','none','important');
}

let painting = false;
async function paint(){
  if (painting) return;
  painting = true;
  try {
    const user = await getUser();

    if (!user) {
      show(els.login);
      hide(els.admin);
      hide(els.logout);
      return;
    }

    hide(els.login);
    show(els.logout);

    const admin = await isAdmin(user.id);
    admin ? show(els.admin) : hide(els.admin);
  } finally {
    painting = false;
  }
}

/* -------- Modal fallback (si no hay jQuery/Bootstrap) -------- */
function openModalFallback(modal) {
  if (!modal) return;
  // backdrop
  let backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fade show';
  backdrop.dataset._authBackdrop = '1';

  modal.classList.add('show');
  modal.style.display = 'block';
  document.body.classList.add('modal-open');
  document.body.style.paddingRight = '0px';
  document.body.appendChild(backdrop);

  // cerrar con click en backdrop o Esc
  const close = () => closeModalFallback(modal);
  backdrop.addEventListener('click', close, { once: true });
  document.addEventListener('keydown', function onKey(e){
    if (e.key === 'Escape') { 
      document.removeEventListener('keydown', onKey);
      close();
    }
  });
}
function closeModalFallback(modal) {
  if (!modal) return;
  modal.classList.remove('show');
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('padding-right');
  // remove backdrop
  document.querySelectorAll('.modal-backdrop[data-_authBackdrop="1"]').forEach(n => n.remove());
}

/* -------------------- Eventos -------------------- */
els.login?.addEventListener('click', (e) => {
  e.preventDefault();
  const modal = els.modal;
  if (modal && window.jQuery?.fn?.modal) {
    window.jQuery('#loginModal').modal('show');
  } else if (modal) {
    openModalFallback(modal);
  } else {
    // No hay modal embebido, ir a página dedicada
    location.href = '/login.html';
  }
});

els.logout?.addEventListener('click', async (e) => {
  e.preventDefault();
  try { await signOut(); } catch {}
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) localStorage.removeItem(k);
    });
  } catch {}
  location.reload();
});

// Pintar estado inicial (por si el DOMContentLoaded ya pasó)
paint();
document.addEventListener('DOMContentLoaded', paint);
onAuthStateChange(paint);
