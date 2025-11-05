// /js/auth-modal.js
import { signIn, signUp, resendVerificationEmail, onAuthStateChange, requestPasswordReset as _requestPasswordReset } from "/auth.js";

const requestPasswordReset = typeof _requestPasswordReset === "function"
  ? _requestPasswordReset
  : async (email) => { // fallback: redirige a tu página de reset si no hay función
      location.href = `/reset.html?email=${encodeURIComponent(email)}`;
    };

const TEMPLATE = `
<div id="authModal" class="auth-modal" role="dialog" aria-modal="true" hidden>
  <div class="auth-backdrop" data-close></div>
  <div class="auth-card" role="document" aria-labelledby="authTitle">
    <button class="auth-close" data-close aria-label="Cerrar">×</button>
    <h3 id="authTitle" class="auth-title">Mi Cuenta</h3>

    <nav class="auth-tabs" role="tablist">
      <button class="auth-tab is-active" data-tab="login"  role="tab" aria-selected="true">Ingresar</button>
      <button class="auth-tab"           data-tab="signup" role="tab" aria-selected="false">Crear cuenta</button>
      <button class="auth-tab"           data-tab="recover" role="tab" aria-selected="false">Recuperar</button>
    </nav>

    <!-- Login -->
    <section class="auth-panel is-active" data-panel="login" role="tabpanel">
      <form id="authLoginForm" class="auth-form" autocomplete="on">
        <label>Email
          <input id="authLoginEmail" type="email" required />
        </label>
        <label>Contraseña
          <input id="authLoginPass" type="password" required />
        </label>
        <small id="authLoginMsg" class="auth-msg"></small>
        <div class="auth-actions">
          <small class="auth-msg">¿Olvidaste tu contraseña? <button class="link" type="button" data-open="recover">Recuperar</button></small>
          <button class="btn primary" type="submit">Ingresar</button>
        </div>
      </form>
    </section>

    <!-- Signup -->
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

    <!-- Recover -->
    <section class="auth-panel" data-panel="recover" role="tabpanel" aria-hidden="true">
      <form id="authRecoverForm" class="auth-form" autocomplete="on">
        <label>Email
          <input id="authRecoverEmail" type="email" required />
        </label>
        <small id="authRecoverMsg" class="auth-msg"></small>
        <div class="auth-actions">
          <button class="btn" type="button" data-open="login">Volver</button>
          <button class="btn primary" type="submit">Enviar enlace</button>
        </div>
      </form>
    </section>
  </div>
</div>
`;


const STYLES = `
.auth-modal[hidden]{display:none}
.auth-modal{position:fixed; inset:0; z-index:9999}
.auth-backdrop{
  position:fixed; inset:0; z-index:0;
  background:rgba(15,23,42,.45);
  backdrop-filter:saturate(120%) blur(4px);
  -webkit-backdrop-filter:saturate(120%) blur(4px);
}
.auth-card{
  position:fixed; inset:0; margin:auto; z-index:1; box-sizing:border-box;
  width:min(720px, 92vw);
  max-height:88vh; overflow:auto; overscroll-behavior:contain;
  background:#fff; border:1px solid var(--line, #e2e8f0);
  border-radius:22px; box-shadow:0 22px 60px rgba(2,6,23,.22);
  padding:20px 22px 22px;
}
@media (max-height:560px){ .auth-card{ max-height:92vh } }

.auth-title{font:800 clamp(18px,2.6vw,22px)/1.2 "Raleway", system-ui; margin:0 40px 12px 2px; color:var(--ink,#0f172a)}
.auth-close{
  position:absolute; top:14px; right:16px;
  width:36px; height:36px; border-radius:12px; display:grid; place-items:center;
  border:1px solid var(--line,#e2e8f0); background:#fff; cursor:pointer;
  box-shadow:0 2px 10px rgba(0,0,0,.06);
}
.auth-close:hover{ background:#f8fafc }

.auth-tabs{ display:flex; gap:12px; margin:8px 0 16px }
.auth-tab{
  flex:1; padding:.8rem 1rem; border-radius:14px; font-weight:800;
  border:1px solid var(--sky-600, #96B1D9);
  background:var(--sky, #D1E5FF); color:var(--ink,#0f172a);
  box-shadow:0 2px 12px rgba(0,0,0,.06);
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
}
.auth-tab:hover{ transform: translateY(-1px); box-shadow:0 8px 22px rgba(0,0,0,.10) }
.auth-tab.is-active{ outline: 2px solid color-mix(in srgb, var(--sky) 35%, transparent) }

.auth-panel{ display:none }
.auth-panel.is-active{ display:block }

.auth-form{ display:grid; gap:.9rem }
.auth-form label{ display:grid; gap:.35rem; font:600 .95rem/1.2 system-ui; color:var(--ink,#0f172a) }
.auth-form input{
  border:1px solid var(--line,#e2e8f0);
  border-radius:14px; padding:.75rem 1rem; font:500 .96rem system-ui; background:#fff;
}
.auth-form input:focus{
  outline:none;
  box-shadow:0 0 0 3px color-mix(in srgb, var(--sky) 40%, transparent);
  border-color: var(--sky-600,#96B1D9);
}

.auth-msg{ color:#64748b }
.auth-help{ display:flex; align-items:center; gap:.8rem; margin-top:.8rem }

.auth-actions{
  display:flex; align-items:center; justify-content:space-between; gap:.8rem; margin-top:.4rem;
}

/* Botones pastel (celeste → hover mocha) */
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:.45rem;
  border-radius:14px; padding:.9rem 1.2rem;
  border:1px solid var(--sky-600,#96B1D9);
  background:var(--sky,#D1E5FF); color:var(--ink,#0f172a);
  font-weight:800; letter-spacing:.2px; cursor:pointer;
  box-shadow:0 2px 12px rgba(0,0,0,.06);
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease, color .18s ease;
}
.btn:hover{
  transform: translateY(-1px);
  background:var(--mocha,#7B5E57); border-color:var(--mocha,#7B5E57); color:#fff;
}
.btn.primary{ background:var(--sky,#D1E5FF); border-color:var(--sky-600,#96B1D9); color:var(--ink,#0f172a) }

/* Link sutil dentro del modal */
.link{
  background:none; border:0; padding:0; margin:0; cursor:pointer;
  color: var(--mocha,#7B5E57); font-weight:800; text-decoration: underline; text-underline-offset: 2px;
}
`;



