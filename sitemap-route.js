// server/sitemap-route.js
// Registers GET /sitemap.xml on an Express app.
// Uses the generateSitemap helper to produce XML from an entries array.

import { generateSitemap } from '../js/sitemapGenerator.js';
import { createClient } from '@supabase/supabase-js';

// Reads Supabase credentials from environment variables:
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase credentials not provided in environment (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function registerSitemapRoute(app, { baseUrl = 'https://terrenet.uy' } = {}) {
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const supabase = getSupabase();

      // Fetch published terrenos, order by updated_at desc (fallback to created_at)
      const { data, error } = await supabase
        .from('terrenos')
        .select('id, slug, updated_at, created_at')
        .eq('publicado', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching terrenos for sitemap:', error);
        throw error;
      }

      const entries = [];

      // Home
      entries.push({ loc: '/index.html', changefreq: 'daily', priority: 0.8, lastmod: new Date().toISOString() });

      const seen = new Set();

      (data || []).forEach(t => {
        const id = t.id;
        const slug = t.slug || '';
        let locPath = '';
        if (slug && String(slug).trim().length > 0) {
          // encode slug safely for URL path
          locPath = `/terreno/${encodeURIComponent(String(slug))}`;
        } else {
          locPath = `/terreno.html?id=${encodeURIComponent(String(id))}`;
        }

        // avoid duplicates
        if (seen.has(locPath)) return;
        seen.add(locPath);

        const lastmod = t.updated_at || t.created_at || new Date().toISOString();
        // Ensure lastmod is an ISO string
        const lastmodIso = new Date(lastmod).toISOString();

        entries.push({ loc: locPath, lastmod: lastmodIso, changefreq: 'weekly', priority: 0.6 });
      });

      // generate XML (generateSitemap will prefix baseUrl)
      const xml = generateSitemap(baseUrl, entries);
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      console.error('Error generating sitemap:', err);
      // Return a minimal sitemap so crawlers don't get 500s
      try {
        const fallback = generateSitemap('https://terrenet.uy', [ { loc: '/index.html', changefreq: 'daily', priority: 0.8 } ]);
        res.set('Content-Type', 'application/xml');
        res.status(200).send(fallback);
      } catch (e) {
        res.status(500).send('Error generating sitemap');
      }
    }
  });
}

export default registerSitemapRoute;
