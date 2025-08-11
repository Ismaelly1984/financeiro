import { on } from './eventEmitter.js';
import { EVENT_NAMES, COLORS, ICONS } from './config.js';
import { calcularSaldo, getTransacoes } from './finance.js'; // Importação alterada

export let graficoPizza = null;
export let graficoLinha = null;

export function init() {
    on(EVENT_NAMES.DATA_UPDATED, atualizarGraficos);
}

function atualizarGraficos() {
    atualizarGraficoPizza();
    atualizarGraficoLinha();
}

function atualizarGraficoPizza() {
    // Agora usando a função getTransacoes() para obter os dados mais recentes
    const transacoesAtuais = getTransacoes();
    const despesas = Object.values(transacoesAtuais).filter(t => t.tipo === 'despesa');
    const gastosPorCategoria = despesas.reduce((acc, t) => {
        acc[t.categoria] = (acc[t.categoria] || 0) + parseFloat(t.valor);
        return acc;
    }, {});

    const labels = Object.keys(gastosPorCategoria);
    const data = Object.values(gastosPorCategoria);

    const cores = labels.map(cat => COLORS[cat] || '#C9CBCF');

    const ctx = document.getElementById('graficoPizza').getContext('2d');
    if (graficoPizza) graficoPizza.destroy();

    graficoPizza = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map(cat => {
                const icon = ICONS[cat];
                return `${cat} (R$ ${gastosPorCategoria[cat].toFixed(2)})`;
            }),
            datasets: [{
                data: data,
                backgroundColor: cores,
                hoverBackgroundColor: cores.map(c => c + 'AA'),
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 14
                        },
                        color: 'var(--cor-texto)',
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function atualizarGraficoLinha() {
    // Agora usando a função getTransacoes() para obter os dados mais recentes
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

    graficoLinha = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gastos Mensais',
                data: data,
                borderColor: '#dc3545',
                backgroundColor: '#dc3545AA',
                fill: true,
                tension: 0.1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'var(--cor-texto)',
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'var(--cor-texto)',
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'var(--cor-texto)',
                    }
                }
            }
        }
    });
}