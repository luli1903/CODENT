import { onAuthStateChange } from "/auth.js";
import { supabase } from "/js/supabaseClient.js";
import { getOrCreateActiveCart, addItemToCart } from "/db.js";

const LOCAL_KEY = "coden_cart"; // <-- antes tenías "cart_local"

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
  if (!user) return; 

  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    if (!Array.isArray(local) || local.length === 0) return;

    const cart = await getOrCreateActiveCart();

    for (const it of local) {
      const productId = it.product_id || it.id;
      const qty = Number(it.qty || 1);
      if (!productId || qty <= 0) continue;

      const unit =
        Number(it.unit_price ?? it.price ?? 0) || (await getProductPrice(productId));

      await addItemToCart(cart.id, productId, qty, unit);
    }

    localStorage.removeItem(LOCAL_KEY);
    console.info("[cart-merge] OK: migrado a DB y limpiado local.");
  } catch (err) {
    console.error("[cart-merge] Error:", err?.message || err, err);
  }
});
