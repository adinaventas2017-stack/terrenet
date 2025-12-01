// js/user.js
import { getSupabaseClient, requireAuth, logout } from "./auth.js";
import { setupMenu } from "./menu.js";
import { SUPABASE_STORAGE_BUCKET } from "./config.js";
import { formatPrecio, formatSuperficie, placeholderImageUrl } from "./utils.js";

const form = document.getElementById("form-terreno");
const lista = document.getElementById("lista-terrenos");
const btnNuevo = document.getElementById("btn-nuevo");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const previewGrid = document.getElementById("preview-grid");
const btnSignOut = document.getElementById("btnSignOut");
const btnAddUrl = document.getElementById("btn-add-url");
const imagenUrlManual = document.getElementById("imagen_url_manual");

let imagenesActuales = [];
let DB_COLUMNS = null;
let currentUserId = null;

function actualizarPreview() {
  previewGrid.innerHTML = "";
  imagenesActuales.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "preview-item";

    const img = document.createElement("img");
    img.src = url;
    img.alt = `Imagen ${index + 1}`;

    const btn = document.createElement("button");
    btn.className = "preview-remove";
    btn.type = "button";
    btn.textContent = "×";
    btn.addEventListener("click", () => {
      imagenesActuales.splice(index, 1);
      actualizarPreview();
    });

    item.appendChild(img);
    item.appendChild(btn);
    previewGrid.appendChild(item);
  });
}

function agregarImagenUrl(url) {
  if (!url) return;
  if (!imagenesActuales.includes(url)) {
    imagenesActuales.push(url);
    actualizarPreview();
  }
}

dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
    const files = Array.from(e.dataTransfer.files);
    await manejarArchivos(files);
  }
});

fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files || []);
  await manejarArchivos(files);
  fileInput.value = "";
});

btnAddUrl.addEventListener("click", () => {
  const url = imagenUrlManual.value.trim();
  if (!url) return;
  agregarImagenUrl(url);
  imagenUrlManual.value = "";
});

