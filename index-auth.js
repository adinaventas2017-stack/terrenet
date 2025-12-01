// js/index-auth.js - Manejo de login en index.html
import { getSupabaseClient } from "./auth.js";
import { logError } from './utils.js';

const modal = document.getElementById("loginModal");
const btnLoginNav = document.getElementById("btnLoginNav");
const btnCloseLogin = document.getElementById("btnCloseLogin");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("loginError");

let lastFocusedElement = null;
let modalKeyHandler = null;

function trapFocus(modalEl) {
  const focusable = modalEl.querySelectorAll('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!focusable || focusable.length === 0) return () => {};
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function keyHandler(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    } else if (e.key === 'Escape') {
      closeModal();
    }
  }

  modalEl.addEventListener('keydown', keyHandler);
  return () => modalEl.removeEventListener('keydown', keyHandler);
}

function openModal() {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.remove('hidden');
  // hide main content from screen readers while modal open
  const main = document.querySelector('main');
  if (main) main.setAttribute('aria-hidden', 'true');
  const header = document.querySelector('header');
  if (header) header.setAttribute('aria-hidden', 'true');
  // focus first input
  if (loginEmail) loginEmail.focus();
  document.body.classList.add('no-scroll');
  // enable focus trap
  modalKeyHandler = trapFocus(modal);
}

function closeModal() {
  if (!modal) return;
  modal.classList.add('hidden');
  loginForm.reset();
  loginError.textContent = "";
  const main = document.querySelector('main');
  if (main) main.removeAttribute('aria-hidden');
  const header = document.querySelector('header');
  if (header) header.removeAttribute('aria-hidden');
  if (typeof modalKeyHandler === 'function') modalKeyHandler();
  document.body.classList.remove('no-scroll');
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
}

// Abrir modal
if (btnLoginNav) btnLoginNav.addEventListener("click", (e) => { e.preventDefault(); openModal(); });

// Cerrar modal
if (btnCloseLogin) btnCloseLogin.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });

// Cerrar modal al hacer click en overlay
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target === modal.querySelector(".modal-overlay")) {
      closeModal();
    }
  });
}

// Manejar submit del formulario
if (loginForm) {
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
      logError('Auth login error:', authError);
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
    logError("Login error:", err);
    loginError.textContent = "Error inesperado. Intenta de nuevo.";
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
});

}

// Agregar enter key en password field
if (loginPassword) {
  loginPassword.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loginForm.dispatchEvent(new Event("submit"));
    }
  });
}
