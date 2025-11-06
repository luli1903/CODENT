import { listProducts } from "/db.js";
import { addToCart, updateCartBadge } from "/js/cart.js";

document.addEventListener("DOMContentLoaded", () => {
  try {
    boot();
  } catch (e) {
    console.error("[SHOP] fallo al iniciar:", e);
    const errorState = document.querySelector("#errorState");
    if (errorState) errorState.hidden = false;
  }
});

async function boot() {
  const $  = (q, ctx=document) => ctx.querySelector(q);
  const $$ = (q, ctx=document) => [...ctx.querySelectorAll(q)];

  const CATEGORIES = [
    { id: "todos",      label: "Todos" },
    { id: "equipos",    label: "Equipos" },
    { id: "insumos",    label: "Insumos dentales" },
    { id: "repuestos",  label: "Repuestos" },
    { id: "accesorios", label: "Accesorios" },
  ];

  const catNav      = $("#catNav");
  const productGrid = $("#productGrid");
  const emptyState  = $("#emptyState");
  const errorState  = $("#errorState");
  const qInput      = $("#q");
  const orderSel    = $("#order");

  if (!productGrid) throw new Error("No existe #productGrid en el DOM");

  let currentCat = new URL(location.href).searchParams.get("cat") || "todos";
  let lastItems  = [];

  // ---------- UI helpers
  const safe = (s="") => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const priceFmt = (n) => {
    try { return new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(Number(n||0)); }
    catch { return `$ ${n ?? 0}`; }
  };
  function toggleStates({ loading=false, empty=false, error=false } = {}) {
    if (emptyState) emptyState.hidden = !empty;
    if (errorState) errorState.hidden = !error;
    productGrid.style.opacity = loading ? 0.5 : 1;
  }

  function cardHTML(p){
    const img = p.image_url || "/img/placeholder.png";
    return `
      <article class="card" data-id="${p.id}">
        <img class="thumb" src="${img}" alt="${safe(p.name)}" loading="lazy"/>
        <div class="body">
          <h3 class="name">${safe(p.name)}</h3>
          <p class="desc">${safe(p.description || "")}</p>
          <div class="meta">
            <span class="price">${priceFmt(p.price)}</span>
            <span class="cat">${p.category || "—"}</span>
          </div>
          <div class="cta">
            <button class="btn" data-action="details">Ver</button>
            <button class="btn primary" data-action="add">Agregar</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderGrid(items=[]) {
    productGrid.innerHTML = items.map(cardHTML).join("");
  }

  function applyClientFilters(items) {
    let a = [...(items||[])];
    const q = (qInput?.value || "").trim().toLowerCase();
    if (q) a = a.filter(p => (p.name||"").toLowerCase().includes(q));
    switch (orderSel?.value) {
      case "price_asc":  a.sort((x,y)=>(x.price??0)-(y.price??0)); break;
      case "price_desc": a.sort((x,y)=>(y.price??0)-(x.price??0)); break;
      case "name_asc":   a.sort((x,y)=> (x.name||"").localeCompare(y.name||"")); break;
    }
    return a;
  }

  async function loadProducts(cat) {
    try {
      toggleStates({ loading:true, empty:false, error:false });
      const category = (cat && cat !== "todos") ? cat : undefined;
      const items = await listProducts({ category }) || [];
      lastItems = items;
      renderGrid(applyClientFilters(items));
      toggleStates({ empty: items.length === 0 });
    } catch (err) {
      console.error("[SHOP] error listProducts:", err);
      toggleStates({ error:true });
    } finally {
      toggleStates({ loading:false });
    }
  }

  function renderChips(){
    if (!catNav) return;
    catNav.innerHTML = CATEGORIES.map(c => `
      <button class="chip ${c.id===currentCat?'is-active':''}" data-cat="${c.id}">
        ${c.label}
      </button>
    `).join("");

    catNav.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const cat = btn.dataset.cat;
      if (cat === currentCat) return;
      currentCat = cat;
      $$(".chip", catNav).forEach(c => c.classList.toggle("is-active", c.dataset.cat===currentCat));

      const u = new URL(location.href);
      if (currentCat === "todos") u.searchParams.delete("cat");
      else u.searchParams.set("cat", currentCat);
      history.replaceState({}, "", u);

      loadProducts(currentCat);
    });
  }

  qInput?.addEventListener("input",  () => renderGrid(applyClientFilters(lastItems)));
  orderSel?.addEventListener("change", () => renderGrid(applyClientFilters(lastItems)));

  productGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest("button, a");
    if (!btn) return;
    const card = btn.closest(".card");
    const id   = card?.dataset?.id;
    if (btn.dataset.action === "add" && id) {
      try {
        await addToCart(id, 1);
        updateCartBadge?.();
      } catch (err) {
        console.error("[SHOP] addToCart falló:", err);
      }
    }
    if (btn.dataset.action === "details" && id) {
      location.href = `/producto.html?id=${encodeURIComponent(id)}`;
    }
  });

  renderChips();
  await loadProducts(currentCat);

  try { window.Cart?.updateCartBadge?.(); } catch {}
}
