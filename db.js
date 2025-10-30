// db.js (versión pulida)
import { supabase } from "./js/supabaseClient.js";
import { supabase } from "./auth.js";

const PRODUCT_COLS = "id,name,description,category,price,stock,image_url,created_at";

// 👇 pegá esto debajo del PRODUCT_COLS o arriba de getProduct()
export async function listProducts({ category } = {}) {
  let query = supabase
    .from("products")
    .select(PRODUCT_COLS)
    .order("created_at", { ascending: false });

  // Si llega un filtro, lo aplicamos
  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}


export async function getProduct(id) {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLS)
    .eq("id", id)
    .maybeSingle(); // no rompe si no existe
  if (error) throw error;
  return data ?? null;
}

export async function createProduct(values) {
  const payload = normalize(values);
  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select(PRODUCT_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, values) {
  const payload = normalize(values, true);
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select(PRODUCT_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function removeProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/** Sube imagen, retorna publicUrl */
export async function uploadProductImage(file) {
  if (!file) return null;

  // nombre seguro
  const safeName = String(file.name || "img")
    .normalize("NFKD").replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_").slice(0, 80);

  const path = `products/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase
    .storage
    .from("products")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/*",
    });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data?.publicUrl || null;
}

/** Normaliza payload; si partial=true, quita undefined */
function normalize(v, partial = false) {
  const num = (x) => (x === undefined || x === null || x === "" ? undefined : Number(x));
  const obj = {
    name: v.name?.trim(),
    description: v.description?.trim() ?? null,
    category: v.category?.trim() || null,
    price: num(v.price),
    stock: Number.isFinite(num(v.stock)) ? num(v.stock) : 0,
    image_url: v.image_url ?? undefined,
  };
  if (partial) {
    return Object.fromEntries(Object.entries(obj).filter(([, val]) => val !== undefined));
  }
  if (obj.price === undefined) obj.price = 0;
  if (obj.stock === undefined) obj.stock = 0;
  return obj;
}

/* ============================
   Carrito persistente (por user)
============================ */

/** Obtiene o crea el carrito ACTIVO del usuario */
export async function getOrCreateActiveCart() {
  const uid = await getUserId();
  if (!uid) throw new Error("Necesitás iniciar sesión.");

  // ¿Ya existe carrito activo?
  let { data: cart, error } = await supabase
    .from("carts")
    .select("id, status")
    .eq("user_id", uid)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;

  if (cart) return cart;

  // Si no existe, lo creo
  const { data: created, error: e2 } = await supabase
    .from("carts")
    .insert({ user_id: uid, status: "active" })
    .select("id, status")
    .single();
  if (e2) throw e2;

  return created;
}

/** Agrega un producto al carrito (suma qty si ya existe) */
export async function addItemToCart(cart_id, product_id, qty = 1, unit_price = 0) {
  // ¿existe ya este product en el cart?
  const { data: existing, error: e1 } = await supabase
    .from("cart_items")
    .select("id, qty")
    .eq("cart_id", cart_id)
    .eq("product_id", product_id)
    .maybeSingle();
  if (e1) throw e1;

  if (existing) {
    const { error: e2 } = await supabase
      .from("cart_items")
      .update({ qty: (existing.qty || 0) + qty, unit_price })
      .eq("id", existing.id);
    if (e2) throw e2;
  } else {
    const { error: e3 } = await supabase
      .from("cart_items")
      .insert({ cart_id, product_id, qty, unit_price });
    if (e3) throw e3;
  }
}

/** Lista los items del carrito con datos del producto */
export async function listCartItems(cart_id) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("id, product_id, qty, unit_price, products:product_id(name, image_url, price)")
    .eq("cart_id", cart_id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Vacía el carrito (opcional) */
export async function clearCart(cart_id) {
  const { error } = await supabase.from("cart_items").delete().eq("cart_id", cart_id);
  if (error) throw error;
}

