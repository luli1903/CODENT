// /js/admin-auth.js
import { supabase } from '/js/supabaseClient.js';
import { signIn } from '/auth.js';

function $(sel, root=document){ return root.querySelector(sel); }

function setMsg(modal, text, type='danger'){
  const msg = $('#loginMsg', modal);
  if (!msg) return;
  msg.textContent = text || '';
  msg.className = 'mt-2 small text-' + (type==='ok'?'success':type==='warn'?'warning':'danger');
  msg.style.display = text ? 'block' : 'none';
}

function setBusy(modal, isBusy){
  const btn = $('#btnDoLogin', modal) || $('button[type="submit"]', modal);
  if (!btn) return;
  btn.disabled = isBusy;
  btn.textContent = isBusy ? 'Ingresando…' : 'Ingresar';
}

function closeModal(modal){
  if (!modal) return;
  if (window.jQuery?.fn?.modal) {
    window.jQuery('#loginModal').modal('hide');
  } else {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

async function waitForSession(maxMs=4000, step=200){
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const { data:{ user } } = await supabase.auth.getUser();
    if (user) return user;
    await new Promise(r=>setTimeout(r, step));
  }
  return null;
}

async function handleLogin(e){
  e?.preventDefault?.();
  const modal = document.getElementById('loginModal');
  if (!modal) return;

  const email = $('#loginEmail', modal)?.value?.trim() || '';
  const pass  = $('#loginPassword', modal)?.value || '';

  setMsg(modal, '');
  setBusy(modal, true);

  try{
    if (!email || !pass) throw new Error('Completá email y contraseña.');
    console.log('[login] signIn start', email);

    // 1) login
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;

    // 2) esperamos la sesión (con timeout)
    const user = await waitForSession();
    if (!user) throw new Error('No se pudo establecer la sesión. Probá de nuevo.');

    console.log('[login] OK user', user.id);

    // 3) cerrar modal y refrescar (navbar se actualiza)
    closeModal(modal);
    location.reload();

  } catch (err){
    console.error('[login] error', err);
    setMsg(modal, err?.message || 'No se pudo iniciar sesión.');
  } finally {
    // siempre devolvemos el botón
    setBusy(modal, false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('loginModal');
  if (!modal) return;
  const form = $('#loginForm', modal);
  const btn  = $('#btnDoLogin', modal) || $('button[type="submit"]', modal);

  form?.addEventListener('submit', handleLogin);
  btn?.addEventListener('click', handleLogin);
  console.log('[login] ready');
});
