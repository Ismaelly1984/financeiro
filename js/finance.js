// finance.js (refinado, compatível)
import { emit, on } from './eventEmitter.js';
import { EVENT_NAMES } from './config.js';
import { salvarTransacoes, carregarTransacoes } from './storage.js';

let transacoes = {};
let _initialized = false;

export function init() {
  if (_initialized) return;          // evita listeners duplicados
  transacoes = carregarTransacoes(); // objeto { [id]: transacao }

  on(EVENT_NAMES.TRANSACTION_ADDED, adicionarTransacao);
  on(EVENT_NAMES.TRANSACTION_UPDATED, atualizarTransacao);
  on(EVENT_NAMES.TRANSACTION_DELETED, removerTransacao);

  _initialized = true;
}

function persistirEAtualizar() {
  salvarTransacoes(transacoes);
  emit(EVENT_NAMES.DATA_UPDATED);
}

function normalizarTransacao(t) {
  // garante campos mínimos e tipos
  const id = Number(t.id);
  const valor = Number(t.valor);
  const descricao = String(t.descricao ?? '').trim();
  const tipo = t.tipo === 'receita' ? 'receita' : 'despesa';
  const categoria = String(t.categoria ?? 'outros');
  const data = String(t.data ?? '');

  if (!id || !descricao || !data || !Number.isFinite(valor)) return null;

  return { id, descricao, valor, tipo, categoria, data };
}

function adicionarTransacao(event) {
  const nova = normalizarTransacao(event.detail || {});
  if (!nova) return; // ignora payload inválido
  // evita sobrescrever se já existir (raro, mas protege)
  if (transacoes[nova.id]) {
    transacoes[nova.id] = { ...transacoes[nova.id], ...nova };
  } else {
    transacoes[nova.id] = nova;
  }
  persistirEAtualizar();
}

function atualizarTransacao(event) {
  const editada = normalizarTransacao(event.detail || {});
  if (!editada) return;
  if (transacoes[editada.id]) {
    transacoes[editada.id] = editada;
    persistirEAtualizar();
  }
}

function removerTransacao(event) {
  const id = Number(event.detail);
  if (!id) return;
  if (transacoes[id]) {
    delete transacoes[id];
    persistirEAtualizar();
  }
}

export function calcularSaldo() {
  let receitas = 0;
  let despesas = 0;
  for (const t of Object.values(transacoes)) {
    if (t.tipo === 'receita') receitas += Number(t.valor) || 0;
    else despesas += Number(t.valor) || 0;
  }
  const saldo = receitas - despesas;
  return { receitas, despesas, saldo };
}

// Getter público usado pelo app/dom/charts
export function getTransacoes() {
  return transacoes;
}
