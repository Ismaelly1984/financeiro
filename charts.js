// charts.js (completo, robusto e padronizado)
import { on } from './eventEmitter.js';
import { EVENT_NAMES, getColorFor, getLabelFor } from './config.js';
import { getTransacoes } from './finance.js';

export let graficoPizza = null;
export let graficoLinha = null;
let _inited = false;

/* =========================
   Tema (CSS → Chart.js)
   ========================= */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function chartTheme() {
  return {
    text: cssVar('--cor-texto') || '#e5e7eb',
    grid: 'rgba(148, 163, 184, 0.15)',
    primary: cssVar('--cor-primaria') || '#3B82F6',
    success: cssVar('--cor-sucesso') || '#10B981',
    danger: cssVar('--cor-aviso') || '#EF4444',
    bgCard: cssVar('--cor-secundaria') || 'transparent'
  };
}

function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;
  const t = chartTheme();

  Chart.defaults.font.family =
    "'Inter', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans'";
  Chart.defaults.color = t.text;

  Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};
  Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
  Chart.defaults.plugins.legend.labels.color = t.text;

  Chart.defaults.plugins.tooltip = Chart.defaults.plugins.tooltip || {};
  Chart.defaults.plugins.tooltip.titleColor = t.text;
  Chart.defaults.plugins.tooltip.bodyColor = t.text;

  Chart.defaults.scales = Chart.defaults.scales || {};
  Chart.defaults.scales.x = Chart.defaults.scales.x || {};
  Chart.defaults.scales.y = Chart.defaults.scales.y || {};
  Chart.defaults.scales.x.ticks = Chart.defaults.scales.x.ticks || {};
  Chart.defaults.scales.y.ticks = Chart.defaults.scales.y.ticks || {};
  Chart.defaults.scales.x.grid = Chart.defaults.scales.x.grid || {};
  Chart.defaults.scales.y.grid = Chart.defaults.scales.y.grid || {};

  Chart.defaults.scales.x.ticks.color = t.text;
  Chart.defaults.scales.y.ticks.color = t.text;
  Chart.defaults.scales.x.grid.color  = t.grid;
  Chart.defaults.scales.y.grid.color  = t.grid;
}

// público (quando alterna o tema)
export function reapplyChartTheme() {
  applyChartDefaults();
  atualizarGraficos();
}
applyChartDefaults();
document.addEventListener('visibilitychange', () => { if (!document.hidden) applyChartDefaults(); });

/* =========================
   Inicialização
   ========================= */
export function init() {
  if (_inited) return;
  _inited = true;
  on(EVENT_NAMES.DATA_UPDATED, atualizarGraficos);
}

function atualizarGraficos() {
  atualizarGraficoPizza();
  atualizarGraficoLinha();
}

/* =========================
   Utils
   ========================= */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl = (n) => BRL.format(Number.isFinite(+n) ? +n : 0);
function destroyIf(chartInstance) { if (chartInstance) chartInstance.destroy(); }
function sum(arr) { return (arr || []).reduce((a, b) => a + (+b || 0), 0); }

function drawNoData(canvas, msg = 'Sem dados para exibir') {
  if (!canvas) return;
  const t = chartTheme();
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  const w = Math.max(1, Math.floor(width * dpr));
  const h = Math.max(1, Math.floor(height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  if (t.bgCard !== 'transparent') { ctx.fillStyle = t.bgCard; ctx.fillRect(0, 0, width, height); }
  ctx.fillStyle = t.text || '#999';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '500 14px Inter, system-ui, sans-serif';
  ctx.fillText(msg, width / 2, height / 2);
  ctx.restore();
}

/* =========================
   Donut: Despesas por categoria
   ========================= */
function atualizarGraficoPizza() {
  const canvas = document.getElementById('graficoPizza');
  if (!canvas || typeof Chart === 'undefined') return;

  const transacoesAtuais = getTransacoes();
  const despesas = Object.values(transacoesAtuais).filter(t => t.tipo === 'despesa');

  const gastosPorCategoria = despesas.reduce((acc, t) => {
    const cat = t.categoria || 'outros';
    const v = parseFloat(t.valor || 0);
    acc[cat] = (acc[cat] || 0) + v;
    return acc;
  }, {});

  const entries = Object.entries(gastosPorCategoria)
    .filter(([, v]) => (+v || 0) > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) { destroyIf(graficoPizza); graficoPizza = null; drawNoData(canvas, 'Sem despesas por categoria'); return; }

  const categorias      = entries.map(([cat]) => cat);
  const valores         = entries.map(([, v]) => v);
  const labelsAmigaveis = categorias.map(getLabelFor);
  const cores           = categorias.map(getColorFor);

  const t = chartTheme();
  const ctx = canvas.getContext('2d');
  destroyIf(graficoPizza);

  graficoPizza = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labelsAmigaveis,
      datasets: [{
        data: valores,
        backgroundColor: cores,
        hoverBackgroundColor: cores.map(c => `${c}CC`),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: t.text, boxWidth: 12, padding: 12, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = +ctx.raw || 0;
              const tot = (ctx.dataset.data || []).reduce((a, b) => a + (+b || 0), 0);
              const pct = tot ? (v / tot * 100) : 0;
              return `${ctx.label}: ${brl(v)} (${pct.toFixed(1)}%)`;
            }
          }
        }
      },
      cutout: '55%' // **dentro** de options (corrigido)
    }
  });
}

/* =========================
   Linha: Gastos mensais (somente despesas)
   ========================= */
function atualizarGraficoLinha() {
  const canvas = document.getElementById('graficoLinha');
  if (!canvas || typeof Chart === 'undefined') return;

  const transacoesAtuais = getTransacoes();
  const despesas = Object.values(transacoesAtuais).filter(t => t.tipo === 'despesa');

  const gastosPorMes = despesas.reduce((acc, t) => {
    const mes = (t.data || '').substring(0, 7); // YYYY-MM
    if (!mes) return acc;
    acc[mes] = (acc[mes] || 0) + parseFloat(t.valor || 0);
    return acc;
  }, {});

  const labels  = Object.keys(gastosPorMes).sort();
  const valores = labels.map(m => gastosPorMes[m]);

  if (labels.length === 0 || sum(valores) === 0) { destroyIf(graficoLinha); graficoLinha = null; drawNoData(canvas, 'Sem gastos mensais'); return; }

  const t = chartTheme();
  const ctx = canvas.getContext('2d');
  destroyIf(graficoLinha);

  // Gradiente para a área
  const rect = canvas.getBoundingClientRect();
  const grad = ctx.createLinearGradient(0, 0, 0, rect.height || 300);
  grad.addColorStop(0, (t.danger || '#EF4444') + '33');
  grad.addColorStop(1, (t.danger || '#EF4444') + '00');

  graficoLinha = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Gastos Mensais',
        data: valores,
        borderColor: t.danger,
        backgroundColor: grad,
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { beginAtZero: true, grid: { color: t.grid }, ticks: { color: t.text } },
        x: { grid: { color: t.grid }, ticks: { color: t.text } }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: t.text, boxWidth: 12, padding: 12, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${brl(ctx.parsed.y)}`
          }
        }
      }
    }
  });
}
