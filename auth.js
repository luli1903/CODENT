// auth.js (versión pulida)
import { supabase } from "./supabaseClient.js";

/** Login con email/clave */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user ?? null;
}

/** Logout */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Usuario actual (helper) */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user ?? null;
}

/**
 * Suscripción a cambios de auth
 * @returns {() => void} función para desuscribirse
 */
export function onAuthStateChange(cb) {
  // Emitir estado inicial
  supabase.auth.getUser().then(({ data }) => cb(data?.user ?? null));

  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });

  // devolver unsubscribe seguro
  return () => {
    try {
      subscription?.subscription?.unsubscribe?.();
    } catch {}
  };
}

/** Chequeo de admin */
export async function isAdmin(uid) {
  if (!uid) return false;
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) {
    console.error("[isAdmin] error:", error.message);
    return false;
  }
  return Boolean(data?.user_id);
}
