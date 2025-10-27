// /auth.js
import { supabase } from "/js/supabaseClient.js";

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}

export function onAuthStateChange(cb) {
  // Llamada inicial
  getUser().then(cb).catch(() => cb(null));
  // Suscripción a cambios
  supabase.auth.onAuthStateChange(async () => {
    const user = await getUser();
    cb(user);
  });
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function isAdmin(userId) {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[isAdmin]", error);
    return false;
  }
  return !!data;
}