function ensureMounted(){
  // si ya está montado, no duplicar
  if (document.getElementById("authModal")) return;

  // inyectar estilos del modal
  const style = document.createElement("style");
  style.textContent = STYLES;
  document.head.appendChild(style);

  // montar HTML del modal
  const wrap = document.createElement("div");
  wrap.innerHTML = TEMPLATE;
  document.body.appendChild(wrap.firstElementChild);

  // refs básicas
  const modal   = document.getElementById("authModal");
  const tabs    = [...document.querySelectorAll(".auth-tab")];
  const panels  = [...document.querySelectorAll(".auth-panel")];

  // ---- helper: activar un panel por id ----
  function openPanel(id){
    const $tabs   = [...document.querySelectorAll(".auth-tab")];
    const $panels = [...document.querySelectorAll(".auth-panel")];

    $tabs.forEach(b=>{
      const on = b.dataset.tab === id;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });

    $panels.forEach(p=>{
      const on = p.dataset.panel === id;
      p.classList.toggle("is-active", on);
      p.setAttribute("aria-hidden", on ? "false" : "true");
    });
  }

  // tabs (Ingresar / Crear / Recuperar)
  tabs.forEach(t=>{
    t.addEventListener("click", ()=> openPanel(t.dataset.tab));
  });

  // links internos: <button data-open="recover"> / data-open="login" / data-open="signup"
  document.addEventListener("click", (e)=>{
    const go = e.target.closest("[data-open]");
    if (go) openPanel(go.dataset.open);
  });

  // cerrar: botón X o click en backdrop
  modal.addEventListener("click", (e)=>{
    if (e.target.closest("[data-close]")) {
      closeAuthModal();
    }
  });

  // ===== Formularios =====
  // Login
  const loginForm = document.getElementById("authLoginForm");
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

  // Signup
  const signForm = document.getElementById("authSignForm");
  signForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("authSignEmail").value.trim();
    const pass  = document.getElementById("authSignPass").value;
    const m     = document.getElementById("authResendMsg");
    m.textContent = "";
    try{
      await signUp(email, pass);
      m.textContent = "Te enviamos un correo para verificar tu cuenta.";
      openPanel("recover"); // opcional: dirigir a “Recuperar” para reenviar/ver estado
    }catch(err){
      m.textContent = err?.message || "No se pudo registrar.";
    }
  });

  // Reenviar verificación
  const resendBtn = document.getElementById("authResend");
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

  // Recuperar contraseña
  const recoverForm = document.getElementById("authRecoverForm");
  recoverForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("authRecoverEmail").value.trim();
    const msg   = document.getElementById("authRecoverMsg");
    msg.textContent = "";
    try{
      await requestPasswordReset(email); // provisto por /auth.js o por tu fallback
      msg.textContent = "Te enviamos un enlace para restablecer tu contraseña.";
    }catch(err){
      msg.textContent = err?.message || "No se pudo enviar el enlace.";
    }
  });

  // cerrar automáticamente si hay sesión
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
