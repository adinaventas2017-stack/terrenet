// js/menu.js
export function setupMenu() {
  const toggle = document.querySelector(".nav-toggle");
  const body = document.body;

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    body.classList.toggle("nav-open");
  });
}
