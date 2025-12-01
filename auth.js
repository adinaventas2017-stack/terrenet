// js/auth.js - Manejo centralizado de autenticación
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { logError } from './utils.js';

// Singleton pattern para evitar múltiples instancias de Supabase client
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

// Exportar para uso en otros módulos
export { getSupabaseClient };

/**
 * Obtiene la sesión actual del usuario
 */
export async function getCurrentSession() {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    return session;
  } catch (err) {
    logError("Error getting session:", err);
    return null;
  }
}

/**
 * Verifica si el usuario actual es admin
 */
export async function isUserAdmin(userId) {
  if (!userId) return false;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("admins")
      .select("uid")
      .eq("uid", userId)
      .limit(1);

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    logError("Error checking admin status:", err);
    return false;
  }
}

/**
 * Realiza login con email y contraseña
 */
export async function loginWithEmail(email, password) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { success: true, user: data.user };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Error desconocido al iniciar sesión",
    };
  }
}

/**
 * Realiza logout
 */
export async function logout() {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (err) {
    logError("Error logging out:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Redirige al panel apropiado según rol
 */
export async function redirectToPanelByRole(userId) {
  if (!userId) {
    window.location.href = "index.html";
    return;
  }

  const isAdmin = await isUserAdmin(userId);

  if (isAdmin) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "user.html";
  }
}

/**
 * Verifica acceso a una página protegida
 * Si no hay sesión, redirige a index.html
 */
export async function requireAuth() {
  const session = await getCurrentSession();

  if (!session) {
    window.location.href = "index.html";
    return null;
  }

  return session;
}

/**
 * Verifica acceso de admin a una página protegida
 * Si no es admin, redirige a user.html
 */
export async function requireAdminAuth() {
  const session = await getCurrentSession();

  if (!session) {
    window.location.href = "index.html";
    return null;
  }

  const isAdmin = await isUserAdmin(session.user.id);

  if (!isAdmin) {
    window.location.href = "user.html";
    return null;
  }

  return session;
}
