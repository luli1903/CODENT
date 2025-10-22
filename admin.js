import { onAuthStateChange, signIn, signOut, isAdmin } from "/auth.js";
import { listProducts, getProduct, createProduct, updateProduct, removeProduct, uploadProductImage } from "/db.js";

const $ = (id) => document.getElementById(id);
const loginSection = $("loginSection");
const crudSection  = $("crudSection");
const loginForm    = $("loginForm");
const loginMsg     = $("loginMsg");
const btnLogout    = $("btnLogout");
const productForm  = $("productForm");
const adminList    = $("adminList");

// SesiÃ³n + guardia de admin
onAuthStateChange(async (user) => {
  if (!user) {
    loginSection.style.display = "";
    crudSection.style.display  = "none";
    btnLogout.style.display    = "none";
    return;
  }
  if (!(await isAdmin(user.id))) {
    loginMsg.textContent = "Tu usuario no tiene permisos de administrador.";
    await signOut();
    return;
  }
  loginSection.style.display = "none";
  crudSection.style.display  = "";
  btnLogout.style.display    = "";
  await renderList();
});

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "";
  try {
    await signIn($("email").value.trim(), $("password").value);
  } catch (err) {
    loginMsg.textContent = "Error: " + (err?.message || err);
  }
});

// Logout
btnLogout.addEventListener("click", () => signOut());

// Render listado
async function renderList() {
  adminList.innerHTML = "Cargando...";
  try {
    const rows = await listProducts();
    adminList.innerHTML = "";
    rows.forEach((p) => {
      const card = document.createElement("div");
      card.className = "card product-card";
      card.style = "border:1px solid #ddd;border-radius:12px;overflow:hidden";
      card.innerHTML = `
        <img src="${p.image_url || ""}" alt="${p.name || ""}" style="width:100%;height:180px;object-fit:cover">
        <div style="padding:12px">
          <h4 style="margin:0 0 6px">${p.name}</h4>
          <p style="margin:0 0 6px">$${Number(p.price || 0).toLocaleString("es-AR")}</p>
          <small>Stock: ${p.stock ?? 0} | Cat: ${p.category || "-"}</small>
          <div style="margin-top:8px;display:flex;gap:8px">
            <button class="edit" data-id="${p.id}">Editar</button>
            <button class="del"  data-id="${p.id}">Eliminar</button>
          </div>
        </div>`;
      adminList.appendChild(card);
    });

    adminList.querySelectorAll(".edit").forEach((b) =>
      b.addEventListener("click", async () => {
        const p = await getProduct(b.dataset.id);
        if (!p) return;
        $("prodId").value     = p.id;
        $("name").value       = p.name || "";
        $("price").value      = p.price || 0;
        $("stock").value      = p.stock || 0;
        $("category").value   = p.category || "";
        $("description").value= p.description || "";
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
    );

    adminList.querySelectorAll(".del").forEach((b) =>
      b.addEventListener("click", async () => {
        if (confirm("Â¿Eliminar este producto?")) {
          await removeProduct(b.dataset.id);
          await renderList();
        }
      })
    );
  } catch {
    adminList.textContent = "Error cargando productos";
  }
}

// Guardar (create/update)
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("prodId").value.trim();
  const data = {
    name: $("name").value.trim(),
    price: $("price").value,
    stock: $("stock").value,
    category: $("category").value.trim(),
    description: $("description").value.trim(),
  };
  const f = $("imageFile").files[0];
  if (f) data.image_url = await uploadProductImage(f);

  if (id) await updateProduct(id, data);
  else    await createProduct(data);

  productForm.reset();
  $("prodId").value = "";
  await renderList();
});

$("btnReset").addEventListener("click", () => {
  productForm.reset();
  $("prodId").value = "";
});

