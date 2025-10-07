// js/cart.js (ES module) – carrito contra Supabase
import { supabase } from '../supabaseClient.js';

const CART_KEY = 'coden_cart';

/* storage */
function getCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY))||[];}catch{return[];} }
function setCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(); }
function updateCartBadge(){
  const badge=document.getElementById('cartBadge'); if(!badge) return;
  const count=getCart().reduce((a,i)=>a+Number(i.qty||0),0); badge.textContent=count;
}

/* supabase */
async function fetchByIds(ids){
  if(!ids?.length) return [];
  const {data,error}=await supabase.from('products').select('*').in('id',ids);
  if(error){ console.error('fetchByIds',error); return []; }
  return data||[];
}
async function fetchOne(id){
  const {data,error}=await supabase.from('products').select('*').eq('id',id).single();
  if(error){ console.error('fetchOne',error); return null; }
  return data;
}

/* API carrito */
async function addToCart(productId, qty=1){
  const cart=getCart();
  const i=cart.findIndex(x=>x.id===productId);
  if(i>=0) cart[i].qty+=qty; else cart.push({id:productId, qty});
  setCart(cart);
  // toast con nombre real (no bloquea UI si falla)
  try{ const p=await fetchOne(productId); if(p&&window.toastCoden) window.toastCoden(`Agregado: ${p.name}`);}catch{}
}
function removeFromCart(productId){ setCart(getCart().filter(i=>i.id!==productId)); }
function setQty(productId, qty){
  if(qty<=0) return removeFromCart(productId);
  const cart=getCart(); const i=cart.findIndex(x=>x.id===productId);
  if(i>=0){ cart[i].qty=qty; setCart(cart); }
}
async function cartTotal(){
  const cart=getCart(); const ids=cart.map(i=>i.id);
  const prods=await fetchByIds(ids); const map=new Map(prods.map(p=>[p.id,p]));
  return cart.reduce((s,i)=> s + Number(map.get(i.id)?.price||0)*Number(i.qty||0), 0);
}

/* render carrito.html */
async function renderCartPage(){
  const list=document.getElementById('cartItems');
  const totalEl=document.getElementById('cartTotal');
  if(!list||!totalEl) return;

  const cart=getCart(); list.innerHTML='';
  if(!cart.length){ list.innerHTML='<p class="text-muted mb-0">Tu carrito está vacío.</p>'; totalEl.textContent='$0'; updateCartBadge(); return; }

  const ids=cart.map(i=>i.id);
  const prods=await fetchByIds(ids); const map=new Map(prods.map(p=>[p.id,p]));
  let total=0;

  cart.forEach(item=>{
    const p=map.get(item.id); if(!p) return;
    const price=Number(p.price||0), qty=Number(item.qty||1), sub=price*qty; total+=sub;

    const row=document.createElement('div');
    row.className='cart-item d-flex align-items-center justify-content-between';
    row.innerHTML=`
      <div class="d-flex align-items-center">
        <img src="${p.image_url||''}" alt="${p.name||''}" style="width:64px;height:64px;object-fit:cover;border-radius:10px" class="mr-2">
        <div>
          <div class="font-weight-bold">${p.name||''}</div>
          <div class="text-muted small">$${price.toLocaleString('es-AR')}</div>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <input type="number" min="1" value="${qty}" class="form-control form-control-sm mr-2" style="width:80px">
        <button class="btn btn-sm btn-outline-danger">Eliminar</button>
      </div>
    `;
    const qtyInput=row.querySelector('input'); const delBtn=row.querySelector('button');
    qtyInput.addEventListener('change', async ()=>{
      const q=Math.max(1, parseInt(qtyInput.value)||1); setQty(p.id,q);
      const t=await cartTotal(); totalEl.textContent='$'+t.toLocaleString('es-AR');
    });
    delBtn.addEventListener('click', async ()=>{
      removeFromCart(p.id); await renderCartPage();
    });
    list.appendChild(row);
  });

  totalEl.textContent='$'+total.toLocaleString('es-AR');
  updateCartBadge();
}

/* expone API igual que antes */
window.Cart={ getCart,setCart,updateCartBadge, addToCart,removeFromCart,setQty, cartTotal,renderCartPage };
