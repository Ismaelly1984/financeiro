import { emit } from './eventEmitter.js';
import { ICONS, EVENT_NAMES } from './config.js';

// =========================
// Referências DOM
// =========================
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

// =========================
// Helpers
// =========================
const moneyBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (n) => moneyBRL.format(Number.isFinite(n) ? n : 0);

export function getIconClass(categoria) {
  return ICONS[categoria] || "fa-folder";
}

// =========================
// Mensagens
// =========================
export function exibirMensagem(texto, tipo = 'info', duracao = 3000) {
  const mensagemDiv = document.getElementById('mensagem-app');
  if (!mensagemDiv) return;
  mensagemDiv.textContent = texto;
  mensagemDiv.setAttribute('role', 'status');
  mensagemDiv.setAttribute('aria-live', 'polite');
  mensagemDiv.className = `mensagem-app show ${tipo}`;
  window.setTimeout(() => {
    mensagemDiv.classList.remove('show', tipo);
  }, duracao);
}

// =========================
// Item de transação
// =========================
export function criarItemTransacao(t) {
  const li = document.createElement('li');
  li.classList.add('transacao-item', t.tipo, 'nova');
  li.dataset.id = t.id;
  li.tabIndex = 0;
  li.setAttribute('role', 'listitem');
  li.setAttribute('aria-label', `${t.descricao}, ${t.categoria}, ${t.data}, valor ${formatBRL(parseFloat(t.valor))}`);

  const info = document.createElement('div');
  info.className = 'transacao-info';

  const icon = document.createElement('i');
  icon.className = `fas ${getIconClass(t.categoria)}`;
  icon.setAttribute('aria-hidden', 'true');

  const desc = document.createElement('span');
  desc.className = 'descricao';
  desc.textContent = t.descricao ?? '';

  const dataCat = document.createElement('span');
  dataCat.className = 'data';
  dataCat.textContent = `${t.data} - ${t.categoria}`;

  info.append(icon, desc, dataCat);

  const valor = document.createElement('span');
  valor.className = 'valor';
  valor.textContent = formatBRL(parseFloat(t.valor));

  const actions = document.createElement('div');
  actions.className = 'transacao-actions';

  const btnEdit = document.createElement('button');
  btnEdit.className = 'edit-btn';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar transação');
  btnEdit.innerHTML = '<i class="fas fa-edit" aria-hidden="true"></i>';
  btnEdit.addEventListener('click', () => emit(EVENT_NAMES.EDIT_REQUESTED, t.id));

  const btnDelete = document.createElement('button');
  btnDelete.className = 'delete-btn';
  btnDelete.title = 'Excluir';
  btnDelete.setAttribute('aria-label', 'Excluir transação');
  btnDelete.innerHTML = '<i class="fas fa-trash-alt" aria-hidden="true"></i>';
  btnDelete.addEventListener('click', (e) => emit(EVENT_NAMES.DELETE_REQUESTED, { event: e, id: t.id }));

  actions.append(btnEdit, btnDelete);
  li.append(info, valor, actions);

  requestAnimationFrame(() => li.classList.add('show'));

  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); btnEdit.click(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); btnDelete.click(); }
  });

  return li;
}

// =========================
// Renderização e ordenação
// =========================
export function renderizarTransacoes(transacoes, filtroTipo, filtroCategoria, ordenarPor, ordemAscendente) {
  if (!lista) return;
  lista.setAttribute('role', 'list');
  lista.innerHTML = '';

  const arr = Array.isArray(transacoes) ? transacoes : Object.values(transacoes || {});
  const filtradas = filtrarEOrdenar(arr, filtroTipo, filtroCategoria, ordenarPor, ordemAscendente);

  if (filtradas.length === 0) {
    const vazio = document.createElement('li');
    vazio.className = 'transacao-item';
    vazio.setAttribute('role', 'listitem');
    vazio.style.justifyContent = 'center';
    vazio.textContent = 'Nenhuma transação encontrada.';
    lista.appendChild(vazio);
    return;
  }

  filtradas.forEach(t => lista.appendChild(criarItemTransacao(t)));
}

function filtrarEOrdenar(array, filtroTipo, filtroCategoria, ordenarPor, ordemAscendente) {
  const filtradas = (array || []).filter(t => {
    const tipoOK = (filtroTipo === 'todos') || (t.tipo === filtroTipo);
    const catOK = (filtroCategoria === 'todas') || (t.categoria === filtroCategoria);
    return tipoOK && catOK;
  });

  filtradas.sort((a, b) => {
    let valA, valB;
    switch (ordenarPor) {
      case 'valor':
        valA = parseFloat(a.valor) || 0;
        valB = parseFloat(b.valor) || 0;
        break;
      case 'descricao':
        valA = (a.descricao || '').toLowerCase();
        valB = (b.descricao || '').toLowerCase();
        break;
      case 'data':
      default:
        valA = new Date(a.data || 0).getTime();
        valB = new Date(b.data || 0).getTime();
        break;
    }
    if (valA < valB) return ordemAscendente ? -1 : 1;
    if (valA > valB) return ordemAscendente ? 1 : -1;
    return 0;
  });

  return filtradas;
}

// =========================
// Modais
// =========================
export function abrirModalEdicao(t) {
  if (!modalEditar) return;
  editIdInput.value = t.id;
  editDescricaoInput.value = t.descricao;
  editValorInput.value = t.valor;
  editTipoSelect.value = t.tipo;
  editCategoriaSelect.value = t.categoria;
  editDataInput.value = t.data;
  modalEditar.style.display = 'block';
  setTimeout(() => editDescricaoInput?.focus(), 0);
}

export function fecharModalEdicao() {
  if (!modalEditar) return;
  modalEditar.style.display = 'none';
}

export function prepararParaRemocao(e, onConfirm) {
  if (!modalConfirmacao) return;
  e.stopPropagation();
  modalConfirmacao.style.display = 'flex';

  // evita empilhar handlers
  confirmarExclusaoBtn.replaceWith(confirmarExclusaoBtn.cloneNode(true));
  cancelarExclusaoBtn.replaceWith(cancelarExclusaoBtn.cloneNode(true));

  const novoConfirmar = document.getElementById('confirmar-exclusao-btn');
  const novoCancelar = document.getElementById('cancelar-exclusao-btn');

  novoConfirmar.addEventListener('click', () => {
    onConfirm?.();
    modalConfirmacao.style.display = 'none';
  });
  novoCancelar.addEventListener('click', () => {
    modalConfirmacao.style.display = 'none';
  });
}