async function manejarArchivos(files) {
  const supabase = getSupabaseClient();
  
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    
    try {
      const path = `uploads/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(path, file, { upsert: false });
      
      if (error) {
        console.error("Upload error:", error);
        alert(`Error subiendo imagen: ${error.message}`);
        continue;
      }

      const { data: publicData } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(path);
      
      if (publicData?.publicUrl) {
        agregarImagenUrl(publicData.publicUrl);
      }
    } catch (err) {
      console.error("Upload exception:", err);
      alert("Error inesperado subiendo imagen.");
    }
  }
}

// Split form parsing into small focused helpers to improve readability and validation
function getUbicacionFromForm() {
  return {
    departamento: document.getElementById("departamento").value || null,
    zona: document.getElementById("zona").value.trim() || null,
    direccion: document.getElementById("direccion").value.trim() || null,
    lat: document.getElementById("lat").value ? Number(document.getElementById("lat").value) : null,
    lng: document.getElementById("lng").value ? Number(document.getElementById("lng").value) : null,
    zona_clase: document.getElementById("zona_clase").value || null
  };
}

function getEconomicoFromForm() {
  return {
    operacion: document.getElementById("operacion").value || null,
    moneda: document.getElementById("moneda").value || 'USD',
    precio: document.getElementById("precio").value ? Number(document.getElementById("precio").value) : null
  };
}

function getNormativaFromForm() {
  return {
    superficie_total_m2: document.getElementById("superficie_total_m2").value ? Number(document.getElementById("superficie_total_m2").value) : null,
    superficie_catastral_m2: document.getElementById("superficie_catastral_m2").value ? Number(document.getElementById("superficie_catastral_m2").value) : null,
    uso_preferente_suelo: document.getElementById("uso_preferente_suelo").value || null,
    subcategoria_uso: document.getElementById("subcategoria_uso").value.trim() || null,
    area_diferenciada: document.getElementById("area_diferenciada").value.trim() || null,
    regimen_gestion_suelo: document.getElementById("regimen_gestion_suelo").value.trim() || null,
    bien_cautelado: document.getElementById("bien_cautelado").checked,
    area_especial_consideracion: document.getElementById("area_especial_consideracion").checked,
    reglamento_vis: document.getElementById("reglamento_vis").checked,
    planes_especiales: document.getElementById("planes_especiales").value.trim() || null,
    altura_maxima_m: document.getElementById("altura_maxima_m").value ? Number(document.getElementById("altura_maxima_m").value) : null,
    altura_minima_m: document.getElementById("altura_minima_m").value ? Number(document.getElementById("altura_minima_m").value) : null,
    altura_maxima_pisos: document.getElementById("altura_maxima_pisos").value ? Number(document.getElementById("altura_maxima_pisos").value) : null,
    fos: document.getElementById("fos").value ? Number(document.getElementById("fos").value) : null,
    retiro_frontal_m: document.getElementById("retiro_frontal_m").value ? Number(document.getElementById("retiro_frontal_m").value) : null,
    retiro_lateral_m: document.getElementById("retiro_lateral_m").value ? Number(document.getElementById("retiro_lateral_m").value) : null,
    retiro_posterior_m: document.getElementById("retiro_posterior_m").value ? Number(document.getElementById("retiro_posterior_m").value) : null,
    galibos: document.getElementById("galibos").value.trim() || null,
    afectaciones_ochava: document.getElementById("afectaciones_ochava").value.trim() || null,
    afectaciones_volumetricas: document.getElementById("afectaciones_volumetricas").value.trim() || null
  };
}

function getServiciosFromForm() {
  return {
    agua: document.getElementById("agua").checked,
    luz: document.getElementById("luz").checked,
    saneamiento: document.getElementById("saneamiento").checked,
    acepta_banco: document.getElementById("acepta_banco").checked,
    financiacion: document.getElementById("financiacion").checked
  };
}

function getContactoFromForm() {
  return {
    contacto_nombre: document.getElementById("contacto_nombre").value.trim() || null,
    contacto_telefono: document.getElementById("contacto_telefono").value.trim() || null,
    contacto_email: document.getElementById("contacto_email").value.trim() || null,
    contacto_avatar_url: document.getElementById("contacto_avatar_url").value.trim() || null
  };
}

function getLinksFromForm() {
  return {
    link_principal: document.getElementById("link_principal").value.trim() || null,
    link_mercadolibre: document.getElementById("link_mercadolibre").value.trim() || null,
    link_otro_portal: document.getElementById("link_otro_portal").value.trim() || null
  };
}

function getImagenesFromForm() {
  return {
    imagenes: imagenesActuales.length > 0 ? imagenesActuales : null,
    portada_url: imagenesActuales.length > 0 ? imagenesActuales[0] : null
  };
}

function getFormDataObject() {
  const id = document.getElementById("terreno_id").value || null;
  const titulo = document.getElementById("titulo").value.trim() || null;
  const descripcion = document.getElementById("descripcion").value.trim() || null;
  const estado = document.getElementById("estado").value || 'disponible';
  const publicado = document.getElementById("publicado").checked;
  const destacado = document.getElementById("destacado").checked;

  return {
    id,
    titulo,
    descripcion,
    ...getUbicacionFromForm(),
    ...getEconomicoFromForm(),
    estado,
    destacado,
    ...getNormativaFromForm(),
    ...getServiciosFromForm(),
    publicado,
    ...getContactoFromForm(),
    ...getLinksFromForm(),
    ...getImagenesFromForm()
  };
}

// Plan limits: FREE 1, BASICO 5, PRO 15, PREMIUM unlimited
function canUserCreateMoreTerrenos(plan, cantidadTerrenosUsuario) {
  if (!plan) plan = 'FREE';
  switch (plan.toUpperCase()) {
    case 'FREE':
      return cantidadTerrenosUsuario < 1;
    case 'BASICO':
      return cantidadTerrenosUsuario < 5;
    case 'PRO':
      return cantidadTerrenosUsuario < 15;
    case 'PREMIUM':
      return true;
    default:
      return cantidadTerrenosUsuario < 1;
  }
}

btnNuevo.addEventListener("click", () => {
  form.reset();
  document.getElementById("terreno_id").value = "";
  document.getElementById("zona_clase").value = "media";
  document.getElementById("operacion").value = "venta";
  document.getElementById("estado").value = "disponible";
  document.getElementById("publicado").checked = true;
  document.getElementById("destacado").checked = false;
  imagenesActuales = [];
  actualizarPreview();
});

const KNOWN_TERRRENOS_COLUMNS = new Set([
  "titulo","descripcion","departamento","zona","direccion","lat","lng","zona_clase","operacion","moneda","precio","estado","destacado",
  "superficie_total_m2","superficie_catastral_m2","uso_preferente_suelo","subcategoria_uso","area_diferenciada","regimen_gestion_suelo","bien_cautelado","area_especial_consideracion","reglamento_vis","planes_especiales",
  "altura_maxima_m","altura_minima_m","altura_maxima_pisos","fos","retiro_frontal_m","retiro_lateral_m","retiro_posterior_m","galibos",
  "afectaciones_ochava","afectaciones_volumetricas","agua","luz","saneamiento","acepta_banco","financiacion","publicado",
  "contacto_nombre","contacto_telefono","contacto_email","link_principal","link_mercadolibre","link_otro_portal","imagenes","portada_url","user_id"
]);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const supabase = getSupabaseClient();
  
  const data = getFormDataObject();

  // inline error box
  const errorBox = document.getElementById("form-error");
  if (errorBox) {
    errorBox.classList.add('hidden');
    errorBox.textContent = "";
  }

  if (!data.titulo || !data.departamento || !data.operacion || !data.superficie_total_m2) {
    if (errorBox) {
      errorBox.classList.remove('hidden');
      errorBox.textContent = "Completá al menos título, departamento, operación y superficie total.";
    } else {
      alert("Completá al menos título, departamento, operación y superficie total.");
    }
    return;
  }

  const payload = { ...data };
  delete payload.id;

  // Agregar user_id para nuevos terrenos
  if (!data.id && currentUserId) {
    payload.user_id = currentUserId;
  }

  const allowedSet = DB_COLUMNS || KNOWN_TERRRENOS_COLUMNS;
  const payloadFiltered = Object.fromEntries(
    Object.entries(payload).filter(([k]) => allowedSet.has(k))
  );

  const dropped = Object.keys(payload).filter(k => !allowedSet.has(k));
  if (dropped.length > 0) console.warn("Dropped fields not in DB:", dropped);

  if (Object.keys(payloadFiltered).length === 0) {
    alert('No hay campos válidos para guardar.');
    return;
  }

  let error;
  if (data.id && data.id.trim()) {
    const res = await supabase.from("terrenos").update(payloadFiltered).eq("id", data.id);
    error = res.error;
  } else {
    // Check user's plan and current count before inserting
    try {
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('plan')
        .eq('id', currentUserId)
        .single();

      if (perfilError) {
        console.warn('No se pudo leer perfil del usuario:', perfilError);
      }

      const userPlan = perfil?.plan || 'FREE';

      // count terrenos for user
      const countRes = await supabase.from('terrenos').select('id', { count: 'exact', head: true }).eq('user_id', currentUserId);
      const userCount = countRes.count || 0;

      if (!canUserCreateMoreTerrenos(userPlan, userCount)) {
        if (errorBox) {
          errorBox.classList.remove('hidden');
          errorBox.textContent = 'Tu plan actual no permite más publicaciones. Escribinos para ampliar tu plan.';
        } else {
          alert('Tu plan actual no permite más publicaciones. Escribinos para ampliar tu plan.');
        }
        return;
      }
    } catch (e) {
      console.error('Error comprobando plan usuario:', e);
      // proceed to attempt insert anyway (fail later if required)
    }

    const res = await supabase.from("terrenos").insert([payloadFiltered]);
    error = res.error;
  }

  if (error) {
    console.error("Error completo:", error);
    const errMsg = (error?.message) ? error.message : JSON.stringify(error);
    if (errorBox) {
      errorBox.classList.remove('hidden');
      errorBox.textContent = "Error guardando terreno: " + errMsg;
    } else {
      alert("Error guardando terreno: " + errMsg);
    }
    return;
  }

  // success
  if (errorBox) {
    errorBox.classList.add('hidden');
    errorBox.textContent = "";
  }

  btnNuevo.click();
  await cargarTerrenos();
});

// Cargar SOLO los terrenos del usuario actual
async function cargarTerrenos() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("terrenos")
    .select("*")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert("Error cargando terrenos.");
    return;
  }

  lista.innerHTML = "";

  for (const t of data) {
    const tr = document.createElement("tr");

    const tdTitulo = document.createElement("td");
    tdTitulo.textContent = t.titulo;
    tr.appendChild(tdTitulo);

    const tdUbic = document.createElement("td");
    tdUbic.textContent = `${t.zona ? t.zona + " · " : ""}${t.departamento}`;
    tr.appendChild(tdUbic);

    const tdSup = document.createElement("td");
    tdSup.textContent = `${t.superficie_total_m2} m²`;
    tr.appendChild(tdSup);

    const tdOp = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge " + (t.operacion === "venta" ? "badge-venta" : "badge-alquiler");
    badge.textContent = t.operacion.toUpperCase();
    tdOp.appendChild(badge);
    tr.appendChild(tdOp);

    const tdPrecio = document.createElement("td");
    tdPrecio.textContent = t.precio ? `USD ${Number(t.precio).toLocaleString("es-UY")}` : "-";
    tr.appendChild(tdPrecio);

    const tdPub = document.createElement("td");
    const badgePub = document.createElement("span");
    badgePub.className = "badge " + (t.publicado ? "" : "badge-off");
    badgePub.textContent = t.publicado ? "ON" : "OFF";
    tdPub.appendChild(badgePub);
    tr.appendChild(tdPub);

    const tdAcc = document.createElement("td");

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn-small";
    btnEditar.textContent = "Editar";
    btnEditar.classList.add('mr-1');
    btnEditar.addEventListener("click", () => cargarEnFormulario(t));
    tdAcc.appendChild(btnEditar);

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn-small";
    btnDel.textContent = "Eliminar";
    btnDel.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este terreno?")) return;
      const supabase = getSupabaseClient();
      const { error: delError } = await supabase.from("terrenos").delete().eq("id", t.id);
      if (delError) {
        console.error(delError);
        alert("Error eliminando.");
        return;
      }
      await cargarTerrenos();
    });
    tdAcc.appendChild(btnDel);

    tr.appendChild(tdAcc);

    lista.appendChild(tr);
  }

  if (Array.isArray(data) && data.length > 0) {
    DB_COLUMNS = new Set(Object.keys(data[0]));
    console.debug("DB_COLUMNS detected:", [...DB_COLUMNS].sort());
  }
}

function cargarEnFormulario(t) {
  if (!DB_COLUMNS && t && typeof t === 'object') {
    DB_COLUMNS = new Set(Object.keys(t));
    console.debug("DB_COLUMNS detected from loaded item:", [...DB_COLUMNS].sort());
  }
  document.getElementById("terreno_id").value = t.id;
  document.getElementById("titulo").value = t.titulo || "";
  document.getElementById("descripcion").value = t.descripcion || "";
  document.getElementById("departamento").value = t.departamento || "";
  document.getElementById("zona").value = t.zona || "";
  document.getElementById("direccion").value = t.direccion || "";
  document.getElementById("lat").value = t.lat ?? "";
  document.getElementById("lng").value = t.lng ?? "";
  document.getElementById("zona_clase").value = t.zona_clase || "media";
  document.getElementById("operacion").value = t.operacion || "venta";
  document.getElementById("precio").value = t.precio ?? "";
  document.getElementById("estado").value = t.estado || "disponible";
  document.getElementById("superficie_total_m2").value = t.superficie_total_m2 || "";
  document.getElementById("superficie_catastral_m2").value = t.superficie_catastral_m2 ?? "";

  document.getElementById("uso_preferente_suelo").value = t.uso_preferente_suelo || "";
  document.getElementById("subcategoria_uso").value = t.subcategoria_uso || "";
  document.getElementById("area_diferenciada").value = t.area_diferenciada || "";
  document.getElementById("regimen_gestion_suelo").value = t.regimen_gestion_suelo || "";
  document.getElementById("planes_especiales").value = t.planes_especiales || "";

  document.getElementById("altura_maxima_m").value = t.altura_maxima_m ?? "";
  document.getElementById("altura_minima_m").value = t.altura_minima_m ?? "";
  document.getElementById("altura_maxima_pisos").value = t.altura_maxima_pisos ?? "";
  document.getElementById("fos").value = t.fos ?? "";
  document.getElementById("retiro_frontal_m").value = t.retiro_frontal_m ?? "";
  document.getElementById("retiro_lateral_m").value = t.retiro_lateral_m ?? "";
  document.getElementById("retiro_posterior_m").value = t.retiro_posterior_m ?? "";
  document.getElementById("galibos").value = t.galibos || "";
  document.getElementById("afectaciones_ochava").value = t.afectaciones_ochava || "";
  document.getElementById("afectaciones_volumetricas").value = t.afectaciones_volumetricas || "";

  document.getElementById("agua").checked = !!t.agua;
  document.getElementById("luz").checked = !!t.luz;
  document.getElementById("saneamiento").checked = !!t.saneamiento;
  document.getElementById("acepta_banco").checked = !!t.acepta_banco;
  document.getElementById("financiacion").checked = !!t.financiacion;

  document.getElementById("publicado").checked = !!t.publicado;
  document.getElementById("destacado").checked = !!t.destacado;

  document.getElementById("contacto_nombre").value = t.contacto_nombre || "";
  document.getElementById("contacto_telefono").value = t.contacto_telefono || "";
  document.getElementById("contacto_email").value = t.contacto_email || "";
  document.getElementById("contacto_avatar_url").value = t.contacto_avatar_url || "";

  document.getElementById("link_principal").value = t.link_principal || "";
  document.getElementById("link_mercadolibre").value = t.link_mercadolibre || "";
  document.getElementById("link_otro_portal").value = t.link_otro_portal || "";

  imagenesActuales = Array.isArray(t.imagenes) ? [...t.imagenes] : [];
  actualizarPreview();
}

// Inicializar
document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();
  const session = await requireAuth();
  if (!session) return;

  currentUserId = session.user.id;
  
  // Mostrar email del usuario
  document.getElementById("sessionEmail").textContent = session.user.email || "Usuario";

  // Configurar botón de logout
  if (btnSignOut) {
    btnSignOut.addEventListener("click", async () => {
      const { success } = await logout();
      if (success) {
        window.location.href = "index.html";
      }
    });
  }

  await cargarTerrenos();
});
