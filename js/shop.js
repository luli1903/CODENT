// /js/shop.js
import { listProducts } from "/db.js";
import { addToCart, updateCartBadge } from "/js/cart.js";

const CATEGORIES = [
  { id: "todos",      label: "Todos" },
  { id: "equipos",    label: "Equipos" },
  { id: "insumos",    label: "Insumos dentales" },
  { id: "repuestos",  label: "Repuestos" },
  { id: "accesorios", label: "Accesorios" },
];

const $  = (q, ctx=document) => ctx.querySelector(q);
const $$ = (q, ctx=document) => [...ctx.querySelectorAll(q)];

const catNav     = $("#catNav");
const productGrid= $("#productGrid");
const emptyState = $("#emptyState");
const errorState = $("#errorState");

let currentCat = new URL(location.href).searchParams.get("cat") || "todos";

init();

async function init(){
  renderChips();
  await loadProducts(currentCat);

  // Delegación para “Agregar” y “Ver”
  productGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest("button, a");
    if (!btn) return;

    const card = btn.closest(".card");
    const id   = card?.dataset?.id;

    if (btn.dataset.action === "add" && id) {
      await addToCart(id, 1);
      updateCartBadge();
    }
    if (btn.dataset.action === "details" && id) {
      location.href = `/producto.html?id=${encodeURIComponent(id)}`;
    }
  });
}

function renderChips(){
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

async function loadProducts(cat){
  try {
    toggleStates({ loading:true, empty:false, error:false });
    const category = (cat && cat !== "todos") ? cat : undefined;
    const items = await listProducts({ category });
    renderGrid(items);
    toggleStates({ empty: items.length === 0 });
  } catch (err) {
    console.error("Error cargando productos:", err?.message || err, err);
    toggleStates({ error: true });
  } finally {
    toggleStates({ loading:false });
  }
}

function renderGrid(items){
  productGrid.innerHTML = items.map(p => cardHTML(p)).join("");
}

function cardHTML(p){
  const price = formatPrice(p.price);
  const img   = p.image_url || "/img/placeholder.png";
  const safe  = (s="") => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  return `
    <article class="card" data-id="${p.id}">
      <img class="thumb" src="${img}" alt="${safe(p.name)}" loading="lazy"/>
      <div class="body">
        <h3 class="name">${safe(p.name)}</h3>
        <p class="desc">${safe(p.description || "")}</p>
        <div class="meta">
          <span class="price">${price}</span>
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

function formatPrice(n){
  try {
    return new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0})
      .format(Number(n||0));
  } catch {
    return `$ ${n ?? 0}`;
  }
}

function toggleStates({ loading=false, empty=false, error=false }={}){
  emptyState.hidden = !empty;
  errorState.hidden = !error;
  productGrid.style.opacity = loading ? .5 : 1;
}
