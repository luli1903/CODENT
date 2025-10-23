import { supabase } from "./supabaseClient.js";

export async function listProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProduct(id) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createProduct(values) {
  const { data, error } = await supabase.from("products").insert(normalize(values)).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, values) {
  const { data, error } = await supabase.from("products").update(normalize(values, true)).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function removeProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProductImage(file) {
  if (!file) return null;
  const path = `products/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("products").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data?.publicUrl || null;
}

function normalize(v, partial = false) {
  const obj = {
    name: v.name?.trim(),
    description: v.description ?? null,
    category: v.category?.trim() || null,
    price: v.price !== undefined ? Number(v.price) : undefined,
    stock: v.stock !== undefined ? Number(v.stock) : undefined,
    image_url: v.image_url ?? undefined,
  };
  if (partial) return Object.fromEntries(Object.entries(obj).filter(([, val]) => val !== undefined));
  if (obj.price === undefined) obj.price = 0;
  if (obj.stock === undefined) obj.stock = 0;
  return obj;
}
