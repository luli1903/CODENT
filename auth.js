import { supabase } from './supabaseClient.js';

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error; return data.user;
}
export async function signOut() { await supabase.auth.signOut(); }

export function onAuthStateChange(cb){
  supabase.auth.getUser().then(({data})=>cb(data?.user||null));
  return supabase.auth.onAuthStateChange((_e, s)=>cb(s?.user||null));
}

export async function isAdmin(uid){
  if(!uid) return false;
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', uid).single();
  return Boolean(data?.user_id);
}
