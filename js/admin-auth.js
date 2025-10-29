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
  const email = document.querySelector('#loginModal #loginEmail')?.value?.trim() || '';
  const pass  = document.querySelector('#loginModal #loginPassword')?.value || '';

  setMsg(modal, '');
  setBusy(modal, true);

  // Endpoint y anon key (las que ya probaste con 200)
  const API_URL = "https://chzofyepqjomxfekvoux.supabase.co/auth/v1/token?grant_type=password";
  const APIKEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoem9meWVwcWpvbXhmZWt2b3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjQ2MjMsImV4cCI6MjA3MzAwMDYyM30.gldAo40K-YCPNdzgvDsqDpDtvYCTPn7KnVsww_RYFUw";

  // Clave de almacenamiento que usa Supabase Web v2
  const STORAGE_KEY = "sb-chzofyepqjomxfekvoux-auth-token";

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
      body: JSON.stringify({ email, password: pass, gotrue_meta_security: { captcha_token: "" } })
    });
    const text = await rsp.text();
    console.timeEnd('[login] fetch token');
    console.log('[login] token status:', rsp.status);

    let tok = {};
    try { tok = text ? JSON.parse(text) : {}; } catch(e){ console.warn('[login] parse JSON fail', e); }
    if (!rsp.ok) {
      const msg = tok?.msg || tok?.error_description || tok?.error || `Error ${rsp.status}`;
      throw new Error(msg);
    }
    console.log('[login] got access_token?', !!tok.access_token, 'true user?', !!tok.user);

    // ---------- 1) Intento normal: setSession con timeout ----------
    const setSessionPromise = supabase.auth.setSession({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token
    });

    const timeoutMs = 4000;
    const result = await Promise.race([
      setSessionPromise.then(res => ({ ok:true, res })).catch(err => ({ ok:false, err })),
      new Promise(r => setTimeout(()=>r({ timeout:true }), timeoutMs))
    ]);

    if (result?.timeout) {
      console.warn('[login] setSession timeout → fallback localStorage');

      // ---------- 2) Fallback: guardamos sesión nosotros ----------
      const nowSec = Math.floor(Date.now()/1000);
      const expires_at = nowSec + (tok.expires_in ?? 3600);

      // Estructura que espera supabase-js v2
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
        // campos que supabase puede leer
        // (no son estrictamente obligatorios, pero ayudan)
        tokenRefreshTimestamp: Date.now()
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        console.log('[login] localStorage fallback OK');
      } catch (e) {
        console.error('[login] localStorage fallback error', e);
        throw new Error('No se pudo guardar la sesión.');
      }
    } else if (!result.ok) {
      console.error('[login] setSession error', result.err);
      throw new Error(result.err?.message || 'No se pudo establecer la sesión.');
    } else {
      console.log('[login] setSession OK');
    }

    // Verificación breve (no bloqueante)
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      console.log('[login] SDK getSession →', !!session?.access_token);
    } catch {}

    // Cerrar y refrescar para que pinte la navbar
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
