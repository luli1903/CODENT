document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre  = document.getElementById("nombre")?.value.trim();
    const email   = document.getElementById("email")?.value.trim();
    const mensaje = document.getElementById("mensaje")?.value.trim();

    if (!nombre || !email || !mensaje) return alert("Por favor, complete todos los campos.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("Ingrese un correo válido.");

    alert("Formulario enviado correctamente ✅");
    form.reset();
  });
});
