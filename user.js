// js/user.js
import { getSupabaseClient, requireAuth, logout } from "./auth.js";
import { SUPABASE_STORAGE_BUCKET } from "./config.js";

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

function getFormDataObject() {
  const id = document.getElementById("terreno_id").value || null;

  const titulo = document.getElementById("titulo").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const departamento = document.getElementById("departamento").value;
  const zona = document.getElementById("zona").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const lat = document.getElementById("lat").value ? Number(document.getElementById("lat").value) : null;
  const lng = document.getElementById("lng").value ? Number(document.getElementById("lng").value) : null;
  const zona_clase = document.getElementById("zona_clase").value;
  const operacion = document.getElementById("operacion").value;
  const precio = document.getElementById("precio").value ? Number(document.getElementById("precio").value) : null;
  const estado = document.getElementById("estado").value;

  const superficie_total_m2 = Number(document.getElementById("superficie_total_m2").value) || 0;
  const superficie_catastral_m2 = document.getElementById("superficie_catastral_m2").value
    ? Number(document.getElementById("superficie_catastral_m2").value)
    : null;

  const uso_preferente_suelo = document.getElementById("uso_preferente_suelo").value;
  const subcategoria_uso = document.getElementById("subcategoria_uso").value.trim();
  const area_diferenciada = document.getElementById("area_diferenciada").value.trim();
  const regimen_gestion_suelo = document.getElementById("regimen_gestion_suelo").value.trim();
  const bien_cautelado = document.getElementById("bien_cautelado").checked;
  const area_especial_consideracion = document.getElementById("area_especial_consideracion").checked;
  const reglamento_vis = document.getElementById("reglamento_vis").checked;
  const planes_especiales = document.getElementById("planes_especiales").value.trim();

  const altura_maxima_m = document.getElementById("altura_maxima_m").value
    ? Number(document.getElementById("altura_maxima_m").value)
    : null;
  const altura_minima_m = document.getElementById("altura_minima_m").value
    ? Number(document.getElementById("altura_minima_m").value)
    : null;
  const altura_maxima_pisos = document.getElementById("altura_maxima_pisos").value
    ? Number(document.getElementById("altura_maxima_pisos").value)
    : null;
  const fos = document.getElementById("fos").value ? Number(document.getElementById("fos").value) : null;
  const retiro_frontal_m = document.getElementById("retiro_frontal_m").value
    ? Number(document.getElementById("retiro_frontal_m").value)
    : null;
  const retiro_lateral_m = document.getElementById("retiro_lateral_m").value
    ? Number(document.getElementById("retiro_lateral_m").value)
    : null;
  const retiro_posterior_m = document.getElementById("retiro_posterior_m").value
    ? Number(document.getElementById("retiro_posterior_m").value)
    : null;
  const galibos = document.getElementById("galibos").value.trim();
  const afectaciones_ochava = document.getElementById("afectaciones_ochava").value.trim();
  const afectaciones_volumetricas = document.getElementById("afectaciones_volumetricas").value.trim();

  const agua = document.getElementById("agua").checked;
  const luz = document.getElementById("luz").checked;
  const saneamiento = document.getElementById("saneamiento").checked;
  const acepta_banco = document.getElementById("acepta_banco").checked;
  const financiacion = document.getElementById("financiacion").checked;

  const publicado = document.getElementById("publicado").checked;
  const destacado = document.getElementById("destacado").checked;

  const contacto_nombre = document.getElementById("contacto_nombre").value.trim();
  const contacto_telefono = document.getElementById("contacto_telefono").value.trim();
  const contacto_email = document.getElementById("contacto_email").value.trim();
  const contacto_avatar_url = document.getElementById("contacto_avatar_url").value.trim();

  const link_principal = document.getElementById("link_principal").value.trim();
  const link_mercadolibre = document.getElementById("link_mercadolibre").value.trim();
  const link_otro_portal = document.getElementById("link_otro_portal").value.trim();

  const imagenes = imagenesActuales.length > 0 ? imagenesActuales : null;
  const portada_url = imagenesActuales.length > 0 ? imagenesActuales[0] : null;

  return {
    id,
    titulo,
    descripcion,
    departamento,
    zona,
    direccion,
    lat,
    lng,
    zona_clase,
    operacion,
    moneda: "USD",
    precio,
    estado,
    destacado,
    superficie_total_m2,
    superficie_catastral_m2,
    uso_preferente_suelo,
    subcategoria_uso,
    area_diferenciada,
    regimen_gestion_suelo,
    bien_cautelado,
    planes_especiales,
    altura_maxima_m,
    altura_minima_m,
    altura_maxima_pisos,
    fos,
    retiro_frontal_m,
    retiro_lateral_m,
    retiro_posterior_m,
    galibos,
    area_especial_consideracion,
    reglamento_vis,
    afectaciones_ochava,
    afectaciones_volumetricas,
    agua,
    luz,
    saneamiento,
    acepta_banco,
    financiacion,
    publicado,
    contacto_nombre,
    contacto_telefono,
    contacto_email,
    link_principal,
    link_mercadolibre,
    link_otro_portal,
    imagenes,
    portada_url
  };
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

  if (!data.titulo || !data.departamento || !data.operacion || !data.superficie_total_m2) {
    alert("Completá al menos título, departamento, operación y superficie total.");
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
    const res = await supabase.from("terrenos").insert([payloadFiltered]);
    error = res.error;
  }

  if (error) {
    console.error("Error completo:", error);
    const errMsg = (error?.message) ? error.message : JSON.stringify(error);
    alert("Error guardando terreno: " + errMsg);
    return;
  }

  btnNuevo.click();
  await cargarTerrenos();
});

// Cargar SOLO los terrenos del usuario actual
async function cargarTerrenos() {
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
    btnEditar.style.marginRight = "0.25rem";
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
