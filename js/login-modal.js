// /js/login-modal.js
import { signIn } from '/auth.js';

const $ = (s) => document.querySelector(s);

const els = {
  form:   $('#loginForm'),
  email:  $('#loginEmail'),
  pass:   $('#loginPassword'),
  msg:    $('#loginMsg'),
  btn:    $('#btnDoLogin'),
  modal:  $('#loginModal'),
};

function uiMsg(text, isErr = false) {
  if (!els.msg) return;
  els.msg.textContent = text || '';
  els.msg.style.display = text ? 'block' : 'none';
  els.msg.classList.toggle('text-danger', !!isErr);
  els.msg.classList.toggle('text-success', !isErr);
}

function uiBusy(busy, label = 'Ingresar') {
  if (!els.btn) return;
  els.btn.disabled = busy;
  els.btn.textContent = busy ? 'Ingresando...' : label;
}

// Cierra el modal con o sin jQuery/Bootstrap
function closeModal() {
  const m = els.modal;
  if (!m) return;
  if (window.jQuery?.fn?.modal) {
    window.jQuery(m).modal('hide');
  } else {
    m.classList.remove('show');
    m.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.querySelectorAll('.modal-backdrop').forEach(n => n.remove());
  }
}

let submitting = false;
async function handleSubmit(e) {
  e.preventDefault();
  if (submitting) return;
  submitting = true;
  uiMsg('');
  uiBusy(true);

  try {
    const email = els.email?.value?.trim();
    const pass  = els.pass?.value ?? '';

    if (!email || !pass) {
      uiMsg('Completá email y contraseña.', true);
      return;
    }

    await signIn(email, pass);

    uiMsg('¡Listo! Iniciaste sesión.');
    setTimeout(() => {
      closeModal();
      location.reload(); // simple: repinta navbar y todo
    }, 200);
  } catch (err) {
    const msg = err?.message || err?.error_description || 'No pudimos iniciar sesión.';
    uiMsg(msg, true);
  } finally {
    uiBusy(false);
    submitting = false;
  }
}

els.form?.addEventListener('submit', handleSubmit);

// Link “Recuperar”
document.getElementById('linkReset')?.addEventListener('click', (e) => {
  e.preventDefault();
  const email = encodeURIComponent(els.email?.value || '');
  window.location.href = `/recovery.html${email ? `?email=${email}` : ''}`;
});
