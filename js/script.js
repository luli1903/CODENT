// CODEN v1 — UI general (navbar, scroll suave, badges)

function smoothScrollWithOffset(){
  const OFFSET = 70;
  document.querySelectorAll('a.js-scroll[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const href = a.getAttribute('href');
      const target = document.querySelector(href);
      if(target){
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.pageYOffset - OFFSET;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
}

// Drawer mobile para la nueva navbar
function wireNavDrawer(){
  const toggle = document.getElementById('menuToggle');
  const drawer = document.getElementById('mobileMenu');
  if(!toggle || !drawer) return;
  toggle.addEventListener('click', ()=> drawer.toggleAttribute('hidden'));
  // Cierra al navegar
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', ()=> drawer.setAttribute('hidden','')));
}

document.addEventListener('DOMContentLoaded', ()=>{
  // Si cart.js ya fue cargado, actualiza la badge
  window.Cart?.updateCartBadge?.();
  smoothScrollWithOffset();
  wireNavDrawer();
});
