// js/client.js
import { getSupabaseClient } from "./auth.js";
import { setupMenu } from "./menu.js";
import "./index-auth.js"; // Manejo de login
import { formatPrecio, formatSuperficie, placeholderImageUrl, showLoading, hideLoading, createServiceChip, logError } from "./utils.js";

// Heroicons SVG helper para servicios
function getServiceIcon(serviceName) {
  const icons = {
    "Agua": '<svg class="service-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.32 0z"/></svg>',
    "Luz": '<svg class="service-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    "Saneamiento": '<svg class="service-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m0 18h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4m0 18V9"/></svg>',
    "Banco": '<svg class="service-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v5h20V7l-10-5z M2 12h20v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5z"/></svg>',
    "Financiación": '<svg class="service-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22m11-11H1m18-4h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2"/></svg>'
  };
  return icons[serviceName] || '';
}

const form = document.getElementById("search-form");
const resultsEl = document.getElementById("results");
const emptyEl = document.getElementById("empty-message");
const paginationEl = document.getElementById("pagination");
let currentPage = 1;
const PAGE_SIZE = 20;

function renderPagination(totalCount) {
  if (!paginationEl) return;
  paginationEl.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE));
  const createBtn = (text, disabled) => {
    const b = document.createElement('button');
    b.className = 'btn btn-ghost pagination-btn';
    b.textContent = text;
    if (disabled) b.disabled = true;
    return b;
  };

  const prev = createBtn('Anterior', currentPage <= 1);
  prev.addEventListener('click', () => {
    if (currentPage > 1) { currentPage -= 1; loadTerrenosFromForm(); }
  });
  paginationEl.appendChild(prev);

  const from = Math.max(1, currentPage - 2);
  const to = Math.min(totalPages, from + 4);
  for (let p = from; p <= to; p++) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost pagination-btn' + (p === currentPage ? ' active' : '');
    btn.textContent = String(p);
    if (p === currentPage) btn.disabled = true;
    btn.addEventListener('click', () => { currentPage = p; loadTerrenosFromForm(); });
    paginationEl.appendChild(btn);
  }

  const next = createBtn('Siguiente', currentPage >= totalPages);
  next.addEventListener('click', () => {
    if (currentPage < totalPages) { currentPage += 1; loadTerrenosFromForm(); }
  });
  paginationEl.appendChild(next);
}
const btnLimpiar = document.getElementById("btn-limpiar");
const btnAdvanced = document.getElementById("btn-advanced");
const advancedFilters = document.getElementById("advanced-filters");

setupMenu();

// Toggle "Más filtros"
btnAdvanced.addEventListener("click", (e) => {
  e.preventDefault();
  const isOpen = advancedFilters.classList.toggle("open");
  btnAdvanced.textContent = isOpen ? "Menos filtros" : "Más filtros";
});

