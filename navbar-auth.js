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
  el.style.removeProperty('display');
  el.style.setProperty('display','inline-block','important');
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

// abrir modal
els.login?.addEventListener('click', (e) => {
  e.preventDefault();
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

// logout robusto
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

document.addEventListener('DOMContentLoaded', paint);
onAuthStateChange(paint);
