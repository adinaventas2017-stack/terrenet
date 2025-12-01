// js/sitemapGenerator.js
// Utility to build a sitemap XML string from an array of entries.
// Each entry: { loc, lastmod, changefreq, priority }

export function generateSitemap(baseUrl, entries = []) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  const footer = '</urlset>';

  const rows = entries.map(e => {
    const loc = e.loc.startsWith('http') ? e.loc : (baseUrl.replace(/\/$/, '') + '/' + e.loc.replace(/^\//, ''));
    const lastmod = e.lastmod ? `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>\n` : '';
    const changefreq = e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>\n` : '';
    const priority = (typeof e.priority !== 'undefined') ? `    <priority>${e.priority}</priority>\n` : '';
    return `  <url>\n    <loc>${loc}</loc>\n${lastmod}${changefreq}${priority}  </url>`;
  }).join('\n\n');

  return header + rows + '\n' + footer;
}

// Example usage (server-side):
// const xml = generateSitemap('https://terrenet.uy', [
//   { loc: '/index.html', changefreq: 'daily', priority: 0.8 },
//   { loc: '/terreno/123-nombre-zona', lastmod: '2025-11-30', changefreq: 'weekly', priority: 0.6 }
// ]);
// then write xml to /sitemap.xml
