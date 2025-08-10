// dom.js
import { emit } from './eventEmitter.js';
import { ICONS, EVENT_NAMES } from './config.js';

// Referências DOM
export const form = document.getElementById('form');
export const lista = document.getElementById('lista-transacoes');
export const saldoSpan = document.getElementById('saldo');
export const totalReceitasSpan = document.getElementById('total-receitas');
export const totalDespesasSpan = document.getElementById('total-despesas');
export const limiteInput = document.getElementById("limite");
export const barraProgresso = document.getElementById("barra-progresso");
export const gastoAtualSpan = document.getElementById("gasto-atual");
export const porcentagemGastoSpan = document.getElementById("porcentagem-gasto");
export const toggleTemaBtn = document.getElementById('toggle-tema');
export const modalEditar = document.getElementById('modal-editar');
export const formEditar = document.getElementById('form-editar');
export const editIdInput = document.getElementById('edit-id');
export const editDescricaoInput = document.getElementById('edit-descricao');
export const editValorInput = document.getElementById('edit-valor');
export const editTipoSelect = document.getElementById('edit-tipo');
export const editCategoriaSelect = document.getElementById('edit-categoria');
export const editDataInput = document.getElementById('edit-data');
export const modalConfirmacao = document.getElementById('modal-confirmacao');
export const confirmarExclusaoBtn = document.getElementById('confirmar-exclusao-btn');
export const cancelarExclusaoBtn = document.getElementById('cancelar-exclusao-btn');
export const filtroTipoSelect = document.getElementById('filtro-tipo');
export const filtroCategoriaSelect = document.getElementById('filtro-categoria');
export const ordenarPorSelect = document.getElementById('ordenar-por');
export const toggleOrdenacaoBtn = document.getElementById('toggle-ordenacao');
export const selectCategoriaOrcamento = document.getElementById('select-categoria-orcamento');
export const inputLimiteCategoria = document.getElementById('input-limite-categoria');
export const btnSalvarLimiteCategoria = document.getElementById('btn-salvar-limite-categoria');
export const listaOrcamentosCategorias = document.getElementById('lista-orcamentos-categorias');

// Funções de UI
export function exibirMensagem(texto, tipo = 'info', duracao = 3000) {
    const mensagemDiv = document.getElementById('mensagem-app');
    if (!mensagemDiv) return;
    mensagemDiv.textContent = texto;
    mensagemDiv.className = `mensagem-app show ${tipo}`;
    setTimeout(() => {
        mensagemDiv.classList.remove('show', tipo);
    }, duracao);
}

export function getIconClass(categoria) {
    return ICONS[categoria] || "fa-folder";
}

export function criarItemTransacao(t) {
    const li = document.createElement('li');
    li.classList.add('transacao-item', t.tipo, 'nova');
    li.dataset.id = t.id;

    li.innerHTML = `
      <div class="transacao-info">
        <i class="fas ${getIconClass(t.categoria)}"></i>
        <span class="descricao">${t.descricao}</span>
        <span class="data">${t.data} - ${t.categoria}</span>
      </div>
      <span class="valor">R$ ${parseFloat(t.valor).toFixed(2)}</span>
      <div class="transacao-actions">
        <button class="edit-btn"><i class="fas fa-edit"></i></button>
        <button class="delete-btn"><i class="fas fa-trash-alt"></i></button>
      </div>
    `;
    
    requestAnimationFrame(() => li.classList.add('show'));
    li.querySelector('.edit-btn').addEventListener('click', () => emit(EVENT_NAMES.EDIT_REQUESTED, t.id));
    li.querySelector('.delete-btn').addEventListener('click', (e) => emit(EVENT_NAMES.DELETE_REQUESTED, { event: e, id: t.id }));

    return li;
}

export function renderizarTransacoes(transacoes, filtroTipo, filtroCategoria, ordenarPor, ordemAscendente) {
    lista.innerHTML = '';
    const filtradas = filtrarEOrdenar(Object.values(transacoes), filtroTipo, filtroCategoria, ordenarPor, ordemAscendente);
    filtradas.forEach(t => lista.appendChild(criarItemTransacao(t)));
}

function filtrarEOrdenar(array, filtroTipo, filtroCategoria, ordenarPor, ordemAscendente) {
    let filtradas = array.filter(t => {
        const tipoOK = filtroTipo === 'todos' || t.tipo === filtroTipo;
        const catOK = filtroCategoria === 'todas' || t.categoria === filtroCategoria;
        return tipoOK && catOK;
    });
    filtradas.sort((a, b) => {
        let valA, valB;
        switch (ordenarPor) {
            case 'data':
                valA = new Date(a.data);
                valB = new Date(b.data);
                break;
            case 'valor':
                valA = parseFloat(a.valor);
                valB = parseFloat(b.valor);
                break;
            case 'descricao':
                valA = a.descricao.toLowerCase();
                valB = b.descricao.toLowerCase();
                break;
        }
        if (valA < valB) return ordemAscendente ? -1 : 1;
        if (valA > valB) return ordemAscendente ? 1 : -1;
        return 0;
    });
    return filtradas;
}

export function abrirModalEdicao(t) {
    editIdInput.value = t.id;
    editDescricaoInput.value = t.descricao;
    editValorInput.value = t.valor;
    editTipoSelect.value = t.tipo;
    editCategoriaSelect.value = t.categoria;
    editDataInput.value = t.data;
    modalEditar.style.display = 'block';
}

export function fecharModalEdicao() {
    modalEditar.style.display = 'none';
}

export function prepararParaRemocao(e, onConfirm) {
    e.stopPropagation();
    modalConfirmacao.style.display = 'flex';
    confirmarExclusaoBtn.onclick = onConfirm;
    cancelarExclusaoBtn.onclick = () => {
        modalConfirmacao.style.display = 'none';
    };
}