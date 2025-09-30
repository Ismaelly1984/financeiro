const { generateSitemap } = require('../src/generator');
const sitemapConfig = require('../src/config/sitemap.config');

describe('generateSitemap', () => {
  it('should generate a valid sitemap with given URLs', () => {
    const urls = [
      { url: 'https://meufinanceiro.com/home', changefreq: 'daily', priority: 1.0 },
      { url: 'https://meufinanceiro.com/about', changefreq: 'monthly', priority: 0.8 },
    ];
    const sitemap = generateSitemap({ ...sitemapConfig, urls });
    expect(sitemap).toContain('<url>');
    expect(sitemap).toContain('<loc>https://meufinanceiro.com/home</loc>');
    expect(sitemap).toContain('<changefreq>daily</changefreq>');
    expect(sitemap).toContain('<priority>1.0</priority>');
  });

  it('should handle empty URL list', () => {
    const sitemap = generateSitemap({ ...sitemapConfig, urls: [] });
    expect(sitemap).toContain('<urlset');
    expect(sitemap).toContain('</urlset>');
  });

  it('should throw an error if no URLs are provided', () => {
    expect(() => generateSitemap({ ...sitemapConfig })).toThrow('No URLs provided for sitemap generation');
  });
});