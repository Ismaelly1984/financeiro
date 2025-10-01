const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'sitemap.xml');

// Permite configurar o domínio base via env (fallback para GitHub Pages do repo)
const OWNER = process.env.GITHUB_REPOSITORY_OWNER || (process.env.GITHUB_REPOSITORY || '/').split('/')[0] || 'user';
const REPO = (process.env.GITHUB_REPOSITORY || '/').split('/')[1] || 'repo';
const DEFAULT_BASE = `https://${OWNER}.github.io/${REPO}`;
const BASE_URL = (process.env.BASE_URL || DEFAULT_BASE).replace(/\/$/, '');

// Caminhos/dirs a ignorar
const IGNORE_DIRS = new Set(['assets', 'scripts', 'node_modules', '.git', '.github', 'meufinanceiro-sitemap']);

function walk(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      walk(full, acc);
    } else if (e.isFile()) {
      if (e.name.endsWith('.html')) {
        const rel = path.relative(ROOT, full).replace(/\\/g, '/');
        acc.push(rel);
      }
    }
  }
}

const pages = [];
walk(ROOT, pages);

function fmtDate(d) {
  // YYYY-MM-DD
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Ordena alfabeticamente
pages.sort((a, b) => a.localeCompare(b));

const urls = pages.map((p) => {
  const loc = `${BASE_URL}/${p}`;
  let lastmod = '';
  try {
    const st = fs.statSync(path.join(ROOT, p));
    lastmod = fmtDate(new Date(st.mtime));
  } catch {}
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    '    <changefreq>weekly</changefreq>',
    '    <priority>0.8</priority>',
    '  </url>'
  ].filter(Boolean).join('\n');
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

fs.writeFileSync(OUT, xml, 'utf8');
console.log('Sitemap gerado em', OUT, 'com BASE_URL =', BASE_URL);
