// /js/navbar-auth.js
import { getUser, isAdmin, onAuthStateChange, signOut } from '/auth.js';

const $ = (s) => document.querySelector(s);

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
  el.style.removeProperty('display');
  el.style.setProperty('display','inline-block','important');
}
function hide(el){
  if(!el) return;
  el.hidden = true;
  el.classList.add('d-none');
  el.style.setProperty('display','none','important');
}

async function paint(){
  const user = await getUser();
  console.log('[navbar] repaint →', user ? user.email : 'no user');

  if (!user) {
    show(els.login);
    hide(els.logout);
    hide(els.admin);
    return;
  }

  hide(els.login);
  show(els.logout);

  let admin = false;
  try { admin = await isAdmin(user.id); } catch {}
  admin ? show(els.admin) : hide(els.admin);
}

// Eventos de botones
els.login?.addEventListener('click', () => {
  const modal = els.modal;
  if (modal && window.jQuery?.fn?.modal) {
    window.jQuery('#loginModal').modal('show');
  } else if (modal) {
    modal.classList.add('show');
    modal.style.display = 'block';
  } else {
    location.href = '/login.html';
  }
});

els.logout?.addEventListener('click', async () => {
  try { await signOut(); } finally { await paint(); }
});

// Inicialización
document.addEventListener('DOMContentLoaded', paint);
onAuthStateChange(paint);
