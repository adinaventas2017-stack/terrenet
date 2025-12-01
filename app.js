// server/app.js
// Minimal Express example showing how to mount the sitemap route.
// Usage:
// 1. npm install express
// 2. node server/app.js

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerSitemapRoute } from './sitemap-route.js';
import registerTerrenoRoutes from './terreno-route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup for server-side rendering
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static assets (serve your existing public files)
app.use(express.static(path.join(__dirname, '..')));

// Register sitemap route
registerSitemapRoute(app, { baseUrl: 'https://terrenet.uy' });

// Register terrenos SSR routes
registerTerrenoRoutes(app, { baseUrl: 'https://terrenet.uy' });

app.get('/', (req, res) => {
  res.send('TerreNet example server. Visit /sitemap.xml or /terreno/:slug');
});

app.listen(PORT, () => {
  console.log(`Example server running: http://localhost:${PORT}`);
  console.log('Sitemap available at: http://localhost:' + PORT + '/sitemap.xml');
  console.log('Terreno SSR available at: http://localhost:' + PORT + '/terreno/:slug');
});

export default app;
