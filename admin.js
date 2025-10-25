import { onAuthStateChange, signIn, signOut, isAdmin } from "/auth.js";
import { listProducts, getProduct, createProduct, updateProduct, removeProduct, uploadProductImage } from "/db.js";

const $  = (id) => document.getElementById(id);
const qs = (sel, ctx=document) => ctx.querySelector(sel);

const loginSection = $("loginSection");
const crudSection  = $("crudSection");
const loginForm    = $("loginForm");
const loginMsg     = $("loginMsg");
const btnLogout    = $("btnLogout");
const productForm  = $("productForm");
const adminList    = $("adminList");

// ---------- UI helpers ----------
function toast(msg, type="success"){
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function setLoading(isLoading){
  const submitBtn = productForm.querySelector('[type="submit"]');
  const resetBtn  = $("btnReset");
  submitBtn.disabled = isLoading;
  resetBtn.disabled  = isLoading;
  if (isLoading) {
    submitBtn.dataset._txt = submitBtn.textContent;
    submitBtn.textContent = "Guardando…";
  } else {
    submitBtn.textContent = submitBtn.dataset._txt || "Guardar";
  }
}

// entrada inválida: agrega borde y hint
function markInvalid(input, hint){
  input.classList.add("is-invalid");
  input.setAttribute("aria-invalid","true");
  if (hint){
    let small = input.nextElementSibling && input.nextElementSibling.classList?.contains("help-text")
      ? input.nextElementSibling
      : document.createElement("small");
    small.className = "help-text";
    small.style.color = "#ef4444";
    small.textContent = hint;
    if (small !== input.nextElementSibling) input.insertAdjacentElement("afterend", small);
  }
}
function clearInvalid(input){
  input.classList.remove("is-invalid");
  input.removeAttribute("aria-invalid");
  const small = input.nextElementSibling;
  if (small && small.classList?.contains("help-text")) small.remove();
}

// preview de imagen
const imageInput = $("imageFile");
if (imageInput){
  imageInput.addEventListener("change", () => {
    let prev = $("imagePreview");
    if (!prev){
      prev = document.createElement("img");
      prev.id = "imagePreview";
      prev.alt = "Vista previa";
      prev.style.cssText = "max-width:180px;border:1px solid var(--line);border-radius:10px;margin-top:6px;display:block;object-fit:cover;aspect-ratio:1/1";
      imageInput.insertAdjacentElement("afterend", prev);
    }
    const f = imageInput.files?.[0];
    if (f) prev.src = URL.createObjectURL(f); else prev.remove();
  });
}

// ---------- Sesión + guardia de admin ----------
onAuthStateChange(async (user) => {
  if (!user) {
    loginSection.style.display = "";
    crudSection.style.display  = "none";
    btnLogout.classList.add("d-none");
    return;
  }
  if (!(await isAdmin(user.id))) {
    loginMsg.textContent = "Tu usuario no tiene permisos de administrador.";
    await signOut();
    return;
  }
  loginSection.style.display = "none";
  crudSection.style.display  = "";
  btnLogout.classList.remove("d-none");
  await renderList();
});

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "";
  try {
    await signIn($("email").value.trim(), $("password").value);
  } catch (err) {
    loginMsg.textContent = "Error: " + (err?.message || err);
  }
});

// ---------- Logout ----------
btnLogout.addEventListener("click", () => signOut());

