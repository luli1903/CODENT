// /js/admin-auth.js — login robusto: fetch token + setSession + logs
import { supabase } from '/js/supabaseClient.js';

function $(sel, root=document){ return root.querySelector(sel); }
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

function setMsg(modal, text, type='danger'){
  const msg = $('#loginMsg', modal);
  if (!msg) return;
  msg.textContent = text || '';
  msg.className = 'mt-2 small text-' + (type==='ok'?'success':type==='warn'?'warning':'danger');
  msg.style.display = text ? 'block' : 'none';
}

function setBusy(modal, isBusy){
  const btn = $('#btnDoLogin', modal) || $('button[type="submit"]', modal);
  if (btn){ btn.disabled = isBusy; btn.textContent = isBusy ? 'Ingresando…' : 'Ingresar'; }
}

function closeModal(modal){
  if (window.jQuery?.fn?.modal) $('#loginModal').modal('hide');
  else { modal.classList.remove('show'); modal.style.display = 'none'; }
}

console.log('[admin-auth] build v7 LOADED from /js/admin-auth.js');

async function handleLogin(e){
  console.log('[admin-auth] handleLogin fired');
  e?.preventDefault?.();

  const modal = document.getElementById('loginModal');
  const email = $('#loginEmail', modal)?.value?.trim() || '';
  const pass  = $('#loginPassword', modal)?.value || '';

  setMsg(modal,''); setBusy(modal,true);

  // endpoint + key de tu proyecto (las mismas que probaste a mano)
  const API_URL = "https://chzofyepqjomxfekvoux.supabase.co/auth/v1/token?grant_type=password";
  const APIKEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoem9meWVwcWpvbXhmZWt2b3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjQ2MjMsImV4cCI6MjA3MzAwMDYyM30.gldAo40K-YCPNdzgvDsqDpDtvYCTPn7KnVsww_RYFUw";

  try{
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
        email, password: pass, gotrue_meta_security: { captcha_token: "" }
      })
    });
    const text = await rsp.text();
    console.timeEnd('[login] fetch token');
    console.log('[login] token status:', rsp.status);

    let tok = {};
    try { tok = text ? JSON.parse(text) : {}; } catch(e){ console.warn('[login] parse fail', e, text); }
    if (!rsp.ok){
      const msg = tok?.msg || tok?.error_description || tok?.error || `Error ${rsp.status}`;
      throw new Error(msg);
    }
    console.log('[login] got access_token?', !!tok.access_token, 'user?', !!tok.user);

    // ✅ SETEAR SESIÓN EN EL SDK
    const { error: setErr, data: setData } = await supabase.auth.setSession({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token
    });
    if (setErr) { console.error('[login] setSession error', setErr); throw setErr; }
    console.log('[login] setSession OK', setData?.user?.id || null);

    // Verificación: el SDK debe exponer la sesión y el user
    for (let i=0; i<12; i++){
      const s = (await supabase.auth.getSession()).data.session;
      if (s?.access_token){
        console.log('[login] SDK session OK (loop)', !!s?.access_token);
        break;
      }
      await sleep(150);
    }

    const { data:{ user } } = await supabase.auth.getUser();
    console.log('[login] SDK getUser →', user?.id || null);

    closeModal(modal);
    location.reload();

  }catch(err){
    console.error('[login] ERROR', err);
    setMsg(modal, err?.message || 'No se pudo iniciar sesión.');
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
});
