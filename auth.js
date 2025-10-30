// auth.js
import { supabase } from "./js/supabaseClient.js";

/* ========== Session helpers ========== */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[auth] getSession error", error);
    return null;
  }
  return data?.session ?? null;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[auth] getUser error", error);
    return null;
  }
  return data?.user ?? null;
}

/* ========== Sign In / Out ========== */
export async function signIn(email, password) {
  console.info("[auth] signIn start", email);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[auth] signIn error", error);
    throw error;
  }
  console.info("[auth] signIn ok", data?.user?.id);
  return data;
}

export async function signOut() {
  console.info("[auth] signOut");
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth] signOut error", error);
    throw error;
  }
}

/* ========== Admin check ========== */
export async function isAdmin(userId) {
  console.info("[auth] isAdmin for", userId);
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] isAdmin error", error);
    return false;
  }
  const ok = !!data?.user_id;
  console.info("[auth] isAdmin =", ok);
  return ok;
}

/* ========== Auth state subscription ========== */
export function onAuthStateChange(callback) {
  console.info("[auth] subscribe onAuthStateChange");
  // Llamada inicial
  supabase.auth.getUser().then(({ data }) => callback(data?.user ?? null));

  // Suscripción (v2 retorna { data: { subscription } })
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  // Devuelvo una función para desuscribirse por si la necesitás
  return () => data?.subscription?.unsubscribe?.();
}
