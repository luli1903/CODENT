// js/admin-auth.js
import { supabase } from './supabaseClient.js'; // misma carpeta: ./ (no /)

const form  = document.getElementById('loginForm');
const email = document.getElementById('loginEmail');
const pass  = document.getElementById('loginPassword');
const btn   = document.getElementById('btnLogin');
const msg   = document.getElementById('loginMsg'); // <small> para feedback

function uiBusy(isBusy, text = 'Ingresar') {
  if (!btn) return;
  btn.disabled   = isBusy;
  btn.textContent = isBusy ? 'Ingresando…' : text;
}

async function doLogin(e) {
  e.preventDefault();
  msg && (msg.textContent = '');
  uiBusy(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: pass.value
  });

  if (error) {
    uiBusy(false);
    msg && (msg.textContent = error.message || 'No se pudo iniciar sesión.');
    return;
  }

  // ✅ si querés chequear admin:
  // const { data: row } = await supabase.from('admins')
  //   .select('user_id').eq('user_id', data.user.id).maybeSingle();
  // if (!row) {
  //   msg && (msg.textContent = 'Tu usuario no tiene permisos de administrador.');
  //   await supabase.auth.signOut();
  //   uiBusy(false, 'Ingresar');
  //   return;
  // }

  // cerrar modal / refrescar panel
  uiBusy(true, 'Listo');
  location.reload();
}

form?.addEventListener('submit', doLogin);
btn?.addEventListener('click', (e) => {
  // por si el botón no está dentro del <form>
  if (form && e) doLogin(e);
});
