/// config.js
export const CATEGORIES = Object.freeze([
  'alimentacao',
  'transporte',
  'lazer',
  'saude',
  'educacao',
  'salario',
  'outros'
]);

export const ICONS = Object.freeze({
  alimentacao: 'fa-utensils',
  transporte: 'fa-bus',
  lazer: 'fa-gamepad',
  saude: 'fa-heartbeat',
  educacao: 'fa-book',
  salario: 'fa-money-bill-wave',
  outros: 'fa-ellipsis-h'
});

export const COLORS = Object.freeze({
  alimentacao: '#FF6384',
  transporte:  '#36A2EB',
  lazer:       '#FFCE56',
  saude:       '#4BC0C0',
  educacao:    '#9966FF',
  salario:     '#10B981', // opcional: cor p/ salário (antes não tinha)
  outros:      '#C9CBCF'
});

export const EVENT_NAMES = Object.freeze({
  TRANSACTION_ADDED:   'transactionAdded',
  TRANSACTION_UPDATED: 'transactionUpdated',
  TRANSACTION_DELETED: 'transactionDeleted',
  DATA_UPDATED:        'dataUpdated',
  EDIT_REQUESTED:      'editRequested',
  DELETE_REQUESTED:    'deleteRequested',
  ORCAMENTOS_UPDATED:  'orcamentosUpdated'
});

// Helper opcional: centraliza a cor por categoria
export function getColorFor(category) {
  return COLORS[category] || '#9CA3AF';
}
