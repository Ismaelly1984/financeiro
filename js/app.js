// app.js (multi-páginas: robusto, unificado e idempotente)
import * as dom from './dom.js';
import * as storage from './storage.js';
import * as finance from './finance.js';
import * as charts from './charts.js';
import { on, emit } from './eventEmitter.js';
import { EVENT_NAMES, getLabelFor, getColorFor } from './config.js';

let ordemAscendente = JSON.parse(localStorage.getItem('ordemAscendente') ?? 'false');
let idParaExcluir = null;
let limiteGasto = 0;
let orcamentosPorCategoria = {};

// Alertas (limite geral e por categoria)
const ALERT_THRESHOLDS = { warn: 0.8, exceed: 1.0 }; // 80% e 100%
let _alertState = { geral: null, categorias: {} };

const has = (sel) => !!document.querySelector(sel);

/* =========================
   Helpers robustos
   ========================= */
function parseBRFloat(v) {
  if (v == null) return NaN;
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
}
function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}
// Comparação de datas "YYYY-MM-DD" sem surpresas de fuso/UTC
function isoWithin(dateStr, startStr, endStr) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  const okStart = startStr ? (d >= startStr.slice(0, 10)) : true;
  const okEnd = endStr ? (d <= endStr.slice(0, 10)) : true;
  return okStart && okEnd;
}
function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function chartColors() {
  return {
    text: getCssVar('--cor-texto') || '#fff',
    grid: 'rgba(148,163,184,0.15)',
    primary: getCssVar('--cor-primaria') || '#3B82F6',
    success: getCssVar('--cor-sucesso') || '#10B981',
    danger: getCssVar('--cor-aviso') || '#EF4444',
  };
}
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/* =========================
   Boot
   ========================= */
