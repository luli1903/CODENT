// /js/cart-merge.js
import { onAuthStateChange } from "/auth.js";
import { getOrCreateActiveCart, addItemToCart } from "/db.js";

const LOCAL_KEY = "cart_local";

onAuthStateChange(async (user) => {
  if (!user) return;

  try {
    // Si no hay carrito local, nada que hacer
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    if (!local.length) return;

    // Crear/obtener carrito en DB
    const cart = await getOrCreateActiveCart();

    // Pasar items (sumando cantidades si ya existen)
    for (const it of local) {
      const qty = Number(it.qty || 1);
      const price = Number(it.unit_price || 0);
      if (!it.product_id || qty <= 0) continue;
      await addItemToCart(cart.id, it.product_id, qty, price);
    }

    // Limpiar local
    localStorage.removeItem(LOCAL_KEY);
    console.info("[cart-merge] Hecho. Carrito local migrado a DB.");
  } catch (err) {
    console.error("[cart-merge] Error:", err?.message || err, err);
  }
});
