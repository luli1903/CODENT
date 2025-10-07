// js/shop.js (ES module)
import { supabase } from '../supabaseClient.js';

async function listProducts(){
  const {data,error}=await supabase.from('products').select('*').order('created_at',{ascending:false});
  if(error){ console.error(error); return []; }
  return data||[];
}

function render(products){
  const grid=document.getElementById('product-list'); if(!grid) return;
  grid.innerHTML='';
  if(!products.length){ grid.innerHTML='<div class="col-12 text-center text-muted py-5">No hay productos todavía.</div>'; return; }

  products.forEach(p=>{
    const col=document.createElement('div'); col.className='col-sm-6 col-md-4 col-lg-3 mb-4';
    col.innerHTML=`
      <div class="card product-card h-100">
        <div class="square-wrap"><img src="${p.image_url||''}" alt="${p.name||''}" class="card-img-top square-img"></div>
        <div class="card-body text-center d-flex flex-column">
          <h5 class="card-title mb-1">${p.name||''}</h5>
          <div class="price mb-3">$${Number(p.price||0).toLocaleString('es-AR')}</div>
          <button class="btn btn-primary add-to-cart" data-id="${p.id}">Agregar</button>
        </div>
      </div>`;
    grid.appendChild(col);
  });

  // bind carrito
  grid.querySelectorAll('.add-to-cart').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id=btn.dataset.id;
      if(!id){ console.warn('sin id'); return; }
      if(!window.Cart){ console.error('window.Cart no disponible'); return; }
      window.Cart.addToCart(id,1);
      window.Cart.updateCartBadge && window.Cart.updateCartBadge();
    });
  });
}

async function init(){
  const grid=document.getElementById('product-list'); if(!grid) return;
  grid.innerHTML='Cargando...';
  const products=await listProducts();
  render(products);
}
document.addEventListener('DOMContentLoaded', init);
