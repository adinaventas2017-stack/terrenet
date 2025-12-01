// js/detail.js - Renderizado de página detalle con nueva estructura v2.2
import { getSupabaseClient } from "./auth.js";
import { setupMenu } from "./menu.js";
import { getServiceIcon, formatPrecio, formatSuperficie, placeholderImageUrl, showLoading, hideLoading, createServiceChip } from "./utils.js";
const root = document.getElementById("detail-root");
const mapContainer = document.getElementById("detail-map-container");
const emptyEl = document.getElementById("detail-empty");

setupMenu();

// Lightbox manager (singleton) — idempotent initialization and reusable
const LightboxManager = (function () {
  let initialized = false;
  let overlay, lbImage, lbClose, lbPrev, lbNext, lbThumbs;
  let images = [];
  let lbIndex = 0;

  function init() {
    if (initialized) return;
    initialized = true;
    overlay = document.querySelector('.lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.innerHTML = `
        <div class="lightbox-content">
          <button class="lightbox-close" aria-label="Cerrar">×</button>
          <button class="lightbox-nav prev" aria-label="Anterior">‹</button>
          <img class="lightbox-image" src="" alt="">
          <button class="lightbox-nav next" aria-label="Siguiente">›</button>
          <div class="lightbox-thumbs"></div>
        </div>`;
      document.body.appendChild(overlay);
    }

    lbImage = overlay.querySelector('.lightbox-image');
    lbClose = overlay.querySelector('.lightbox-close');
    lbPrev = overlay.querySelector('.lightbox-nav.prev');
    lbNext = overlay.querySelector('.lightbox-nav.next');
    lbThumbs = overlay.querySelector('.lightbox-thumbs');

    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click', () => showIndex(-1));
    lbNext.addEventListener('click', () => showIndex(1));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // keyboard handler
    window.addEventListener('keydown', function onKey(e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'ArrowRight') showIndex(1);
      if (e.key === 'ArrowLeft') showIndex(-1);
      if (e.key === 'Escape') close();
    });

    // touch handlers
    lbImage.addEventListener('touchstart', (e) => { lbImage._touchStartX = e.touches[0].clientX; }, { passive: true });
    lbImage.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchEndX - (lbImage._touchStartX || 0);
      if (Math.abs(diff) > 40) { if (diff < 0) showIndex(1); else showIndex(-1); }
    }, { passive: true });
  }

  function open(imgs, index = 0) {
    if (!Array.isArray(imgs) || imgs.length === 0) return;
    init();
    images = imgs.slice();
    lbIndex = (index + images.length) % images.length;
    renderThumbs();
    lbImage.src = images[lbIndex] || '';
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
    updateThumbsActive();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }

  function showIndex(delta) {
    if (!images || images.length === 0) return;
    lbIndex = (lbIndex + delta + images.length) % images.length;
    lbImage.src = images[lbIndex];
    updateThumbsActive();
  }

  function renderThumbs() {
    if (!lbThumbs) return;
    lbThumbs.innerHTML = '';
    images.forEach((url, idx) => {
      const timg = document.createElement('img');
      timg.className = 'lightbox-thumb' + (idx === lbIndex ? ' active' : '');
      timg.src = url;
      timg.alt = `Thumb ${idx+1}`;
      timg.addEventListener('click', () => {
        lbIndex = idx;
        lbImage.src = images[lbIndex];
        updateThumbsActive();
      });
      lbThumbs.appendChild(timg);
    });
  }

  function updateThumbsActive() {
    if (!lbThumbs) return;
    lbThumbs.querySelectorAll('.lightbox-thumb').forEach((el, idx) => el.classList.toggle('active', idx === lbIndex));
  }

  return { open, close, init };
})();



function getIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function sugerirPrecio(terreno) {
  let baseM2;
  switch (terreno.departamento) {
    case "Montevideo": baseM2 = 600; break;
    case "Canelones": baseM2 = 250; break;
    case "Maldonado": baseM2 = 400; break;
    default: baseM2 = 180;
  }

  let factorZona = 1;
  if (terreno.zona_clase === "premium") factorZona = 1.4;
  else if (terreno.zona_clase === "periferica") factorZona = 0.85;

  const edificabilidadFactor = terreno.edificabilidad_factor ?? 1;
  const factorEdif = 1 + edificabilidadFactor * 0.1;
  const serviciosCount = [terreno.agua, terreno.luz, terreno.saneamiento].filter(Boolean).length;
  const factorServicios = 1 + serviciosCount * 0.05;

  const superficie = Number(terreno.superficie_total_m2) || 0;
  if (!superficie) return null;

  let precio = superficie * baseM2 * factorZona * factorEdif * factorServicios;
  if (terreno.operacion === "alquiler") precio = precio * 0.01;

  return Math.round(precio);
}

function renderDetalle(t) {
  root.innerHTML = "";
  mapContainer.innerHTML = "";
  emptyEl.textContent = "";

  const layout = document.createElement("div");
  layout.className = "detail-layout";

  // ===== LEFT: GALLERY =====
  const gallery = document.createElement("div");
  gallery.className = "detail-gallery";

  const mainImg = document.createElement("img");
  mainImg.className = "detail-main-image";

  const imagenes = t.imagenes && t.imagenes.length > 0 ? t.imagenes : (t.portada_url ? [t.portada_url] : []);

  if (imagenes.length > 0) {
    mainImg.src = imagenes[0];
    mainImg.alt = t.titulo;
  } else {
    mainImg.src = placeholderImageUrl(600, 400, 'Sin imagen');
    mainImg.alt = "Sin imagen";
  }
  gallery.appendChild(mainImg);

  if (imagenes.length > 1) {
    const thumbs = document.createElement("div");
    thumbs.className = "detail-thumbnails";
    imagenes.forEach((url, idx) => {
      const th = document.createElement("img");
      th.src = url;
      th.className = "thumbnail" + (idx === 0 ? " active" : "");
      th.alt = `Imagen ${idx + 1}`;
      th.addEventListener("click", () => {
        mainImg.src = url;
        document.querySelectorAll(".thumbnail").forEach(el => el.classList.remove("active"));
        th.classList.add("active");
        LightboxManager.open(imagenes, idx);
      });
      thumbs.appendChild(th);
    });
    gallery.appendChild(thumbs);
  }

  layout.appendChild(gallery);

  // ===== RIGHT: SIDEBAR =====
  const sidebar = document.createElement("div");
  sidebar.className = "detail-sidebar";

  // HEADER BOX
  const header = document.createElement("div");
  header.className = "detail-header";

  const headerTop = document.createElement("div");
  headerTop.className = "detail-header-top";

  const title = document.createElement("h1");
  title.className = "detail-title";
  title.textContent = t.titulo;
  headerTop.appendChild(title);

  const pill = document.createElement("span");
  pill.className = "pill " + (t.operacion === "venta" ? "badge-venta" : "badge-alquiler");
  pill.textContent = t.operacion.toUpperCase();
    // Price element
    const price = document.createElement("div");
    price.className = "detail-price";
  price.textContent = formatPrecio(t.precio, t.moneda);
  header.appendChild(price);
    // Removed TerreNet suggestion model from UI

  sidebar.appendChild(header);

  // SPECS GRID 2x2
  const specsGrid = document.createElement("div");
  specsGrid.className = "detail-specs-grid";
  specsGrid.innerHTML = `<h3>Especificaciones</h3>`;

  const specs2x2 = document.createElement("div");
  specs2x2.className = "specs-2x2";

  const specsData = [
    { label: "Departamento", value: t.departamento },
    { label: "Operación", value: t.operacion.charAt(0).toUpperCase() + t.operacion.slice(1) },
    { label: "Superficie", value: formatSuperficie(t.superficie_total_m2) },
    { label: "Zona", value: t.zona || t.zona_clase || "" }
  ];

  specsData.forEach(spec => {
    const item = document.createElement("div");
    item.className = "spec-item";
    item.innerHTML = `<div class="spec-label">${spec.label}</div><div class="spec-value">${spec.value}</div>`;
    specs2x2.appendChild(item);
  });

  specsGrid.appendChild(specs2x2);
  sidebar.appendChild(specsGrid);

  layout.appendChild(sidebar);
  root.appendChild(layout);

  // LIGHTBOX: use singleton LightboxManager to avoid duplicate listeners
  if (imagenes.length > 0) {
    mainImg.classList.add('zoom-cursor');
    mainImg.addEventListener('click', () => LightboxManager.open(imagenes, 0));

    // thumbnails already wired when created above; manager will handle opening
  }

  // ===== FULL WIDTH SECTIONS =====

  // DESCRIPCIÓN
  if (t.descripcion) {
    const desc = document.createElement("div");
    desc.className = "detail-full-section";
    desc.innerHTML = `<h2>Descripción</h2><div class="description-content">${t.descripcion}</div>`;
    root.appendChild(desc);
  }

  // ESPECIFICACIONES TÉCNICAS
  const techSpecs = [];
  if (t.uso_preferente_suelo) techSpecs.push({ label: "Uso del suelo", value: t.uso_preferente_suelo });
  if (t.altura_maxima_m) techSpecs.push({ label: "Altura máxima", value: `${t.altura_maxima_m} m` });
  if (t.fos) techSpecs.push({ label: "FOS", value: t.fos });
  if (t.retiro_frontal_m) techSpecs.push({ label: "Retiro frontal", value: `${t.retiro_frontal_m} m` });
  if (t.retiro_lateral_m) techSpecs.push({ label: "Retiro lateral", value: `${t.retiro_lateral_m} m` });
  if (t.superficie_catastral_m2) techSpecs.push({ label: "Superficie catastral", value: `${t.superficie_catastral_m2} m` });
  if (t.area_diferenciada) techSpecs.push({ label: "Área diferenciada", value: t.area_diferenciada });
  if (t.regimen_gestion_suelo) techSpecs.push({ label: "Régimen de gestión", value: t.regimen_gestion_suelo });

  if (techSpecs.length > 0) {
    const techSec = document.createElement("div");
    techSec.className = "detail-full-section";
    techSec.innerHTML = `<h2>Especificaciones Técnicas</h2>`;

    const techGrid = document.createElement("div");
    techGrid.className = "tech-specs";

    techSpecs.forEach(spec => {
      const item = document.createElement("div");
      item.className = "tech-spec-item";
      item.innerHTML = `<div class="tech-spec-label">${spec.label}</div><div class="tech-spec-value">${spec.value}</div>`;
      techGrid.appendChild(item);
    });

    techSec.appendChild(techGrid);
    root.appendChild(techSec);
  }

  // SERVICIOS
  const servicios = [];
  if (t.agua) servicios.push("Agua");
  if (t.luz) servicios.push("Luz");
  if (t.saneamiento) servicios.push("Saneamiento");
  if (t.acepta_banco) servicios.push("Banco");
  if (t.financiacion) servicios.push("Financiación");

  if (servicios.length > 0) {
    const servSec = document.createElement("div");
    servSec.className = "detail-full-section";
    servSec.innerHTML = `<h2>Servicios y Condiciones</h2>`;

    const servList = document.createElement("div");
    servList.className = "services-list";

    servicios.forEach(s => {
      servList.appendChild(createServiceChip(s, 18));
    });

    servSec.appendChild(servList);
    root.appendChild(servSec);
  }

  // CONTACTO
  const contactSec = document.createElement("div");
  contactSec.className = "detail-full-section";
  contactSec.innerHTML = `<h2>Contacto</h2>`;

  const nombre = t.contacto_nombre || "Asesor TerreNet";
  const telefono = t.contacto_telefono || "";
  const email = t.contacto_email || "";

  const contactBox = document.createElement("div");
  contactBox.className = "contact-info";

  const contactName = document.createElement("div");
  contactName.className = "contact-name";
  contactName.textContent = nombre;
  contactBox.appendChild(contactName);

  if (telefono) {
    const phoneLink = document.createElement("a");
    phoneLink.className = "contact-link";
    phoneLink.href = `tel:${telefono}`;
    phoneLink.textContent = `Tel: ${telefono}`;
    contactBox.appendChild(phoneLink);
  }

  if (email) {
    const emailLink = document.createElement("a");
    emailLink.className = "contact-link";
    emailLink.href = `mailto:${email}`;
    emailLink.textContent = `Email: ${email}`;
    contactBox.appendChild(emailLink);
  }

  if (telefono) {
    const wa = document.createElement("a");
    wa.href = `https://wa.me/${telefono.replace(/[^0-9]/g, "")}`;
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.classList.add("btn", "btn-primary", "wa-btn");
    wa.textContent = "Escribir por WhatsApp";
    contactBox.appendChild(wa);
  }

  contactSec.appendChild(contactBox);
  root.appendChild(contactSec);

  // MAPA
  let mapsUrl = "";
  if (t.lat && t.lng) {
    mapsUrl = `https://www.google.com/maps?q=${t.lat},${t.lng}&output=embed`;
  } else if (t.direccion) {
    const q = encodeURIComponent(`${t.direccion} ${t.departamento ?? ""} Uruguay`);
    mapsUrl = `https://www.google.com/maps?q=${q}&output=embed`;
  }

  if (mapsUrl) {
    const mapTitle = document.createElement("h2");
    mapTitle.className = "map-title";
    mapTitle.textContent = "Ubicación en Mapa";
    mapContainer.appendChild(mapTitle);

    const frame = document.createElement("div");
    frame.className = "map-frame";
    const iframeEl = document.createElement('iframe');
    iframeEl.loading = 'lazy';
    iframeEl.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    iframeEl.src = mapsUrl;
    iframeEl.className = 'map-iframe';
    frame.appendChild(iframeEl);
    mapContainer.appendChild(frame);
  }
}

// Hydration-aware loader: prefer server-provided data (window.__INITIAL_TERR__), otherwise fall back to client fetch by id
async function loadDetalle() {
  // If server-side provided initial data (SSR hydration), use it directly.
  const initial = window.__INITIAL_TERR__ || null;
  if (initial) {
    renderDetalle(initial);
    // Update title and meta tags, but DO NOT re-inject JSON-LD if server already provided it
    try {
      const titleText = initial.titulo ? `${initial.titulo} – TerreNet` : 'Detalle del terreno – TerreNet';
      document.title = titleText;
      const desc = initial.descripcion ? (initial.descripcion.substring(0, 160)) : `Terreno en ${initial.zona || initial.departamento || 'Uruguay'} — Superficie ${initial.superficie_total_m2 || ''} m²`;
      const setMeta = (prop, val, isProperty = true) => {
        if (!val) return;
        let sel = isProperty ? `meta[property="${prop}"]` : `meta[name="${prop}"]`;
        let m = document.querySelector(sel);
        if (!m) {
          m = document.createElement('meta');
          if (isProperty) m.setAttribute('property', prop);
          else m.setAttribute('name', prop);
          document.head.appendChild(m);
        }
        m.setAttribute('content', val);
      };
      setMeta('og:title', titleText);
      setMeta('description', desc, false);
      setMeta('og:description', desc);
      setMeta('og:type', 'article');
      setMeta('og:url', window.location.href);
      if (Array.isArray(initial.imagenes) && initial.imagenes.length > 0) setMeta('og:image', initial.imagenes[0]);
      // Important: if server rendered JSON-LD (script#json-ld-terreno) exists, do NOT modify it.
      // If it does NOT exist (unlikely in SSR), only then we would consider creating it.
    } catch (e) {
      console.debug('detail.js: error updating meta tags during hydration', e);
    }
    return;
  }

  // Client-side path: load by id (static legacy `terreno.html?id=...` or client-only pages)
  const id = getIdFromUrl();
  if (!id) {
    emptyEl.textContent = "Falta el identificador del terreno.";
    root.innerHTML = "";
    return;
  }
  showLoading(root, 'Cargando terreno...');
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("terrenos").select("*").eq("id", id).single();
    hideLoading(root);
    if (error || !data) {
      emptyEl.textContent = error?.message ? `Error: ${error.message}` : "No encontramos este terreno.";
      root.innerHTML = "";
      return;
    }
    renderDetalle(data);
    // Update document title and Open Graph meta tags for SEO/share
    try {
      const titleText = data.titulo ? `${data.titulo} – TerreNet` : 'Detalle del terreno – TerreNet';
      document.title = titleText;

      const desc = data.descripcion ? (data.descripcion.substring(0, 160)) : `Terreno en ${data.zona || data.departamento || 'Uruguay'} — Superficie ${data.superficie_total_m2 || ''} m²`;

      const setMeta = (prop, val, isProperty = true) => {
        if (!val) return;
        let sel = isProperty ? `meta[property="${prop}"]` : `meta[name="${prop}"]`;
        let m = document.querySelector(sel);
        if (!m) {
          m = document.createElement('meta');
          if (isProperty) m.setAttribute('property', prop);
          else m.setAttribute('name', prop);
          document.head.appendChild(m);
        }
        m.setAttribute('content', val);
      };

      setMeta('og:title', titleText);
      setMeta('description', desc, false);
      setMeta('og:description', desc);
      setMeta('og:type', 'article');
      setMeta('og:url', window.location.href);
      if (Array.isArray(data.imagenes) && data.imagenes.length > 0) setMeta('og:image', data.imagenes[0]);
      // Insert JSON-LD (schema.org) for the terreno so crawlers and social tools can read structured data.
      try {
        const buildJsonLd = (t) => {
          const images = Array.isArray(t.imagenes) && t.imagenes.length > 0 ? t.imagenes : (t.portada_url ? [t.portada_url] : []);
          const price = (t.precio !== undefined && t.precio !== null && !Number.isNaN(Number(t.precio))) ? Number(t.precio) : undefined;
          const moneda = t.moneda || 'USD';
          const priceValidUntil = t.precio_valido_hasta || t.price_valid_until || undefined;

          let availability = undefined;
          if (t.operacion === 'venta') availability = 'https://schema.org/ForSale';
          else if (t.operacion === 'alquiler') availability = 'https://schema.org/ForLease';

          const canonicalUrl = (t.slug) ? `${window.location.origin.replace(/\/$/, '')}/terreno/${t.slug}` : window.location.href;

          const listing = {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            "url": canonicalUrl,
            "name": t.titulo || "Terreno en Uruguay",
            "description": t.descripcion ? String(t.descripcion).substring(0, 300) : undefined,
            "image": images.length ? images : undefined,
            "itemOffered": {
              "@type": "Land",
              "name": t.titulo || undefined,
              "landArea": (t.superficie_total_m2 ? { "@type": "QuantitativeValue", "value": Number(t.superficie_total_m2), "unitCode": "M2" } : undefined)
            },
            "offers": (price ? { "@type": "Offer", "price": price, "priceCurrency": moneda, "url": canonicalUrl, "availability": availability, "priceValidUntil": priceValidUntil } : undefined),
            "datePosted": t.created_at || t.fecha_publicacion || undefined,
            "address": (t.direccion || t.zona || t.departamento) ? { "@type": "PostalAddress", "streetAddress": t.direccion || undefined, "addressLocality": t.zona || undefined, "addressRegion": t.departamento || undefined, "addressCountry": "UY" } : undefined,
            "seller": (t.contacto_nombre || t.contacto_telefono || t.contacto_email) ? { "@type": "Person", "name": t.contacto_nombre || undefined, "telephone": t.contacto_telefono || undefined, "email": t.contacto_email || undefined } : undefined,
            "identifier": (t.id !== undefined ? { "@type": "PropertyValue", "propertyID": String(t.id) } : undefined)
          };

          const clean = (obj) => {
            if (Array.isArray(obj)) return obj.map(clean).filter(v => v !== undefined);
            if (obj && typeof obj === 'object') {
              const out = {};
              Object.keys(obj).forEach(k => {
                const v = clean(obj[k]);
                if (v !== undefined && !(Array.isArray(v) && v.length === 0)) out[k] = v;
              });
              return Object.keys(out).length ? out : undefined;
            }
            return (obj === null || obj === undefined) ? undefined : obj;
          };

          return clean(listing);
        };

        const jsonLd = buildJsonLd(data);
        if (jsonLd) {
          let ld = document.getElementById('json-ld-terreno');
          if (!ld) {
            ld = document.createElement('script');
            ld.type = 'application/ld+json';
            ld.id = 'json-ld-terreno';
            ld.textContent = JSON.stringify(jsonLd, null, 2);
            document.head.appendChild(ld);
          } else {
            // If the script already exists (e.g., server-side rendered), do not overwrite it.
          }
        }
      } catch (e) {
        console.debug('detail.js: error injecting JSON-LD', e);
      }
    } catch (e) {
      // non-fatal for rendering
      console.debug('detail.js: error updating meta tags', e);
    }
  } catch (err) {
    hideLoading(root);
    emptyEl.textContent = `Error inesperado: ${err.message}`;
    root.innerHTML = "";
  }
}

window.addEventListener("DOMContentLoaded", loadDetalle);
