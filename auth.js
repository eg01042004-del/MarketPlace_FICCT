import { supabase } from "./supabase.js";

export async function registrar(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function observarAuth(callback) {
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}