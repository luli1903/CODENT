// auth.js
import { supabase } from "./js/supabaseClient.js";

/* ========== Session helpers ========== */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // Si no hay sesión, no lo trates como error fatal
    if (error.name === "AuthSessionMissingError") return null;
    console.error("[auth] getSession error", error);
    return null;
  }
  return data?.session ?? null;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // Evitar rojo cuando simplemente no hay sesión aún
    if (error.name === "AuthSessionMissingError") {
      console.info("[auth] getUser: no session (ok)");
      return null;
    }
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
  // Llamada inicial: usa getSession (no tira error cuando no hay sesión)
  supabase.auth.getSession().then(({ data }) => {
    callback(data?.session?.user ?? null);
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => data?.subscription?.unsubscribe?.();
}
