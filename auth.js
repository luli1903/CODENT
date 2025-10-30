// auth.js
import { supabase } from "./js/supabaseClient.js";

/* ========== Session helpers ========== */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    console.error("[auth] getSession error", error);
    return null;
  }
  return data?.session ?? null;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError") {
      console.info("[auth] getUser: no session (ok)");
      return null;
    }
    console.error("[auth] getUser error", error);
    return null;
  }
  return data?.user ?? null;
}

export async function getUserId() {
  const u = await getUser();
  return u?.id ?? null;
}

/* ========== Sign Up / Sign In / Out ========== */
// Registro con verificación por email.
// IMPORTANT: cambiá el redirect si preferís otra página distinta a /recovery.html
export async function signUp(email, password) {
  console.info("[auth] signUp start", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: location.origin + "/recovery.html", // <- ya la tenés en tu repo
    },
  });
  if (error) {
    console.error("[auth] signUp error", error);
    throw error;
  }
  console.info("[auth] signUp ok", data?.user?.id);
  return data;
}

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

/* ========== Email verification helpers ========== */
export async function isEmailVerified() {
  const user = await getUser();
  // v2: email_confirmed_at se setea cuando el usuario verifica el correo
  const ok = !!user?.email_confirmed_at;
  console.info("[auth] isEmailVerified =", ok);
  return ok;
}

// Reenviar correo de verificación (usa el correo actual o el que pases por parámetro)
export async function resendVerificationEmail(email) {
  const target = email || (await getUser())?.email;
  if (!target) {
    throw new Error("No hay email para re-enviar verificación.");
  }
  console.info("[auth] resendVerificationEmail", target);
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email: target,
    options: {
      emailRedirectTo: location.origin + "/recovery.html",
    },
  });
  if (error) {
    console.error("[auth] resendVerificationEmail error", error);
    throw error;
  }
  return data;
}

/* ========== Guards (útiles en páginas protegidas) ========== */
export async function requireAuth(redirectTo = "/index.html") {
  const session = await getSession();
  if (!session?.user) {
    location.href = redirectTo;
    return null;
  }
  return session.user;
}

// Útil para pantallas de datos de envío / checkout
export async function requireEmailVerified(redirectIfFail = "") {
  const ok = await isEmailVerified();
  if (!ok) {
    // Podés mostrar un banner en la UI en vez de redirigir
    if (redirectIfFail) location.href = redirectIfFail;
    throw new Error("Necesitás verificar tu email para continuar.");
  }
  return true;
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
  supabase.auth.getSession().then(({ data }) => {
    callback(data?.session?.user ?? null);
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => data?.subscription?.unsubscribe?.();
}
