/**
 * SecureVoice Admin Case Analytics JavaScript
 * Handles analytics dashboard functionality with Chart.js
 */

// Chart instances
let trendChart = null;
let crimeDistributionChart = null;
let statusChart = null;
let resolutionChart = null;

// Chart color palette matching admin dashboard theme
const chartColors = {
    primary: '#124E66',
    secondary: '#2E3944',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    teal: '#14b8a6',
    gradient: {
        primary: ['rgba(18, 78, 102, 0.8)', 'rgba(18, 78, 102, 0.1)'],
        success: ['rgba(16, 185, 129, 0.8)', 'rgba(16, 185, 129, 0.1)'],
        warning: ['rgba(245, 158, 11, 0.8)', 'rgba(245, 158, 11, 0.1)'],
        danger: ['rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.1)']
    }
};

// Initialize analytics when tab is opened
document.addEventListener('DOMContentLoaded', () => {
    // Listen for tab changes
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab === 'analytics') {
                setTimeout(() => loadAnalytics(), 100);
            }
        });
    });

    // Period change handler
    const periodSelect = document.getElementById('analytics-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', loadAnalytics);
    }
});

// Main function to load all analytics
async function loadAnalytics() {
    const period = document.getElementById('analytics-period')?.value || '30';
    
    try {
        await Promise.all([
            loadSummaryStats(),
            loadTrendData(period),
            loadCrimeDistribution()
        ]);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('Error loading analytics data', 'error');
    }
}

// Refresh analytics button handler
function refreshAnalytics() {
    loadAnalytics();
    showToast('Analytics refreshed', 'success');
}

// Load summary statistics
async function loadSummaryStats() {
    try {
        const response = await fetch('/get-performance-metrics', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            const perf = data.performance;
            document.getElementById('analytics-total').textContent = perf.total_cases || 0;
            document.getElementById('analytics-resolved').textContent = perf.resolved_cases || 0;
            document.getElementById('resolution-rate').textContent = `${perf.resolution_rate || 0}%`;
            document.getElementById('avg-resolution-time').textContent = Math.round(perf.avg_resolution_time || 0);
        }
    } catch (error) {
        console.error('Error loading summary stats:', error);
    }
}

// Load trend data and render chart
async function loadTrendData(period) {
    try {
        const response = await fetch(`/get-trend-analysis?period=${period}`, { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            renderTrendChart(data.trends);
            renderStatusChart(data.trends.totals);
        }
    } catch (error) {
        console.error('Error loading trend data:', error);
    }
}

// Render trend line chart
function renderTrendChart(trends) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    // Destroy existing chart
    if (trendChart) {
        trendChart.destroy();
    }

    const labels = trends.daily.map(d => formatDate(d.date));
    const totalData = trends.daily.map(d => d.total);

    // Create gradient
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, chartColors.gradient.primary[0]);
    gradient.addColorStop(1, chartColors.gradient.primary[1]);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Cases',
                data: totalData,
                borderColor: chartColors.primary,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: chartColors.secondary,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 7,
                        color: '#748D92'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(116, 141, 146, 0.1)'
                    },
                    ticks: {
                        color: '#748D92',
                        stepSize: 1
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Render status bar chart
function renderStatusChart(totals) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'Verifying', 'Investigating', 'Resolved'],
            datasets: [{
                label: 'Cases',
                data: [totals.pending, totals.verifying, totals.investigating, totals.resolved],
                backgroundColor: [
                    chartColors.warning,
                    chartColors.info,
                    chartColors.pink,
                    chartColors.success
                ],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: chartColors.secondary,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#748D92'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(116, 141, 146, 0.1)'
                    },
                    ticks: {
                        color: '#748D92',
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Load crime distribution data
async function loadCrimeDistribution() {
    try {
        const response = await fetch('/get-crime-distribution', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            renderCrimeDistributionChart(data.distribution);
            renderCrimeStatsTable(data.distribution);
            renderResolutionChart(data.distribution);
        }
    } catch (error) {
        console.error('Error loading crime distribution:', error);
    }
}

// Render crime distribution doughnut chart
function renderCrimeDistributionChart(distribution) {
    const ctx = document.getElementById('crimeDistributionChart');
    if (!ctx) return;

    if (crimeDistributionChart) {
        crimeDistributionChart.destroy();
    }

    const colors = [
        chartColors.primary,
        chartColors.success,
        chartColors.warning,
        chartColors.danger,
        chartColors.info,
        chartColors.purple,
        chartColors.pink,
        chartColors.teal
    ];

    crimeDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: distribution.map(d => d.crime_type),
            datasets: [{
                data: distribution.map(d => d.count),
                backgroundColor: colors.slice(0, distribution.length),
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: '#212A31'
                    }
                },
                tooltip: {
                    backgroundColor: chartColors.secondary,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render resolution time chart
function renderResolutionChart(distribution) {
    const ctx = document.getElementById('resolutionChart');
    if (!ctx) return;

    if (resolutionChart) {
        resolutionChart.destroy();
    }

    const sortedByTime = [...distribution]
        .filter(d => d.avg_resolution_days !== null)
        .sort((a, b) => b.avg_resolution_days - a.avg_resolution_days)
        .slice(0, 6);

    resolutionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedByTime.map(d => d.crime_type),
            datasets: [{
                label: 'Avg. Days to Resolve',
                data: sortedByTime.map(d => Math.round(d.avg_resolution_days || 0)),
                backgroundColor: sortedByTime.map((_, i) => {
                    const days = sortedByTime[i].avg_resolution_days || 0;
                    if (days <= 7) return chartColors.success;
                    if (days <= 14) return chartColors.info;
                    if (days <= 30) return chartColors.warning;
                    return chartColors.danger;
                }),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: chartColors.secondary,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `${context.raw} days average`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(116, 141, 146, 0.1)'
                    },
                    ticks: {
                        color: '#748D92'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#748D92'
                    }
                }
            }
        }
    });
}

