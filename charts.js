import { on } from './eventEmitter.js';
import { EVENT_NAMES } from './config.js';
import { getTransacoes } from './finance.js';

export let graficoPizza = null;
export let graficoLinha = null;

/* =========================
   Bridge de tema (CSS → Chart.js)
   ========================= */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function chartTheme() {
  return {
    text: cssVar('--cor-texto'),
    grid: 'rgba(148, 163, 184, 0.15)',
    primary: cssVar('--cor-primaria'),
    success: cssVar('--cor-sucesso'),
    danger: cssVar('--cor-aviso'),
    bgCard: cssVar('--cor-secundaria')
  };
}

function applyChartDefaults() {
  const t = chartTheme();
  if (typeof Chart === 'undefined') return;

  // fontes / cores globais
  Chart.defaults.font.family =
    "'Inter', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans'";
  Chart.defaults.color = t.text;

  // legendas e tooltip
  Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};
  Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
  Chart.defaults.plugins.legend.labels.color = t.text;

  Chart.defaults.plugins.tooltip = Chart.defaults.plugins.tooltip || {};
  Chart.defaults.plugins.tooltip.titleColor = t.text;
  Chart.defaults.plugins.tooltip.bodyColor = t.text;

  // v4: configurar eixos diretamente em x/y
  Chart.defaults.scales = Chart.defaults.scales || {};
  Chart.defaults.scales.x = Chart.defaults.scales.x || {};
  Chart.defaults.scales.y = Chart.defaults.scales.y || {};

  Chart.defaults.scales.x.ticks = Chart.defaults.scales.x.ticks || {};
  Chart.defaults.scales.y.ticks = Chart.defaults.scales.y.ticks || {};
  Chart.defaults.scales.x.grid  = Chart.defaults.scales.x.grid  || {};
  Chart.defaults.scales.y.grid  = Chart.defaults.scales.y.grid  || {};

  Chart.defaults.scales.x.ticks.color = t.text;
  Chart.defaults.scales.y.ticks.color = t.text;
  Chart.defaults.scales.x.grid.color  = t.grid;
  Chart.defaults.scales.y.grid.color  = t.grid;
}

// Exporta para reaplicar imediatamente quando o tema mudar
export function reapplyChartTheme() {
  applyChartDefaults();
  atualizarGraficos(); // recria para aplicar as novas cores
}

applyChartDefaults();

// Reaplica defaults quando a aba volta (garante consistência)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) applyChartDefaults();
});

/* =========================
   Inicialização
   ========================= */
export function init() {
  on(EVENT_NAMES.DATA_UPDATED, atualizarGraficos);
}

function atualizarGraficos() {
  atualizarGraficoPizza();
  atualizarGraficoLinha();
}

/* =========================
   Pizza: Gastos por categoria
   ========================= */
function atualizarGraficoPizza() {
  const canvas = document.getElementById('graficoPizza');
  if (!canvas || typeof Chart === 'undefined') return;

  const transacoesAtuais = getTransacoes();
  const despesas = Object.values(transacoesAtuais).filter(t => t.tipo === 'despesa');
  const gastosPorCategoria = despesas.reduce((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + parseFloat(t.valor);
    return acc;
  }, {});

  const labels = Object.keys(gastosPorCategoria);
  const data = Object.values(gastosPorCategoria);

  const t = chartTheme();
  const cores = labels.map(cat => {
    const mapa = {
      alimentacao: t.primary,
      transporte: t.success,
      lazer: '#F59E0B',
      saude: '#06B6D4',
      educacao: '#8B5CF6',
      outros: '#9CA3AF'
    };
    return mapa[cat] || t.primary;
  });

  const ctx = canvas.getContext('2d');
  if (graficoPizza) graficoPizza.destroy();

  graficoPizza = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels.map(cat => `${cat} (R$ ${gastosPorCategoria[cat].toFixed(2)})`),
      datasets: [{
        data,
        backgroundColor: cores,
        hoverBackgroundColor: cores.map(c => `${c}CC`),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right' } }
    }
  });
}

/* =========================
   Linha: Gastos mensais
   ========================= */
function atualizarGraficoLinha() {
  const canvas = document.getElementById('graficoLinha');
  if (!canvas || typeof Chart === 'undefined') return;

  const transacoesAtuais = getTransacoes();
  const despesas = Object.values(transacoesAtuais).filter(t => t.tipo === 'despesa');
  const gastosPorMes = despesas.reduce((acc, t) => {
    const mes = t.data.substring(0, 7);
    acc[mes] = (acc[mes] || 0) + parseFloat(t.valor);
    return acc;
  }, {});

  const labels = Object.keys(gastosPorMes).sort();
  const data = labels.map(mes => gastosPorMes[mes]);

  const t = chartTheme();
  const ctx = canvas.getContext('2d');
  if (graficoLinha) graficoLinha.destroy();

  graficoLinha = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Gastos Mensais',
        data,
        borderColor: t.danger,
        backgroundColor: `${t.danger}33`,
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // Em v4, as opções de cor já foram definidas em defaults; aqui só garantimos beginAtZero
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { labels: { usePointStyle: false } },
        tooltip: { intersect: false, mode: 'index' }
      }
    }
  });
}