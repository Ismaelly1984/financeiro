import { on } from './eventEmitter.js';
import { EVENT_NAMES, COLORS, ICONS } from './config.js';
import { calcularSaldo, getTransacoes } from './finance.js';

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
    grid: 'rgba(148, 163, 184, 0.15)', // linha sutil
    primary: cssVar('--cor-primaria'),
    success: cssVar('--cor-sucesso'),
    danger: cssVar('--cor-aviso'),
    bgCard: cssVar('--cor-secundaria')
  };
}

function applyChartDefaults() {
  const t = chartTheme();
  // fontes / cores globais
  Chart.defaults.font.family = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans'";
  Chart.defaults.color = t.text;
  // legendas e tooltip
  Chart.defaults.plugins.legend.labels.color = t.text;
  Chart.defaults.plugins.tooltip.titleColor = t.text;
  Chart.defaults.plugins.tooltip.bodyColor = t.text;
  // grid
  Chart.defaults.scales.category.grid.color = t.grid;
  Chart.defaults.scales.linear.grid.color = t.grid;
}
applyChartDefaults();

// Reaplica defaults quando o tema mudar / aba voltar
window.addEventListener('storage', (e) => {
  if (e.key === 'tema') applyChartDefaults();
});
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
      lazer: '#F59E0B',    // amber-500
      saude: '#06B6D4',    // cyan-500
      educacao: '#8B5CF6', // violet-500
      outros: '#9CA3AF'    // slate-400
    };
    return mapa[cat] || t.primary;
  });

  const ctx = document.getElementById('graficoPizza').getContext('2d');
  if (graficoPizza) graficoPizza.destroy();

  graficoPizza = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels.map(cat => `${cat} (R$ ${gastosPorCategoria[cat].toFixed(2)})`),
      datasets: [{
        data,
        backgroundColor: cores,
        hoverBackgroundColor: cores.map(c => `${c}CC`), // ~80% opacidade
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.parsed;
              const label = context.label || '';
              const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
              return `${label}: ${dinheiro}`;
            }
          }
        }
      }
    }
  });
}

/* =========================
   Linha: Gastos mensais
   ========================= */
function atualizarGraficoLinha() {
  const transacoesAtuais = getTransacoes();
  const despesas = Object.values(transacoesAtuais).filter(t => t.tipo === 'despesa');
  const gastosPorMes = despesas.reduce((acc, t) => {
    const mes = t.data.substring(0, 7);
    acc[mes] = (acc[mes] || 0) + parseFloat(t.valor);
    return acc;
  }, {});

  const labels = Object.keys(gastosPorMes).sort();
  const data = labels.map(mes => gastosPorMes[mes]);

  const ctx = document.getElementById('graficoLinha').getContext('2d');
  if (graficoLinha) graficoLinha.destroy();

  const t = chartTheme();

  graficoLinha = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Gastos Mensais',
        data,
        borderColor: t.danger,
        backgroundColor: `${t.danger}33`, // ~20% opacidade
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: chartTheme().text },
          grid: { color: chartTheme().grid }
        },
        x: {
          ticks: { color: chartTheme().text },
          grid: { color: chartTheme().grid }
        }
      },
      plugins: {
        legend: { labels: { color: chartTheme().text } },
        tooltip: { intersect: false, mode: 'index' }
      }
    }
  });
}
