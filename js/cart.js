// CODEN v1 — carrito + Mercado Pago + helpers
import { supabase } from "/js/supabaseClient.js";

const CART_KEY = "coden_cart";

/* =======================
   Storage simple
======================= */
export function getCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
export function setCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}
export function updateCartBadge(){
  const badge=document.getElementById("cartBadge"); if(!badge) return;
  const count=getCart().reduce((a,i)=>a+Number(i.qty||0),0);
  badge.textContent = count;
  badge.setAttribute('aria-live','polite');
  badge.setAttribute('aria-label', `Carrito: ${count} producto${count===1?'':'s'}`);
}

/* =======================
   Supabase helpers
======================= */
async function fetchByIds(ids){
  if(!ids?.length) return [];
  const {data,error}=await supabase.from("products").select("*").in("id",ids);
  if(error){ console.error("fetchByIds",error); return []; }
  return data||[];
}
async function fetchOne(id){
  const {data,error}=await supabase.from("products").select("*").eq("id",id).single();
  if(error){ console.error("fetchOne",error); return null; }
  return data;
}

/* =======================
   API carrito
======================= */
export async function addToCart(productId, qty=1){
  const cart=getCart();
  const i=cart.findIndex(x=>String(x.id)===String(productId));
  if(i>=0) cart[i].qty+=qty; else cart.push({id:productId, qty});
  setCart(cart);
  try{
    const p=await fetchOne(productId);
    if(p&&window.toastCoden) window.toastCoden(`Agregado: ${p.name}`);
  }catch{}
}
export function removeFromCart(productId){
  setCart(getCart().filter(i=>String(i.id)!==String(productId)));
}
export function setQty(productId, qty){
  if(qty<=0) return removeFromCart(productId);
  const cart=getCart(); const i=cart.findIndex(x=>String(x.id)===String(productId));
  if(i>=0){ cart[i].qty=qty; setCart(cart); }
}
export async function cartTotal(){
  const cart=getCart(); const ids=cart.map(i=>i.id);
  const prods=await fetchByIds(ids); const map=new Map(prods.map(p=>[String(p.id),p]));
  return cart.reduce((s,i)=> s + Number(map.get(String(i.id))?.price||0)*Number(i.qty||0), 0);
}

