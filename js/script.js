// Scroll suave con offset de navbar
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

document.addEventListener('DOMContentLoaded', ()=>{
  window.Cart?.updateCartBadge?.();
  smoothScrollWithOffset();
});
