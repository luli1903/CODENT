// /js/navbar-auth.js
import { supabase } from '/js/supabaseClient.js';
import { isAdmin, signOut, getUser, onAuthStateChange } from '/auth.js';

function show(el, v){ if (el) el.style.display = v ? 'inline-block' : 'none'; }

async function paint(){
  const btnOpenLogin = document.getElementById('btnOpenLogin');
  const btnAdmin = document.getElementById('btnAdmin');
  const btnLogout = document.getElementById('btnLogout');

  const user = await getUser();
  console.log('[navbar] user:', user?.id || null);

  if (!user){
    show(btnOpenLogin, true); show(btnAdmin, false); show(btnLogout, false);
    return;
  }
  // si hay user, pintar logout y admin si corresponde
  show(btnOpenLogin, false); show(btnLogout, true);

  try{
    const admin = await isAdmin(user.id);
    console.log('[navbar] isAdmin:', admin);
    show(btnAdmin, !!admin);
  } catch(e){
    console.warn('[navbar] isAdmin error', e);
    show(btnAdmin, false);
  }
}

window.addEventListener('DOMContentLoaded', ()=>{
  console.log('[navbar] loaded v10');

  // abrir modal
  document.getElementById('btnOpenLogin')?.addEventListener('click', ()=>{
    if (window.jQuery?.fn?.modal) window.jQuery('#loginModal').modal('show');
    else {
      const el = document.getElementById('loginModal');
      if (el){ el.style.display = 'block'; el.classList.add('show'); }
    }
  });

  // logout
  document.getElementById('btnLogout')?.addEventListener('click', async ()=>{
    try { await signOut(); } finally { localStorage.removeItem('sb-chzofyepqjomxfekvoux-auth-token'); location.reload(); }
  });

  // pintar al cargar
  paint();

  // y en cada cambio de sesión
  onAuthStateChange(()=>paint());
});

