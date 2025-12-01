// js/utils.js
// Helpers compartidos para TerreNet
export function getServiceIcon(serviceName, size = 16) {
  const s = Number(size);
  const icons = {
    Agua: `<svg class="service-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.32 0z"/></svg>`,
    Luz: `<svg class="service-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    Saneamiento: `<svg class="service-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m0 18h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4m0 18V9"/></svg>`,
    Banco: `<svg class="service-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v5h20V7l-10-5z M2 12h20v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5z"/></svg>`,
    Financiación: `<svg class="service-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22m11-11H1m18-4h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2"/></svg>`
  };
  return icons[serviceName] || '';
}

export function formatPrecio(precio, moneda = '') {
  if (precio === null || precio === undefined || precio === '') return 'A consultar';
  const n = Number(precio);
  if (Number.isNaN(n)) return 'A consultar';
  const formatted = n.toLocaleString('es-UY');
  return moneda ? `${moneda} ${formatted}` : formatted;
}

export function formatSuperficie(m2) {
  if (m2 === null || m2 === undefined || m2 === '') return '';
  const n = Number(m2);
  if (Number.isNaN(n)) return '';
  return `${n} m²`;
}

export function placeholderImageUrl(width = 400, height = 300, text = 'Sin imagen') {
  const textEnc = encodeURIComponent(text);
  return `https://placehold.co/${width}x${height}?text=${textEnc}`;
}

export function showLoading(container, message = 'Cargando...') {
  if (!container) return null;
  let el = container.querySelector('.tn-loading');
  if (!el) {
    el = document.createElement('div');
    el.className = 'tn-loading';
    // Visuals for .tn-loading defined in css/base.css
    container.insertBefore(el, container.firstChild);
  }
  el.textContent = message;
  return el;
}

export function hideLoading(container) {
  if (!container) return;
  const el = container.querySelector('.tn-loading');
  if (el) el.remove();
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Small helper to create a service chip element (DOM node)
export function createServiceChip(serviceName, size = 14) {
  const span = document.createElement('span');
  span.className = 'service-chip';
  span.setAttribute('aria-label', `Disponible: ${serviceName}`);
  span.innerHTML = `${getServiceIcon(serviceName, size)}<span>${serviceName}</span>`;
  return span;
}