// ---------- Listado ----------
async function renderList() {
  adminList.innerHTML = "Cargando…";
  try {
    const rows = await listProducts();
    adminList.innerHTML = "";
    adminList.classList.add("product-grid");

    rows.forEach((p) => {
      const card = document.createElement("div");
      card.className = "product-card";

      const safeName = (p.name || "").replace(/"/g, "&quot;");
      const img = p.image_url || "";

      card.innerHTML = `
        <img src="${img}" alt="${safeName}">
        <div class="product-body">
          <h4 class="product-title">${p.name || ""}</h4>
          <div class="product-price">$${Number(p.price || 0).toLocaleString("es-AR")}</div>
          <div class="product-meta">
            <span class="chip chip--stock">Stock: ${p.stock ?? 0}</span>
            <span class="chip chip--cat">Cat: ${p.category || "-"}</span>
          </div>
          <div class="card-actions">
            <button class="edit btn btn-ghost btn-sm" data-id="${p.id}">Editar</button>
            <button class="del btn btn-danger btn-sm"  data-id="${p.id}">Eliminar</button>
          </div>
        </div>
      `;
      adminList.appendChild(card);
    });

    adminList.querySelectorAll(".edit").forEach((b) =>
      b.addEventListener("click", async () => {
        const p = await getProduct(b.dataset.id);
        if (!p) return;
        $("prodId").value      = p.id;
        $("name").value        = p.name || "";
        $("price").value       = p.price ?? 0;
        $("stock").value       = p.stock ?? 0;
        $("category").value    = p.category || "";
        $("description").value = p.description || "";
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
    );

    adminList.querySelectorAll(".del").forEach((b) =>
      b.addEventListener("click", async () => {
        if (confirm("¿Eliminar este producto?")) {
          await removeProduct(b.dataset.id);
          await renderList();
          toast("Producto eliminado", "success");
        }
      })
    );
  } catch (e) {
    console.error(e);
    adminList.textContent = "Error cargando productos";
    toast("Error cargando productos", "error");
  }
}

// ---------- Guardar (create/update) ----------
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // limpiar estados inválidos previos
  ["name","price","stock"].forEach(id => clearInvalid($(id)));

  const id = $("prodId").value.trim();
  const data = {
    name: $("name").value.trim(),
    price: parseFloat($("price").value),
    stock: parseInt($("stock").value, 10),
    category: $("category").value.trim(),
    description: $("description").value.trim(),
  };

  // Validaciones mínimas
  let hasError = false;
  if (!data.name) { markInvalid($("name"), "El nombre es obligatorio"); hasError = true; }
  if (!(data.price >= 0)) { markInvalid($("price"), "Precio inválido"); hasError = true; }
  if (!(data.stock >= 0)) { markInvalid($("stock"), "Stock inválido"); hasError = true; }
  if (hasError) { toast("Revisá los campos marcados", "error"); return; }

  try {
    setLoading(true);
    const f = $("imageFile").files[0];
    if (f) data.image_url = await uploadProductImage(f);

    if (id) {
      await updateProduct(id, data);
      toast("Producto actualizado", "success");
    } else {
      await createProduct(data);
      toast("Producto creado", "success");
    }

    productForm.reset();
    $("prodId").value = "";
    const prev = $("imagePreview"); if (prev) prev.remove();

    await renderList();
  } catch (err) {
    console.error(err);
    toast("No se pudo guardar el producto", "error");
    alert("No se pudo guardar el producto: " + (err?.message || err));
  } finally {
    setLoading(false);
  }
});

// ---------- Reset ----------
$("btnReset").addEventListener("click", () => {
  productForm.reset();
  $("prodId").value = "";
  const prev = $("imagePreview"); if (prev) prev.remove();
});

// ---- Navbar: mostrar/ocultar botones según sesión ----
import { onAuthStateChange, isAdmin } from "/auth.js";

(function setupNavbarAuth(){
  const btnLogin = document.getElementById("btnLogin");
  const btnAdmin = document.getElementById("btnAdmin");

  // Si esta página no tiene navbar, salir sin romper
  if (!btnLogin && !btnAdmin) return;

  onAuthStateChange(async (user) => {
    // No logueado => solo "Iniciar sesión"
    if (!user) {
      if (btnLogin) btnLogin.style.display = "inline-block";
      if (btnAdmin) btnAdmin.style.display = "none";
      return;
    }

    // Logueado: mostrar Panel solo si es admin
    let esAdmin = false;
    try { esAdmin = await isAdmin(user.id); } catch {}
    if (esAdmin) {
      if (btnLogin) btnLogin.style.display = "none";
      if (btnAdmin) btnAdmin.style.display = "inline-block";
    } else {
      if (btnLogin) btnLogin.style.display = "inline-block";
      if (btnAdmin) btnAdmin.style.display = "none";
    }
  });

  // (Opcional) acción del botón login
  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      // redirigí a tu pantalla/modal de login
      window.location.href = "login.html";
    });
  }
})();
