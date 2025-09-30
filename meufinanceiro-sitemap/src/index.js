// src/index.js
import { generateSitemap } from './generator.js';
import config from './config/sitemap.config.js';

const init = () => {
  console.log('Iniciando o gerador de sitemap...');
  try {
    const out = generateSitemap(config);
    console.log(`Sitemap gerado em: ${out}`);
  } catch (err) {
    console.error('Falha ao gerar sitemap:', err);
    process.exit(1);
  }
};

init();