function init() {
  // Core (sempre seguro)
  finance.init();

  // Charts só quando houver canvas relevante
  const hasCharts =
    has('#graficoPizza') || has('#graficoLinha') ||
    has('#rel-grafico-linha') || has('#rel-grafico-pizza');
  if (hasCharts && typeof charts.init === 'function') charts.init();

  // Estado salvo
  limiteGasto = storage.carregarLimiteGasto();
  orcamentosPorCategoria = storage.carregarOrcamentosPorCategoria();
  restaurarPreferenciasUI();

  // Listeners — UI principal (com guards por página)
  if (dom.form) dom.form.addEventListener('submit', handleAddTransaction);
  if (dom.formEditar) dom.formEditar.addEventListener('submit', handleEditTransaction);
  if (dom.limiteInput) dom.limiteInput.addEventListener('change', handleSetLimit);
  if (dom.toggleTemaBtn) dom.toggleTemaBtn.addEventListener('click', toggleTema);

  if (dom.filtroTipoSelect) dom.filtroTipoSelect.addEventListener('change', () => { salvarPreferenciasUI(); updateUI(); });
  if (dom.filtroCategoriaSelect) dom.filtroCategoriaSelect.addEventListener('change', () => { salvarPreferenciasUI(); updateUI(); });
  if (dom.ordenarPorSelect) dom.ordenarPorSelect.addEventListener('change', () => { salvarPreferenciasUI(); updateUI(); });
  if (dom.toggleOrdenacaoBtn) dom.toggleOrdenacaoBtn.addEventListener('click', () => { toggleOrdenacao(); salvarPreferenciasUI(); });

  // Orçamento por categoria
  if (dom.btnSalvarLimiteCategoria) dom.btnSalvarLimiteCategoria.addEventListener('click', handleSaveBudget);

  // Exportar CSV (todas transações)
  document.getElementById('btn-exportar')?.addEventListener('click', exportarCSV);

  // -------------------------
  // Relatórios — somente se os controles existirem
  // -------------------------
  const relOn = has('#rel-agrup') || has('#rel-gerar') || has('#rel-grafico-linha') || has('#rel-grafico-pizza');

  if (relOn) {
    document.getElementById('rel-gerar')?.addEventListener('click', gerarRelatorio);
    document.getElementById('rel-exportar')?.addEventListener('click', exportarRelatorioCSV);
    document.getElementById('rel-imprimir')?.addEventListener('click', () => window.print());
    document.getElementById('rel-inicio')?.addEventListener('change', gerarRelatorio);
    document.getElementById('rel-fim')?.addEventListener('change', gerarRelatorio);

    document.getElementById('rel-preset-mes')?.addEventListener('click', () => {
      const { inicio, fim } = rangePreset('mes');
      const iniEl = document.getElementById('rel-inicio');
      const fimEl = document.getElementById('rel-fim');
      if (iniEl) iniEl.value = inicio;
      if (fimEl) fimEl.value = fim;
      gerarRelatorio();
    });

    document.getElementById('rel-preset-30')?.addEventListener('click', () => {
      const { inicio, fim } = rangePreset('30');
      const iniEl = document.getElementById('rel-inicio');
      const fimEl = document.getElementById('rel-fim');
      if (iniEl) iniEl.value = inicio;
      if (fimEl) fimEl.value = fim;
      gerarRelatorio();
    });

    document.getElementById('rel-inc-receitas')?.addEventListener('change', gerarRelatorio);
    document.getElementById('rel-inc-despesas')?.addEventListener('change', gerarRelatorio);
    document.getElementById('rel-agrup')?.addEventListener('change', gerarRelatorio);
  }

  // Modal edição — fechar/cancelar
  document.getElementById('modal-editar-close')?.addEventListener('click', () => dom.fecharModalEdicao?.());
  document.getElementById('editar-cancelar-btn')?.addEventListener('click', () => dom.fecharModalEdicao?.());

  // FAB ajuda — limpa modais antes de sair
  const fabAjuda = document.getElementById('btn-ajuda-flutuante');
  if (fabAjuda) {
    fabAjuda.addEventListener('click', () => {
      if (dom.modalEditar?.style.display === 'block') dom.fecharModalEdicao?.();
    });
  }

  // Menu mobile
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('active'));
  }

  // Marcar link ativo (nav + footer)
  dom.marcarNavAtiva?.();

  // Eventos internos (event bus)
  on(EVENT_NAMES.DATA_UPDATED, updateUI);
  on(EVENT_NAMES.EDIT_REQUESTED, handleEditRequest);
  on(EVENT_NAMES.DELETE_REQUESTED, handleDeleteRequest);
  on(EVENT_NAMES.ORCAMENTOS_UPDATED, updateBudgetsUI);

  // Fechar modais clicando fora
  window.addEventListener('click', (e) => {
    if (e.target === dom.modalEditar) dom.fecharModalEdicao?.();
    if (e.target === dom.modalConfirmacao) fecharModalConfirmacao();
  });

  // Listas grandes — escolhe automaticamente o modo:
  // 1) Caixa rolável (#caixa-transacoes) -> 10 por vez
  // 2) Scroll infinito de página (#filtro-mes) -> 20 por vez
  if (document.getElementById('caixa-transacoes')) {
    initTransacoesEmCaixa();
  } else if (document.getElementById('filtro-mes')) {
    initInfiniteScrollModule();
  }

  // Render inicial
  emit(EVENT_NAMES.DATA_UPDATED);

  // Gera relatório inicial (se estiver na página de relatórios)
  if (relOn) gerarRelatorio();

  // Service Worker (path inteligente para raiz ou /financeiro/)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      let serviceWorkerPath = '/service-worker.js';
      if (window.location.pathname.includes('/financeiro/')) {
        serviceWorkerPath = '/financeiro/service-worker.js';
      }
      navigator.serviceWorker.register(serviceWorkerPath)
        .then(reg => console.log('✅ SW registrado:', reg.scope))
        .catch(err => console.error('❌ Erro ao registrar SW:', err));
    });
  }
}

/* =========================
   Preferências UI (tema/filtros/ordem)
   ========================= */
function restaurarPreferenciasUI() {
  const temaSalvo = localStorage.getItem('tema');
  if (temaSalvo === 'light') {
    document.documentElement.classList.add('light');
    const icon = dom.toggleTemaBtn?.querySelector('i');
    if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
  }
  const filtroTipo = localStorage.getItem('filtroTipo');
  const filtroCategoria = localStorage.getItem('filtroCategoria');
  const ordenarPor = localStorage.getItem('ordenarPor');
  if (filtroTipo && dom.filtroTipoSelect) dom.filtroTipoSelect.value = filtroTipo;
  if (filtroCategoria && dom.filtroCategoriaSelect) dom.filtroCategoriaSelect.value = filtroCategoria;
  if (ordenarPor && dom.ordenarPorSelect) dom.ordenarPorSelect.value = ordenarPor;
  if (dom.toggleOrdenacaoBtn) {
    dom.toggleOrdenacaoBtn.innerHTML = ordemAscendente ? '<i class="fas fa-sort-up"></i>' : '<i class="fas fa-sort-down"></i>';
  }
}

function salvarPreferenciasUI() {
  if (dom.filtroTipoSelect) localStorage.setItem('filtroTipo', dom.filtroTipoSelect.value);
  if (dom.filtroCategoriaSelect) localStorage.setItem('filtroCategoria', dom.filtroCategoriaSelect.value);
  if (dom.ordenarPorSelect) localStorage.setItem('ordenarPor', dom.ordenarPorSelect.value);
  localStorage.setItem('ordemAscendente', JSON.stringify(ordemAscendente));
}

