// app.js (multi-páginas: robusto e idempotente)
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
    document.getElementById('rel-demo')?.addEventListener('click', carregarDadosDeExemplo);
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

  // Render inicial
  emit(EVENT_NAMES.DATA_UPDATED);

  // Gera relatório inicial (se estiver na página de relatórios)
  if (relOn) gerarRelatorio();

  // Service Worker
  if ('serviceWorker' in navigator) {
    let serviceWorkerPath = '/service-worker.js';
    if (window.location.pathname.includes('/financeiro/')) serviceWorkerPath = '/financeiro/service-worker.js';
    navigator.serviceWorker.register(serviceWorkerPath).catch(() => { });
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
  const valor = parseFloat(dom.form.valor.value);
  const tipo = dom.form.tipo.value;
  const categoria = dom.form.categoria.value;
  const data = dom.form.data.value;

  if (!descricao || !valor || !data) {
    dom.exibirMensagem?.('Por favor, preencha todos os campos.', 'aviso');
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
  const valor = parseFloat(dom.editValorInput.value);
  const data = dom.editDataInput.value;

  if (!dom.editDescricaoInput.value.trim() || !valor || !data) {
    dom.exibirMensagem?.('Por favor, preencha todos os campos.', 'aviso');
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
  const novoLimite = parseFloat(e.target.value);
  if (novoLimite >= 0) {
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
  // Se não for a página de Limite, não faz nada
  if (!dom.barraProgresso || !dom.gastoAtualSpan || !dom.porcentagemGastoSpan) return;

  const { despesas } = finance.calcularSaldo();
  const ratio = limiteGasto > 0 ? (despesas / limiteGasto) : 0;
  const porcentagem = ratio * 100;

  dom.gastoAtualSpan.textContent = dom.formatBRL?.(despesas) ?? despesas.toFixed(2);
  dom.porcentagemGastoSpan.textContent = porcentagem.toFixed(2);
  dom.barraProgresso.style.width = `${Math.min(porcentagem, 100)}%`;
  dom.barraProgresso.setAttribute('aria-valuenow', Math.min(porcentagem, 100).toFixed(0));

  // Alertas 80% / 100% com histerese simples
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
  const limite = parseFloat(dom.inputLimiteCategoria?.value);

  if (categoria && limite > 0) {
    orcamentosPorCategoria[categoria] = limite;
    storage.salvarOrcamentosPorCategoria(orcamentosPorCategoria);
    dom.exibirMensagem?.(`Orçamento de ${dom.formatBRL?.(limite) ?? limite} para ${categoria} salvo!`, 'success');
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
        <span><i class="fas ${dom.getIconClass?.(categoria) ?? 'fa-tag'}"></i> ${categoria}</span>
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
        dom.exibirMensagem?.(`Excedeu o orçamento de ${categoria}.`, 'aviso', 5000);
        navigator.vibrate?.(200);
      } else if (ratio >= ALERT_THRESHOLDS.warn && prev !== 'warn' && prev !== 'exceed') {
        _alertState.categorias[categoria] = 'warn';
        dom.exibirMensagem?.(`Atingiu 80% do orçamento de ${categoria}.`, 'info', 4000);
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
      dom.exibirMensagem?.(`Orçamento de ${categoria} removido.`, 'aviso');
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

  // Lista de transações só na página de transações
  if (dom.renderizarTransacoes && dom.ordenarPorSelect && dom.filtroTipoSelect && dom.filtroCategoriaSelect) {
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

function rangePreset(preset) {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'mes') {
    const ini = new Date(today.getFullYear(), today.getMonth(), 1);
    const fim = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { inicio: toStr(ini), fim: toStr(fim) };
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
  const dIni = inicio ? new Date(inicio) : null;
  const dFim = fim ? new Date(fim) : null;

  return arr.filter(t => {
    const d = new Date(t.data);
    if (dIni && d < dIni) return false;
    if (dFim && d > dFim) return false;
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

  // Pizza/Donut por categoria (somente despesas) — padronizado
  const pieCtx = document.getElementById('rel-grafico-pizza')?.getContext('2d');
  const entries = Object.entries(porCategoria)
    .filter(([, v]) => (+v || 0) > 0)
    .sort((a, b) => b[1] - a[1]);

  const catLabels = entries.map(([c]) => getLabelFor(c));
  const catData   = entries.map(([, v]) => v);
  const catColors = entries.map(([c]) => getColorFor(c));

  renderOrReplaceChart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{
        data: catData,
        backgroundColor: catColors,
        hoverBackgroundColor: catColors.map(c => c + 'CC'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: ct.text, boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${BRL.format(+ctx.raw || 0)}`
          }
        }
      },
      cutout: '55%'
    }
  }, { current: relChartPie, set current(v) { relChartPie = v; }, get current() { return relChartPie; } });

  dom.exibirMensagem?.('Relatório gerado.', 'success');
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
   Demo data (semente)
   ========================= */
function ymd(y, m, d) {
  // m: 1-12
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}
function carregarDadosDeExemplo() {
  // Gera um conjunto variado: últimos 6–7 meses, várias categorias e tipos
  const now = new Date();
  const anoAtual = now.getFullYear();
  const mesAtual = now.getMonth() + 1; // 1-12

  // Meses relativos (ajusta ano quando cruza janeiro)
  const rel = (offset) => {
    let m = mesAtual + offset; let y = anoAtual;
    while (m <= 0) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    return { y, m };
  };

  const exemplos = [
    // Receitas
    { descricao: 'Salário', valor: 4200, tipo: 'receita', categoria: 'salario', data: ymd(rel(0).y, rel(0).m, 5) },
    { descricao: 'Freelance', valor: 800, tipo: 'receita', categoria: 'outros', data: ymd(rel(0).y, rel(0).m, 18) },
    { descricao: 'Salário', valor: 4200, tipo: 'receita', categoria: 'salario', data: ymd(rel(-1).y, rel(-1).m, 5) },
    { descricao: 'Bônus', valor: 600, tipo: 'receita', categoria: 'outros', data: ymd(rel(-1).y, rel(-1).m, 20) },
    { descricao: 'Salário', valor: 4200, tipo: 'receita', categoria: 'salario', data: ymd(rel(-2).y, rel(-2).m, 5) },

    // Despesas recorrentes
    { descricao: 'Aluguel', valor: 1600, tipo: 'despesa', categoria: 'outros', data: ymd(rel(0).y, rel(0).m, 8) },
    { descricao: 'Transporte (passe)', valor: 220, tipo: 'despesa', categoria: 'transporte', data: ymd(rel(0).y, rel(0).m, 2) },
    { descricao: 'Mercado', valor: 650, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(0).y, rel(0).m, 12) },
    { descricao: 'Restaurante', valor: 120, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(0).y, rel(0).m, 22) },
    { descricao: 'Academia', valor: 99, tipo: 'despesa', categoria: 'saude', data: ymd(rel(0).y, rel(0).m, 3) },
    { descricao: 'Farmácia', valor: 85, tipo: 'despesa', categoria: 'saude', data: ymd(rel(0).y, rel(0).m, 14) },
    { descricao: 'Internet', valor: 120, tipo: 'despesa', categoria: 'outros', data: ymd(rel(0).y, rel(0).m, 10) },

    // Diversão/Educação
    { descricao: 'Cinema', valor: 50, tipo: 'despesa', categoria: 'lazer', data: ymd(rel(0).y, rel(0).m, 16) },
    { descricao: 'Jogo online', valor: 80, tipo: 'despesa', categoria: 'lazer', data: ymd(rel(-1).y, rel(-1).m, 9) },
    { descricao: 'Curso online', valor: 300, tipo: 'despesa', categoria: 'educacao', data: ymd(rel(-1).y, rel(-1).m, 11) },

    // Variações meses anteriores
    { descricao: 'Mercado', valor: 590, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(-1).y, rel(-1).m, 13) },
    { descricao: 'Restaurante', valor: 95, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(-1).y, rel(-1).m, 25) },
    { descricao: 'Transporte (app)', valor: 75, tipo: 'despesa', categoria: 'transporte', data: ymd(rel(-1).y, rel(-1).m, 21) },
    { descricao: 'Internet', valor: 120, tipo: 'despesa', categoria: 'outros', data: ymd(rel(-1).y, rel(-1).m, 10) },

    { descricao: 'Mercado', valor: 610, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(-2).y, rel(-2).m, 12) },
    { descricao: 'Restaurante', valor: 130, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(-2).y, rel(-2).m, 23) },
    { descricao: 'Transporte (passe)', valor: 220, tipo: 'despesa', categoria: 'transporte', data: ymd(rel(-2).y, rel(-2).m, 2) },
    { descricao: 'Internet', valor: 120, tipo: 'despesa', categoria: 'outros', data: ymd(rel(-2).y, rel(-2).m, 10) },

    // Mais meses
    { descricao: 'Salário', valor: 4200, tipo: 'receita', categoria: 'salario', data: ymd(rel(-3).y, rel(-3).m, 5) },
    { descricao: 'Mercado', valor: 580, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(-3).y, rel(-3).m, 12) },
    { descricao: 'Transporte (passe)', valor: 220, tipo: 'despesa', categoria: 'transporte', data: ymd(rel(-3).y, rel(-3).m, 2) },

    { descricao: 'Salário', valor: 4200, tipo: 'receita', categoria: 'salario', data: ymd(rel(-4).y, rel(-4).m, 5) },
    { descricao: 'Mercado', valor: 600, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(-4).y, rel(-4).m, 12) },

    { descricao: 'Salário', valor: 4200, tipo: 'receita', categoria: 'salario', data: ymd(rel(-5).y, rel(-5).m, 5) },
    { descricao: 'Mercado', valor: 570, tipo: 'despesa', categoria: 'alimentacao', data: ymd(rel(-5).y, rel(-5).m, 12) },
  ];

  // Insere via EventBus (finance.js escuta e já persiste no storage)
  exemplos.forEach((t) => {
    emit(EVENT_NAMES.TRANSACTION_ADDED, { ...t, id: Date.now() + Math.floor(Math.random() * 1e6) });
  });

  dom.exibirMensagem?.('Dados de exemplo carregados!', 'success');
  gerarRelatorio();
}

/* =========================
   Start
   ========================= */
window.addEventListener('load', init);
