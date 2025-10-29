// /js/navbar-auth.js
import { onAuthStateChange, isAdmin, getUser, signOut } from "/auth.js";

function set(el, show){ if(el) el.style.display = show ? "inline-block" : "none"; }

function stateLoggedOut(btnLogin, btnAdmin, btnLogout){
  set(btnLogin, true); set(btnAdmin, false); set(btnLogout, false);
  console.log("[navbar] state: logged OUT");
}
function stateLoggedInNonAdmin(btnLogin, btnAdmin, btnLogout){
  set(btnLogin, false); set(btnAdmin, false); set(btnLogout, true);
  console.log("[navbar] state: logged IN (no admin)");
}
function stateAdmin(btnLogin, btnAdmin, btnLogout){
  set(btnLogin, false); set(btnAdmin, true); set(btnLogout, true);
  console.log("[navbar] state: ADMIN");
}

window.addEventListener("DOMContentLoaded", () => {
  const btnLogin  = document.getElementById("btnLogin");
  const btnAdmin  = document.getElementById("btnAdmin");
  const btnLogout = document.getElementById("btnLogout");

  console.log("[navbar] loaded", {btnLogin:!!btnLogin, btnAdmin:!!btnAdmin, btnLogout:!!btnLogout});

  // Estado inicial
  stateLoggedOut(btnLogin, btnAdmin, btnLogout);

  // Abrir modal
  btnLogin?.addEventListener("click", () => {
    const modalEl = document.getElementById("loginModal");
    if (!modalEl) { location.href = "/login.html"; return; }
    try {
      if (window.bootstrap?.Modal) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      } else if (window.jQuery) {
        window.jQuery("#loginModal").modal("show");
      } else {
        modalEl.style.display = "block";
        modalEl.classList.add("show");
      }
    } catch(e){ console.error("[navbar] modal error", e); }
  });

  // Logout
  btnLogout?.addEventListener("click", async () => {
    try { await signOut(); } finally { location.reload(); }
  });

  // Pintar según sesión
  const decide = async () => {
    const user = await getUser();
    console.log("[navbar] user:", user?.id || null);
    if (!user) return stateLoggedOut(btnLogin, btnAdmin, btnLogout);
    try {
      const admin = await isAdmin(user.id);
      console.log("[navbar] isAdmin:", admin);
      admin ? stateAdmin(btnLogin, btnAdmin, btnLogout)
            : stateLoggedInNonAdmin(btnLogin, btnAdmin, btnLogout);
    } catch (e) {
      console.error("[navbar] isAdmin error", e);
      stateLoggedInNonAdmin(btnLogin, btnAdmin, btnLogout);
    }
  };

  // Inicial + suscripción
  decide();
  onAuthStateChange(decide);
});
