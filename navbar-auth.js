// /navbar-auth.js
import { onAuthStateChange, isAdmin, getUser } from "/auth.js";

function showLoginOnly(btnLogin, btnAdmin) {
  if (btnLogin) btnLogin.style.display = "inline-block";
  if (btnAdmin) btnAdmin.style.display = "none";
}
function showAdminOnly(btnLogin, btnAdmin) {
  if (btnLogin) btnLogin.style.display = "none";
  if (btnAdmin) btnAdmin.style.display = "inline-block";
}

window.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btnLogin");
  const btnAdmin = document.getElementById("btnAdmin");

  // Esta página puede no tener navbar; si no, salimos sin romper nada.
  if (!btnLogin && !btnAdmin) return;

  // Estado inicial seguro
  showLoginOnly(btnLogin, btnAdmin);

  // Abrir modal de login (si existe) o ir a login.html
  btnLogin?.addEventListener("click", () => {
    if (window.$ && window.$("#loginModal")?.modal) {
      $("#loginModal").modal("show");
      return;
    }
    window.location.href = "login.html";
  });

  // Reaccionar a cambios de sesión
  onAuthStateChange(async () => {
    const user = await getUser();
    if (!user) return showLoginOnly(btnLogin, btnAdmin);

    const admin = await isAdmin(user.id);
    admin ? showAdminOnly(btnLogin, btnAdmin) : showLoginOnly(btnLogin, btnAdmin);
  });
});