/* =========================
   Handlers CRUD
   ========================= */
function handleAddTransaction(e) {
  e.preventDefault();
  const descricao = dom.form.descricao.value.trim();
  const valor = parseBRFloat(dom.form.valor.value);
  const tipo = dom.form.tipo.value;
  const categoria = dom.form.categoria.value;
  const data = dom.form.data.value; // "YYYY-MM-DD"

  if (!descricao || !isFiniteNumber(valor) || !data) {
    dom.exibirMensagem?.('Por favor, preencha todos os campos com valores válidos.', 'aviso');
    return;
  }

  const novaTransacao = { id: Date.now(), descricao, valor, tipo, categoria, data };
  emit(EVENT_NAMES.TRANSACTION_ADDED, novaTransacao);
  dom.form.reset();
  dom.exibirMensagem?.('Transação adicionada!', 'success');
}

function handleEditRequest(event) {
  const id = event.detail;
  const t = finance.getTransacoes()[id];
  if (t) dom.abrirModalEdicao?.(t);
}

function handleEditTransaction(e) {
  e.preventDefault();
  const valor = parseBRFloat(dom.editValorInput.value);
  const data = dom.editDataInput.value;

  if (!dom.editDescricaoInput.value.trim() || !isFiniteNumber(valor) || !data) {
    dom.exibirMensagem?.('Por favor, preencha todos os campos com valores válidos.', 'aviso');
    return;
  }

  const transacaoEditada = {
    id: parseInt(dom.editIdInput.value, 10),
    descricao: dom.editDescricaoInput.value.trim(),
    valor,
    tipo: dom.editTipoSelect.value,
    categoria: dom.editCategoriaSelect.value,
    data
  };

  emit(EVENT_NAMES.TRANSACTION_UPDATED, transacaoEditada);
  dom.fecharModalEdicao?.();
  dom.formEditar?.reset();
  dom.exibirMensagem?.('Transação atualizada!', 'success');
}

function handleDeleteRequest(event) {
  const { event: clickEvent, id } = event.detail;
  clickEvent.stopPropagation();
  idParaExcluir = id;
  dom.prepararParaRemocao?.(clickEvent, confirmDeleteTransaction);
}

function confirmDeleteTransaction() {
  if (idParaExcluir != null) {
    emit(EVENT_NAMES.TRANSACTION_DELETED, idParaExcluir);
    dom.exibirMensagem?.('Transação excluída!', 'aviso');
  }
  fecharModalConfirmacao();
  idParaExcluir = null;
}

function fecharModalConfirmacao() {
  if (dom.modalConfirmacao) dom.modalConfirmacao.style.display = 'none';
  idParaExcluir = null;
}

/* =========================
   Limite geral
   ========================= */
function handleSetLimit(e) {
  const novoLimite = parseBRFloat(e.target.value);
  if (isFiniteNumber(novoLimite) && novoLimite >= 0) {
    limiteGasto = novoLimite;
    storage.salvarLimiteGasto(limiteGasto);
    updateProgressBar();
    dom.exibirMensagem?.('Limite de gastos salvo!', 'success');
  } else {
    dom.exibirMensagem?.('O limite deve ser um número positivo.', 'aviso');
    if (dom.limiteInput) dom.limiteInput.value = limiteGasto;
  }
}

function updateProgressBar() {
  if (!dom.barraProgresso || !dom.gastoAtualSpan || !dom.porcentagemGastoSpan) return;

  const { despesas } = finance.calcularSaldo();
  const ratio = limiteGasto > 0 ? (despesas / limiteGasto) : 0;
  const porcentagem = ratio * 100;

  dom.gastoAtualSpan.textContent = dom.formatBRL?.(despesas) ?? despesas.toFixed(2);
  dom.porcentagemGastoSpan.textContent = porcentagem.toFixed(2);
  dom.barraProgresso.style.width = `${Math.min(porcentagem, 100)}%`;
  dom.barraProgresso.setAttribute('aria-valuenow', Math.min(porcentagem, 100).toFixed(0));

  if (limiteGasto > 0) {
    if (ratio >= ALERT_THRESHOLDS.exceed && _alertState.geral !== 'exceed') {
      _alertState.geral = 'exceed';
      dom.exibirMensagem?.('ATENÇÃO: Você excedeu o seu limite de gastos!', 'aviso', 5000);
      navigator.vibrate?.(200);
    } else if (ratio >= ALERT_THRESHOLDS.warn && _alertState.geral !== 'warn' && _alertState.geral !== 'exceed') {
      _alertState.geral = 'warn';
      dom.exibirMensagem?.('Atenção: 80% do limite de gastos atingido.', 'info', 4000);
      navigator.vibrate?.([60, 40, 60]);
    } else if (ratio < ALERT_THRESHOLDS.warn) {
      _alertState.geral = null;
    }
  }

  dom.barraProgresso.classList.toggle('estourou', ratio >= ALERT_THRESHOLDS.exceed);
}

