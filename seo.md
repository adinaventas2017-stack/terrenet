# SEO Notes for TerreNet (v1)

This document summarizes the SEO-related changes applied for v1 and next steps.

## What was implemented

- Page-level meta tags added/verified:
  - `index.html`: `title`, `meta[name="description"]`, `link rel="canonical"`, and Open Graph tags (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`).
  - `terreno.html`: meta description, canonical and OG placeholders (dynamically updated at runtime by `js/detail.js`).
  - Internal pages (`registro.html`, `user.html`, `admin.html`, `debug.html`) include `<meta name="robots" content="noindex, nofollow">` to prevent indexing.

- Centralized runtime meta updates:
  - `js/detail.js` now updates `document.title` and common Open Graph meta tags when a terreno is loaded so social previews use real data.

- Static site-level controls:
  - `robots.txt` placed at project root with rules to allow public crawling but explicitly disallow internal panels.
  - `sitemap.xml` (static) placed at project root with entries for the homepage and a template/placeholder for the detail page. This is a starting point — a dynamic sitemap is recommended later.

- Home page visual improvements for the SEO content block:
  - `index.html`: SEO text wrapped in a dedicated `<section class="seo-section">` with `.seo-section-inner` layout and semantic headings.
  - `css/main.css`: added styles for `.seo-section` and `.seo-section-inner` including responsive 2-column layout on desktop and typographic spacing.

## Which pages are noindexed

- `registro.html`
- `user.html`
- `admin.html`
- `debug.html`

These pages also have `robots.txt` disallow entries as a second layer of control.

## Future improvements (recommended roadmap)

- Generate a dynamic `sitemap.xml` server-side including each terreno URL (with `lastmod`, `changefreq`, and `priority`).
- Add friendly per-terreno URLs (e.g. `/terreno/123-titulo-del-terreno`) and update sitemap generation.
- Implement structured data (`schema.org`) for `RealEstateListing` or `Product` where appropriate to improve rich results.
- Provide optimized Open Graph images (1200x630) per listing and include `og:image:width` / `og:image:height` where possible.
- Review robots and canonical usage when introducing friendly URLs and server-side routing.

### Implementation notes: URLs amigables, sitemap dinámico y schema.org

- Friendly URLs (recommended approach):
  1. Add a `slug` column to the `terrenos` table (unique index). Use a slugify function when creating/updating records: `${id}-${slugify(title)}-${slugify(zona)}`.
  2. Serve detail pages at a pretty path like `/terreno/:slug` in your server (or use redirects). The existing `terreno.html?id=123` can remain as a fallback while transitioning.
  3. Update `link rel="canonical"` on the detail page to use the canonical friendly URL when available.

- Sitemap dynamic generator (server-side):
  - Use a small server-side script or server route that queries the `terrenos` table for published listings and returns XML generated with lastmod/changefreq/priority. Example workflow:
    1. Query `SELECT id, titulo, zona, updated_at FROM terrenos WHERE publicado = true`.
    2. Build friendly URLs using stored `slug` or generate on the fly from `id`+slug.
    3. Use the `generateSitemap(baseUrl, entries)` helper in `js/sitemapGenerator.js` (or port it server-side) to create XML and serve it at `/sitemap.xml`.
  - Cache the generated sitemap and regenerate on publish/unpublish events or via a nightly cron.

- Schema.org JSON-LD for listing pages:
  - Implement JSON-LD server-side where possible so crawlers always see the structured data. If server-side rendering isn't available, inject JSON-LD dynamically on page load (as implemented in `js/detail.js`).
  - Include: `name`, `description`, `url`, `image[]`, `itemOffered` (Land with `landArea` QuantitativeValue), `offers` (price, priceCurrency), `address` (PostalAddress), `seller` (Person/Organization), and `datePosted`.
  - Validate sample pages with the Rich Results Test and the Google Structured Data Testing Tool.

## Notes for deploy

- Remember to replace the placeholder base URL (`https://terrenet.uy/`) in `sitemap.xml` with the production domain if different.
- Verify `robots.txt` after deploy via `https://<domain>/robots.txt` and test sitemap listing in Google Search Console.

## Sitemap dinámico (implementación base)

- Se incluye un ejemplo de endpoint Node/Express que sirve `/sitemap.xml` dinámico usando los registros de terrenos.

- Archivo de muestra: `server/sitemap-route.js`
  - `registerSitemapRoute(app, { baseUrl })` registra `GET /sitemap.xml`.
  - Por cada terreno publicado construye una entrada con `loc`, `lastmod`, `changefreq` y `priority`.
  - Preferencia por URL amigable: si `slug` existe usa `/terreno/{slug}`, si no, usa `/terreno.html?id={id}` como fallback.
  - Usa `generateSitemap(baseUrl, entries)` (ver `js/sitemapGenerator.js`) para producir XML válido.

- Archivo de ejemplo para correr localmente: `server/app.js` (necesita `express` instalado).

### Cómo migrar a datos reales (Supabase)

1. Reemplazar la función mock `getTerrenosPublicados()` por una llamada real a Supabase, por ejemplo:

   const { data } = await supabase.from('terrenos').select('id, slug, updated_at').eq('publicado', true);

2. Construir las entradas usando `slug` cuando esté presente y `id` como fallback.

3. Cachear la respuesta del sitemap (por ejemplo en memoria o CDN) y regenerarla cuando se publique o actualice un terreno (o con cron diario/nocturno).

4. Servir `/sitemap.xml` con `Content-Type: application/xml` y controlar headers para caché según la política elegida.

### Variables de entorno para el servidor

- El ejemplo de servidor usa la librería oficial `@supabase/supabase-js` y requiere que expongas las credenciales en las variables de entorno del proceso del servidor:
  - `SUPABASE_URL` — URL de tu proyecto Supabase.
  - `SUPABASE_SERVICE_ROLE_KEY` (preferible) o `SUPABASE_KEY` — clave con permisos de lectura (service role o anon si apropiado).

  Asegurate de mantener `SERVICE_ROLE_KEY` seguro (no exponerlo en clientes). En entornos con funciones serverless, guarda estas variables en el secreto del entorno.

### Notas
- Es recomendable que al introducir `slug` se actualicen `canonical` en las páginas de detalle para apuntar a la URL amigable.
- Validar el sitemap resultante en Google Search Console tras desplegar.