function sugerirPrecio(terreno) {
  let baseM2;
  switch (terreno.departamento) {
    case "Montevideo":
      baseM2 = 600;
      break;
    case "Canelones":
      baseM2 = 250;
      break;
    case "Maldonado":
      baseM2 = 400;
      break;
    default:
      baseM2 = 180;
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

  if (terreno.operacion === "alquiler") {
    precio = precio * 0.01;
  }

  return Math.round(precio);
}

function renderTerrenos(data) {
  resultsEl.innerHTML = "";
  emptyEl.textContent = "";

  if (!data || data.length === 0) {
    emptyEl.innerHTML = `No se encontraron terrenos. Probá aflojando filtros o <button id="clear-filters" class="btn btn-ghost">limpiando</button>`;
    const btn = document.getElementById('clear-filters');
    if (btn) btn.addEventListener('click', () => { form.reset(); currentPage = 1; loadTerrenosFromForm(); });
    return;
  }

  for (const t of data) {
    const card = document.createElement("article");
    card.className = "card";

    const img = document.createElement("img");
    img.className = "card-image";
    if (t.portada_url) {
      img.src = t.portada_url;
      img.alt = t.titulo;
    } else if (Array.isArray(t.imagenes) && t.imagenes.length > 0) {
      img.src = t.imagenes[0];
      img.alt = t.titulo;
    } else {
      img.alt = "Terreno sin imagen";
      img.src = placeholderImageUrl(400, 300, 'Sin imagen');
    }
    card.appendChild(img);

    const body = document.createElement("div");
    body.className = "card-body";

    const headerRow = document.createElement("div");
    headerRow.className = "card-header-row";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = t.titulo;
    headerRow.appendChild(title);

    const pill = document.createElement("div");
    pill.className = "pill " + (t.operacion === "venta" ? "badge-venta" : "badge-alquiler");
    pill.textContent = t.operacion.toUpperCase();
    headerRow.appendChild(pill);

    body.appendChild(headerRow);

    const priceRow = document.createElement("div");
    priceRow.className = "price-row";

    const realPrice = formatPrecio(t.precio, t.moneda);
    const spanPrice = document.createElement("span");
    spanPrice.className = "price";
    spanPrice.textContent = realPrice;
    priceRow.appendChild(spanPrice);

    body.appendChild(priceRow);

    const meta = document.createElement("div");
    meta.className = "meta";

    const loc = document.createElement("span");
    loc.textContent = `${t.zona ? t.zona + " · " : ""}${t.departamento}`;
    meta.appendChild(loc);

    const sup = document.createElement("span");
    sup.textContent = formatSuperficie(t.superficie_total_m2);
    meta.appendChild(sup);

    if (t.padron) {
      const pad = document.createElement("span");
      pad.textContent = `Padrón ${t.padron}`;
      meta.appendChild(pad);
    }

    body.appendChild(meta);

    const servicios = [];
    if (t.agua) servicios.push("Agua");
    if (t.luz) servicios.push("Luz");
    if (t.saneamiento) servicios.push("Saneamiento");
    if (t.acepta_banco) servicios.push("Banco");
    if (t.financiacion) servicios.push("Financiación");

    if (servicios.length) {
      const serv = document.createElement("div");
      serv.className = "services";
      servicios.forEach(s => {
        serv.appendChild(createServiceChip(s, 14));
      });
      body.appendChild(serv);
    }

    const footer = document.createElement("div");
    footer.className = "card-footer";

    const smallMeta = document.createElement("div");
    smallMeta.className = 'card-small-meta';
    smallMeta.textContent = t.contacto_nombre ? `Contacto: ${t.contacto_nombre}` : "Asesor inmobiliario";
    footer.appendChild(smallMeta);

    const link = document.createElement("a");
    link.className = "link-detalle link-detalle-primary";
    link.href = `terreno.html?id=${t.id}`;
    link.setAttribute("aria-label", `Ver detalle de terreno ${t.titulo}`);
    link.innerHTML = `
      <svg class="icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0"></path>
      </svg>
      Ver detalle
    `;
    footer.appendChild(link);

    body.appendChild(footer);

    card.appendChild(body);
    resultsEl.appendChild(card);
  }
}

async function loadTerrenosFromForm(event) {
  if (event) event.preventDefault();
  const supabase = getSupabaseClient();
  const formData = new FormData(form);
  // show loading state
  showLoading(resultsEl, 'Buscando terrenos...');
  resultsEl.innerHTML = '';
  emptyEl.textContent = '';

  // base query with count for pagination
  let query = supabase.from("terrenos").select("*", { count: 'exact' }).eq("publicado", true);

  // --- FILTROS BÁSICOS ---
  const departamento = formData.get("departamento");
  const zona = formData.get("zona");
  const operacion = formData.get("operacion");
  const precioMin = formData.get("precio_min");
  const precioMax = formData.get("precio_max");
  const supMin = formData.get("superficie_min");
  const padron = formData.get("padron");

  if (departamento) query = query.eq("departamento", departamento);
  if (zona) query = query.ilike("zona", `%${zona}%`);
  if (operacion) query = query.eq("operacion", operacion);
  if (precioMin) query = query.gte("precio", Number(precioMin));
  if (precioMax) query = query.lte("precio", Number(precioMax));
  if (supMin) query = query.gte("superficie_total_m2", Number(supMin));
  if (padron) query = query.eq("padron", padron);

  // --- FILTROS AVANZADOS: NORMATIVA BÁSICA ---
  const uso = formData.get("uso_preferente_suelo");
  const zonaClase = formData.get("zona_clase"); // si la tenés como campo en la tabla
  const subcategoria = formData.get("subcategoria");
  const areaDif = formData.get("area_diferenciada");
  const regimen = formData.get("regimen_gestion_suelo");
  const supCatMin = formData.get("superficie_catastral_min");

  if (uso) query = query.eq("uso_preferente_suelo", uso);
  if (zonaClase) query = query.eq("zona_clase", zonaClase);
  if (subcategoria) query = query.ilike("subcategoria", `%${subcategoria}%`);
  if (areaDif) query = query.ilike("area_diferenciada", `%${areaDif}%`);
  if (regimen) query = query.ilike("regimen_gestion_suelo", `%${regimen}%`);
  if (supCatMin) query = query.gte("superficie_catastral_m2", Number(supCatMin));

  // --- PARÁMETROS CONSTRUCTIVOS ---
  const alturaMaxMin = formData.get("altura_maxima_min");
  const alturaMinMin = formData.get("altura_minima_min");
  const fosMin = formData.get("fos_min");
  const retiroFrontalMin = formData.get("retiro_frontal_min");
  const retiroLateralMin = formData.get("retiro_lateral_min");
  const retiroPosteriorMin = formData.get("retiro_posterior_min");
  const planesEspeciales = formData.get("planes_especiales");
  const galibos = formData.get("galibos");

  if (alturaMaxMin) query = query.gte("altura_maxima_m", Number(alturaMaxMin));
  if (alturaMinMin) query = query.gte("altura_minima_m", Number(alturaMinMin));
  if (fosMin) query = query.gte("fos", Number(fosMin));
  if (retiroFrontalMin) query = query.gte("retiro_frontal_m", Number(retiroFrontalMin));
  if (retiroLateralMin) query = query.gte("retiro_lateral_m", Number(retiroLateralMin));
  if (retiroPosteriorMin) query = query.gte("retiro_posterior_m", Number(retiroPosteriorMin));
  if (planesEspeciales) query = query.ilike("planes_especiales", `%${planesEspeciales}%`);
  if (galibos) query = query.ilike("galibos", `%${galibos}%`);

  // --- RESTRICCIONES ADICIONALES (booleans) ---
  if (document.getElementById("bien_cautelado").checked) {
    query = query.eq("bien_cautelado", true);
  }
  if (document.getElementById("area_especial_consideracion").checked) {
    query = query.eq("area_especial_consideracion", true);
  }
  if (document.getElementById("reglamento_vis").checked) {
    query = query.eq("reglamento_vis", true);
  }
  if (document.getElementById("afectaciones_ochava").checked) {
    query = query.eq("afectaciones_ochava", true);
  }

  // --- SERVICIOS ---
  if (document.getElementById("agua").checked) query = query.eq("agua", true);
  if (document.getElementById("luz").checked) query = query.eq("luz", true);
  if (document.getElementById("saneamiento").checked) query = query.eq("saneamiento", true);

  // --- CONDICIONES COMERCIALES ---
  if (document.getElementById("acepta_banco").checked) query = query.eq("acepta_banco", true);
  if (document.getElementById("financiacion").checked) query = query.eq("financiacion", true);

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(start, end);
  hideLoading(resultsEl);

  if (error) {
    logError(error);
    emptyEl.textContent = "Error cargando terrenos.";
    resultsEl.innerHTML = "";
    renderPagination(0);
    return;
  }

  renderTerrenos(data);
  renderPagination(count || (data ? data.length : 0));
}


form.addEventListener("submit", (e) => { currentPage = 1; loadTerrenosFromForm(e); });

btnLimpiar.addEventListener("click", () => {
  currentPage = 1;
  form.reset();
  loadTerrenosFromForm();
});

window.addEventListener("DOMContentLoaded", () => loadTerrenosFromForm());