/* =========================
   Orçamentos por categoria
   ========================= */
function handleSaveBudget() {
  const categoria = dom.selectCategoriaOrcamento?.value;
  const limite = parseBRFloat(dom.inputLimiteCategoria?.value);

  if (categoria && isFiniteNumber(limite) && limite > 0) {
    orcamentosPorCategoria[categoria] = limite;
    storage.salvarOrcamentosPorCategoria(orcamentosPorCategoria);
    dom.exibirMensagem?.(`Orçamento de ${dom.formatBRL?.(limite) ?? limite} para ${getLabelFor(categoria)} salvo!`, 'success');
    emit(EVENT_NAMES.ORCAMENTOS_UPDATED);
  } else {
    dom.exibirMensagem?.('Por favor, selecione uma categoria e insira um valor positivo.', 'aviso');
  }
}

function updateBudgetsUI() {
  if (!dom.listaOrcamentosCategorias) return;

  dom.listaOrcamentosCategorias.innerHTML = '';

  const despesas = Object.values(finance.getTransacoes()).filter(t => t.tipo === 'despesa');
  const gastosPorCategoria = despesas.reduce((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + parseFloat(t.valor);
    return acc;
  }, {});

  for (const categoria in orcamentosPorCategoria) {
    const limite = orcamentosPorCategoria[categoria];
    const gasto = gastosPorCategoria[categoria] || 0;
    const ratio = limite > 0 ? (gasto / limite) : 0;
    const porcentagem = ratio * 100;

    const item = document.createElement('div');
    item.classList.add('orcamento-item');
    item.innerHTML = `
      <div class="orcamento-header">
        <span><i class="fas ${dom.getIconClass?.(categoria) ?? 'fa-tag'}"></i> ${getLabelFor(categoria)}</span>
        <span>${dom.formatBRL?.(gasto) ?? gasto.toFixed(2)} / ${dom.formatBRL?.(limite) ?? limite.toFixed(2)}</span>
      </div>
      <div class="orcamento-barra">
        <div class="progresso" style="width: ${Math.min(porcentagem, 100)}%;"></div>
      </div>
      <button class="remover-orcamento-btn" data-categoria="${categoria}">
        <i class="fas fa-trash-alt"></i> Remover
      </button>
    `;
    dom.listaOrcamentosCategorias.appendChild(item);

    // Alertas por categoria
    const prev = _alertState.categorias[categoria] || null;
    if (limite > 0) {
      if (ratio >= ALERT_THRESHOLDS.exceed && prev !== 'exceed') {
        _alertState.categorias[categoria] = 'exceed';
        dom.exibirMensagem?.(`Excedeu o orçamento de ${getLabelFor(categoria)}.`, 'aviso', 5000);
        navigator.vibrate?.(200);
      } else if (ratio >= ALERT_THRESHOLDS.warn && prev !== 'warn' && prev !== 'exceed') {
        _alertState.categorias[categoria] = 'warn';
        dom.exibirMensagem?.(`Atingiu 80% do orçamento de ${getLabelFor(categoria)}.`, 'info', 4000);
        navigator.vibrate?.([60, 40, 60]);
      } else if (ratio < ALERT_THRESHOLDS.warn) {
        _alertState.categorias[categoria] = null;
      }
    }
  }

  // Remoção de orçamento
  document.querySelectorAll('.remover-orcamento-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const categoria = e.currentTarget.dataset.categoria;
      delete orcamentosPorCategoria[categoria];
      storage.salvarOrcamentosPorCategoria(orcamentosPorCategoria);
      dom.exibirMensagem?.(`Orçamento de ${getLabelFor(categoria)} removido.`, 'aviso');
      emit(EVENT_NAMES.ORCAMENTOS_UPDATED);
    });
  });
}

/* =========================
   Tema / Ordenação / UI
   ========================= */
function toggleOrdenacao() {
  ordemAscendente = !ordemAscendente;
  if (dom.toggleOrdenacaoBtn) {
    dom.toggleOrdenacaoBtn.innerHTML = ordemAscendente ? '<i class="fas fa-sort-up"></i>' : '<i class="fas fa-sort-down"></i>';
  }
  updateUI();
}

