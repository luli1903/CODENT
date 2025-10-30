// /js/producto.js
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
      <div class="row align-items-start">
        <div class="col-md-6 text-center mb-3">
          <div class="coden-product__img" style="max-width:520px;margin:0 auto;border-radius:14px;overflow:hidden">
            <img src="${img}" alt="${name}" style="width:100%;height:auto;object-fit:contain">
          </div>
        </div>
        <div class="col-md-6">
          <h2 class="mb-1" style="font-family:'Cormorant',serif">${name}</h2>
          <div class="coden-badges mb-2">
            <span class="coden-badge">24–72h</span>
            <span class="coden-badge coden-badge--ok">Garantía 12m</span>
          </div>
          <p class="text-muted">${desc}</p>
          <div class="h4 coden-price mb-3">$ ${price}</div>

          <div class="d-flex align-items-center my-3">
            <label class="mr-2 mb-0">Cantidad:</label>
            <input id="qty" type="number" min="1" value="1" class="form-control" style="width:110px">
          </div>

          <div class="coden-inline">
            <button id="addBtn" class="coden-btn">Agregar al carrito</button>
            <a href="tienda.html" class="coden-textlink">Volver a la tienda</a>
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
