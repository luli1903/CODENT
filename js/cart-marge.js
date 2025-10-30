// /js/cart-merge.js  (alineado con tu cart.js que usa localStorage "coden_cart")
import { onAuthStateChange } from "/auth.js";
import { supabase } from "/js/supabaseClient.js";
import { getOrCreateActiveCart, addItemToCart } from "/db.js";

const LOCAL_KEY = "coden_cart"; // <-- antes tenías "cart_local"

// obtiene precio desde la tabla products si no vino en el local
async function getProductPrice(id) {
  const { data, error } = await supabase
    .from("products")
    .select("price")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.price || 0);
}

onAuthStateChange(async (user) => {
  if (!user) return; // no hay sesión, no mergeamos

  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    if (!Array.isArray(local) || local.length === 0) return;

    // crea/obtiene el carrito activo de este usuario en DB
    const cart = await getOrCreateActiveCart();

    // items locales: { id, qty } ─> agregamos a DB con su precio unitario
    for (const it of local) {
      const productId = it.product_id || it.id;
      const qty = Number(it.qty || 1);
      if (!productId || qty <= 0) continue;

      // si el local no trae unit_price/price, lo leo de products
      const unit =
        Number(it.unit_price ?? it.price ?? 0) || (await getProductPrice(productId));

      await addItemToCart(cart.id, productId, qty, unit);
    }

    // limpia local si todo salió bien
    localStorage.removeItem(LOCAL_KEY);
    console.info("[cart-merge] OK: migrado a DB y limpiado local.");
  } catch (err) {
    console.error("[cart-merge] Error:", err?.message || err, err);
  }
});
