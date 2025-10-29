// /js/navbar-auth.js
import { onAuthStateChange, isAdmin, getUser, signOut } from "/auth.js";

function set(el, show){ if(el) el.style.display = show ? "inline-block" : "none"; }

function stateLoggedOut(btnOpenLogin, btnAdmin, btnLogout){
  set(btnOpenLogin, true); set(btnAdmin, false); set(btnLogout, false);
  console.log("[navbar] state: logged OUT");
}
function stateLoggedInNonAdmin(btnOpenLogin, btnAdmin, btnLogout){
  set(btnOpenLogin, false); set(btnAdmin, false); set(btnLogout, true);
  console.log("[navbar] state: logged IN (no admin)");
}
function stateAdmin(btnOpenLogin, btnAdmin, btnLogout){
  set(btnOpenLogin, false); set(btnAdmin, true); set(btnLogout, true);
  console.log("[navbar] state: ADMIN");
}

window.addEventListener("DOMContentLoaded", () => {
  const btnOpenLogin  = document.getElementById("btnOpenLogin");
  const btnAdmin  = document.getElementById("btnAdmin");
  const btnLogout = document.getElementById("btnLogout");

  console.log("[navbar] loaded", {btnOpenLogin:!!btnOpenLogin, btnAdmin:!!btnAdmin, btnLogout:!!btnLogout});

  // Estado inicial
  stateLoggedOut(btnOpenLogin, btnAdmin, btnLogout);

  // Abrir modal
  // /navbar-auth.js
btnOpenLogin?.addEventListener("click", () => {
  const hasModal = !!document.getElementById("loginModal");
  if (!hasModal) { location.href = "/login.html"; return; }
  if (window.jQuery?.fn?.modal) {
    window.jQuery("#loginModal").modal("show");
  } else {
    // fallback
    const el = document.getElementById("loginModal");
    el.style.display = "block";
    el.classList.add("show");
  }
});


  // Logout
  btnLogout?.addEventListener("click", async () => {
    try { await signOut(); } finally { location.reload(); }
  });

  // Pintar según sesión
  const decide = async () => {
    const user = await getUser();
    console.log("[navbar] user:", user?.id || null);
    if (!user) return stateLoggedOut(btnOpenLogin, btnAdmin, btnLogout);
    try {
      const admin = await isAdmin(user.id);
      console.log("[navbar] isAdmin:", admin);
      admin ? stateAdmin(btnOpenLogin, btnAdmin, btnLogout)
            : stateLoggedInNonAdmin(btnOpenLogin, btnAdmin, btnLogout);
    } catch (e) {
      console.error("[navbar] isAdmin error", e);
      stateLoggedInNonAdmin(btnOpenLogin, btnAdmin, btnLogout);
    }
  };

  // Inicial + suscripción
  decide();
  onAuthStateChange(decide);
});
