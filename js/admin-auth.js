// /js/admin-auth.js
import { supabase } from '/js/supabaseClient.js';

const $ = (id) => document.getElementById(id);
const form  = $('loginForm');
const email = $('loginEmail');
const pass  = $('loginPassword');
const msg   = $('loginMsg');
const btn   = form?.querySelector('button[type="submit"]');
const linkReset = $('linkReset');

function busy(on, text = 'Ingresar') {
  if (!btn) return;
  btn.disabled = on;
  btn.textContent = on ? 'Ingresando…' : text;
}
function showMsg(text, color = 'red') {
  if (!msg) return;
  msg.style.display = text ? 'block' : 'none';
  msg.style.color = color;
  msg.textContent = text || '';
}
function closeModal() {
  const modal = document.getElementById('loginModal');
  if (!modal) return;
  if (window.jQuery?.fn?.modal) {
    window.jQuery('#loginModal').modal('hide');
  } else {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

async function isAdmin(userId) {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  } catch {
    return false;
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMsg('');
  busy(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: (email?.value || '').trim(),
      password: pass?.value || ''
    });

    if (error) throw error;
    const user = data?.user;
    if (!user) throw new Error('No se pudo abrir sesión.');

    // cerramos modal y redirigimos
    closeModal();

    const admin = await isAdmin(user.id);
    if (admin) {
      location.href = '/admin.html';
    } else {
      location.reload(); // solo repinta navbar
    }
  } catch (err) {
    showMsg(err?.message || 'No se pudo iniciar sesión.');
    busy(false);
  }
});

// Recuperar contraseña
linkReset?.addEventListener('click', async (e) => {
  e.preventDefault();
  const addr = (email?.value || '').trim();
  if (!addr) return showMsg('Ingresá tu email para recuperar.');
  const { error } = await supabase.auth.resetPasswordForEmail(addr, {
    redirectTo: location.origin + '/reset.html'
  });
  if (error) showMsg(error.message);
  else showMsg('Listo. Revisá tu correo y abrí el enlace.', 'green');
});
