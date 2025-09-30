// src/index.js
import { generateSitemap } from './generator';
import config from './config/sitemap.config';

const init = () => {
    console.log('Iniciando o gerador de sitemap...');
    generateSitemap(config);
};

init();