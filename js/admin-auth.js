import { supabase } from "/js/supabaseClient.js";

const $ = (id) => document.getElementById(id);
const form = $("productForm");
const list = $("adminList");
const btnReset = $("btnReset");
const btnLogout = $("btnLogout");
const toastDelay = 3500;

const btnSubmit = form?.querySelector('button[type="submit"]');
const DEFAULT_IMG = "/img/coming-soon.png";

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), toastDelay);
}

function busy(on) {
  if (!btnSubmit) return;
  btnSubmit.disabled = on;
  btnSubmit.textContent = on ? "Guardando…" : "Guardar";
}

function formatMoney(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  return num.toLocaleString("es-AR", { minimumFractionDigits: 0 });
}

function sanitizeFilename(name = "") {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("prodId").value;
  const name = $("name").value.trim();
  const price = parseFloat($("price").value);
  const stock = parseInt($("stock").value, 10);
  const category = $("category").value;
  const description = $("description").value.trim();
  const file = $("imageFile").files[0];

  if (!name || !category || Number.isNaN(price) || Number.isNaN(stock)) {
    showToast("Completá nombre, categoría, precio y stock válidos.", "error");
    return;
  }

  let image_url = null;
  busy(true);

  try {
    if (file) {
      const safeName = sanitizeFilename(file.name);
      const filePath = `products/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file, { upsert: false }); // evita sobreescribir
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("images").getPublicUrl(filePath);
      image_url = pub?.publicUrl || null;
    }

    if (id) {
      const payload = { name, price, stock, category, description, updated_at: new Date() };
      if (image_url) payload.image_url = image_url;

      const { error } = await supabase.from("products").update(payload).eq("id", id);
      if (error) throw error;

      showToast("Producto actualizado correctamente");
    } else {
      const { error } = await supabase.from("products").insert([
        { name, price, stock, category, description, image_url },
      ]);
      if (error) throw error;

      showToast("Producto agregado correctamente");
    }

    form.reset();
    $("prodId").value = "";
    if ($("imageFile")) $("imageFile").value = "";

    await loadProducts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error("[admin.js] submit error:", err);
    showToast("Error al guardar el producto", "error");
  } finally {
    busy(false);
  }
});

btnReset?.addEventListener("click", () => {
  form.reset();
  $("prodId").value = "";
  if ($("imageFile")) $("imageFile").value = "";
});

function productCard(p) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.innerHTML = `
    <img src="${p.image_url || DEFAULT_IMG}" alt="${p.name}">
    <div class="product-body">
      <h3 class="product-title">${p.name}</h3>
      <div class="product-price">$${formatMoney(p.price)}</div>
      <div class="product-meta">
        <span class="chip">Stock: ${p.stock}</span>
        <span class="chip">Cat: ${p.category || "-"}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${p.id}">Eliminar</button>
      </div>
    </div>
  `;
  return article;
}

function renderProducts(products = []) {
  if (!list) return;
  list.replaceChildren(...products.map(productCard));
}

async function loadProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });
    if (error) throw error;
    renderProducts(data || []);
  } catch (err) {
    console.error("[admin.js] loadProducts error:", err);
    showToast("Error al cargar productos", "error");
  }
}

list?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-edit],[data-delete]");
  if (!btn) return;

  const editId = btn.getAttribute("data-edit");
  const deleteId = btn.getAttribute("data-delete");

  if (editId) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", editId)
        .single();
      if (error) throw error;

      $("prodId").value = data.id;
      $("name").value = data.name || "";
      $("price").value = data.price ?? "";
      $("stock").value = data.stock ?? "";
      $("category").value = data.category || "";
      $("description").value = data.description || "";

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[admin.js] edit load error:", err);
      showToast("Error al cargar producto para editar", "error");
    }
  }

  if (deleteId) {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteId);
      if (error) throw error;

      showToast("Producto eliminado");
      await loadProducts();
    } catch (err) {
      console.error("[admin.js] delete error:", err);
      showToast("Error al eliminar producto", "error");
    }
  }
});

btnLogout?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "/index.html";
});

loadProducts();
