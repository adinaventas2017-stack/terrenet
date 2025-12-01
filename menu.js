// js/menu.js
export function setupMenu() {
  // Protect against double-initialization (idempotent)
  if (window.__tnMenuInitialized) return;
  window.__tnMenuInitialized = true;
  const toggle = document.querySelector(".nav-toggle");
  const body = document.body;

  if (!toggle) return;

  function updateHeaderHeightVar() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const h = Math.ceil(header.getBoundingClientRect().height) + 'px';
    document.documentElement.style.setProperty('--header-height', h);
  }

  // initialize and keep in sync on resize
  updateHeaderHeightVar();
  window.addEventListener('resize', () => updateHeaderHeightVar());

  toggle.setAttribute('aria-controls', 'mainNav');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener("click", () => {
    // recompute header height before opening to avoid gaps
    updateHeaderHeightVar();
    const isOpen = body.classList.toggle("nav-open");
    // prevent background scroll when mobile nav is open
    body.classList.toggle("no-scroll", isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      // focus first focusable link in nav
      const nav = document.querySelector('#mainNav');
      const first = nav && nav.querySelector('a,button');
      if (first) first.focus();
    }
  });

  // Close mobile nav when a nav link is clicked
  const nav = document.querySelector('.main-nav');
  if (nav) {
    nav.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => {
        if (body.classList.contains('nav-open')) {
          body.classList.remove('nav-open');
          body.classList.remove('no-scroll');
          toggle.setAttribute('aria-expanded', 'false');
          if (toggle) toggle.focus();
        }
      });
    });

    // close on Escape key when nav open
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && body.classList.contains('nav-open')) {
        body.classList.remove('nav-open');
        body.classList.remove('no-scroll');
        toggle.setAttribute('aria-expanded', 'false');
        if (toggle) toggle.focus();
      }
    });
  }
  
  // trap focus while nav is open
  function trapFocusNav(e) {
    if (!document.body.classList.contains('nav-open')) return;
    const focusable = nav.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }
  document.addEventListener('keydown', trapFocusNav);
}
