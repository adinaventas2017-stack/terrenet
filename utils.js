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

// --- Logging helpers -------------------------------------------------
// Configurable via `window.__TN_LOG_LEVEL__` (debug|info|warn|error)
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const LOG_LEVEL = (typeof window !== 'undefined' && window.__TN_LOG_LEVEL__) ? window.__TN_LOG_LEVEL__ : 'info';

function shouldLog(level) {
  const min = LEVELS[LOG_LEVEL] || LEVELS.info;
  const cur = LEVELS[level] || LEVELS.info;
  return cur >= min;
}

export function logDebug(...args) {
  if (shouldLog('debug')) console.debug(...args);
}

export function logInfo(...args) {
  if (shouldLog('info')) console.info(...args);
}

export function logWarn(...args) {
  if (shouldLog('warn')) console.warn(...args);
}

export function logError(...args) {
  // Parse optional options object as last argument: { userMessage, showUser, containerSelector, autoHide, timeout }
  let opts = {};
  if (args.length > 0) {
    const last = args[args.length - 1];
    if (last && typeof last === 'object' && (last.userMessage !== undefined || last.showUser !== undefined || last.containerSelector !== undefined || last.autoHide !== undefined || last.timeout !== undefined)) {
      opts = args.pop();
    }
  }

  // Determine a user-friendly message
  let userMessage = opts.userMessage;
  if (!userMessage) {
    // Prefer a string first arg if present
    if (args.length > 0 && typeof args[0] === 'string') {
      userMessage = args[0];
    } else {
      // Look for an error-like object with a message
      const errObj = args.find(a => a && typeof a === 'object' && (a.message || a.error));
      if (errObj) userMessage = (errObj.message || errObj.error || 'Ocurrió un error. Intenta nuevamente.');
      else userMessage = 'Ocurrió un error. Intenta nuevamente.';
    }
  }

  // Technical log to console only if level allows
  if (shouldLog('error')) console.error(...args);

  // By default, show UI feedback for critical errors unless explicitly disabled
  const showUser = opts.showUser !== undefined ? Boolean(opts.showUser) : true;
  if (showUser) {
    try {
      showStatus(userMessage, { type: 'error', containerSelector: opts.containerSelector, autoHide: Boolean(opts.autoHide), timeout: opts.timeout || 7000 });
    } catch (e) {
      if (shouldLog('debug')) console.debug('logError: failed to showStatus', e);
    }
  }
}


// Small helper to create a service chip element (DOM node)
export function createServiceChip(serviceName, size = 14) {
  const span = document.createElement('span');
  span.className = 'service-chip';
  span.setAttribute('aria-label', `Disponible: ${serviceName}`);
  span.innerHTML = `${getServiceIcon(serviceName, size)}<span>${serviceName}</span>`;
  return span;
}

// Show an inline status message. If an element with id="form-error" exists,
// set its content and reveal it. Otherwise prepend a `.status-message` to the
// target container (defaults to `.container`). Returns the created/existing node.
export function showStatus(message, opts = {}) {
  const { type = 'error', containerSelector = '.container', autoHide = false, timeout = 5000 } = opts;

  const formErr = document.getElementById('form-error');
  // If page has a dedicated inline form error box, prefer that for form-level errors
  if (formErr) {
    formErr.classList.remove('hidden');
    formErr.textContent = message;
    formErr.classList.toggle('status-success', type === 'success');
    formErr.classList.toggle('status-error', type === 'error');
    // ensure aria-live on form error
    formErr.setAttribute('role', type === 'error' ? 'alert' : 'status');
    formErr.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    return formErr;
  }

  // Choose a sensible container: #status-container -> main -> provided selector -> .container -> body
  const container = document.querySelector('#status-container') || document.querySelector('main') || document.querySelector(containerSelector) || document.querySelector('.container') || document.body;

  // If there is already a visible status-message, update it instead of inserting duplicates
  const existing = container.querySelector('.status-message');
  if (existing) {
    existing.textContent = message;
    existing.className = `status-message ${type === 'success' ? 'status-success' : type === 'error' ? 'status-error' : 'status-info'}`;
    existing.setAttribute('role', type === 'error' ? 'alert' : 'status');
    existing.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    if (autoHide) setTimeout(() => existing.remove(), timeout);
    return existing;
  }

  const el = document.createElement('div');
  el.className = `status-message ${type === 'success' ? 'status-success' : type === 'error' ? 'status-error' : 'status-info'}`;
  el.textContent = message;
  // Accessibility
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

  // Insert at top of chosen container but after any sticky headers inside it
  if (container.firstChild) container.insertBefore(el, container.firstChild);
  else container.appendChild(el);

  if (autoHide) {
    setTimeout(() => el.remove(), timeout);
  }
  return el;
}

