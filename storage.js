// storage.js
export function carregarTransacoes() {
    const transacoesArray = JSON.parse(localStorage.getItem('transacoes')) || [];
    // Converte o array para um objeto para otimização
    return transacoesArray.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});
}

export function salvarTransacoes(transacoes) {
    // Converte o objeto de volta para um array para salvar no localStorage
    localStorage.setItem('transacoes', JSON.stringify(Object.values(transacoes)));
}

export function carregarLimiteGasto() {
    return parseFloat(localStorage.getItem("limiteGasto")) || 0;
}

export function salvarLimiteGasto(limite) {
    localStorage.setItem("limiteGasto", limite);
}

export function carregarOrcamentosPorCategoria() {
    return JSON.parse(localStorage.getItem('orcamentosPorCategoria')) || {};
}

export function salvarOrcamentosPorCategoria(orcamentos) {
    localStorage.setItem('orcamentosPorCategoria', JSON.stringify(orcamentos));
}