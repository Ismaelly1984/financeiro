// app.js (completo e corrigido)
import * as dom from './dom.js';
import * as storage from './storage.js';
import * as finance from './finance.js';
import * as charts from './charts.js';
import { on, emit } from './eventEmitter.js';
import { EVENT_NAMES } from './config.js';

let ordemAscendente = false;
let idParaExcluir = null;
let limiteGasto = 0;
let orcamentosPorCategoria = {};

function init() {
    // Inicializa os módulos da aplicação
    finance.init();
    charts.init();

    // Carrega dados do localStorage
    limiteGasto = storage.carregarLimiteGasto();
    orcamentosPorCategoria = storage.carregarOrcamentosPorCategoria();

    // Event Listeners para eventos do usuário
    dom.form.addEventListener('submit', handleAddTransaction);
    dom.formEditar.addEventListener('submit', handleEditTransaction);
    dom.limiteInput.addEventListener('change', handleSetLimit);
    dom.toggleTemaBtn.addEventListener('click', toggleTema);
    dom.filtroTipoSelect.addEventListener('change', updateUI);
    dom.filtroCategoriaSelect.addEventListener('change', updateUI);
    dom.ordenarPorSelect.addEventListener('change', updateUI);
    dom.toggleOrdenacaoBtn.addEventListener('click', toggleOrdenacao);
    dom.btnSalvarLimiteCategoria.addEventListener('click', handleSaveBudget);
    dom.cancelarExclusaoBtn.addEventListener('click', fecharModalConfirmacao);
    dom.confirmarExclusaoBtn.addEventListener('click', confirmDeleteTransaction);

    // Lógica do menu hambúrguer (corrigido)
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Event Listeners para eventos internos
    on(EVENT_NAMES.DATA_UPDATED, updateUI);
    on(EVENT_NAMES.EDIT_REQUESTED, handleEditRequest);
    on(EVENT_NAMES.DELETE_REQUESTED, handleDeleteRequest);
    on(EVENT_NAMES.ORCAMENTOS_UPDATED, updateBudgetsUI);

    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === dom.modalEditar) {
            dom.fecharModalEdicao();
        }
        if (e.target === dom.modalConfirmacao) {
            fecharModalConfirmacao();
        }
    });
}

function handleAddTransaction(e) {
    e.preventDefault();
    const descricao = dom.form.descricao.value.trim();
    const valor = parseFloat(dom.form.valor.value);
    const tipo = dom.form.tipo.value;
    const categoria = dom.form.categoria.value;
    const data = dom.form.data.value;

    if (!descricao || !valor || !data) {
        dom.exibirMensagem('Por favor, preencha todos os campos.', 'aviso');
        return;
    }

    const novaTransacao = {
        id: Date.now(),
        descricao,
        valor,
        tipo,
        categoria,
        data
    };

    emit(EVENT_NAMES.TRANSACTION_ADDED, novaTransacao);
    dom.form.reset();
    dom.exibirMensagem('Transação adicionada!', 'success');
}

function handleEditRequest(event) {
    const id = event.detail;
    const t = finance.transacoes[id];
    if (t) {
        dom.abrirModalEdicao(t);
    }
}

function handleEditTransaction(e) {
    e.preventDefault();
    const valor = parseFloat(dom.editValorInput.value);
    const data = dom.editDataInput.value;

    if (!dom.editDescricaoInput.value.trim() || !valor || !data) {
        dom.exibirMensagem('Por favor, preencha todos os campos.', 'aviso');
        return;
    }

    const transacaoEditada = {
        id: parseInt(dom.editIdInput.value),
        descricao: dom.editDescricaoInput.value.trim(),
        valor,
        tipo: dom.editTipoSelect.value,
        categoria: dom.editCategoriaSelect.value,
        data
    };

    emit(EVENT_NAMES.TRANSACTION_UPDATED, transacaoEditada);
    dom.fecharModalEdicao();
    dom.formEditar.reset();
    dom.exibirMensagem('Transação atualizada!', 'success');
}

function handleDeleteRequest(event) {
    const { event: clickEvent, id } = event.detail;
    clickEvent.stopPropagation();
    dom.prepararParaRemocao(clickEvent, () => emit(EVENT_NAMES.TRANSACTION_DELETED, id));
}

function confirmDeleteTransaction() {
    emit(EVENT_NAMES.TRANSACTION_DELETED, idParaExcluir);
    dom.fecharModalConfirmacao();
    dom.exibirMensagem('Transação excluída!', 'aviso');
    idParaExcluir = null;
}

function fecharModalConfirmacao() {
    dom.modalConfirmacao.style.display = 'none';
    idParaExcluir = null;
}

function handleSetLimit(e) {
    const novoLimite = parseFloat(e.target.value);
    if (novoLimite >= 0) {
        limiteGasto = novoLimite;
        storage.salvarLimiteGasto(limiteGasto);
        updateProgressBar();
        dom.exibirMensagem('Limite de gastos salvo!', 'success');
    } else {
        dom.exibirMensagem('O limite deve ser um número positivo.', 'aviso');
        dom.limiteInput.value = limiteGasto;
    }
}

