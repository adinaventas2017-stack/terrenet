// server/terreno-route.js
// Server-side route to render terreno pages at /terreno/:slug and support /terreno.html?id=...

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase credentials not provided in environment (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Build JSON-LD object for server-side rendering
function buildJsonLd(t, canonicalUrl) {
  const images = Array.isArray(t.imagenes) && t.imagenes.length > 0 ? t.imagenes : (t.portada_url ? [t.portada_url] : []);
  const price = (t.precio !== undefined && t.precio !== null && !Number.isNaN(Number(t.precio))) ? Number(t.precio) : undefined;
  const moneda = t.moneda || 'USD';
  const priceValidUntil = t.precio_valido_hasta || t.price_valid_until || undefined;

  let availability = undefined;
  if (t.operacion === 'venta') availability = 'https://schema.org/ForSale';
  else if (t.operacion === 'alquiler') availability = 'https://schema.org/ForLease';

  const listing = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    'url': canonicalUrl,
    'name': t.titulo || 'Terreno en Uruguay',
    'description': t.descripcion ? String(t.descripcion).substring(0, 300) : undefined,
    'image': images.length ? images : undefined,
    'itemOffered': {
      '@type': 'Land',
      'name': t.titulo || undefined,
      'landArea': (t.superficie_total_m2 ? { '@type': 'QuantitativeValue', 'value': Number(t.superficie_total_m2), 'unitCode': 'M2' } : undefined)
    },
    'offers': (price ? { '@type': 'Offer', 'price': price, 'priceCurrency': moneda, 'url': canonicalUrl, 'availability': availability, 'priceValidUntil': priceValidUntil } : undefined),
    'datePosted': t.created_at || t.fecha_publicacion || undefined,
    'address': (t.direccion || t.zona || t.departamento) ? { '@type': 'PostalAddress', 'streetAddress': t.direccion || undefined, 'addressLocality': t.zona || undefined, 'addressRegion': t.departamento || undefined, 'addressCountry': 'UY' } : undefined,
    'seller': (t.contacto_nombre || t.contacto_telefono || t.contacto_email) ? { '@type': 'Person', 'name': t.contacto_nombre || undefined, 'telephone': t.contacto_telefono || undefined, 'email': t.contacto_email || undefined } : undefined,
    'identifier': (t.id !== undefined ? { '@type': 'PropertyValue', 'propertyID': String(t.id) } : undefined)
  };

  // Clean undefined recursively
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
}

export function registerTerrenoRoutes(app, { baseUrl = 'https://terrenet.uy' } = {}) {
  // Route: /terreno/:slug
  app.get('/terreno/:slug', async (req, res) => {
    // Normalize and validate slug from path
    const rawSlug = req.params.slug;
    const slug = (typeof rawSlug === 'string') ? rawSlug.trim() : '';
    console.debug(`/terreno/:slug requested for slug='${slug}' url='${req.originalUrl}'`);

    if (!slug) return res.status(400).send('Missing or invalid slug');

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('terrenos').select('*').eq('slug', slug).single();
      if (error) {
        console.error('Supabase error fetching terreno by slug:', { slug, message: error.message, details: error.details, hint: error.hint });
        const payload = { error: 'Supabase error fetching terreno', message: error.message };
        if (process.env.NODE_ENV !== 'production') payload.details = error;
        return res.status(500).json(payload);
      }
      if (!data) {
        console.warn('No terreno found for slug', { slug });
        return res.status(404).send('Terreno no encontrado');
      }

      const canonical = `${baseUrl.replace(/\/$/, '')}/terreno/${encodeURIComponent(slug)}`;
      const title = data.titulo || 'Detalle del terreno – TerreNet';
      const description = data.descripcion ? String(data.descripcion).substring(0, 160) : `Terreno en ${data.zona || data.departamento || 'Uruguay'}`;

      const jsonLd = buildJsonLd(data, canonical);

      // Render EJS template: pass initial data and json-ld
      res.render('terreno', {
        terreno: data,
        title,
        description,
        canonical,
        jsonLd: JSON.stringify(jsonLd, null, 2),
        initialData: JSON.stringify(data)
      });
    } catch (err) {
      console.error('Unhandled error in /terreno/:slug', { slug, err: err && err.stack ? err.stack : String(err) });
      const payload = { error: 'Internal server error', message: err && err.message ? err.message : String(err) };
      if (process.env.NODE_ENV !== 'production') payload.stack = err && err.stack ? err.stack : null;
      res.status(500).json(payload);
    }
  });

  // Support old route: /terreno.html?id=123 -> redirect to /terreno/:slug if slug exists
  app.get('/terreno.html', async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).send('Missing id');
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('terrenos').select('id, slug').eq('id', id).single();
      if (error) {
        console.error('Supabase error fetching terreno by id:', { id, message: error.message, details: error.details });
        const payload = { error: 'Supabase error fetching terreno by id', message: error.message };
        if (process.env.NODE_ENV !== 'production') payload.details = error;
        return res.status(500).json(payload);
      }
      if (!data) return res.status(404).send('Terreno no encontrado');
      if (data.slug && data.slug.length) {
        const url = `${baseUrl.replace(/\/$/, '')}/terreno/${encodeURIComponent(data.slug)}`;
        return res.redirect(301, url);
      }
      // No slug: render using id fallback
      const { data: full, error: err2 } = await supabase.from('terrenos').select('*').eq('id', id).single();
      if (err2) {
        console.error('Supabase error fetching terreno full by id:', { id, message: err2.message, details: err2.details });
        const payload = { error: 'Supabase error fetching terreno full by id', message: err2.message };
        if (process.env.NODE_ENV !== 'production') payload.details = err2;
        return res.status(500).json(payload);
      }
      if (!full) return res.status(404).send('Terreno no encontrado');

      const canonical = `${baseUrl.replace(/\/$/, '')}/terreno.html?id=${encodeURIComponent(String(id))}`;
      const title = full.titulo || 'Detalle del terreno – TerreNet';
      const description = full.descripcion ? String(full.descripcion).substring(0, 160) : `Terreno en ${full.zona || full.departamento || 'Uruguay'}`;
      const jsonLd = buildJsonLd(full, canonical);

      res.render('terreno', {
        terreno: full,
        title,
        description,
        canonical,
        jsonLd: JSON.stringify(jsonLd, null, 2),
        initialData: JSON.stringify(full)
      });
    } catch (err) {
      console.error('Unhandled error in /terreno.html', { id, err: err && err.stack ? err.stack : String(err) });
      const payload = { error: 'Internal server error', message: err && err.message ? err.message : String(err) };
      if (process.env.NODE_ENV !== 'production') payload.stack = err && err.stack ? err.stack : null;
      res.status(500).json(payload);
    }
  });
}

export default registerTerrenoRoutes;