function toggleTema() {
  document.documentElement.classList.toggle('light');
  const temaAtual = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  localStorage.setItem('tema', temaAtual);
  const icon = dom.toggleTemaBtn?.querySelector('i');
  if (icon) {
    if (temaAtual === 'light') { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
    else { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
  }
  if (typeof charts.reapplyChartTheme === 'function') charts.reapplyChartTheme();
}

function updateUI() {
  const transacoesAtuais = finance.getTransacoes();

  const usaCaixa = !!document.getElementById('caixa-transacoes');
  const usaInfScroll = !!document.getElementById('filtro-mes');

  // Se estiver usando lista incremental, não renderiza a lista padrão
  if (!usaCaixa && !usaInfScroll && dom.renderizarTransacoes && dom.ordenarPorSelect && dom.filtroTipoSelect && dom.filtroCategoriaSelect) {
    dom.renderizarTransacoes(
      transacoesAtuais,
      dom.filtroTipoSelect.value,
      dom.filtroCategoriaSelect.value,
      dom.ordenarPorSelect.value,
      ordemAscendente
    );
  }

  const saldo = finance.calcularSaldo();
  if (dom.totalReceitasSpan) dom.totalReceitasSpan.textContent = dom.formatBRL?.(saldo.receitas) ?? saldo.receitas.toFixed(2);
  if (dom.totalDespesasSpan) dom.totalDespesasSpan.textContent = dom.formatBRL?.(saldo.despesas) ?? saldo.despesas.toFixed(2);
  if (dom.saldoSpan) {
    dom.saldoSpan.textContent = dom.formatBRL?.(saldo.saldo) ?? saldo.saldo.toFixed(2);
    dom.saldoSpan.classList.toggle('negativo', saldo.saldo < 0);
  }

  updateProgressBar();
  updateBudgetsUI();

  // Notifica módulos incrementais
  if (usaInfScroll && typeof window.__mfInfScrollRefresh === 'function') {
    window.__mfInfScrollRefresh();
  }
}

/* =========================
   Exportações (CSV)
   ========================= */
function exportarCSV() {
  const transacoes = finance.getTransacoes();
  const linhas = [["Descrição", "Valor", "Tipo", "Categoria", "Data"]];
  Object.values(transacoes).forEach(t => {
    linhas.push([t.descricao, String(t.valor).replace(',', '.'), t.tipo, t.categoria, t.data]);
  });
  const csv = linhas.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }); // BOM para Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transacoes_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  dom.exibirMensagem?.('CSV exportado com sucesso!', 'success');
}

/* =========================
   Relatórios
   ========================= */
let relChartLine = null;
let relChartPie = null;

function rangePreset(preset) {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (preset === 'mes') {
    const ini = new Date(today.getFullYear(), today.getMonth(), 1);
    const fim = new Date(today.getFullYear(), today.getMonth() + 1);
    const end = new Date(fim - 1);
    return { inicio: toStr(ini), fim: toStr(end) };
  }
  if (preset === '30') {
    const ini = new Date(today);
    ini.setDate(ini.getDate() - 30);
    return { inicio: toStr(ini), fim: toStr(today) };
  }
  return { inicio: '', fim: '' };
}

function agrupar(chave, agrup) {
  if (agrup === 'dia') return (chave || '').slice(0, 10); // YYYY-MM-DD
  return (chave || '').slice(0, 7); // YYYY-MM
}

function filtrarPorDataETipo(transacoes, inicio, fim, incReceitas, incDespesas) {
  const arr = Object.values(transacoes);
  return arr.filter(t => {
    if (!t?.data) return false;
    if (!isoWithin(t.data, inicio, fim)) return false;
    if (t.tipo === 'receita' && !incReceitas) return false;
    if (t.tipo === 'despesa' && !incDespesas) return false;
    return true;
  });
}

function renderOrReplaceChart(ctx, config, refName) {
  if (!ctx || !window.Chart) return null;
  if (refName.current) refName.current.destroy();
  refName.current = new Chart(ctx, config);
  return refName.current;
}

