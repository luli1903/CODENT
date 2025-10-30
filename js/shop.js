// /js/shop.js
import { listProducts, getOrCreateActiveCart, addItemToCart } from "/db.js";
import { getSession } from "/auth.js";

// Definimos 4 categorías (slugs compatibles con la columna `category`)
const CATEGORIES = [
  { id: "todos",      label: "Todos" },
  { id: "equipos",    label: "Equipos" },
  { id: "insumos",    label: "Insumos dentales" },
  { id: "repuestos",  label: "Repuestos" },
  { id: "accesorios", label: "Accesorios" },
];

const $  = (q, ctx=document) => ctx.querySelector(q);
const $$ = (q, ctx=document) => [...ctx.querySelectorAll(q)];

const catNav      = $("#catNav");
const productGrid = $("#productGrid");
const emptyState  = $("#emptyState");
const errorState  = $("#errorState");

let currentCat = new URL(location.href).searchParams.get("cat") || "todos";

init();

async function init(){
  bindGlobalClicks();
  renderChips();
  await loadProducts(currentCat);
}

/* ============================
   Chips (categorías)
============================ */
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

/* ============================
   Carga de productos
============================ */
async function loadProducts(cat){
  try {
    toggleStates({ loading:true, empty:false, error:false });
    const category = (cat && cat !== "todos") ? cat : undefined;
    const items = await listProducts({ category });
    renderGrid(items);
    toggleStates({ empty: items.length === 0 });
  } catch (err) {
    console.error("Error cargando productos:", err?.message || err, err);
    toggleStates?.({ error: true });
  } finally {
    toggleStates({ loading:false });
  }
}

function renderGrid(items){
  productGrid.innerHTML = items.map(p => cardHTML(p)).join("");
}

/* ============================
   Template de tarjeta
============================ */
function cardHTML(p){
  const price = Number(p.price || 0);
  const img   = p.image_url || "/img/placeholder.png";
  return `
    <article class="card" data-id="${p.id}" data-unit-price="${price}">
      <img class="thumb" src="${img}" alt="${escapeHTML(p.name)}" loading="lazy"/>
      <div class="body">
        <h3 class="name">${escapeHTML(p.name)}</h3>
        <p class="desc">${escapeHTML(p.description || "")}</p>
        <div class="meta">
          <span class="price">${formatPrice(price)}</span>
          <span class="cat">${categoryLabel(p.category)}</span>
        </div>
        <div class="cta">
          <button class="btn" data-action="details">Ver</button>
          <button class="btn primary" data-action="add">Agregar</button>
        </div>
      </div>
    </article>
  `;
}

/* ============================
   Clicks globales (Ver / Agregar)
============================ */
function bindGlobalClicks(){
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const card = btn.closest("article.card");
    if (!card) return;

    const action = btn.dataset.action;
    const productId  = card.dataset.id;
    const unitPrice  = Number(card.dataset.unitPrice || 0);

    if (action === "details") {
      // Futuro: ir a detalle / modal
      // Por ahora, solo un aviso
      toast("Pronto ver detalles del producto");
      return;
    }

    if (action === "add") {
      await handleAddToCart(productId, unitPrice);
      return;
    }
  });
}

/* ============================
   Agregar al carrito
============================ */
async function handleAddToCart(productId, unitPrice){
  try {
    const session = await getSession();

    if (session?.user) {
      // Usuario logueado → carrito en DB
      const cart = await getOrCreateActiveCart();
      await addItemToCart(cart.id, productId, 1, unitPrice);
      toast("Agregado al carrito ✅");
    } else {
      // Invitado → carrito local (se mergea al iniciar sesión)
      const key = "cart_local";
      const cart = JSON.parse(localStorage.getItem(key) || "[]");
      const idx = cart.findIndex(it => it.product_id === productId);
      if (idx >= 0) cart[idx].qty += 1;
      else cart.push({ product_id: productId, qty: 1, unit_price: unitPrice });
      localStorage.setItem(key, JSON.stringify(cart));
      toast("Agregado (modo invitado). Iniciá sesión para guardarlo.");
    }
  } catch (err) {
    console.error("No se pudo agregar al carrito:", err?.message || err, err);
    alert("No se pudo agregar al carrito. Intentalo de nuevo.");
  }
}

/* ============================
   Helpers UI / formato
============================ */
function categoryLabel(slug){
  return CATEGORIES.find(c => c.id === slug)?.label || "—";
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

function escapeHTML(str=""){
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function toast(msg){
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position:fixed; bottom:20px; right:20px; z-index:9999;
    background:#0ea5e9; color:#fff; padding:10px 16px; border-radius:10px;
    font-weight:600; box-shadow:0 8px 16px rgba(0,0,0,.1);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
