// /js/admin-auth.js  (login por fetch + setSession)
console.log('[admin-auth] build v6 LOADED from /js/admin-auth.js');

import { supabase } from '/js/supabaseClient.js';

function $(sel, root=document){ return root.querySelector(sel); }
const delay = (ms)=>new Promise(r=>setTimeout(r,ms));

function setMsg(modal, text, type='danger'){
  const msg = $('#loginMsg', modal);
  if (!msg) return;
  msg.textContent = text || '';
  msg.className = 'mt-2 small text-' + (type==='ok'?'success':type==='warn'?'warning':'danger');
  msg.style.display = text ? 'block' : 'none';
}

function setBusy(modal, isBusy){
  const btn = $('#btnDoLogin', modal) || $('button[type="submit"]', modal);
  if (btn){
    btn.disabled = isBusy;
    btn.textContent = isBusy ? 'Ingresando…' : 'Ingresar';
  }
}

function closeModal(modal){
  if (!modal) return;
  if (window.jQuery?.fn?.modal) $('#loginModal').modal('hide');
  else { modal.classList.remove('show'); modal.style.display = 'none'; }
}

// ⚙️ Usa el mismo endpoint que probaste en consola
async function fetchToken(email, password){
  const API_URL = "https://chzofyepqjomxfekvoux.supabase.co/auth/v1/token?grant_type=password";
  const APIKEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoem9meWVwcWpvbXhmZWt2b3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjQ2MjMsImV4cCI6MjA3MzAwMDYyM30.gldAo40K-YCPNdzgvDsqDpDtvYCTPn7KnVsww_RYFUw";

  const rsp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'apikey': APIKEY,
      'Authorization': `Bearer ${APIKEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      gotrue_meta_security: { captcha_token: "" }
    })
  });

  const text = await rsp.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* noop */ }

  if (!rsp.ok) {
    const msg = json?.msg || json?.error_description || json?.error || `Error ${rsp.status}`;
    throw new Error(msg);
  }
  return json; // { access_token, refresh_token, user, ... }
}

async function handleLogin(e){
  console.log('[admin-auth] handleLogin fired');
  e?.preventDefault?.();

  const modal = document.getElementById('loginModal');
  const email = document.querySelector('#loginModal #loginEmail')?.value?.trim() || '';
  const pass  = document.querySelector('#loginModal #loginPassword')?.value || '';

  setMsg(modal, '');
  setBusy(modal, true);

  const API_URL = "https://chzofyepqjomxfekvoux.supabase.co/auth/v1/token?grant_type=password";
  const APIKEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoem9meWVwcWpvbXhmZWt2b3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjQ2MjMsImV4cCI6MjA3MzAwMDYyM30.gldAo40K-YCPNdzgvDsqDpDtvYCTPn7KnVsww_RYFUw";

  try {
    if (!email || !pass) throw new Error('Completá email y contraseña.');

    console.time('[login] fetch token');
    const rsp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'apikey': APIKEY,
        'Authorization': `Bearer ${APIKEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password: pass,
        gotrue_meta_security: { captcha_token: "" }
      })
    });
    const text = await rsp.text();
    console.timeEnd('[login] fetch token');
    console.log('[login] token status:', rsp.status);

    let tok = {};
    try { tok = text ? JSON.parse(text) : {}; } catch(e) {
      console.warn('[login] parse token JSON fail', e, text);
    }
    if (!rsp.ok) {
      const msg = tok?.msg || tok?.error_description || tok?.error || `Error ${rsp.status}`;
      throw new Error(msg);
    }

    console.log('[login] got access_token?', !!tok.access_token, 'user?', !!tok.user);

    // Inyectar sesión en el SDK
    const { error: setErr } = await supabase.auth.setSession({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token
    });
    if (setErr) throw setErr;
    console.log('[login] setSession OK');

    // Pequeño loop para asegurarnos que el SDK expone el user
    for (let i = 0; i < 10; i++) {
      const { data:{ user } } = await supabase.auth.getUser();
      if (user) { console.log('[login] SDK user OK', user.id); break; }
      await new Promise(r=>setTimeout(r,150));
    }

    // Cerrar y refrescar
    closeModal(modal);
    location.reload();

  } catch (err) {
    console.error('[login] ERROR', err);
    setMsg(modal, err?.message || 'No se pudo iniciar sesión.');
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
});
