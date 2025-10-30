// /admin.js
import { onAuthStateChange, signOut, isAdmin } from "/auth.js";
import {
  listProducts, getProduct, createProduct, updateProduct,
  removeProduct, uploadProductImage
} from "/db.js";

const $  = (id) => document.getElementById(id);

const btnLogout   = $("btnLogout");
const crudSection = $("crudSection");
const productForm = $("productForm");
const adminList   = $("adminList");

// ---------- Sesión + guardia de admin ----------
onAuthStateChange(async (user) => {
  // si no hay user o no es admin → afuera
  if (!user || !(await isAdmin(user.id))) {
    location.href = "/index.html";
    return;
  }
  // mostrar CRUD y logout
  crudSection.style.display = "";
  btnLogout?.classList.remove("d-none");
  await renderList();
});

// ---------- Logout ----------
btnLogout?.addEventListener("click", async () => {
  await signOut();
  location.href = "/index.html";
});

// ---------- UI helpers ----------
function toast(msg, type="success"){
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function setLoading(isLoading){
  const submitBtn = productForm?.querySelector('[type="submit"]');
  const resetBtn  = $("btnReset");
  if (submitBtn) submitBtn.disabled = isLoading;
  if (resetBtn)  resetBtn.disabled  = isLoading;
  if (submitBtn) {
    if (isLoading) {
      submitBtn.dataset._txt = submitBtn.textContent;
      submitBtn.textContent = "Guardando…";
    } else {
      submitBtn.textContent = submitBtn.dataset._txt || "Guardar";
    }
  }
}

function markInvalid(input, hint){
  if (!input) return;
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
  if (!input) return;
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

// ---------- Listado ----------
async function renderList() {
  if (!adminList) return;
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
productForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  ["name","price","stock"].forEach(id => clearInvalid($(id)));

  const id = $("prodId")?.value?.trim();
  const data = {
    name: $("name")?.value?.trim(),
    price: parseFloat($("price")?.value),
    stock: parseInt($("stock")?.value, 10),
    category: $("category")?.value?.trim(),
    description: $("description")?.value?.trim(),
  };

  // Validaciones mínimas
  let hasError = false;
  if (!data.name)              { markInvalid($("name"), "El nombre es obligatorio"); hasError = true; }
  if (!(data.price >= 0))      { markInvalid($("price"), "Precio inválido");        hasError = true; }
  if (!(data.stock >= 0))      { markInvalid($("stock"), "Stock inválido");         hasError = true; }
  if (hasError) { toast("Revisá los campos marcados", "error"); return; }

  try {
    setLoading(true);
    const f = $("imageFile")?.files?.[0];
    if (f) data.image_url = await uploadProductImage(f);

    if (id) {
      await updateProduct(id, data);
      toast("Producto actualizado", "success");
    } else {
      await createProduct(data);
      toast("Producto creado", "success");
    }

    productForm.reset();
    if ($("prodId")) $("prodId").value = "";
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
$("btnReset")?.addEventListener("click", () => {
  productForm?.reset();
  if ($("prodId")) $("prodId").value = "";
  const prev = $("imagePreview"); if (prev) prev.remove();
});
