#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'assets', 'components');

async function readComponent(name) {
  const p = path.join(COMPONENTS_DIR, name);
  try {
    return await fs.readFile(p, 'utf8');
  } catch (err) {
    console.error(`Erro ao ler componente ${name}:`, err.message);
    return null;
  }
}

async function walk(dir, fileList = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip component folder to avoid recursion
      if (path.resolve(full) === path.resolve(COMPONENTS_DIR)) continue;
      // skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      await walk(full, fileList);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      fileList.push(full);
    }
  }
  return fileList;
}

async function replaceBlocks(filePath, navbarHtml, footerHtml) {
  let content = await fs.readFile(filePath, 'utf8');
  const original = content;

  const navRegex = /<nav\b[^>]*class=(?:"|')([^"']*\bnavbar\b[^"']*)(?:"|')[\s\S]*?<\/nav>/i;
  const footerRegex = /<footer\b[^>]*class=(?:"|')([^"']*\bfooter\b[^"']*)(?:"|')[\s\S]*?<\/footer>/i;

  if (navRegex.test(content)) {
    content = content.replace(navRegex, navbarHtml.trim());
  }
  if (footerRegex.test(content)) {
    content = content.replace(footerRegex, footerHtml.trim());
  }

  if (content !== original) {
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  }
  return false;
}

(async () => {
  try {
    const navbarHtml = await readComponent('navbar.html');
    const footerHtml = await readComponent('footer.html');
    if (!navbarHtml || !footerHtml) {
      console.error('Componentes não encontrados em assets/components. Abortando.');
      process.exit(2);
    }

    const files = await walk(ROOT);
    // Only process top-level HTML and pages/*.html (exclude assets and scripts)
    const candidates = files.filter(f => {
      const rel = path.relative(ROOT, f);
      if (rel.startsWith('assets' + path.sep)) return false;
      if (rel.startsWith('scripts' + path.sep)) return false;
      if (rel.startsWith('.github' + path.sep)) return false;
      return true;
    });

    let changed = 0;
    for (const file of candidates) {
      const ok = await replaceBlocks(file, navbarHtml, footerHtml);
      if (ok) {
        console.log('Atualizado:', path.relative(ROOT, file));
        changed++;
      }
    }

    console.log(`Inclusão de componentes finalizada. Arquivos atualizados: ${changed}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
})();
