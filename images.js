// js/images.js
import { getSupabaseClient } from './auth.js';
import { logError } from './utils.js';
import { SUPABASE_STORAGE_BUCKET } from './config.js';

// Setup dropzone behavior. onFiles receives File[] when files are dropped/selected.
export function setupDropzone({ dropzoneEl, fileInputEl, onFiles }) {
  if (!dropzoneEl || !fileInputEl) return () => {};

  function onClick() { fileInputEl.click(); }
  function onDragOver(e) { e.preventDefault(); e.stopPropagation(); dropzoneEl.classList.add('dragover'); }
  function onDragLeave(e) { e.preventDefault(); e.stopPropagation(); dropzoneEl.classList.remove('dragover'); }
  async function onDrop(e) {
    e.preventDefault(); e.stopPropagation(); dropzoneEl.classList.remove('dragover');
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length && typeof onFiles === 'function') onFiles(files);
  }

  function onChange() {
    const files = Array.from(fileInputEl.files || []);
    if (files.length && typeof onFiles === 'function') onFiles(files);
    fileInputEl.value = '';
  }

  dropzoneEl.addEventListener('click', onClick);
  dropzoneEl.addEventListener('dragover', onDragOver);
  dropzoneEl.addEventListener('dragleave', onDragLeave);
  dropzoneEl.addEventListener('drop', onDrop);
  fileInputEl.addEventListener('change', onChange);

  // return teardown
  return () => {
    dropzoneEl.removeEventListener('click', onClick);
    dropzoneEl.removeEventListener('dragover', onDragOver);
    dropzoneEl.removeEventListener('dragleave', onDragLeave);
    dropzoneEl.removeEventListener('drop', onDrop);
    fileInputEl.removeEventListener('change', onChange);
  };
}

// Upload files to Supabase storage and return array of public URLs
export async function uploadImagesToSupabase(files = []) {
  const supabase = getSupabaseClient();
  const urls = [];
  for (const file of files) {
    if (!file || !file.type?.startsWith('image/')) continue;
    try {
      const path = `uploads/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, file, { upsert: false });
      if (error) {
        logError('Upload error', error);
        continue;
      }
      const { data: publicData } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
      if (publicData?.publicUrl) urls.push(publicData.publicUrl);
    } catch (err) {
      logError('Upload exception', err);
    }
  }
  return urls;
}

// Render preview grid given container element and array of urls.
// onRemove(index) is called when user clicks remove.
export function renderPreview({ containerEl, urls = [], onRemove }) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  urls.forEach((url, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';

    const img = document.createElement('img');
    img.src = url;
    img.alt = `Imagen ${idx + 1}`;
    img.className = 'preview-thumb';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preview-remove';
    btn.setAttribute('aria-label', `Eliminar imagen ${idx + 1}`);
    btn.textContent = '×';
    btn.addEventListener('click', () => {
      if (typeof onRemove === 'function') onRemove(idx);
    });

    item.appendChild(img);
    item.appendChild(btn);
    containerEl.appendChild(item);
  });
}
