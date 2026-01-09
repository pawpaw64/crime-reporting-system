/**
 * Admin Case Analytics Module
 * Handles statistical visualization and case management for analytics dashboard
 */

let analyticsData = null;
let statusChart = null;
let trendChart = null;
let typeChart = null;

/**
 * Initialize analytics dashboard
 */
async function initializeAnalytics() {
    console.log('Initializing analytics dashboard...');
    try {
        await loadAnalyticsData();
        renderCharts();
        renderAnalyticsTable();
        console.log('Analytics dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing analytics:', error);
        showToast('Failed to initialize analytics dashboard', 'error');
    }
}

/**
 * Load analytics data from backend
 */
async function loadAnalyticsData() {
    console.log('Loading analytics data from /analytics/case-analytics...');
    try {
        const response = await fetch('/analytics/case-analytics', {
            method: 'GET',
            credentials: 'include'
        });

        console.log('Analytics response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Analytics API error:', errorText);
            throw new Error(`Failed to load analytics data: ${response.status}`);
        }

        analyticsData = await response.json();
        console.log('Analytics data loaded:', analyticsData);
        updateStatCards();
        return analyticsData;

    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('Failed to load analytics data: ' + error.message, 'error');
        
        // Show error in the table container
        const container = document.getElementById('analytics-table-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle fa-3x" style="color: #ef4444;"></i>
                    <h3>Error Loading Analytics</h3>
                    <p>${error.message}</p>
                    <button class="btn primary" onclick="initializeAnalytics()" style="margin-top: 1rem;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Update stat cards with current numbers
 */
function updateStatCards() {
    if (!analyticsData || !analyticsData.stats) return;

    const stats = analyticsData.stats;
    
    document.getElementById('total-cases-stat').textContent = stats.total_cases || 0;
    document.getElementById('active-cases-stat').textContent = stats.active_cases || 0;
    document.getElementById('resolved-cases-stat').textContent = stats.resolved || 0;
    document.getElementById('discarded-cases-stat').textContent = stats.discarded || 0;
}

/**
 * Render all charts
 */
function renderCharts() {
    if (!analyticsData) {
        console.warn('No analytics data available for charts');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded!');
        showToast('Chart library not loaded', 'error');
        return;
    }

    console.log('Rendering charts...');
    renderStatusDistributionChart();
    renderMonthlyTrendChart();
    renderTypeDistributionChart();
}

/**
 * Render status distribution pie chart
 */
function renderStatusDistributionChart() {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (statusChart) {
        statusChart.destroy();
    }

    const statusData = analyticsData.statusDistribution || [];
    const labels = statusData.map(item => capitalizeFirst(item.status));
    const data = statusData.map(item => item.count);
    
    const colors = {
        'Pending': '#f59e0b',
        'Verifying': '#3b82f6',
        'Investigating': '#8b5cf6',
        'Resolved': '#10b981'
    };

    const backgroundColors = labels.map(label => colors[label] || '#6b7280');

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Active Cases by Status',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render monthly trend line chart
 */
function renderMonthlyTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (trendChart) {
        trendChart.destroy();
    }

    const trendData = analyticsData.monthlyTrend || [];
    const labels = trendData.map(item => {
        const date = new Date(item.month + '-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Cases',
                    data: trendData.map(item => item.count),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Resolved',
                    data: trendData.map(item => item.resolved),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Discarded',
                    data: trendData.map(item => item.discarded),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Case Trends (Last 12 Months)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Render complaint type distribution bar chart
 */
function renderTypeDistributionChart() {
    const canvas = document.getElementById('typeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (typeChart) {
        typeChart.destroy();
    }

    const typeData = analyticsData.typeDistribution || [];
    const labels = typeData.map(item => item.complaint_type || 'Other');
    const data = typeData.map(item => item.count);

    typeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Cases',
                data: data,
                backgroundColor: '#8b5cf6',
                borderColor: '#7c3aed',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Cases by Type',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Render analytics table with all cases
 */
function renderAnalyticsTable() {
    const container = document.getElementById('analytics-table-container');
    if (!container || !analyticsData) return;

    const cases = analyticsData.allCases || [];

    if (cases.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox fa-3x"></i>
                <h3>No Cases Found</h3>
                <p>No cases have been recorded yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Complainant</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Location</th>
                    <th>State</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${cases.map(c => renderCaseRow(c)).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Render individual case row
 */
function renderCaseRow(caseData) {
    const statusClass = getStatusClass(caseData.status);
    const isDiscarded = caseData.is_discarded;
    
    return `
        <tr class="${isDiscarded ? 'discarded-row' : ''}">
            <td>#${caseData.complaint_id}</td>
            <td>
                <strong>${caseData.complainant_fullname || caseData.username}</strong>
                ${caseData.complainant_fullname ? `<br><small>@${caseData.username}</small>` : ''}
            </td>
            <td>${caseData.complaint_type || 'General'}</td>
            <td><span class="status-badge ${statusClass}">${caseData.status}</span></td>
            <td>${new Date(caseData.created_at).toLocaleDateString()}</td>
            <td>${truncateText(caseData.location_address || 'N/A', 25)}</td>
            <td>
                ${isDiscarded 
                    ? `<span class="state-badge discarded">
                        <i class="fas fa-trash"></i> Discarded
                       </span>` 
                    : `<span class="state-badge active">
                        <i class="fas fa-check-circle"></i> Active
                       </span>`
                }
            </td>
            <td>
                <div class="action-btns">
                    ${!isDiscarded 
                        ? `<button class="btn btn-danger btn-sm" onclick="discardCase(${caseData.complaint_id})" title="Discard Case">
                            <i class="fas fa-trash"></i> Discard
                           </button>`
                        : `<button class="btn btn-secondary btn-sm" onclick="restoreCase(${caseData.complaint_id})" title="Restore Case">
                            <i class="fas fa-undo"></i> Restore
                           </button>`
                    }
                    <button class="btn btn-primary btn-sm" onclick="viewCaseDetails(${caseData.complaint_id})" title="View Details">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Discard a case
 */
async function discardCase(complaintId) {
    if (!confirm('Are you sure you want to discard this case? It will be removed from active cases but kept in analytics.')) {
        return;
    }

    try {
        const response = await fetch(`/analytics/discard-case/${complaintId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            showToast('Case discarded successfully', 'success');
            await loadAnalyticsData();
            renderCharts();
            renderAnalyticsTable();
        } else {
            showToast(result.error || 'Failed to discard case', 'error');
        }

    } catch (error) {
        console.error('Error discarding case:', error);
        showToast('Failed to discard case', 'error');
    }
}

/**
 * Restore a discarded case
 */
async function restoreCase(complaintId) {
    if (!confirm('Are you sure you want to restore this case?')) {
        return;
    }

    try {
        const response = await fetch(`/analytics/restore-case/${complaintId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            showToast('Case restored successfully', 'success');
            await loadAnalyticsData();
            renderCharts();
            renderAnalyticsTable();
        } else {
            showToast(result.error || 'Failed to restore case', 'error');
        }

    } catch (error) {
        console.error('Error restoring case:', error);
        showToast('Failed to restore case', 'error');
    }
}

/**
 * View case details (reuses existing modals)
 */
function viewCaseDetails(complaintId) {
    // Find the case in analyticsData
    const caseData = analyticsData.allCases.find(c => c.complaint_id === complaintId);
    
    if (!caseData) return;

    // Use existing functions to view details
    if (typeof viewEvidence === 'function') {
        viewEvidence(complaintId);
    }
}

/**
 * Apply filters to analytics table
 */
function applyAnalyticsFilters() {
    const statusFilter = document.getElementById('analytics-filter-status').value;
    const searchFilter = document.getElementById('analytics-filter-search').value.toLowerCase();
    const stateFilter = document.getElementById('analytics-filter-state').value;

    if (!analyticsData || !analyticsData.allCases) return;

    let filtered = [...analyticsData.allCases];

    // Apply status filter
    if (statusFilter) {
        filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Apply state filter (active/discarded)
    if (stateFilter === 'active') {
        filtered = filtered.filter(c => !c.is_discarded);
    } else if (stateFilter === 'discarded') {
        filtered = filtered.filter(c => c.is_discarded);
    }

    // Apply search filter
    if (searchFilter) {
        filtered = filtered.filter(c => 
            c.username.toLowerCase().includes(searchFilter) ||
            (c.complainant_fullname && c.complainant_fullname.toLowerCase().includes(searchFilter)) ||
            (c.complaint_type && c.complaint_type.toLowerCase().includes(searchFilter)) ||
            c.complaint_id.toString().includes(searchFilter)
        );
    }

    // Re-render table with filtered data
    const container = document.getElementById('analytics-table-container');
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search fa-3x"></i>
                <h3>No Results Found</h3>
                <p>No cases match your filter criteria.</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Complainant</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Location</th>
                        <th>State</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(c => renderCaseRow(c)).join('')}
                </tbody>
            </table>
        `;
    }
}

/**
 * Clear all filters
 */
function clearAnalyticsFilters() {
    document.getElementById('analytics-filter-status').value = '';
    document.getElementById('analytics-filter-search').value = '';
    document.getElementById('analytics-filter-state').value = '';
    renderAnalyticsTable();
}

/**
 * Utility: Get status class for styling
 */
function getStatusClass(status) {
    const statusMap = {
        'pending': 'pending',
        'verifying': 'verifying',
        'investigating': 'investigating',
        'resolved': 'resolved'
    };
    return statusMap[status.toLowerCase()] || 'pending';
}

/**
 * Utility: Truncate text
 */
function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Utility: Capitalize first letter
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Utility: Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export functions for use in HTML
if (typeof window !== 'undefined') {
    window.initializeAnalytics = initializeAnalytics;
    window.discardCase = discardCase;
    window.restoreCase = restoreCase;
    window.viewCaseDetails = viewCaseDetails;
    window.applyAnalyticsFilters = applyAnalyticsFilters;
    window.clearAnalyticsFilters = clearAnalyticsFilters;
}