// Render crime statistics table
function renderCrimeStatsTable(distribution) {
    const tbody = document.getElementById('crime-stats-body');
    if (!tbody) return;

    if (distribution.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-inbox"></i> No crime data available
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = distribution.map(item => {
        const resolutionRate = item.count > 0 
            ? Math.round((item.resolved_count / item.count) * 100) 
            : 0;
        const avgDays = Math.round(item.avg_resolution_days || 0);
        
        // Determine trend icon
        let trendIcon = 'fa-minus';
        let trendClass = 'trend-stable';
        if (resolutionRate >= 70) {
            trendIcon = 'fa-arrow-up';
            trendClass = 'trend-up';
        } else if (resolutionRate < 40) {
            trendIcon = 'fa-arrow-down';
            trendClass = 'trend-down';
        }

        return `
            <tr>
                <td>
                    <div class="crime-type-cell">
                        <span class="crime-dot" style="background: ${getCrimeColor(item.crime_type)}"></span>
                        ${item.crime_type}
                    </div>
                </td>
                <td><strong>${item.count}</strong></td>
                <td>${item.resolved_count || 0}</td>
                <td>
                    <div class="rate-bar">
                        <div class="rate-fill" style="width: ${resolutionRate}%; background: ${getRateColor(resolutionRate)}"></div>
                        <span>${resolutionRate}%</span>
                    </div>
                </td>
                <td>${avgDays} days</td>
                <td><i class="fas ${trendIcon} ${trendClass}"></i></td>
            </tr>
        `;
    }).join('');
}

// Helper: Get color for crime type
function getCrimeColor(type) {
    const colorMap = {
        'Theft': chartColors.danger,
        'Harassment': chartColors.warning,
        'Assault': chartColors.pink,
        'Fraud': chartColors.purple,
        'Threat': chartColors.info,
        'Other': chartColors.teal
    };
    return colorMap[type] || chartColors.primary;
}

// Helper: Get color based on rate
function getRateColor(rate) {
    if (rate >= 70) return chartColors.success;
    if (rate >= 40) return chartColors.warning;
    return chartColors.danger;
}

// Helper: Format date for charts
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Export for global access
window.refreshAnalytics = refreshAnalytics;
window.loadAnalytics = loadAnalytics;
