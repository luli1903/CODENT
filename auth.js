import { supabase } from "/supabaseClient.js";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthStateChange(cb) {
  supabase.auth.getUser().then(({ data }) => cb(data?.user || null));
  const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => cb(s?.user || null));
  return sub;
}

export async function isAdmin(uid) {
  if (!uid) return false;
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.user_id);
}
