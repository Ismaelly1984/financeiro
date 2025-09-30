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
      path: '/help.html',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ],
};

export default sitemapConfig;