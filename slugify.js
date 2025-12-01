// js/slugify.js
// Robust slugify helper for client and server use.
export function slugify(input, { maxLength = 80 } = {}) {
  if (!input && input !== 0) return '';
  const s = String(input);
  // Normalize unicode, remove diacritics
  let slug = s.normalize('NFKD').replace(/\p{Diacritic}/gu, '');
  // Lowercase
  slug = slug.toLowerCase();
  // Replace non-alphanumeric characters with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');
  // Trim hyphens
  slug = slug.replace(/(^-|-$)/g, '');
  // Collapse multiple hyphens
  slug = slug.replace(/-+/g, '-');
  // Trim to max length without cutting words awkwardly: cut and trim trailing hyphen
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    slug = slug.replace(/(^-|-$)/g, '');
  }
  return slug;
}

export default slugify;
