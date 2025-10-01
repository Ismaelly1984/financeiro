const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'sitemap.xml');

// Gera um sitemap mínimo com as páginas HTML encontradas na raiz e pages/
const pages = [];
function gather(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) continue;
    if (e.name.endsWith('.html')) {
      const rel = path.relative(ROOT, path.join(dir, e.name)).replace(/\\/g, '/');
      pages.push(rel);
    }
  }
}

gather(ROOT);

const urls = pages.map(p => `  <url>\n    <loc>https://ismaelly1984.github.io/financeiro/${p}</loc>\n  </url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

fs.writeFileSync(OUT, xml, 'utf8');
console.log('Sitemap gerado em', OUT);
