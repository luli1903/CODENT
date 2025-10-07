// JS común del sitio (no renderiza productos aquí)
import { updateCartBadge } from './cart.js';

// Scroll suave con offset de navbar
function smoothScrollWithOffset(){
  const OFFSET = 70; // alto aprox. de navbar
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
  updateCartBadge();
  smoothScrollWithOffset();
});

// Mini toast global opcional
window.toastCoden = (msg)=>{
  let t = document.getElementById('toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#052c47;color:#fff;padding:.6rem 1rem;border-radius:12px;font-weight:700;opacity:0;transition:opacity .2s;z-index:1080';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(()=>t.style.opacity='0', 1400);
};
