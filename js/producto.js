import { getProduct } from "/db.js";
import { addToCart, updateCartBadge } from "/js/cart.js";

const $ = (q, c = document) => c.querySelector(q);
const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

async function init() {
  const id = new URL(location.href).searchParams.get("id");
  const root = document.getElementById("content");

  if (!id) {
    root.innerHTML = '<p class="text-muted">Producto no encontrado.</p>';
    return;
  }

  try {
    const p = await getProduct(id);
    if (!p) {
      root.innerHTML = '<p class="text-muted">Producto no disponible.</p>';
      return;
    }
    const price = Number(p.price || 0).toLocaleString("es-AR");
    const name = esc(p.name || "");
    const desc = esc(p.description || "");
    const img = p.image_url || "";

    root.innerHTML = `
      <div class="product-grid">
        <div class="coden-product__img">
          <img src="${img}" alt="${name}">
        </div>

        <div class="info-card">
          <h2 class="mb-1">${name}</h2>

          <div class="coden-badges mb-2">
            <span class="coden-badge">24–72h</span>
            <span class="coden-badge coden-badge--ok">Garantía 12m</span>
          </div>

          ${desc ? `<p class="text-muted mb-2">${desc}</p>` : ""}

          <div class="h4 coden-price mb-3">$ ${price}</div>

          <div class="d-flex align-items-center my-3">
            <label class="mr-2 mb-0">Cantidad:</label>
            <input id="qty" type="number" min="1" value="1" class="form-control">
          </div>

          <div class="coden-inline">
            <button id="addBtn" class="btn btn-primary">Agregar al carrito</button>
            <a href="/tienda.html" class="btn btn-ghost">Volver a la tienda</a>
          </div>
        </div>
      </div>
    `;

    $("#addBtn")?.addEventListener("click", async () => {
      const q = Math.max(1, parseInt($("#qty").value) || 1);
      try {
        await addToCart(p.id, q);
        updateCartBadge();
        window.toastCoden?.("Agregado: " + (p.name || "Producto"));
      } catch (e) {
        console.error(e);
        alert("No se pudo agregar el producto.");
      }
    });

    updateCartBadge();
  } catch (e) {
    console.error(e);
    root.innerHTML = '<p class="text-muted">No se pudo cargar el producto.</p>';
  }
}

document.addEventListener("DOMContentLoaded", init);
