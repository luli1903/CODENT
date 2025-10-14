// CODEN v1 — listado de productos con tarjetas modernas
import { supabase } from "../supabaseClient.js";
import { addToCart } from "./cart.js"; // usamos la API real del carrito

async function listProducts(){
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at",{ ascending:false });
  if (error) { console.error(error); return []; }
  return data || [];
}

function render(products){
  const grid = document.getElementById("product-list"); if(!grid) return;
  grid.innerHTML = "";

  if (!products.length) {
    grid.innerHTML = '<div class="text-center text-muted py-5">No hay productos todavía.</div>';
    return;
  }

  products.forEach(p=>{
    // Card visual CODEN (no más doble CTA)
    const col = document.createElement("div");
    col.className = "col-sm-6 col-md-4 col-lg-3 mb-4"; // si usás Bootstrap. Si no, quitalo.
    col.innerHTML = `
      <article class="coden-product h-100">
        <div class="coden-product__img">
          <img src="${p.image_url || ""}" alt="${p.name || ""}" loading="lazy">
        </div>
        <div class="coden-product__body">
          <div class="coden-product__title">${p.name || ""}</div>
          <div class="coden-badges" style="margin:.25rem 0 .5rem">
            <span class="coden-badge">24–72h</span>
            <span class="coden-badge coden-badge--ok">Garantía 12m</span>
          </div>
          <div class="coden-price">$ ${Number(p.price || 0).toLocaleString("es-AR")}</div>
          <div class="coden-inline" style="margin-top:10px">
            <button class="coden-btn add-to-cart" data-id="${p.id}">Agregar</button>
            <a class="coden-textlink" href="producto.html?id=${p.id}">Detalles</a>
          </div>
        </div>
      </article>`;
    grid.appendChild(col);
  });

  grid.querySelectorAll(".add-to-cart").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.dataset.id;
      if(!id) return;
      await addToCart(id,1);
    });
  });
}

async function initShop(){
  const grid = document.getElementById("product-list"); if(!grid) return;
  grid.innerHTML = "Cargando...";
  const products = await listProducts();
  render(products);
}

document.addEventListener("DOMContentLoaded", initShop);
