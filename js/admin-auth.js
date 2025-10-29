// js/admin-auth.js
import { signIn } from '/auth.js';

document.addEventListener('DOMContentLoaded', () => {
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
    e?.preventDefault?.();
    if (msg) msg.textContent = '';
    uiBusy(true);

    try {
      await signIn(email.value.trim(), pass.value);
      uiBusy(true, 'Listo');
      // Si lo usás dentro de modal, podés cerrarlo aquí si existe:
      const modal = document.getElementById('loginModal');
      if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
      }
      location.reload();
    } catch (error) {
      uiBusy(false);
      if (msg) msg.textContent = error?.message || 'No se pudo iniciar sesión.';
      return;
    }
  }

  form?.addEventListener('submit', doLogin);
  btn?.addEventListener('click', (e) => {
    // por si el botón no está dentro del <form>
    if (form && e) doLogin(e);
  });
});
