import { getSupabaseClient } from './auth.js';
import { showStatus } from './utils.js';

const authArea = document.getElementById('auth-area');
const loginForm = document.getElementById('loginForm');
const sessionInfo = document.getElementById('sessionInfo');
const sessionEmail = document.getElementById('sessionEmail');
const btnSignOut = document.getElementById('btnSignOut');
const loginEmail = document.getElementById('loginEmail');
const loginPass = document.getElementById('loginPass');
const btnSignIn = document.getElementById('btnSignIn');
const mainContent = document.querySelector('main');
const header = document.querySelector('header');

async function initAuth() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: admins } = await supabase.from('admins').select('uid').eq('uid', session.user.id).limit(1);
    const isAdmin = Array.isArray(admins) && admins.length > 0;
    
    if (isAdmin) {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'user.html';
    }
  } else {
    renderLoginUI();
  }
}

function renderLoginUI() {
  if (authArea) authArea.setAttribute('data-authenticated', 'false');
  if (loginForm) loginForm.classList.remove('hidden');
  if (sessionInfo) sessionInfo.classList.add('hidden');
  if (mainContent) mainContent.classList.add('hidden');
  if (header) header.classList.add('hidden');
}

if (btnSignIn) {
  btnSignIn.addEventListener('click', async () => {
    const supabase = getSupabaseClient();
    const email = loginEmail.value.trim();
    const pass = loginPass.value;
    if (!email || !pass) return showStatus('Email y password requeridos', { type: 'error' });
    btnSignIn.disabled = true;
    btnSignIn.textContent = 'Entrando...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    btnSignIn.disabled = false;
    btnSignIn.textContent = 'Entrar';

    if (error) return showStatus('Error login: ' + error.message, { type: 'error' });

    const { data: admins } = await supabase.from('admins').select('uid').eq('uid', data.user.id).limit(1);
    const isAdmin = Array.isArray(admins) && admins.length > 0;
    
    if (isAdmin) {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'user.html';
    }
  });
}

if (btnSignOut) {
  btnSignOut.addEventListener('click', async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    renderLoginUI();
    loginEmail.value = '';
    loginPass.value = '';
  });
}

const supabase = getSupabaseClient();
supabase.auth.onAuthStateChange((event, session) => {
  if (!session) {
    renderLoginUI();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
