import { supabase } from "../supabaseClient.js";

const CART_KEY = "coden_cart";

/* storage */
export function getCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY))||[];}catch{return[];} }
export function setCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(); }
export function updateCartBadge(){
  const badge=document.getElementById("cartBadge"); if(!badge) return;
  const count=getCart().reduce((a,i)=>a+Number(i.qty||0),0); badge.textContent=count;
}

/* supabase helpers */
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

/* API carrito */
export async function addToCart(productId, qty=1){
  const cart=getCart();
  const i=cart.findIndex(x=>x.id===productId);
  if(i>=0) cart[i].qty+=qty; else cart.push({id:productId, qty});
  setCart(cart);
  try{ const p=await fetchOne(productId); if(p&&window.toastCoden) window.toastCoden(`Agregado: ${p.name}`);}catch{}
}
export function removeFromCart(productId){ setCart(getCart().filter(i=>i.id!==productId)); }
export function setQty(productId, qty){
  if(qty<=0) return removeFromCart(productId);
  const cart=getCart(); const i=cart.findIndex(x=>x.id===productId);
  if(i>=0){ cart[i].qty=qty; setCart(cart); }
}
export async function cartTotal(){
  const cart=getCart(); const ids=cart.map(i=>i.id);
  const prods=await fetchByIds(ids); const map=new Map(prods.map(p=>[p.id,p]));
  return cart.reduce((s,i)=> s + Number(map.get(i.id)?.price||0)*Number(i.qty||0), 0);
}

/* Render carrito.html */
export async function renderCartPage(){
  const list=document.getElementById("cartItems");
  const totalEl=document.getElementById("cartTotal");
  if(!list||!totalEl) return;

  const cart=getCart(); list.innerHTML="";
  if(!cart.length){ list.innerHTML='<p class="text-muted mb-0">Tu carrito está vacío.</p>'; totalEl.textContent="$0"; updateCartBadge(); return; }

  const ids=cart.map(i=>i.id);
  const prods=await fetchByIds(ids); const map=new Map(prods.map(p=>[p.id,p]));
  let total=0;

  cart.forEach(item=>{
    const p=map.get(item.id); if(!p) return;
    const price=Number(p.price||0), qty=Number(item.qty||1), sub=price*qty; total+=sub;

    const row=document.createElement("div");
    row.className="card d-flex align-items-center justify-content-between p-2 mb-2";
    row.innerHTML=`
      <div class="d-flex align-items-center">
        <img src="${p.image_url||""}" alt="${p.name||""}" style="width:64px;height:64px;object-fit:cover;border-radius:10px" class="mr-2">
        <div>
          <div class="font-weight-bold">${p.name||""}</div>
          <div class="text-muted small">$${price.toLocaleString("es-AR")}</div>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <input type="number" min="1" value="${qty}" class="form-control form-control-sm mr-2" style="width:80px">
        <button class="btn btn-sm btn-outline-danger">Eliminar</button>
      </div>
    `;
    const qtyInput=row.querySelector("input"); const delBtn=row.querySelector("button");
    qtyInput.addEventListener("change", async ()=>{
      const q=Math.max(1, parseInt(qtyInput.value)||1); setQty(p.id,q);
      const t=await cartTotal(); totalEl.textContent="$"+t.toLocaleString("es-AR");
    });
    delBtn.addEventListener("click", async ()=>{ removeFromCart(p.id); await renderCartPage(); });
    list.appendChild(row);
  });

  totalEl.textContent="$"+total.toLocaleString("es-AR");
  updateCartBadge();
}

/* Toast global opcional */
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

// API global (si te sirve en scripts no-módulo)
window.Cart = { getCart,setCart,updateCartBadge, addToCart,removeFromCart,setQty, cartTotal,renderCartPage };

/* =======================
   MERCADO PAGO — INTEGRACIÓN
======================= */

// 1) Calcular totales (subtotal + envío) usando tus precios de Supabase
async function computeTotals() {
  const cart = getCart();
  const ids = cart.map(i => i.id);
  const prods = await fetchByIds(ids);
  const map = new Map(prods.map(p => [p.id, p]));

  const subtotal = cart.reduce((sum, i) => {
    const p = map.get(i.id);
    return sum + Number(p?.price || 0) * Number(i.qty || 0);
  }, 0);

  const shipping = getSelectedShipping(); // { label, cost }
  const total = subtotal + Number(shipping?.cost || 0);

  return { subtotal, shipping, total, prods };
}

