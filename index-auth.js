// js/index-auth.js - Manejo de login en index.html
import { getSupabaseClient } from "./auth.js";

const modal = document.getElementById("loginModal");
const btnLoginNav = document.getElementById("btnLoginNav");
const btnCloseLogin = document.getElementById("btnCloseLogin");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("loginError");

// Abrir modal
btnLoginNav.addEventListener("click", () => {
  modal.classList.remove('hidden');
  loginEmail.focus();
});

// Cerrar modal
btnCloseLogin.addEventListener("click", () => {
  modal.classList.add('hidden');
  loginForm.reset();
  loginError.textContent = "";
});

// Cerrar modal al hacer click en overlay
modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target === modal.querySelector(".modal-overlay")) {
    modal.classList.add('hidden');
    loginForm.reset();
    loginError.textContent = "";
  }
});

// Manejar submit del formulario
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginError.textContent = "Email y contraseña requeridos";
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Entrando...";
  loginError.textContent = "";

  try {
    const supabase = getSupabaseClient();

    // PASO 1: Login en auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Auth login error:', authError);
      // Error 400 normalmente significa credenciales inválidas O usuario no existe
      if (authError.message.includes('Invalid login credentials')) {
        loginError.textContent = "Email o contraseña incorrectos";
      } else {
        loginError.textContent = `Error: ${authError.message}`;
      }
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
      return;
    }

    const userId = authData.user.id;

    // PASO 2: Verificar que usuario está aprobado en tabla usuarios
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('estado_verificacion')
      .eq('id', userId)
      .single();

    if (usuarioError || !usuarioData) {
      loginError.textContent = "Usuario no encontrado en el sistema";
      await supabase.auth.signOut();
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
      return;
    }

    if (usuarioData.estado_verificacion === 'pendiente') {
      loginError.textContent = "Tu registro aún está pendiente de verificación del administrador.";
      await supabase.auth.signOut();
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
      return;
    }

    if (usuarioData.estado_verificacion === 'rechazado') {
      loginError.textContent = "Tu registro fue rechazado. Contacta al administrador.";
      await supabase.auth.signOut();
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
      return;
    }

    // PASO 3: Verificar si es admin
    const { data: admins } = await supabase
      .from('admins')
      .select('uid')
      .eq('uid', userId)
      .limit(1);

    const isAdmin = Array.isArray(admins) && admins.length > 0;

    // PASO 4: Redirigir según rol
    if (isAdmin) {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'user.html';
    }
  } catch (err) {
    console.error("Login error:", err);
    loginError.textContent = "Error inesperado. Intenta de nuevo.";
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
});

// Agregar enter key en password field
loginPassword.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    loginForm.dispatchEvent(new Event("submit"));
  }
});
