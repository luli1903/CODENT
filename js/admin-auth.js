// /js/admin-auth.js
import { supabase } from '/js/supabaseClient.js';

const STORAGE_KEY = 'sb-chzofyepqjomxfekvoux-auth-token';
const API_URL = "https://chzofyepqjomxfekvoux.supabase.co/auth/v1/token?grant_type=password";
const APIKEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoem9meWVwcWpvbXhmZWt2b3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjQ2MjMsImV4cCI6MjA3MzAwMDYyM30.gldAo40K-YCPNdzgvDsqDpDtvYCTPn7KnVsww_RYFUw";

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const $ = (sel, root=document)=>root.querySelector(sel);

function setMsg(text, type='danger'){
  const el = $('#loginMsg');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'mt-2 small text-' + (type==='ok'?'success':type==='warn'?'warning':'danger');
  el.style.display = text ? 'block' : 'none';
}
function setBusy(isBusy){
  const btn = $('#btnDoLogin') || $('#loginForm button[type="submit"]');
  if (btn){ btn.disabled = isBusy; btn.textContent = isBusy ? 'Ingresando…' : 'Ingresar'; }
}
function closeModal(){
  if (window.jQuery?.fn?.modal) window.jQuery('#loginModal').modal('hide');
  else {
    const el = document.getElementById('loginModal');
    if (el){ el.classList.remove('show'); el.style.display = 'none'; }
  }
}

async function fetchToken(email, password){
  const ctrl = new AbortController();
  const id   = setTimeout(()=>ctrl.abort(), 8000); // 8s
  try{
    const rsp  = await fetch(API_URL, {
      method:'POST',
      headers:{
        'apikey': APIKEY,
        'Authorization': `Bearer ${APIKEY}`,
        'Content-Type':'application/json'
      },
      body: JSON.stringify({ email, password, gotrue_meta_security:{captcha_token:""} }),
      signal: ctrl.signal
    });
    const text = await rsp.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch{}
    if (!rsp.ok){
      const msg = json?.msg || json?.error_description || json?.error || `Error ${rsp.status}`;
      throw new Error(msg);
    }
    return json; // { access_token, refresh_token, user, ... }
  } finally {
    clearTimeout(id);
  }
}

async function setSessionOrFallback(tok){
  // 1) Intento con SDK
  const setPromise = supabase.auth.setSession({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token
  });

  const result = await Promise.race([
    setPromise.then(()=>({ok:true})).catch(err=>({ok:false, err})),
    new Promise(r=>setTimeout(()=>r({timeout:true}), 4000)) // 4s
  ]);

  if (result.timeout){
    // 2) Fallback localStorage
    const nowSec = Math.floor(Date.now()/1000);
    const expires_at = nowSec + (tok.expires_in ?? 3600);
    const value = {
      currentSession: {
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        token_type: tok.token_type || 'bearer',
        expires_in: tok.expires_in ?? 3600,
        expires_at,
        user: tok.user || null
      },
      expiresAt: expires_at,
      tokenRefreshTimestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  }
  if (!result.ok){
    throw result.err || new Error('No se pudo establecer la sesión.');
  }
  return true;
}

async function handleLogin(e){
  e?.preventDefault?.();
  setMsg('');
  setBusy(true);

  try{
    const email = $('#loginEmail')?.value?.trim() || '';
    const pass  = $('#loginPassword')?.value || '';
    if (!email || !pass) throw new Error('Completá email y contraseña.');

    const tok = await fetchToken(email, pass);
    await setSessionOrFallback(tok);

    // Verificación (no bloqueante)
    for (let i=0; i<10; i++){
      const s = (await supabase.auth.getSession()).data.session;
      if (s?.access_token) break;
      await sleep(150);
    }

    closeModal();
    location.reload();
  } catch(err){
    console.error('[login] ERROR', err);
    setMsg(err?.message || 'No se pudo iniciar sesión.');
    setBusy(false);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  console.log('[admin-auth] loaded v10');
  $('#loginForm')?.addEventListener('submit', handleLogin);
  $('#btnDoLogin')?.addEventListener('click', handleLogin);

  // Link "Recuperar"
  $('#linkReset')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const email = $('#loginEmail')?.value?.trim();
    if (!email){ setMsg('Ingresá tu email para recuperar.', 'warn'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/reset.html' });
    if (error) setMsg(error.message); else setMsg('Listo. Revisá tu correo y abrí el enlace.', 'ok');
  });
});
