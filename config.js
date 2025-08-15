/// config.js
// =========================
// Categorias / Ícones / Cores
// =========================
export const CATEGORIES = Object.freeze([
  'alimentacao',
  'transporte',
  'lazer',
  'saude',
  'educacao',
  'salario',
  'outros'
]);

// Rótulos amigáveis (usados em selects, listas, etc.)
export const CATEGORY_LABELS = Object.freeze({
  alimentacao: '🍽️ Alimentação',
  transporte:  '🚌 Transporte',
  lazer:       '🎮 Lazer',
  saude:       '🏥 Saúde',
  educacao:    '📚 Educação',
  salario:     '💰 Salário',
  outros:      '🧩 Outros'
});

export const ICONS = Object.freeze({
  alimentacao: 'fa-utensils',
  transporte:  'fa-bus',
  lazer:       'fa-gamepad',
  saude:       'fa-heartbeat',
  educacao:    'fa-book',
  salario:     'fa-money-bill-wave',
  outros:      'fa-ellipsis-h'
});

export const COLORS = Object.freeze({
  alimentacao: '#FF6384',
  transporte:  '#36A2EB',
  lazer:       '#FFCE56',
  saude:       '#4BC0C0',
  educacao:    '#9966FF',
  salario:     '#10B981', // cor para receitas/salário
  outros:      '#C9CBCF'
});

// =========================
// Eventos (Event Bus)
// =========================
export const EVENT_NAMES = Object.freeze({
  TRANSACTION_ADDED:   'transactionAdded',
  TRANSACTION_UPDATED: 'transactionUpdated',
  TRANSACTION_DELETED: 'transactionDeleted',
  DATA_UPDATED:        'dataUpdated',
  EDIT_REQUESTED:      'editRequested',
  DELETE_REQUESTED:    'deleteRequested',
  ORCAMENTOS_UPDATED:  'orcamentosUpdated'
});

// =========================
/* Helpers públicos */
// =========================
export function getColorFor(category) {
  return COLORS[category] || '#9CA3AF';
}

export function getIconFor(category) {
  return ICONS[category] || 'fa-folder';
}

export function getLabelFor(category) {
  // fallback capitalizado caso entre uma categoria desconhecida
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  const pretty = String(category || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase());
  return pretty || 'Categoria';
}

// Paleta na ordem das categorias recebidas (útil no charts.js)
export function buildPalette(categories = CATEGORIES) {
  return categories.map(c => getColorFor(c));
}

// =========================
// (Opcional) Chaves de Storage centralizadas
// Útil se quiser tipar/organizar no storage.js
// =========================
export const STORAGE_KEYS = Object.freeze({
  THEME:             'tema',
  FILTER_TYPE:       'filtroTipo',
  FILTER_CATEGORY:   'filtroCategoria',
  SORT_BY:           'ordenarPor',
  SORT_ASC:          'ordemAscendente',
  LIMIT_GASTO:       'limiteGasto',
  ORCAMENTOS_CAT:    'orcamentosPorCategoria',
  TRANSACOES:        'transacoes'
});

// (Opcional) Metadados do app
export const APP = Object.freeze({
  NAME: 'MeuFinanceiro',
  VERSION: '1.0.0'
});
