// /js/admin.js
import { supabase } from "/js/supabaseClient.js";

// ========= HELPERS =========
const $ = (id) => document.getElementById(id);
const form = $("productForm");
const list = $("adminList");
const btnReset = $("btnReset");
const toastDelay = 3500;

// ========= TOASTS =========
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), toastDelay);
}

// ========= FORMULARIO =========
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("prodId").value;
  const name = $("name").value.trim();
  const price = parseFloat($("price").value) || 0;
  const stock = parseInt($("stock").value) || 0;
  const category = $("category").value;
  const description = $("description").value.trim();
  const file = $("imageFile").files[0];

  if (!name || !category) {
    showToast("Completá todos los campos obligatorios", "error");
    return;
  }

  let image_url = null;

  try {
    // Subir imagen si se seleccionó
    if (file) {
      const filePath = `products/${Date.now()}_${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      image_url = publicUrl?.publicUrl;
    }

    if (id) {
      // Editar producto
      const { error } = await supabase
        .from("products")
        .update({
          name,
          price,
          stock,
          category,
          description,
          ...(image_url ? { image_url } : {}),
          updated_at: new Date(),
        })
        .eq("id", id);

      if (error) throw error;
      showToast("Producto actualizado correctamente");
    } else {
      // Nuevo producto
      const { error } = await supabase.from("products").insert([
        {
          name,
          price,
          stock,
          category,
          description,
          image_url,
        },
      ]);

      if (error) throw error;
      showToast("Producto agregado correctamente");
    }

    form.reset();
    $("prodId").value = "";
    await loadProducts();
  } catch (err) {
    console.error(err);
    showToast("Error al guardar el producto", "error");
  }
});

// ========= BOTÓN NUEVO =========
btnReset?.addEventListener("click", () => {
  form.reset();
  $("prodId").value = "";
});

// ========= RENDER PRODUCTOS =========
function productCard(p) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.innerHTML = `
    <img src="${p.image_url || "/img/coming-soon.png"}" alt="${p.name}">
    <div class="product-body">
      <h3 class="product-title">${p.name}</h3>
      <div class="product-price">$${p.price}</div>
      <div class="product-meta">Stock: ${p.stock} · Cat: ${p.category || "-"}</div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${p.id}">Eliminar</button>
      </div>
    </div>
  `;
  return article;
}

function renderProducts(products = []) {
  list.replaceChildren(...products.map(productCard));
}

// ========= CARGAR PRODUCTOS =========
async function loadProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;
    renderProducts(data || []);
  } catch (err) {
    console.error(err);
    showToast("Error al cargar productos", "error");
  }
}

// ========= EDITAR / ELIMINAR =========
list?.addEventListener("click", async (e) => {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;

  // Editar
  if (editId) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", editId)
        .single();

      if (error) throw error;

      $("prodId").value = data.id;
      $("name").value = data.name;
      $("price").value = data.price;
      $("stock").value = data.stock;
      $("category").value = data.category;
      $("description").value = data.description || "";

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      showToast("Error al cargar producto para editar", "error");
    }
  }

  // Eliminar
  if (deleteId) {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;

      showToast("Producto eliminado");
      await loadProducts();
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar producto", "error");
    }
  }
});

// ========= LOGOUT =========
const btnLogout = document.getElementById("btnLogout");
btnLogout?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "/index.html";
});

// ========= INICIO =========
loadProducts();