// 2) Obtener envío desde UI (ajustá si usás otro selector)
function getSelectedShipping() {
  // Radios: <input type="radio" name="shipping" value="mdp|pba|resto|retiro">
  const radio = document.querySelector('input[name="shipping"]:checked');
  const value = (radio?.value || document.querySelector('#shippingMethod')?.value || 'retiro').trim();

  if (value === 'mdp')   return { label: 'Urbano MDP', cost: 3000 };
  if (value === 'pba')   return { label: 'Provincia BA', cost: 5500 };
  if (value === 'resto') return { label: 'Resto del país', cost: 7500 };
  return { label: 'Retiro en local', cost: 0 };
}

// 3) Refrescar UI de totales en carrito.html
export async function renderTotalsBox() {
  const { subtotal, shipping, total } = await computeTotals();
  const elSubtotal = document.querySelector('#subtotal');
  const elEnvio    = document.querySelector('#envio');
  const elTotal    = document.querySelector('#total');

  if (elSubtotal) elSubtotal.textContent = "$ " + subtotal.toLocaleString("es-AR");
  if (elEnvio)    elEnvio.textContent    = shipping.cost ? "$ " + shipping.cost.toLocaleString("es-AR") : "—";
  if (elTotal)    elTotal.textContent    = "$ " + total.toLocaleString("es-AR");
}

// 4) Adaptar tus productos → ítems de MP (usa datos reales desde Supabase)
async function cartToMPItems() {
  const cart = getCart();
  if (!cart.length) return [];

  const ids = cart.map(i => i.id);
  const prods = await fetchByIds(ids);
  const map = new Map(prods.map(p => [p.id, p]));

  return cart.map(i => {
    const p = map.get(i.id) || {};
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

// 5) Tomar datos del cliente desde el formulario (ajustá los IDs a los tuyos)
function getCustomerFromForm() {
  return {
    name: document.querySelector('#nombre')?.value || '',
    surname: document.querySelector('#apellido')?.value || '',
    email: document.querySelector('#email')?.value || ''
    // opcionales:
    // docType: 'DNI', docNumber: '12345678',
    // phone: document.querySelector('#telefono')?.value || '',
    // address: { street:'Av. X', number:'123', zip:'7600' }
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

    console.log("[MP] creando preferencia con:", { cart, customer, shipping });

    const res = await fetch('/.netlify/functions/createPreference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, customer, shipping })
    });

    if (!res.ok) {
      // 👇 lee el texto que envía tu función (útil para depurar)
      const txt = await res.text();
      console.error('createPreference FAIL:', res.status, txt);
      alert('Hubo un error iniciando el pago.\n' + txt);
      return;
    }

    const data = await res.json();
    console.log("Preferencia creada ✅", data);

    const redirect = data.init_point || data.sandbox_init_point;
    if (!redirect) throw new Error('Preferencia sin init_point');

    window.location.href = redirect;
  } catch (e) {
    console.error('Error iniciando pago:', e);
    alert('Ocurrió un error iniciando el pago. Intentá nuevamente.');
  }
}


// 7) Auto-wire de eventos (envío + botón pagar)
function wireCartEvents() {
  // botones/inputs de envío
  document.querySelectorAll('input[name="shipping"], #shippingMethod')
    .forEach(el => el.addEventListener('change', renderTotalsBox));

  // botón de pagar
  document.getElementById('btn-pagar')?.addEventListener('click', payWithMercadoPago);
}

// 8) Inicialización en carrito.html
document.addEventListener('DOMContentLoaded', () => {
  // Si estás parado en la página de carrito, refrescá totales y eventos
  if (document.getElementById('cartItems')) {
    renderTotalsBox().catch(console.error);
    wireCartEvents();
  }
});

// También lo dejo en window por si lo querés usar desde HTML inline
window.Pay = { payWithMercadoPago, renderTotalsBox };