/* =======================
   Render carrito.html
======================= */
export async function renderCartPage(){
  const list=document.getElementById("cartItems");
  const totalEl=document.getElementById("cartTotal");
  if(!list||!totalEl) return;

  const cart=getCart(); list.innerHTML="";
  if(!cart.length){
    list.innerHTML='<p class="text-muted mb-0">Tu carrito está vacío.</p>';
    totalEl.textContent="$0";
    updateCartBadge();
    return;
  }

  const ids=cart.map(i=>i.id);
  const prods=await fetchByIds(ids); const map=new Map(prods.map(p=>[String(p.id),p]));
  let total=0;

  cart.forEach(item=>{
    const p=map.get(String(item.id)); if(!p) return;
    const price=Number(p.price||0), qty=Number(item.qty||1), sub=price*qty; total+=sub;

    const row=document.createElement("div");
    row.className="coden-product";
    row.style.display="grid";
    row.style.gridTemplateColumns="auto 1fr auto";
    row.style.alignItems="center";
    row.style.gap="12px";
    row.style.padding="10px";
    row.style.marginBottom="10px";

    const safeName = String(p.name||"").replace(/"/g,"&quot;");

    row.innerHTML=`
      <div class="coden-product__img" style="width:72px; height:54px; border-radius:12px; overflow:hidden">
        <img src="${p.image_url||""}" alt="${safeName}">
      </div>
      <div>
        <div class="coden-product__title">${p.name||""}</div>
        <div class="coden-badges" style="margin-top:4px">
          <span class="coden-badge">Unidad</span>
          <span class="coden-badge coden-badge--ok">$ ${price.toLocaleString("es-AR")}</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px">
        <input type="number" min="1" value="${qty}" class="form-control form-control-sm" style="width:82px">
        <button class="coden-btn coden-btn--ghost" style="padding:.45rem .8rem">Eliminar</button>
      </div>
    `;

    const qtyInput=row.querySelector("input");
    const delBtn=row.querySelector("button");

    qtyInput.addEventListener("change", async ()=>{
      const q=Math.max(1, parseInt(qtyInput.value)||1); setQty(p.id,q);
      const t=await cartTotal(); totalEl.textContent="$"+t.toLocaleString("es-AR");
    });
    delBtn.addEventListener("click", async ()=>{
      removeFromCart(p.id);
      await renderCartPage();
    });

    list.appendChild(row);
  });

  totalEl.textContent="$"+total.toLocaleString("es-AR");
  updateCartBadge();
}

/* =======================
   Toast global (opcional)
======================= */
window.toastCoden = (msg)=>{
  let t = document.getElementById("toast");
  if(!t){
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = "position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#052c47;color:#fff;padding:.6rem 1rem;border-radius:12px;font-weight:700;opacity:0;transition:opacity .2s;z-index:1080";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  setTimeout(()=>t.style.opacity="0", 1400);
};

/* =======================
   Mercado Pago — integración
======================= */
// 1) Calcular totales (subtotal + envío)
async function computeTotals() {
  const cart = getCart();
  const ids = cart.map(i => i.id);
  const prods = await fetchByIds(ids);
  const map = new Map(prods.map(p => [String(p.id), p]));

  const subtotal = cart.reduce((sum, i) => {
    const p = map.get(String(i.id));
    return sum + Number(p?.price || 0) * Number(i.qty || 0);
  }, 0);

  const shipping = getSelectedShipping(); // { label, cost }
  const total = subtotal + Number(shipping?.cost || 0);

  return { subtotal, shipping, total, prods };
}

// 2) Obtener envío desde UI
function getSelectedShipping() {
  const radio = document.querySelector('input[name="shipping"]:checked');
  const value = (radio?.value || document.querySelector('#shippingMethod')?.value || 'retiro').trim();

  if (value === 'mdp')   return { label: 'Urbano MDP', cost: 3000 };
  if (value === 'pba')   return { label: 'Provincia BA', cost: 5500 };
  if (value === 'resto') return { label: 'Resto del país', cost: 7500 };
  return { label: 'Retiro en local', cost: 0 };
}

// 3) Refrescar UI de totales
export async function renderTotalsBox() {
  const { subtotal, shipping, total } = await computeTotals();
  const elSubtotal = document.querySelector('#subtotal');
  const elEnvio    = document.querySelector('#envio');
  const elTotal    = document.querySelector('#total');

  if (elSubtotal) elSubtotal.textContent = "$ " + subtotal.toLocaleString("es-AR");
  if (elEnvio)    elEnvio.textContent    = shipping.cost ? "$ " + shipping.cost.toLocaleString("es-AR") : "—";
  if (elTotal)    elTotal.textContent    = "$ " + total.toLocaleString("es-AR");
}

// 4) Adaptar carrito → ítems MP
async function cartToMPItems() {
  const cart = getCart();
  if (!cart.length) return [];

  const ids = cart.map(i => i.id);
  const prods = await fetchByIds(ids);
  const map = new Map(prods.map(p => [String(p.id), p]));

  return cart.map(i => {
    const p = map.get(String(i.id)) || {};
    return {
      id: String(i.id),
      title: String(p.name || "Producto"),
      quantity: Number(i.qty || 1),
      unit_price: Number(p.price || 0),
      currency_id: "ARS",
      picture_url: p.image_url || undefined
    };
  });
}

// 5) Cliente desde formulario
function getCustomerFromForm() {
  return {
    name: document.querySelector('#nombre')?.value || '',
    surname: document.querySelector('#apellido')?.value || '',
    email: document.querySelector('#email')?.value || ''
  };
}

// 6) Handler principal de pago
export async function payWithMercadoPago() {
  try {
    const cart = await cartToMPItems();
    if (!cart.length) { alert("Tu carrito está vacío."); return; }

    const customer = getCustomerFromForm();
    if (!customer.email) { alert("Ingresá un email válido."); return; }

    const { shipping } = await computeTotals();

    const res = await fetch('/.netlify/functions/createPreference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, customer, shipping })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('createPreference FAIL:', res.status, txt);
      alert('Hubo un error iniciando el pago.\n' + txt);
      return;
    }

    const data = await res.json();
    const redirect = data.init_point || data.sandbox_init_point;
    if (!redirect) throw new Error('Preferencia sin init_point');

    window.location.href = redirect;
  } catch (e) {
    console.error('Error iniciando pago:', e);
    alert('Ocurrió un error iniciando el pago. Intentá nuevamente.');
  }
}

// 7) Auto-wire en carrito.html
function wireCartEvents() {
  document.querySelectorAll('input[name="shipping"], #shippingMethod')
    .forEach(el => el.addEventListener('change', renderTotalsBox));
  document.getElementById('btn-pagar')?.addEventListener('click', payWithMercadoPago);
}

// 8) Init específico de carrito
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cartItems')) {
    renderCartPage().catch(console.error);
    renderTotalsBox().catch(console.error);
    wireCartEvents();
  }
});

// API global opcional (si usás handlers inline)
window.Cart = { getCart,setCart,updateCartBadge, addToCart,removeFromCart,setQty, cartTotal,renderCartPage };
window.Pay  = { payWithMercadoPago, renderTotalsBox };
