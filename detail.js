// js/detail.js - Renderizado de página detalle con nueva estructura v2.2
import { getSupabaseClient } from "./auth.js";
import { setupMenu } from "./menu.js";
const root = document.getElementById("detail-root");
const mapContainer = document.getElementById("detail-map-container");
const emptyEl = document.getElementById("detail-empty");
let loadingEl;

setupMenu();

function getServiceIcon(serviceName) {
  const icons = {
    "Agua": '<svg class="service-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.32 0z"/></svg>',
    "Luz": '<svg class="service-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    "Saneamiento": '<svg class="service-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m0 18h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4m0 18V9"/></svg>',
    "Banco": '<svg class="service-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v5h20V7l-10-5z M2 12h20v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5z"/></svg>',
    "Financiación": '<svg class="service-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22m11-11H1m18-4h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2"/></svg>'
  };
  return icons[serviceName] || '';
}

function showLoading() {
  if (!loadingEl) {
    loadingEl = document.createElement("div");
    loadingEl.textContent = "Cargando terreno...";
    loadingEl.style.cssText = "padding: 2rem; text-align: center; color: #6b7280;";
    root.innerHTML = "";
    root.appendChild(loadingEl);
  }
  emptyEl.textContent = "";
}

function hideLoading() {
  if (loadingEl) loadingEl.remove();
  loadingEl = null;
}

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
    mainImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23e5e7eb' width='400' height='400'/%3E%3C/svg%3E";
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
        openLightbox(idx);
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
  price.textContent = t.precio ? `${t.moneda} ${Number(t.precio).toLocaleString("es-UY")}` : "A consultar";
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
    { label: "Superficie", value: t.superficie_total_m2 ? `${t.superficie_total_m2} m` : "" },
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

  // LIGHTBOX: Create overlay once and append to root (keeps markup together)
  if (imagenes.length > 0) {
    let lightbox = document.querySelector('.lightbox-overlay');
    if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Cerrar">×</button>
        <button class="lightbox-nav prev" aria-label="Anterior">‹</button>
        <img class="lightbox-image" src="" alt="">
        <button class="lightbox-nav next" aria-label="Siguiente">›</button>
        <div class="lightbox-thumbs"></div>
      </div>`;
    document.body.appendChild(lightbox);
    }

    const lbImage = lightbox.querySelector('.lightbox-image');
  const lbClose = lightbox.querySelector('.lightbox-close');
  const lbPrev = lightbox.querySelector('.lightbox-nav.prev');
  const lbNext = lightbox.querySelector('.lightbox-nav.next');
  const lbThumbs = lightbox.querySelector('.lightbox-thumbs');
  let lbIndex = 0;

  function openLightbox(index) {
    lbIndex = (index + imagenes.length) % imagenes.length;
    lbImage.src = imagenes[lbIndex];
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    updateThumbsActive();
    window.addEventListener('keydown', onKeyDown);
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onKeyDown);
  }

  function showIndex(delta) {
    lbIndex = (lbIndex + delta + imagenes.length) % imagenes.length;
    lbImage.src = imagenes[lbIndex];
    updateThumbsActive();
  }

  function onKeyDown(e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'ArrowRight') showIndex(1);
    if (e.key === 'ArrowLeft') showIndex(-1);
    if (e.key === 'Escape') closeLightbox();
  }

  function updateThumbsActive() {
    lbThumbs.querySelectorAll('.lightbox-thumb').forEach((el, idx) => {
      el.classList.toggle('active', idx === lbIndex);
    });
  }

    // If there are thumbnails, create them inside lightbox thumbs
    lbThumbs.innerHTML = '';
  imagenes.forEach((url, idx) => {
    const timg = document.createElement('img');
    timg.className = 'lightbox-thumb' + (idx === 0 ? ' active' : '');
    timg.src = url;
    timg.alt = `Thumb ${idx+1}`;
    timg.addEventListener('click', () => openLightbox(idx));
    lbThumbs.appendChild(timg);
  });

  // Clicking main image opens lightbox
  if (imagenes.length > 0) {
    mainImg.style.cursor = 'zoom-in';
    mainImg.addEventListener('click', () => openLightbox(0));
  }

    // Lightbox handlers
    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', () => showIndex(-1));
    lbNext.addEventListener('click', () => showIndex(1));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // Basic swipe handling for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    lbImage.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    lbImage.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].clientX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 40) {
        if (diff < 0) showIndex(1); else showIndex(-1);
      }
    }, { passive: true });
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
      const chip = document.createElement("span");
      chip.className = "service-chip";
      chip.innerHTML = `${getServiceIcon(s)}<span>${s}</span>`;
      servList.appendChild(chip);
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
    wa.className = "btn btn-primary";
    wa.style.marginTop = "0.8rem";
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
    frame.innerHTML = `<iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapsUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
    mapContainer.appendChild(frame);
  }
}

async function loadDetalle() {
  const id = getIdFromUrl();
  if (!id) {
    emptyEl.textContent = "Falta el identificador del terreno.";
    root.innerHTML = "";
    return;
  }
  showLoading();
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("terrenos").select("*").eq("id", id).single();
    hideLoading();
    if (error || !data) {
      emptyEl.textContent = error?.message ? `Error: ${error.message}` : "No encontramos este terreno.";
      root.innerHTML = "";
      return;
    }
    renderDetalle(data);
  } catch (err) {
    hideLoading();
    emptyEl.textContent = `Error inesperado: ${err.message}`;
    root.innerHTML = "";
  }
}

window.addEventListener("DOMContentLoaded", loadDetalle);
