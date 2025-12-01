// js/menu.js
export function setupMenu() {
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

  toggle.addEventListener("click", () => {
    // recompute header height before opening to avoid gaps
    updateHeaderHeightVar();
    body.classList.toggle("nav-open");
    // prevent background scroll when mobile nav is open
    body.classList.toggle("no-scroll");
  });

  // Close mobile nav when a nav link is clicked
  const nav = document.querySelector('.main-nav');
  if (nav) {
    nav.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => {
        if (body.classList.contains('nav-open')) {
          body.classList.remove('nav-open');
          body.classList.remove('no-scroll');
        }
      });
    });
  }
}
