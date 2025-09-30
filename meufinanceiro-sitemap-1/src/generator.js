function generateSitemap(config) {
    const { baseUrl, urls, changeFrequency, priority } = config;
    let sitemapEntries = '';

    urls.forEach(url => {
        sitemapEntries += `
        <url>
            <loc>${baseUrl}${url}</loc>
            <changefreq>${changeFrequency}</changefreq>
            <priority>${priority}</priority>
        </url>`;
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap-image/1.1">
        ${sitemapEntries}
    </urlset>`;

    return sitemap.trim();
}

export { generateSitemap };