function updateProgressBar() {
    const { despesas } = finance.calcularSaldo();
    const porcentagem = limiteGasto > 0 ? (despesas / limiteGasto) * 100 : 0;

    dom.gastoAtualSpan.textContent = despesas.toFixed(2);
    dom.porcentagemGastoSpan.textContent = porcentagem.toFixed(2);
    dom.barraProgresso.style.width = `${Math.min(porcentagem, 100)}%`;

    if (porcentagem > 100) {
        dom.barraProgresso.classList.add('estourou');
        dom.exibirMensagem('ATENÇÃO: Você excedeu o seu limite de gastos!', 'aviso', 5000);
    } else {
        dom.barraProgresso.classList.remove('estourou');
    }
}

function handleSaveBudget() {
    const categoria = dom.selectCategoriaOrcamento.value;
    const limite = parseFloat(dom.inputLimiteCategoria.value);

    if (categoria && limite > 0) {
        orcamentosPorCategoria[categoria] = limite;
        storage.salvarOrcamentosPorCategoria(orcamentosPorCategoria);
        dom.exibirMensagem(`Orçamento de R$${limite.toFixed(2)} para ${categoria} salvo!`, 'success');
        emit(EVENT_NAMES.ORCAMENTOS_UPDATED);
    } else {
        dom.exibirMensagem('Por favor, selecione uma categoria e insira um valor positivo.', 'aviso');
    }
}

function updateBudgetsUI() {
    dom.listaOrcamentosCategorias.innerHTML = '';
    const despesas = Object.values(finance.transacoes).filter(t => t.tipo === 'despesa');
    const gastosPorCategoria = despesas.reduce((acc, t) => {
        acc[t.categoria] = (acc[t.categoria] || 0) + parseFloat(t.valor);
        return acc;
    }, {});

    for (const categoria in orcamentosPorCategoria) {
        const limite = orcamentosPorCategoria[categoria];
        const gasto = gastosPorCategoria[categoria] || 0;
        const porcentagem = (gasto / limite) * 100;

        const orcamentoItem = document.createElement('div');
        orcamentoItem.classList.add('orcamento-item');
        orcamentoItem.innerHTML = `
            <div class="orcamento-header">
                <span><i class="fas ${dom.getIconClass(categoria)}"></i> ${categoria}</span>
                <span>R$ ${gasto.toFixed(2)} / R$ ${limite.toFixed(2)}</span>
            </div>
            <div class="orcamento-barra">
                <div class="progresso" style="width: ${Math.min(porcentagem, 100)}%;"></div>
            </div>
            <button class="remover-orcamento-btn" data-categoria="${categoria}"><i class="fas fa-trash-alt"></i> Remover</button>
        `;
        dom.listaOrcamentosCategorias.appendChild(orcamentoItem);
    }

    document.querySelectorAll('.remover-orcamento-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoria = e.currentTarget.dataset.categoria;
            delete orcamentosPorCategoria[categoria];
            storage.salvarOrcamentosPorCategoria(orcamentosPorCategoria);
            dom.exibirMensagem(`Orçamento de ${categoria} removido.`, 'aviso');
            emit(EVENT_NAMES.ORCAMENTOS_UPDATED);
        });
    });
}

function toggleOrdenacao() {
    ordemAscendente = !ordemAscendente;
    dom.toggleOrdenacaoBtn.innerHTML = ordemAscendente ? '<i class="fas fa-sort-up"></i>' : '<i class="fas fa-sort-down"></i>';
    updateUI();
}

function toggleTema() {
    document.documentElement.classList.toggle('light');
    const temaAtual = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    localStorage.setItem('tema', temaAtual);
    const icon = dom.toggleTemaBtn.querySelector('i');
    if (temaAtual === 'light') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

function updateUI() {
    dom.renderizarTransacoes(finance.transacoes, dom.filtroTipoSelect.value, dom.filtroCategoriaSelect.value, dom.ordenarPorSelect.value, ordemAscendente);
    const { receitas, despesas, saldo } = finance.calcularSaldo();
    dom.totalReceitasSpan.textContent = receitas.toFixed(2);
    dom.totalDespesasSpan.textContent = despesas.toFixed(2);
    dom.saldoSpan.textContent = saldo.toFixed(2);
    dom.saldoSpan.classList.toggle('negativo', saldo < 0);
    updateProgressBar();
    updateBudgetsUI();
}


window.addEventListener('load', () => {
    // Aplica o tema salvo no carregamento da página
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo === 'light') {
        document.documentElement.classList.add('light');
        const icon = dom.toggleTemaBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    
    // Inicia a aplicação
    init();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado com sucesso:', registration);
            })
            .catch(error => {
                console.log('Falha no registro do Service Worker:', error);
            });
    }
});