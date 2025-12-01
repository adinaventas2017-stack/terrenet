// js/admin.js
import { getSupabaseClient, requireAdminAuth, logout } from "./auth.js";
import { setupMenu } from "./menu.js";
import { SUPABASE_STORAGE_BUCKET } from "./config.js";
import { showStatus, confirmDialog, logDebug, logWarn, logError } from "./utils.js";
import { setupDropzone, uploadImagesToSupabase, renderPreview } from "./images.js";

const form = document.getElementById("form-terreno");
const lista = document.getElementById("lista-terrenos");
const btnSugerir = document.getElementById("btn-sugerir");
const btnNuevo = document.getElementById("btn-nuevo");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const previewGrid = document.getElementById("preview-grid");
const btnAddUrl = document.getElementById("btn-add-url");
const imagenUrlManual = document.getElementById("imagen_url_manual");
const btnSignOut = document.getElementById("btnSignOut");

let imagenesActuales = [];
let DB_COLUMNS = null;

function actualizarPreview() {
  renderPreview({ containerEl: previewGrid, urls: imagenesActuales, onRemove: (idx) => { imagenesActuales.splice(idx,1); actualizarPreview(); } });
}

function agregarImagenUrl(url) {
  if (!url) return;
  if (!imagenesActuales.includes(url)) {
    imagenesActuales.push(url);
    actualizarPreview();
  }
}

btnAddUrl.addEventListener("click", () => {
  const url = imagenUrlManual.value.trim();
  if (!url) return;
  agregarImagenUrl(url);
  imagenUrlManual.value = "";
});

let teardownDropzone = null;
if (dropzone && fileInput) {
  teardownDropzone = setupDropzone({ dropzoneEl: dropzone, fileInputEl: fileInput, onFiles: async (files) => {
    try {
      const urls = await uploadImagesToSupabase(files);
      if (!urls || urls.length === 0) {
        showStatus('No se subieron imágenes.', { type: 'error' });
        return;
      }
      urls.forEach(u => agregarImagenUrl(u));
      actualizarPreview();
    } catch (err) {
      logError('Error subiendo imágenes', err, { userMessage: 'Error subiendo imágenes.' });
    }
  }});
}

// Image uploads managed via shared images module

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

function sugerirPrecioDesdeForm() {
  const data = getFormDataObject();
  if (!data.departamento || !data.superficie_total_m2) return null;

  let baseM2;
  switch (data.departamento) {
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
  if (data.zona_clase === "premium") factorZona = 1.4;
  else if (data.zona_clase === "periferica") factorZona = 0.85;

  const edificabilidadFactor = data.edificabilidad_factor ?? 1;
  const factorEdif = 1 + edificabilidadFactor * 0.1;

  const serviciosCount = [data.agua, data.luz, data.saneamiento].filter(Boolean).length;
  const factorServicios = 1 + serviciosCount * 0.05;

  let precio = data.superficie_total_m2 * baseM2 * factorZona * factorEdif * factorServicios;

  if (data.operacion === "alquiler") {
    precio = precio * 0.01;
  }

  return Math.round(precio);
}

btnSugerir.addEventListener("click", () => {
  const estimado = sugerirPrecioDesdeForm();
  if (!estimado) {
    showStatus("Poné al menos departamento, superficie total y tipo de zona para estimar.", { type: 'error' });
    return;
  }
  document.getElementById("precio").value = estimado;
});

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

// List of known columns in the 'terrenos' table. Keep in sync with Supabase schema.
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
    showStatus("Completá al menos título, departamento, operación y superficie total.", { type: 'error' });
    return;
  }

  const payload = { ...data };
  delete payload.id;

  // Filter payload to only include known DB columns
  // If DB_COLUMNS detected at runtime, prefer that; otherwise fall back to static whitelist
  const allowedSet = DB_COLUMNS || KNOWN_TERRRENOS_COLUMNS;
  const payloadFiltered = Object.fromEntries(
    Object.entries(payload).filter(([k]) => allowedSet.has(k))
  );

  // Log any keys dropped for debugging
  const dropped = Object.keys(payload).filter(k => !allowedSet.has(k));
  if (dropped.length > 0) logWarn("Dropped fields not in DB:", dropped);

  if (Object.keys(payloadFiltered).length === 0) {
    showStatus('No hay campos válidos para guardar. Verifica el formulario y la configuración del backend.', { type: 'error' });
    return;
  }

  let error;
  if (data.id && data.id.trim()) {  // Verifica que no sea vacío
    const res = await supabase.from("terrenos").update(payloadFiltered).eq("id", data.id);
    error = res.error;
  } else {
    const res = await supabase.from("terrenos").insert([payloadFiltered]);
    error = res.error;
  }

  if (error) {
    const errMsg = (error?.message) ? error.message : JSON.stringify(error);
    logError(error, { userMessage: 'Error guardando terreno: ' + errMsg });
    return;
  }

  btnNuevo.click();
  await cargarTerrenos();
});