function gerarRelatorio() {
  if (!has('#rel-resumo') && !has('#rel-grafico-linha') && !has('#rel-grafico-pizza')) return;

  const inicio = document.getElementById('rel-inicio')?.value;
  const fim = document.getElementById('rel-fim')?.value;
  const incReceitas = document.getElementById('rel-inc-receitas')?.checked ?? true;
  const incDespesas = document.getElementById('rel-inc-despesas')?.checked ?? true;
  const agrup = document.getElementById('rel-agrup')?.value || 'mes';

  const ts = finance.getTransacoes();
  const filtradas = filtrarPorDataETipo(ts, inicio, fim, incReceitas, incDespesas);
  const temDados = filtradas.length > 0;

  // KPIs + categorias (para despesas)
  let receitas = 0, despesas = 0;
  const porCategoria = {};
  filtradas.forEach(t => {
    const v = parseFloat(t.valor) || 0;
    if (t.tipo === 'receita') receitas += v;
    else {
      despesas += v;
      porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + v;
    }
  });
  const saldo = receitas - despesas;

  // Resumo
  const resumoEl = document.getElementById('rel-resumo');
  if (resumoEl) {
    resumoEl.innerHTML = `
      <p><strong>Período:</strong> ${inicio || 'início'} → ${fim || 'hoje'}</p>
      <p><strong>Receitas:</strong> ${dom.formatBRL?.(receitas) ?? receitas.toFixed(2)}</p>
      <p><strong>Despesas:</strong> ${dom.formatBRL?.(despesas) ?? despesas.toFixed(2)}</p>
      <p><strong>Saldo:</strong> ${dom.formatBRL?.(saldo) ?? saldo.toFixed(2)}</p>
      <p><small>${filtradas.length} transações no período</small></p>
    `;
  }

  // Top categorias
  const topEl = document.getElementById('rel-top-categorias');
  if (topEl) {
    const pares = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 5);
    topEl.innerHTML = pares.length
      ? pares.map(([cat, val]) => `<li>${getLabelFor(cat)}: <strong>${dom.formatBRL?.(val) ?? val.toFixed(2)}</strong></li>`).join('')
      : '<li>Nenhuma despesa no período.</li>';
  }

  // Série temporal (linha): receitas, despesas e saldo acumulado
  const series = {};
  filtradas.forEach(t => {
    const key = agrupar(t.data || '', agrup);
    series[key] = series[key] || { receita: 0, despesa: 0 };
    if (t.tipo === 'receita') series[key].receita += (+t.valor || 0);
    else series[key].despesa += (+t.valor || 0);
  });
  const labels = Object.keys(series).sort();
  const dadosReceita = labels.map(k => series[k].receita);
  const dadosDespesa = labels.map(k => series[k].despesa);
  let acumulado = 0;
  const saldoAcum = labels.map((k, i) => {
    acumulado += (dadosReceita[i] - dadosDespesa[i]);
    return acumulado;
  });

  const ct = chartColors();
  const linhaCtx = document.getElementById('rel-grafico-linha')?.getContext('2d');
  renderOrReplaceChart(linhaCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Receitas',
          data: dadosReceita,
          borderColor: ct.success,
          backgroundColor: ct.success + '33',
          fill: true,
          tension: 0.25,
          pointRadius: 3
        },
        {
          label: 'Despesas',
          data: dadosDespesa,
          borderColor: ct.danger,
          backgroundColor: ct.danger + '33',
          fill: true,
          tension: 0.25,
          pointRadius: 3
        },
        {
          label: 'Saldo acumulado',
          data: saldoAcum,
          borderColor: ct.primary,
          backgroundColor: ct.primary + '00',
          fill: false,
          tension: 0.15,
          pointRadius: 3,
          borderDash: [6, 4]
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: ct.text } },
        tooltip: {
          intersect: false, mode: 'index',
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${BRL.format(+ctx.raw || 0)}`
          }
        }
      },
      scales: {
        x: { grid: { color: ct.grid }, ticks: { color: ct.text } },
        y: {
          grid: { color: ct.grid },
          ticks: {
            color: ct.text,
            callback: (v) => BRL.format(v)
          },
          beginAtZero: true
        }
      }
    }
  }, { current: relChartLine, set current(v) { relChartLine = v; }, get current() { return relChartLine; } });

  // Pizza/Donut por categoria (somente despesas)
  const pieCtx = document.getElementById('rel-grafico-pizza')?.getContext('2d');
  const entries = Object.entries(porCategoria)
    .filter(([, v]) => (+v || 0) > 0)
    .sort((a, b) => b[1] - a[1]);

  const catLabels = entries.map(([c]) => getLabelFor(c));
  const catData = entries.map(([, v]) => v);
  const catColors = entries.map(([c]) => getColorFor(c));

  renderOrReplaceChart(pieCtx, {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: catColors, hoverBackgroundColor: catColors.map(c => c + 'CC'), borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: ct.text, boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${BRL.format(+ctx.raw || 0)}` } }
      },
      cutout: '55%'
    }
  }, { current: relChartPie, set current(v) { relChartPie = v; }, get current() { return relChartPie; } });

  if (temDados) {
    dom.exibirMensagem?.('Relatório gerado.', 'success');
  }
}

