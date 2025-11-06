document.addEventListener("DOMContentLoaded", () => {
  let index = 0;
  const slides = document.querySelectorAll(".slide");
  const total = slides.length;
  if (!total) return;

  const showSlide = (i) => slides.forEach((s, idx) => s.style.display = idx === i ? "block" : "none");
  const nextSlide = () => { index = (index + 1) % total; showSlide(index); };

  showSlide(index);
  setInterval(nextSlide, 3000);
});