async function cargarTerrenos() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("terrenos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logError(error, { userMessage: 'Error cargando terrenos.' });
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
      const ok = await confirmDialog({ title: 'Eliminar terreno', message: '¿Eliminar este terreno?', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' });
      if (!ok) return;
      const supabase = getSupabaseClient();
      const { error: delError } = await supabase.from("terrenos").delete().eq("id", t.id);
      if (delError) {
        logError(delError, { userMessage: 'Error eliminando.' });
        return;
      }
      await cargarTerrenos();
    });
    tdAcc.appendChild(btnDel);

    tr.appendChild(tdAcc);

    lista.appendChild(tr);
  }

  // If we detected rows, use the first row keys as DB_COLUMNS
  if (Array.isArray(data) && data.length > 0) {
    DB_COLUMNS = new Set(Object.keys(data[0]));
    logDebug("DB_COLUMNS detected:", [...DB_COLUMNS].sort());
  }
}

function cargarEnFormulario(t) {
  // Ensure we have DB columns from the current item (helps if no rows were present at cargarTerrenos)
  if (!DB_COLUMNS && t && typeof t === 'object') {
    DB_COLUMNS = new Set(Object.keys(t));
    logDebug("DB_COLUMNS detected from loaded item:", [...DB_COLUMNS].sort());
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

cargarTerrenos();

// ==================== VERIFICACIÓN DE USUARIOS ====================

async function loadUsuariosPendientes(){
  const contRoot = document.getElementById('usuariosPendientes');
  if (!contRoot) return;
  contRoot.innerHTML = '<p>Cargando usuarios...</p>';
    try {
      const supabase = getSupabaseClient();
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('estado_verificacion', 'pendiente');
  
      if (error) throw error;
      if (!usuarios || usuarios.length === 0) {
        contRoot.innerHTML = '<p class="small-muted">✅ No hay usuarios pendientes de verificación.</p>';
        return;
      }
  
      contRoot.innerHTML = '';
      usuarios.forEach(u => {
        const div = document.createElement('div');
        div.className = 'usuario-card';
        div.dataset.userid = u.id;
  
        const empresaText = u.empresa ? '🏢 Empresa' : '👤 Persona';
  
        div.innerHTML = `
          <div class="usuario-meta-row">
            <div class="usuario-meta-left">
              <strong class="usuario-name">${escapeHtml(u.nombre || '')} ${escapeHtml(u.apellido || '')}</strong>
              <div class="small-muted mt-1">${escapeHtml(u.email || '')}</div>
              <div class="empresa-text">${empresaText}</div>
              ${u.link_verificacion ? `<div class="mt-1"><a href="${escapeHtml(u.link_verificacion)}" target="_blank" class="link-profile">Ver perfil</a></div>` : ''}
            </div>
            <div class="usuario-actions">
              <button class="btn-aprobar">✓ Aprobar</button>
              <button class="btn-rechazar">✕ Rechazar</button>
            </div>
          </div>
        `;
  
        const btnA = div.querySelector('.btn-aprobar');
        const btnR = div.querySelector('.btn-rechazar');
        btnA.addEventListener('click', async () => await cambiarEstado(u.id, 'aprobado', div, btnA, btnR));
        btnR.addEventListener('click', async () => await cambiarEstado(u.id, 'rechazado', div, btnA, btnR));
  
        contRoot.appendChild(div);
      });
  } catch(err){
    contRoot.innerHTML = '<p class="status-error">Error cargando usuarios pendientes.</p>';
    logError(err);
  }
}

async function cambiarEstado(id, estado, cardEl, btnAccept, btnReject){
  const origA = btnAccept.innerHTML;
  const origR = btnReject.innerHTML;
  btnAccept.disabled = true;
  btnReject.disabled = true;
  btnAccept.innerHTML = '⏳';
  btnReject.innerHTML = '⏳';

  try{
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('usuarios')
      .update({ estado_verificacion: estado })
      .eq('id', id)
      .select();

    if(error){
      const msg = 'Error al actualizar usuario: ' + (error.message || JSON.stringify(error));
      logError(error, { userMessage: msg });
      return;
    }

    if(!data || data.length === 0){
      showStatus('No se actualizó el registro. Revisa RLS.', { type: 'error' });
      return;
    }

    // Mostrar mensaje según estado
    const mensaje = estado === 'aprobado' 
      ? '✅ Usuario aprobado' 
      : '❌ Usuario rechazado';
    
    cardEl.classList.add(estado === 'aprobado' ? 'usuario-aprobado' : 'usuario-rechazado');
    cardEl.innerHTML = `<p class="no-margin ${estado === 'aprobado' ? 'status-success' : 'status-error'}">${mensaje}</p>`;
    
    // Remover después de 2 segundos
    setTimeout(() => {
      if(cardEl && cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
    }, 2000);
  } catch(err){
    logError(err, { userMessage: 'Error al actualizar usuario: ' + (err.message || err) });
  } finally {
    if(btnAccept){ btnAccept.disabled = false; btnAccept.innerHTML = origA; }
    if(btnReject){ btnReject.disabled = false; btnReject.innerHTML = origR; }
  }
}

function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Inicializar panel admin
document.addEventListener('DOMContentLoaded', async () => {
  setupMenu();
  const session = await requireAdminAuth();
  if (!session) return;

  // Mostrar email del usuario
  document.getElementById("sessionEmail").textContent = session.user.email || "Admin";

  // Cargar datos
  loadUsuariosPendientes();
  cargarTerrenos();
  loadUsersWithPlans();

  // Configurar botón de logout
  if (btnSignOut) {
    btnSignOut.addEventListener("click", async () => {
      const { success } = await logout();
      if (success) {
        window.location.href = "index.html";
      }
    });
  }
});

// ==================== ADMIN: Usuarios y planes ====================
async function loadUsersWithPlans(){
  const cont = document.getElementById('usersPlansContainer');
  if(!cont) return;
  cont.innerHTML = '<p>Cargando perfiles...</p>';
    try {
      const supabase = getSupabaseClient();
      const { data: perfiles, error } = await supabase.from('perfiles').select('id,nombre,avatar_url,telefono,email,plan');
      if (error) throw error;
      if (!perfiles || perfiles.length === 0) {
        cont.innerHTML = '<p class="small-muted">No hay perfiles registrados.</p>';
        return;
      }
  
      const table = document.createElement('table');
      table.className = 'data-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Contacto</th>
            <th>Plan</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
  
      const tbody = table.querySelector('tbody');
      perfiles.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'data-row';
  
        const tdUser = document.createElement('td');
        tdUser.innerHTML = `<strong>${escapeHtml(p.nombre || '')}</strong> <div class="small-muted">ID: ${escapeHtml(p.id || '')}</div>`;
  
        const tdContact = document.createElement('td');
        tdContact.innerHTML = `<div class="small-muted">${escapeHtml(p.email || p.telefono || '')}</div>`;
  
        const tdPlan = document.createElement('td');
        const select = document.createElement('select');
        select.innerHTML = `
          <option value="FREE">FREE</option>
          <option value="BASICO">BASICO</option>
          <option value="PRO">PRO</option>
          <option value="PREMIUM">PREMIUM</option>
        `;
        select.value = (p.plan || 'FREE').toUpperCase();
        tdPlan.appendChild(select);
  
        const tdActions = document.createElement('td');
        const btnSave = document.createElement('button');
        btnSave.className = 'btn btn-primary';
        btnSave.textContent = 'Guardar';
        btnSave.classList.add('ml-1');
        btnSave.addEventListener('click', async () => {
          btnSave.disabled = true;
          const planSel = select.value;
          try {
            const { data, error } = await getSupabaseClient().from('perfiles').update({ plan: planSel }).eq('id', p.id).select();
            if (error) throw error;
            btnSave.textContent = 'Guardado';
            setTimeout(() => btnSave.textContent = 'Guardar', 1500);
          } catch (err) {
            logError(err, { userMessage: 'Error guardando plan: ' + (err.message || err) });
          } finally {
            btnSave.disabled = false;
          }
        });
        tdActions.appendChild(btnSave);
  
        tr.appendChild(tdUser);
        tr.appendChild(tdContact);
        tr.appendChild(tdPlan);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
      });
  
      cont.innerHTML = '';
      cont.appendChild(table);
  
    } catch (err) {
      logError('Error cargando perfiles:', err);
      cont.innerHTML = '<p class="status-error">Error cargando perfiles.</p>';
    }
}
