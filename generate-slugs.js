#!/usr/bin/env node
/**
 * scripts/generate-slugs.js
 *
 * Usage:
 *  node scripts/generate-slugs.js path/to/terrenos.json
 *
 * The JSON file should be an array of objects with at least: { id, titulo, zona }
 * The script will print SQL UPDATE statements (won't execute anything).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function loadSlugify() {
  // Import the project helper as an ES module
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const slugPath = path.join(__dirname, '..', 'js', 'slugify.js');
  const slugModule = await import(`file://${slugPath}`);
  return slugModule.slugify || slugModule.default;
}

function exampleData() {
  return [
    { id: 123, titulo: 'Terreno en Pocitos - Excelente ubicacion', zona: 'Pocitos' },
    { id: 124, titulo: 'Parcela de gran tamaño: ideal desarrollo', zona: 'Canelones' },
    { id: 125, titulo: 'Fracción rústica (campo)', zona: '' }
  ];
}

async function main() {
  const slugify = await loadSlugify();
  const arg = process.argv[2];
  let items = null;

  if (!arg) {
    console.log('No JSON file provided. Using example data.');
    items = exampleData();
  } else {
    const filePath = path.resolve(process.cwd(), arg);
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      process.exit(1);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    try { items = JSON.parse(raw); } catch (e) { console.error('Invalid JSON file'); process.exit(1); }
  }

  console.log('\n-- SQL to add slug column (example, run once):');
  console.log("ALTER TABLE terrenos ADD COLUMN slug TEXT; -- adjust if column already exists");
  console.log("CREATE UNIQUE INDEX IF NOT EXISTS idx_terrenos_slug ON terrenos(slug);\n");

  console.log('-- Generated UPDATE statements (do NOT run blindly; review first)');
  items.forEach(item => {
    const title = item.titulo || '';
    const zone = item.zona || '';
    const id = item.id;
    if (typeof id === 'undefined') return;
    const base = slugify(title);
    const zoneSlug = zone ? `-${slugify(zone)}` : '';
    const slug = `${base}${zoneSlug}-${String(id)}`.replace(/-+/g, '-').replace(/(^-|-$)/g, '');
    // Ensure single quotes escaped (slug should not contain them, but be safe)
    const safe = slug.replace(/'/g, "''");
    // Print friendly output and SQL
    console.log(`ID ${id} → ${slug}`);
    console.log(`UPDATE terrenos SET slug='${safe}' WHERE id=${id};\n`);
  });

  console.log('\n-- After reviewing, you can run the SQL updates in your DB.');
  console.log('-- Recommended: run inside a transaction, verify uniqueness, and test redirects to new friendly URLs.');
}

main().catch(err => { console.error(err); process.exit(1); });
