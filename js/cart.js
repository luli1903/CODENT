// CODENT — carrito + Mercado Pago + helpers
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
export async function addToCart(productId, qty = 1){
  const cart = getCart();
  const idx  = cart.findIndex(x => String(x.id) === String(productId));

  let snap = null;
  try {
    const p = await fetchOne(productId);
    if (p) {
      snap = {
        name: p.name || "Producto",
        price: Number(p.price || 0),
        image_url: p.image_url || ""
      };
    }
  } catch (_) {}

  if (idx >= 0){
    cart[idx].qty += qty;
    if (snap) cart[idx] = { ...cart[idx], ...snap };
  } else {
    cart.push({ id: productId, qty, ...(snap || {}) });
  }

  setCart(cart);
  if (snap && window.toastCoden) window.toastCoden(`Agregado: ${snap.name}`);
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

  const ids   = cart.map(i => i.id);
  const prods = await fetchByIds(ids);
  const map   = new Map(prods.map(p => [String(p.id), p]));

  let total = 0;

  cart.forEach(item => {
    const p = map.get(String(item.id));
    const name  = (p?.name ?? item.name ?? "Producto");
    const price = Number(p?.price ?? item.price ?? 0);
    const img   = (p?.image_url ?? item.image_url ?? "");
    const qty   = Number(item.qty || 1);
    const sub   = price * qty;

    total += sub;

    const row = document.createElement("div");
    row.className = "coden-product";
    row.style.cssText = "display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:10px;margin-bottom:10px";

    const safeName = String(name).replace(/"/g,"&quot;");

    row.innerHTML = `
      <div class="coden-product__img" style="width:72px; height:54px; border-radius:12px; overflow:hidden">
        <img src="${img}" alt="${safeName}">
      </div>
      <div>
        <div class="coden-product__title">${name}</div>
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

    const qtyInput = row.querySelector("input");
    const delBtn   = row.querySelector("button");

    qtyInput.addEventListener("change", async ()=>{
      const q = Math.max(1, parseInt(qtyInput.value)||1);
      setQty(item.id, q);
      const t = await cartTotal();
      totalEl.textContent = "$" + t.toLocaleString("es-AR");
      await renderTotalsBox(); // refresca resumen (incluye envío)
    });

    delBtn.addEventListener("click", async ()=>{
      removeFromCart(item.id);
      await renderCartPage();
      await renderTotalsBox();
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
   Envío real (dirección + costo)
======================= */
function readShipAddress(){
  return {
    name:    document.getElementById('ship_name')?.value || '',
    surname: document.getElementById('ship_surname')?.value || '',
    email:   document.getElementById('ship_email')?.value || '',
    phone:   document.getElementById('ship_phone')?.value || '',
    zip:     document.getElementById('ship_zip')?.value || '',
    state:   document.getElementById('ship_state')?.value || '',
    city:    document.getElementById('ship_city')?.value || '',
    street:  document.getElementById('ship_street')?.value || '',
    number:  document.getElementById('ship_number')?.value || '',
    floor:   document.getElementById('ship_floor')?.value || '',
    refs:    document.getElementById('ship_refs')?.value || '',
  };
}
function isHome(){ return document.querySelector('input[name="shipping_method"]:checked')?.value === 'home'; }

function calculateShipping(cart, addr){
  if (!isHome()) return { method:'pickup', label:'Retiro en local (Mar del Plata)', cost:0 };

  const required = ['zip','state','city','street','number','email','name','surname'];
  const missing = required.filter(k => !String(addr[k]||'').trim());
  if (missing.length) return { method:'home', label:'Envío a domicilio', cost:null, error:'Completá los datos para calcular el envío.' };

  const weight = cart.reduce((kg, p) => kg + (Number(p.weight_kg||0) * Number(p.qty||1)), 0);

  const zip = (addr.zip||'').trim();
  const isMDP = zip.startsWith('760'); // 7600..7603
  let base = 7500;
  let zone = 'Resto del país';
  if (addr.state === 'Buenos Aires') {
    base = isMDP ? 3000 : 5500;
    zone = isMDP ? 'Urbano Mar del Plata' : 'Provincia de Buenos Aires';
  } else if (addr.state === 'CABA') {
    base = 7500; zone = 'CABA';
  }

  let extra = 0;
  if (weight > 5) {
    const blocks = Math.ceil((weight - 5) / 5);
    extra = blocks * 1500;
  }

  const cost = base + extra;
  return { method:'home', label:`${zone}`, cost };
}

/* =======================
   Resumen de totales
======================= */
async function computeTotals() {
  const cart = getCart();
  const ids = cart.map(i => i.id);
  const prods = await fetchByIds(ids);
  const map = new Map(prods.map(p => [String(p.id), p]));

  const subtotal = cart.reduce((sum, i) => {
    const p = map.get(String(i.id));
    return sum + Number(p?.price || 0) * Number(i.qty || 0);
  }, 0);

  const addr = readShipAddress();
  const shipping = calculateShipping(cart, addr);
  const total = subtotal + Number(shipping?.cost || 0);

  return { subtotal, shipping, total };
}

export async function renderTotalsBox() {
  const { subtotal, shipping, total } = await computeTotals();
  const elSubtotal = document.querySelector('#subtotal');
  const elEnvio    = document.querySelector('#envio');
  const elTotal    = document.querySelector('#total');
  const note       = document.getElementById('ship_calc_msg');

  if (elSubtotal) elSubtotal.textContent = "$ " + subtotal.toLocaleString("es-AR");
  if (elEnvio)    elEnvio.textContent    = shipping.cost == null ? "—" : (shipping.cost ? "$ " + shipping.cost.toLocaleString("es-AR") : "Sin costo");
  if (elTotal)    elTotal.textContent    = "$ " + total.toLocaleString("es-AR");
  if (note) {
    const addr = readShipAddress();
    note.textContent = isHome()
      ? (shipping.cost == null ? (shipping.error || "Completá los datos para calcular el envío.") : `Destino: ${addr.city}, ${addr.state} (${addr.zip}).`)
      : "Retiro en Mar del Plata, Buenos Aires.";
  }
}

/* =======================
   Pago MP (redirect clásico)
======================= */
function getCustomerFromForm() {
  const a = readShipAddress();
  return { name: a.name, surname: a.surname, email: a.email, phone: a.phone };
}

export async function payWithMercadoPago() {
  try {
    const cart = getCart();
    if (!cart.length) { alert("Tu carrito está vacío."); return; }

    const customer = getCustomerFromForm();
    if (!customer.email) { alert("Ingresá un email válido."); return; }

    const addr = readShipAddress();
    const shipping = calculateShipping(cart, addr);
    if (isHome() && shipping.cost == null) {
      alert('Completá los datos de envío para continuar.');
      return;
    }

    // Armamos payload para el serverless
    const payload = {
      cart: cart.map(i => ({ id: i.id, title: i.name || "Producto", unit_price: Number(i.price || 0), quantity: Number(i.qty || 1), weight_kg: Number(i.weight_kg || 0) })),
      customer,
      shipping: {
        method: shipping.method,
        label: shipping.label,
        cost: shipping.cost || 0,
        address: addr
      }
    };

    const res = await fetch('/api/create-preference', {   // <— UNIFICADO
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('createPreference FAIL:', res.status, data);
      alert('Hubo un error iniciando el pago.\n' + (data?.error || ''));
      return;
    }

    const redirect = data.init_point || data.sandbox_init_point;
    if (!redirect) throw new Error('Preferencia sin init_point');

    window.location.href = redirect;
  } catch (e) {
    console.error('Error iniciando pago:', e);
    alert('Ocurrió un error iniciando el pago. Intentá nuevamente.');
  }
}

/* =======================
   Wire + init
======================= */
function wireCartEvents() {
  // radios de envío (pickup/home)
  document.querySelectorAll('input[name="shipping_method"]').forEach(el => {
    el.addEventListener('change', () => { 
      const box = document.getElementById('shippingAddress');
      if (box) box.style.display = isHome() ? '' : 'none';
      renderTotalsBox().catch(console.error);
    });
  });

  // inputs de dirección
  [
    'ship_zip','ship_state','ship_city','ship_street','ship_number','ship_floor',
    'ship_phone','ship_email','ship_name','ship_surname'
  ].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      renderTotalsBox().catch(console.error);
    });
  });

  document.getElementById('btn-pagar')?.addEventListener('click', payWithMercadoPago);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cartItems')) {
    renderCartPage().catch(console.error);
    renderTotalsBox().catch(console.error);
    wireCartEvents();
    const box = document.getElementById('shippingAddress');
    if (box) box.style.display = isHome() ? '' : 'none';
  }
});

// API global (opcional)
window.Cart = { getCart,setCart,updateCartBadge, addToCart,removeFromCart,setQty, cartTotal,renderCartPage };
window.Pay  = { payWithMercadoPago, renderTotalsBox };
