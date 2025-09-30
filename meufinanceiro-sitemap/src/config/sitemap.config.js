const sitemapConfig = {
  baseUrl: 'https://meufinanceiro.com',
  pages: [
    {
      path: '/',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      path: '/index.html',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      path: '/transacoes.html',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      path: '/graficos.html',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      path: '/relatorios.html',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      path: '/pages/help.html',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      path: '/offline.html',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ],
};

export default sitemapConfig;