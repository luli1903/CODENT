// /js/auth-modal.js
import { signIn, signUp, resendVerificationEmail, onAuthStateChange } from "/auth.js";

const TEMPLATE = `
<div id="authModal" class="auth-modal" role="dialog" aria-modal="true" hidden>
  <div class="auth-backdrop" data-close></div>
  <div class="auth-card" role="document" aria-labelledby="authTitle">
    <button class="auth-close" data-close aria-label="Cerrar">×</button>
    <h3 id="authTitle" class="auth-title">Mi Cuenta</h3>

    <nav class="auth-tabs" role="tablist">
      <button class="auth-tab is-active" data-tab="login"  role="tab" aria-selected="true">Ingresar</button>
      <button class="auth-tab"           data-tab="signup" role="tab" aria-selected="false">Crear cuenta</button>
    </nav>

    <section class="auth-panel is-active" data-panel="login" role="tabpanel">
      <form id="authLoginForm" class="auth-form" autocomplete="on">
        <label>Email
          <input id="authLoginEmail" type="email" required />
        </label>
        <label>Contraseña
          <input id="authLoginPass" type="password" required />
        </label>
        <small id="authLoginMsg" class="auth-msg"></small>
        <button class="btn primary" type="submit">Ingresar</button>
      </form>
    </section>

    <section class="auth-panel" data-panel="signup" role="tabpanel" aria-hidden="true">
      <form id="authSignForm" class="auth-form" autocomplete="on">
        <label>Email
          <input id="authSignEmail" type="email" required />
        </label>
        <label>Contraseña (mín. 6)
          <input id="authSignPass" type="password" minlength="6" required />
        </label>
        <small class="auth-msg">Te enviaremos un correo para <b>verificar</b> tu cuenta.</small>
        <button class="btn primary" type="submit">Crear cuenta</button>
      </form>
      <div class="auth-help">
        <button id="authResend" class="btn" type="button">Reenviar verificación</button>
        <small id="authResendMsg" class="auth-msg"></small>
      </div>
    </section>
  </div>
</div>
`;

const STYLES = `
.auth-modal[hidden]{display:none}
.auth-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:saturate(80%) blur(3px)}
.auth-card{position:fixed;inset:auto auto 0 0;right:0;left:0;margin:0 auto 8vh auto;width:min(420px,92%);
  background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.18);padding:16px 16px 18px}
@media(min-width:640px){.auth-card{inset:0;margin:auto}}
.auth-title{font:800 1.25rem/1.2 system-ui;margin:0 28px 10px 0;color:#0f172a}
.auth-close{position:absolute;top:10px;right:12px;border:1px solid #e2e8f0;background:#fff;border-radius:10px;cursor:pointer;width:32px;height:32px}
.auth-tabs{display:flex;gap:6px;margin:6px 0 12px}
.auth-tab{flex:1;border:1px solid #e2e8f0;background:#fff;border-radius:12px;padding:.5rem .6rem;cursor:pointer}
.auth-tab.is-active{border-color:#0ea5e9;box-shadow:0 0 0 2px color-mix(in srgb,#0ea5e9 28%,transparent)}
.auth-panel{display:none}
.auth-panel.is-active{display:block}
.auth-form{display:grid;gap:.7rem}
.auth-form label{display:grid;gap:.3rem;font:600 .95rem/1.2 system-ui;color:#0f172a}
.auth-form input{border:1px solid #e2e8f0;border-radius:12px;padding:.55rem .7rem;font:500 .95rem system-ui}
.btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;border-radius:12px;padding:.55rem .85rem;background:#fff;cursor:pointer}
.btn.primary{background:#0ea5e9;border-color:#0ea5e9;color:#fff}
.auth-msg{color:#64748b}
.auth-help{display:flex;align-items:center;gap:.6rem;margin-top:.6rem}
`;

function ensureMounted(){
  if (document.getElementById("authModal")) return;
  const style = document.createElement("style");
  style.textContent = STYLES;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.innerHTML = TEMPLATE;
  document.body.appendChild(wrap.firstElementChild);

  // Tabs
  const tabs = [...document.querySelectorAll(".auth-tab")];
  const panels = [...document.querySelectorAll(".auth-panel")];
  tabs.forEach(t=>{
    t.addEventListener("click", ()=>{
      const id = t.dataset.tab;
      tabs.forEach(b=>b.classList.toggle("is-active", b===t));
      panels.forEach(p=>p.classList.toggle("is-active", p.dataset.panel===id));
    });
  });

  // Close
  document.getElementById("authModal").addEventListener("click", (e)=>{
    if (e.target.closest("[data-close]")) closeAuthModal();
  });

  // Forms
  const loginForm = document.getElementById("authLoginForm");
  const signForm  = document.getElementById("authSignForm");
  const resendBtn = document.getElementById("authResend");

  loginForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("authLoginEmail").value.trim();
    const pass  = document.getElementById("authLoginPass").value;
    const msg   = document.getElementById("authLoginMsg");
    msg.textContent = "";
    try{
      await signIn(email, pass);
      msg.textContent = "Ingresaste. Cerrando…";
      setTimeout(closeAuthModal, 400);
    }catch(err){
      msg.textContent = err?.message || "No se pudo iniciar sesión.";
    }
  });

  signForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("authSignEmail").value.trim();
    const pass  = document.getElementById("authSignPass").value;
    const m     = document.getElementById("authResendMsg");
    m.textContent = "";
    try{
      await signUp(email, pass);
      m.textContent = "Te enviamos un correo para verificar tu cuenta.";
    }catch(err){
      m.textContent = err?.message || "No se pudo registrar.";
    }
  });

  resendBtn?.addEventListener("click", async ()=>{
    const m = document.getElementById("authResendMsg");
    m.textContent = "";
    try{
      await resendVerificationEmail();
      m.textContent = "Email de verificación reenviado.";
    }catch(err){
      m.textContent = err?.message || "No se pudo reenviar.";
    }
  });

  // Cerrar modal automáticamente cuando haya sesión
  onAuthStateChange((user)=>{
    if (user) closeAuthModal();
  });
}

export function openAuthModal(tab="login"){
  ensureMounted();
  const modal = document.getElementById("authModal");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  // activar tab
  document.querySelectorAll(".auth-tab").forEach(b=>{
    const active = b.dataset.tab === tab;
    b.classList.toggle("is-active", active);
    document.querySelector(`.auth-panel[data-panel="${b.dataset.tab}"]`)
      ?.classList.toggle("is-active", active);
  });
}

export function closeAuthModal(){
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

// Auto-bind: cualquier elemento con data-open-auth abre el modal
document.addEventListener("click", (e)=>{
  const btn = e.target.closest("[data-open-auth]");
  if (!btn) return;
  const tab = btn.dataset.tab || "login";
  openAuthModal(tab);
});