function exportarRelatorioCSV() {
  const inicio = document.getElementById('rel-inicio')?.value;
  const fim = document.getElementById('rel-fim')?.value;
  const incReceitas = document.getElementById('rel-inc-receitas')?.checked ?? true;
  const incDespesas = document.getElementById('rel-inc-despesas')?.checked ?? true;

  const ts = finance.getTransacoes();
  const filtradas = filtrarPorDataETipo(ts, inicio, fim, incReceitas, incDespesas);

  const linhas = [["Descrição", "Valor", "Tipo", "Categoria", "Data"]];
  filtradas.forEach(t => {
    linhas.push([t.descricao, String(t.valor).replace(',', '.'), t.tipo, t.categoria, t.data]);
  });

  const csv = linhas.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_${(inicio || 'inicio')}_${(fim || 'hoje')}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  dom.exibirMensagem?.('CSV do relatório exportado!', 'success');
}

/* =========================
   Módulo opcional: scroll infinito + filtro por mês
   ========================= */
function initInfiniteScrollModule() {
  const lista = document.getElementById('lista-transacoes');
  const filtroMes = document.getElementById('filtro-mes'); // <input type="month">
  const loading = document.getElementById('loading');       // <div id="loading">Carregando...</div>

  if (!lista || !filtroMes) return; // só ativa se a página implementou os elementos

  const POR_PAGINA = 20;
  let pagina = 0;
  let filtradas = [];

  function obterTodas() {
    return Object.values(finance.getTransacoes()).map(t => ({
      ...t,
      __date: new Date(t.data)
    }));
  }

  function aplicaFiltroAtual() {
    const todas = obterTodas();

    // Filtro por mês/ano
    const mesSelecionado = filtroMes.value; // ex: "2025-08"
    let porMes = todas;
    if (mesSelecionado) {
      const [ano, mes] = mesSelecionado.split('-').map(Number);
      porMes = todas.filter(t =>
        t.__date.getFullYear() === ano && (t.__date.getMonth() + 1) === mes
      );
    }

    // Filtros de tipo/categoria (se existirem na página)
    const tipo = dom.filtroTipoSelect?.value || 'todos';
    const categoria = dom.filtroCategoriaSelect?.value || 'todas';

    filtradas = porMes.filter(t => {
      if (tipo !== 'todos' && t.tipo !== tipo) return false;
      if (categoria !== 'todas' && t.categoria !== categoria) return false;
      return true;
    });

    // Ordenação (se houver controles)
    const ordenarPor = dom.ordenarPorSelect?.value || 'data';
    const asc = ordemAscendente;

    filtradas.sort((a, b) => {
      if (ordenarPor === 'valor') return asc ? a.valor - b.valor : b.valor - a.valor;
      if (ordenarPor === 'descricao') {
        return asc
          ? (a.descricao || '').localeCompare(b.descricao || '')
          : (b.descricao || '').localeCompare(a.descricao || '');
      }
      // data
      return asc ? (a.__date - b.__date) : (b.__date - a.__date);
    });

    // Reset da lista
    lista.innerHTML = '';
    pagina = 0;
    if (!filtradas.length) {
      lista.innerHTML = '<li class="transacao-item" style="justify-content:center">Nenhuma transação neste período.</li>';
      loading && (loading.style.display = 'none');
      return;
    }
    carregarMais();
  }

  function carregarMais() {
    const inicio = pagina * POR_PAGINA;
    const fim = inicio + POR_PAGINA;
    const lote = filtradas.slice(inicio, fim);

    lote.forEach(t => {
      const li = dom.criarItemTransacao ? dom.criarItemTransacao(t) : (() => {
        const el = document.createElement('li');
        el.className = 'transacao-item';
        el.textContent = `${t.data} — ${t.descricao} — ${BRL.format(+t.valor || 0)}`;
        return el;
      })();
      lista.appendChild(li);
    });

    pagina++;
    if (loading) loading.style.display = 'none';
  }

  // Scroll listener com throttling via rAF
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const nearBottom = window.innerHeight + window.scrollY >= (document.body.offsetHeight - 50);
      const aindaTem = pagina * POR_PAGINA < filtradas.length;
      if (nearBottom && aindaTem) {
        if (loading) loading.style.display = 'block';
        setTimeout(carregarMais, 300);
      }
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Controles → refiltrar
  filtroMes.addEventListener('change', aplicaFiltroAtual);
  dom.filtroTipoSelect?.addEventListener('change', aplicaFiltroAtual);
  dom.filtroCategoriaSelect?.addEventListener('change', aplicaFiltroAtual);
  dom.ordenarPorSelect?.addEventListener('change', aplicaFiltroAtual);
  dom.toggleOrdenacaoBtn?.addEventListener('click', () => {
    toggleOrdenacao();
    aplicaFiltroAtual();
  });

  // Expor função para atualizar quando dados mudarem
  window.__mfInfScrollRefresh = () => aplicaFiltroAtual();

  // Se não houver valor, define mês atual por padrão
  if (!filtroMes.value) {
    const hoje = new Date();
    filtroMes.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }

  // Primeira renderização
  aplicaFiltroAtual();
}

