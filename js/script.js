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

function wireNavDrawer(){
  const toggle = document.getElementById('menuToggle');
  const drawer = document.getElementById('mobileMenu');
  if(!toggle || !drawer) return;
  toggle.addEventListener('click', ()=> drawer.toggleAttribute('hidden'));
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', ()=> drawer.setAttribute('hidden','')));
}

document.addEventListener('DOMContentLoaded', ()=>{
  window.Cart?.updateCartBadge?.();
  smoothScrollWithOffset();
  wireNavDrawer();
});
