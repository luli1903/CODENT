// js/shop.js — CODEN v1 (grilla de productos con UI moderna)
// Requisitos en el HTML: <div id="product-list"></div>
//
// Notas de rutas:
// - Este archivo está en /js
// - db.js está en la raíz → import "../db.js"
// - cart.js está en /js → import "./cart.js"

import { listProducts as fetchProducts } from "../db.js";
import { addToCart } from "./cart.js";

// Sanitiza para evitar inyecciones simples en innerHTML
const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

// Render de la grilla con la estética CODEN (1 CTA + link)
function render(products) {
  const grid = document.getElementById("product-list");
  if (!grid) return;

  if (!products?.length) {
    grid.innerHTML =
      '<div class="col-12 text-center text-muted py-5">No hay productos todavía.</div>';
    return;
  }

  // Si usás Bootstrap, este contenedor suele ser un .row
  // Si NO usás Bootstrap, podés quitar las clases col-*
  const frag = document.createDocumentFragment();

  products.forEach((p) => {
    const name = esc(p.name || "");
    const price = Number(p.price || 0);

    const col = document.createElement("div");
    col.className = "col-sm-6 col-md-4 col-lg-3 mb-4";

    col.innerHTML = `
      <article class="coden-product h-100">
        <div class="coden-product__img">
          <img
            src="${p.image_url || ""}"
            alt="${name}"
            loading="lazy"
            onerror="this.src='https://via.placeholder.com/600x450?text=Sin+imagen';this.style.objectFit='contain';"
          >
        </div>
        <div class="coden-product__body">
          <div class="coden-product__title">${name}</div>

          <div class="coden-badges" style="margin:.25rem 0 .5rem">
            <span class="coden-badge">24–72h</span>
            <span class="coden-badge coden-badge--ok">Garantía 12m</span>
          </div>

          <div class="coden-price">$ ${price.toLocaleString("es-AR")}</div>

          <div class="coden-inline" style="margin-top:10px">
            <button class="coden-btn add-to-cart" data-id="${p.id}">Agregar</button>
            <a class="coden-textlink" href="producto.html?id=${encodeURIComponent(
              p.id
            )}">Detalles</a>
          </div>
        </div>
      </article>
    `;

    frag.appendChild(col);
  });

  // Vacío y pinto de una (mejor performance que innerHTML acumulado)
  grid.innerHTML = "";
  grid.appendChild(frag);

  // Wire de eventos (una sola vez por render)
  grid.querySelectorAll(".add-to-cart").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!id) return;
      btn.disabled = true;
      try {
        await addToCart(id, 1);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

// Init de la página de tienda
async function initShop() {
  const grid = document.getElementById("product-list");
  if (!grid) return; // no estoy en la tienda

  // Mensaje de carga
  grid.innerHTML =
    '<div class="col-12 text-center text-muted py-4">Cargando…</div>';

  try {
    const products = await fetchProducts();
    render(products);
  } catch (e) {
    console.error(e);
    grid.innerHTML =
      '<div class="col-12 text-center text-muted py-4">No se pudo cargar el catálogo.</div>';
  }
}

document.addEventListener("DOMContentLoaded", initShop);
