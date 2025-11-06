import { supabase } from "./supabaseClient.js";

(async function loadFeatured() {
  const grid  = document.getElementById("featuredGrid");
  const empty = document.getElementById("featuredEmpty");
  if (!grid) return;

  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,image_url,slug,is_active,featured")
    .eq("is_active", true)
    .eq("featured", true)
    .limit(8);

  if (error) {
    console.error("Error cargando destacados:", error);
    empty.style.display = "block";
    return;
  }

  if (!data || data.length === 0) {
    empty.style.display = "block";
    return;
  }

  grid.innerHTML = data
    .map(
      (p) => `
      <article class="product-card">
        <a class="img" href="/producto.html?slug=${encodeURIComponent(p.slug || p.id)}">
          <img src="${p.image_url || "/img/placeholder.png"}" alt="${p.name || "Producto"}">
        </a>
        <div class="body">
          <div class="title">${p.name || "Producto"}</div>
          <div class="price">$ ${Number(p.price || 0).toLocaleString("es-AR")}</div>
        </div>
      </article>`
    )
    .join("");
})();