// Accessible confirm dialog helper that returns a Promise<boolean>
export function confirmDialog(opts = {}) {
  const { title = 'Confirmar', message = '', confirmLabel = 'Aceptar', cancelLabel = 'Cancelar' } = opts;

  return new Promise((resolve) => {
    // If a confirm modal already exists, reuse it (avoid duplicates)
    let modal = document.getElementById('tn-confirm-modal');
    let created = false;
    if (!modal) {
      created = true;
      modal = document.createElement('div');
      modal.id = 'tn-confirm-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content confirm-modal-content" role="dialog" aria-modal="true" aria-labelledby="tn-confirm-title" aria-describedby="tn-confirm-desc">
          <div class="modal-header">
            <h3 id="tn-confirm-title">${title}</h3>
            <button class="btn-close" aria-label="Cerrar">&times;</button>
          </div>
          <div class="modal-body">
            <p id="tn-confirm-desc">${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="tn-confirm-cancel">${cancelLabel}</button>
            <button class="btn btn-primary" id="tn-confirm-ok">${confirmLabel}</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    } else {
      // Update text
      const t = modal.querySelector('#tn-confirm-title'); if (t) t.textContent = title;
      const d = modal.querySelector('#tn-confirm-desc'); if (d) d.textContent = message;
      const ok = modal.querySelector('#tn-confirm-ok'); if (ok) ok.textContent = confirmLabel;
      const cancel = modal.querySelector('#tn-confirm-cancel'); if (cancel) cancel.textContent = cancelLabel;
    }

    const dialog = modal.querySelector('.modal-content');
    const overlay = modal.querySelector('.modal-overlay');
    const btnClose = modal.querySelector('.btn-close');
    const btnOk = modal.querySelector('#tn-confirm-ok');
    const btnCancel = modal.querySelector('#tn-confirm-cancel');

    // Store last focused element to restore
    const lastFocus = document.activeElement;

    // show
    modal.classList.remove('hidden');
    document.body.classList.add('no-scroll');

    // focus
    if (btnCancel) btnCancel.focus();

    let keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault(); cleanup(false);
      } else if (e.key === 'Enter') {
        // If Enter pressed, consider it confirm unless the active element is cancel
        if (document.activeElement === btnCancel) {
          cleanup(false);
        } else {
          cleanup(true);
        }
      } else if (e.key === 'Tab') {
        // trap focus within dialog
        const focusable = dialog.querySelectorAll('a,button,input,[tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };

    function cleanup(result) {
      // hide
      modal.classList.add('hidden');
      document.body.classList.remove('no-scroll');
      // remove listeners
      document.removeEventListener('keydown', keyHandler);
      if (btnOk) btnOk.removeEventListener('click', onOk);
      if (btnCancel) btnCancel.removeEventListener('click', onCancel);
      if (btnClose) btnClose.removeEventListener('click', onCancel);
      if (overlay) overlay.removeEventListener('click', onOverlay);
      // restore focus
      try { if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus(); } catch (e) {}
      resolve(Boolean(result));
      // if we created the modal on the fly, keep it in DOM for reuse (do not remove)
    }

    function onOk(e) { e.preventDefault(); cleanup(true); }
    function onCancel(e) { e.preventDefault(); cleanup(false); }
    function onOverlay(e) { if (e.target === overlay) cleanup(false); }

    document.addEventListener('keydown', keyHandler);
    if (btnOk) btnOk.addEventListener('click', onOk);
    if (btnCancel) btnCancel.addEventListener('click', onCancel);
    if (btnClose) btnClose.addEventListener('click', onCancel);
    if (overlay) overlay.addEventListener('click', onOverlay);
  });
}
