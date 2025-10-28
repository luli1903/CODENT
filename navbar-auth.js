// /js/navbar-auth.js
import { onAuthStateChange, isAdmin, getUser, signOut } from "/js/auth.js";

function showLoginOnly(btnLogin, btnAdmin, btnLogout) {
  if (btnLogin)  btnLogin.style.display  = "inline-block";
  if (btnAdmin)  btnAdmin.style.display  = "none";
  if (btnLogout) btnLogout.style.display = "none";
}

function showAdminOnly(btnLogin, btnAdmin, btnLogout) {
  if (btnLogin)  btnLogin.style.display  = "none";
  if (btnAdmin)  btnAdmin.style.display  = "inline-block";
  if (btnLogout) btnLogout.style.display = "inline-block";
}

function showLoggedOnly(btnLogin, btnAdmin, btnLogout) {
  if (btnLogin)  btnLogin.style.display  = "none";
  if (btnAdmin)  btnAdmin.style.display  = "none";
  if (btnLogout) btnLogout.style.display = "inline-block";
}

window.addEventListener("DOMContentLoaded", () => {
  const btnLogin  = document.getElementById("btnLogin");
  const btnAdmin  = document.getElementById("btnAdmin");
  const btnLogout = document.getElementById("btnLogout");

  // Estado inicial
  showLoginOnly(btnLogin, btnAdmin, btnLogout);

  // 🔹 Click Login → abrir modal
  btnLogin?.addEventListener("click", () => {
    const modalEl = document.getElementById("loginModal");
    if (!modalEl) {
      window.location.href = "/login.html";
      return;
    }

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
    } catch {
      modalEl.style.display = "block";
      modalEl.classList.add("show");
    }
  });

  // 🔹 Click Logout → cerrar sesión
  btnLogout?.addEventListener("click", async () => {
    try {
      await signOut();
      location.reload();
    } catch (err) {
      console.error("[logout]", err);
    }
  });

  // 🔹 Escuchar cambios de sesión Supabase
  onAuthStateChange(async () => {
    const user = await getUser();
    if (!user) return showLoginOnly(btnLogin, btnAdmin, btnLogout);

    const admin = await isAdmin(user.id);
    if (admin) {
      showAdminOnly(btnLogin, btnAdmin, btnLogout);
    } else {
      showLoggedOnly(btnLogin, btnAdmin, btnLogout);
    }
  });
});
