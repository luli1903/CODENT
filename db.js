// db.js (versión pulida)
import { supabase } from "./js/supabaseClient.js";

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
