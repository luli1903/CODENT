// /js/admin-auth.js (versión debug)
import { supabase } from '/js/supabaseClient.js';

function $(sel, root=document){ return root.querySelector(sel); }
function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

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

async function handleLogin(e){
  e?.preventDefault?.();
  const modal = document.getElementById('loginModal');
  if (!modal) return;

  const email = $('#loginEmail', modal)?.value?.trim() || '';
  const pass  = $('#loginPassword', modal)?.value || '';

  setMsg(modal,'');
  setBusy(modal,true);

  // ⚠️ timeout duro para no colgar
  const KILL_AFTER_MS = 6000;
  const kill = delay(KILL_AFTER_MS).then(()=>({ timeout:true }));

  // login real
  const doLogin = (async ()=>{
    try{
      if (!email || !pass) throw new Error('Completá email y contraseña.');
      console.log('[login] calling signInWithPassword', { email });

      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      console.log('[login] token rsp:', { hasUser: !!data?.user, error });

      if (error) return { error };
      // no esperamos nada más: redirigimos
      return { ok:true };
    }catch(err){
      return { error: err };
    }
  })();

  // carrera entre login y timeout
  const result = await Promise.race([doLogin, kill]);

  try{
    if (result?.timeout){
      console.error('[login] timeout');
      throw new Error('El inicio de sesión tardó demasiado. Probá de nuevo.');
    }
    if (result?.error){
      console.error('[login] error', result.error);
      throw new Error(result.error?.message || 'No se pudo iniciar sesión.');
    }
    // éxito
    console.log('[login] OK → redirect');
    closeModal(modal);
    // opcional: si querés ir directo al panel de admin, usá: location.href = '/admin.html';
    location.reload();
  }catch(err){
    setMsg(modal, err.message);
  }finally{
    setBusy(modal,false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('loginModal');
  if (!modal) return;
  const form = $('#loginForm', modal);
  const btn  = $('#btnDoLogin', modal) || $('button[type="submit"]', modal);

  form?.addEventListener('submit', handleLogin);
  btn?.addEventListener('click', handleLogin);
  console.log('[login] ready (debug build)');
});
