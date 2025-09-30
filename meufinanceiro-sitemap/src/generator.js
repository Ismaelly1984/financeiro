import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function generateSitemap(config, outputFilePath) {
  const baseUrl = (config.baseUrl || '').replace(/\/$/, '');
  const pages = config.pages || [];

  const entries = pages.map(p => {
    const loc = `${baseUrl}${p.path}`;
    const lastmod = formatDate(p.lastModified);
    const changefreq = p.changeFrequency || 'monthly';
    const priority = (p.priority != null) ? Number(p.priority).toFixed(1) : '0.5';

    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>'
    ].join('\n');
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Sitemap gerado automaticamente -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries}\n` +
    `</urlset>\n`;

  // Default: escreve em ../sitemap.xml (uma pasta acima de src)
  const outPath = outputFilePath || path.resolve(__dirname, '..', 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');

  return outPath;
}

export default generateSitemap;
export { generateSitemap };