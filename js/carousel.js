// Carrusel de imágenes
document.addEventListener("DOMContentLoaded", () => {
  let index = 0;
  const slides = document.querySelectorAll(".slide");
  const total = slides.length;

  function showSlide(i) {
    slides.forEach((slide, idx) => {
      slide.style.display = idx === i ? "block" : "none";
    });
  }

  function nextSlide() {
    index = (index + 1) % total;
    showSlide(index);
  }

  showSlide(index);
  setInterval(nextSlide, 3000); // cada 3s cambia la imagen
});
