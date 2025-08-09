import { emit, on } from './eventEmitter.js';
import { EVENT_NAMES } from './config.js';
import { salvarTransacoes, carregarTransacoes } from './storage.js';

export let transacoes = {};

export function init() {
    transacoes = carregarTransacoes();
    on(EVENT_NAMES.TRANSACTION_ADDED, adicionarTransacao);
    on(EVENT_NAMES.TRANSACTION_UPDATED, atualizarTransacao);
    on(EVENT_NAMES.TRANSACTION_DELETED, removerTransacao);
    emit(EVENT_NAMES.DATA_UPDATED);
}

function adicionarTransacao(event) {
    const nova = event.detail;
    transacoes[nova.id] = nova;
    salvarTransacoes(transacoes);
    emit(EVENT_NAMES.DATA_UPDATED);
}

function atualizarTransacao(event) {
    const editada = event.detail;
    if (transacoes[editada.id]) {
        transacoes[editada.id] = editada;
        salvarTransacoes(transacoes);
        emit(EVENT_NAMES.DATA_UPDATED);
    }
}

function removerTransacao(event) {
    const id = event.detail;
    if (transacoes[id]) {
        delete transacoes[id];
        salvarTransacoes(transacoes);
        emit(EVENT_NAMES.DATA_UPDATED);
    }
}

export function calcularSaldo() {
    let receitas = 0;
    let despesas = 0;
    Object.values(transacoes).forEach(t => {
        if (t.tipo === 'receita') receitas += parseFloat(t.valor);
        else despesas += parseFloat(t.valor);
    });
    const saldo = receitas - despesas;
    return { receitas, despesas, saldo };
}