/* =========================
   Lista em caixa com scroll interno (10 por vez)
   Ativa automaticamente se #caixa-transacoes existir.
   ========================= */
function initTransacoesEmCaixa() {
  const caixa = document.getElementById('caixa-transacoes');
  const lista = document.getElementById('lista-transacoes');
  const loading = document.getElementById('loading');
  if (!caixa || !lista) return;

  const POR_PAGINA = 10;
  let pagina = 0;
  let dataset = [];

  function coletarETriar() {
    const todas = Object.values(finance.getTransacoes()).map(t => ({
      ...t,
      __date: new Date(t.data)
    }));

    const tipo = dom.filtroTipoSelect?.value || 'todos';
    const categoria = dom.filtroCategoriaSelect?.value || 'todas';
    const ordenarPor = dom.ordenarPorSelect?.value || 'data';
    const asc = JSON.parse(localStorage.getItem('ordemAscendente') ?? 'false');

    dataset = todas.filter(t => {
      if (tipo !== 'todos' && t.tipo !== tipo) return false;
      if (categoria !== 'todas' && t.categoria !== categoria) return false;
      return true;
    });

    dataset.sort((a, b) => {
      if (ordenarPor === 'valor') return asc ? (a.valor - b.valor) : (b.valor - a.valor);
      if (ordenarPor === 'descricao') {
        const aa = (a.descricao || '').toLowerCase(), bb = (b.descricao || '').toLowerCase();
        return asc ? aa.localeCompare(bb) : bb.localeCompare(aa);
      }
      return asc ? (a.__date - b.__date) : (b.__date - a.__date);
    });
  }

  function limparEIniciar() {
    lista.innerHTML = '';
    pagina = 0;
    if (!dataset.length) {
      const li = document.createElement('li');
      li.className = 'transacao-item';
      li.style.justifyContent = 'center';
      li.textContent = 'Nenhuma transação encontrada.';
      lista.appendChild(li);
    } else {
      carregarMais();
    }
    if (loading) loading.style.display = dataset.length > POR_PAGINA ? 'block' : 'none';
  }

  function carregarMais() {
    const inicio = pagina * POR_PAGINA;
    const fim = inicio + POR_PAGINA;
    const lote = dataset.slice(inicio, fim);

    lote.forEach(t => {
      const li = dom.criarItemTransacao ? dom.criarItemTransacao(t) : (() => {
        const el = document.createElement('li');
        el.className = 'transacao-item';
        el.textContent = `${t.data} — ${t.descricao} — ${BRL.format(+t.valor || 0)}`;
        return el;
      })();
      lista.appendChild(li);
    });

    pagina++;
    if (loading) {
      const fimDaLista = (pagina * POR_PAGINA) >= dataset.length;
      loading.style.display = fimDaLista ? 'none' : 'block';
    }
  }

  function onScroll() {
    const pertoDoFim = (caixa.scrollTop + caixa.clientHeight) >= (caixa.scrollHeight - 12);
    const aindaTem = (pagina * POR_PAGINA) < dataset.length;
    if (pertoDoFim && aindaTem) carregarMais();
  }

  caixa.addEventListener('scroll', onScroll, { passive: true });

  dom.filtroTipoSelect?.addEventListener('change', () => { coletarETriar(); limparEIniciar(); });
  dom.filtroCategoriaSelect?.addEventListener('change', () => { coletarETriar(); limparEIniciar(); });
  dom.ordenarPorSelect?.addEventListener('change', () => { coletarETriar(); limparEIniciar(); });
  dom.toggleOrdenacaoBtn?.addEventListener('click', () => { coletarETriar(); limparEIniciar(); });

  on(EVENT_NAMES.DATA_UPDATED, () => { coletarETriar(); limparEIniciar(); });

  coletarETriar();
  limparEIniciar();
}

/* =========================
   Start
   ========================= */
window.addEventListener('load', init);
