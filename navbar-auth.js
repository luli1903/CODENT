// /js/navbar-auth.js – versión robusta con restauración de sesión
import { supabase } from '/js/supabaseClient.js';
import { isAdmin, signOut } from '/auth.js';

const STORAGE_KEY = 'sb-chzofyepqjomxfekvoux-auth-token';

function set(el, show){ if (el) el.style.display = show ? 'inline-block' : 'none'; }

function paintLoggedOut(btnOpenLogin, btnAdmin, btnLogout){
  set(btnOpenLogin, true); set(btnAdmin, false); set(btnLogout, false);
  console.log('[navbar] state: logged OUT');
}
function paintUser(btnOpenLogin, btnAdmin, btnLogout){
  set(btnOpenLogin, false); set(btnAdmin, false); set(btnLogout, true);
  console.log('[navbar] state: logged IN (no admin)');
}
function paintAdmin(btnOpenLogin, btnAdmin, btnLogout){
  set(btnOpenLogin, false); set(btnAdmin, true); set(btnLogout, true);
  console.log('[navbar] state: ADMIN');
}

async function ensureSessionFromStorage() {
  // 1) ¿El SDK ya tiene sesión?
  let { data:{ session } } = await supabase.auth.getSession();
  if (session?.access_token) return session;

  // 2) Si no, intentamos restaurar desde localStorage (fallback del login)
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const saved = JSON.parse(raw);
    const cs = saved?.currentSession;
    if (cs?.access_token && cs?.refresh_token) {
      console.log('[navbar] restoring session from localStorage');
      const { error } = await supabase.auth.setSession({
        access_token: cs.access_token,
        refresh_token: cs.refresh_token
      });
      if (error) {
        console.warn('[navbar] setSession restore error', error);
        return null;
      }
      // Reconsultamos
      ({ data:{ session } } = await supabase.auth.getSession());
      return session;
    }
  } catch (e) {
    console.warn('[navbar] restore parse error', e);
  }
  return null;
}

async function decide(btnOpenLogin, btnAdmin, btnLogout) {
  // Esperamos a que el SDK levante la sesión (o la restauramos)
  let session = (await supabase.auth.getSession()).data.session;
  if (!session) session = await ensureSessionFromStorage();

  const user = session?.user || (await supabase.auth.getUser()).data.user;
  console.log('[navbar] user:', user?.id || null);

  if (!user) return paintLoggedOut(btnOpenLogin, btnAdmin, btnLogout);

  try {
    const admin = await isAdmin(user.id);
    console.log('[navbar] isAdmin:', admin);
    admin ? paintAdmin(btnOpenLogin, btnAdmin, btnLogout)
          : paintUser(btnOpenLogin, btnAdmin, btnLogout);
  } catch (e) {
    console.error('[navbar] isAdmin error', e);
    paintUser(btnOpenLogin, btnAdmin, btnLogout);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const btnOpenLogin  = document.getElementById('btnOpenLogin');
  const btnAdmin      = document.getElementById('btnAdmin');
  const btnLogout     = document.getElementById('btnLogout');

  console.log('[navbar] loaded', { btnOpenLogin: !!btnOpenLogin, btnAdmin: !!btnAdmin, btnLogout: !!btnLogout });

  // Estado inicial seguro
  paintLoggedOut(btnOpenLogin, btnAdmin, btnLogout);

  // Abrir modal
  btnOpenLogin?.addEventListener('click', () => {
    const hasModal = !!document.getElementById('loginModal');
    if (!hasModal) { location.href = '/login.html'; return; }
    if (window.jQuery?.fn?.modal) window.jQuery('#loginModal').modal('show');
    else {
      const el = document.getElementById('loginModal');
      el.style.display = 'block'; el.classList.add('show');
    }
  });

  // Logout
  btnLogout?.addEventListener('click', async () => {
    try { await signOut(); }
    finally {
      // limpiamos también el fallback por si quedó
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });

  // 1) Pintar una vez al cargar (con restauración si hace falta)
  decide(btnOpenLogin, btnAdmin, btnLogout);

  // 2) Suscripción: también reacciona a INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[navbar] auth event', event, !!session?.user);
    await decide(btnOpenLogin, btnAdmin, btnLogout);
  });
});
