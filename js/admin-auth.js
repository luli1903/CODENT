// /js/admin-auth.js
import { signIn } from '/auth.js';

function $(id){ return document.getElementById(id); }

function setMsg(text, type='danger'){
  const msg = $('loginMsg');
  if (!msg) return;
  msg.textContent = text || '';
  msg.className = 'mt-2 small text-' + (
    type === 'ok' ? 'success' : type === 'warn' ? 'warning' : 'danger'
  );
  msg.style.display = text ? 'block' : 'none';
}

function setBusy(isBusy){
  const btn = $('btnLogin') || $('btnDoLogin') || $('loginForm')?.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = isBusy;
  btn.textContent = isBusy ? 'Ingresando…' : 'Ingresar';
}

function closeModal(){
  const el = $('loginModal');
  if (!el) return;
  if (window.jQuery?.fn?.modal) {
    window.jQuery('#loginModal').modal('hide');
  } else {
    el.classList.remove('show');
    el.style.display = 'none';
  }
}

async function handleLogin(e){
  e?.preventDefault?.();
  setMsg('');
  setBusy(true);

  const email = $('loginEmail')?.value?.trim() || '';
  const pass  = $('loginPassword')?.value || '';

  try{
    console.log('[login] try', email);
    await signIn(email, pass); // esto throwea si hay error
    console.log('[login] ok');
    closeModal();
    location.reload();
  }catch(err){
    console.error('[login] error', err);
    setMsg(err?.message || 'No se pudo iniciar sesión.');
    setBusy(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = $('loginForm');
  const btn  = $('btnLogin') || $('btnDoLogin') || form?.querySelector('button[type="submit"]');
  form?.addEventListener('submit', handleLogin);
  btn?.addEventListener('click', handleLogin);
});
