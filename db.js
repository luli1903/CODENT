import { supabase } from "/js/supabaseClient.js";

const PRODUCT_COLS = "id,name,description,category,price,stock,image_url,created_at";

export async function listProducts({ category } = {}) {
  let q = supabase.from("products").select(PRODUCT_COLS).order("created_at", { ascending: false });
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getProduct(id) {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLS)
    .eq("id", id)
    .maybeSingle();
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

export async function uploadProductImage(file) {
  if (!file) return null;

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

export async function getOrCreateActiveCart() {
  const { data: me } = await supabase.auth.getUser();
  const uid = me?.user?.id;
  if (!uid) throw new Error("No user");

  let { data: cart, error } = await supabase
    .from("carts")
    .select("id,status")
    .eq("user_id", uid)
    .eq("status", "active")
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;

  if (!cart) {
    const ins = await supabase
      .from("carts")
      .insert({ user_id: uid, status: "active" })
      .select("id,status")
      .single();
    if (ins.error) throw ins.error;
    cart = ins.data;
  }
  return cart;
}

export async function addItemToCart(cartId, productId, qty = 1, unitPrice = 0) {
  const { data, error } = await supabase
    .from("cart_items")
    .insert({ cart_id: cartId, product_id: productId, qty, unit_price: unitPrice })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

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
