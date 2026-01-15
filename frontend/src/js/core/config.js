// ============================================
// CENTRALIZED API CONFIGURATION
// ============================================

const Config = (() => {
    const DEFAULT_PORT = 3000;
    const BACKEND_PORTS = ['3000', '3001', '5000'];
    let detectedBackendPort = null;
    
    const detectBackendPort = async () => {
        if (detectedBackendPort) return detectedBackendPort;
        
        const hostname = window.location.hostname;
        for (const port of BACKEND_PORTS) {
            try {
                const response = await fetch(`http://${hostname}:${port}/check-auth`, {
                    method: 'GET',
                    credentials: 'include',
                    signal: AbortSignal.timeout(1000)
                });
                if (response) {
                    detectedBackendPort = port;
                    return port;
                }
            } catch (e) { /* Port not available */ }
        }
        return DEFAULT_PORT;
    };
    
    const getApiBaseUrl = () => {
        const hostname = window.location.hostname;
        const currentPort = window.location.port;
        
        if (BACKEND_PORTS.includes(currentPort)) return '/api';
        const backendPort = detectedBackendPort || DEFAULT_PORT;
        return `http://${hostname}:${backendPort}/api`;
    };
    
    const getBaseUrl = () => {
        const hostname = window.location.hostname;
        const currentPort = window.location.port;
        
        if (BACKEND_PORTS.includes(currentPort)) return window.location.origin;
        return `http://${hostname}:${DEFAULT_PORT}`;
    };
    
    const isBackendServer = () => BACKEND_PORTS.includes(window.location.port);
    
    return {
        API_BASE_URL: getApiBaseUrl(),
        BASE_URL: getBaseUrl(),
        DEFAULT_PORT,
        BACKEND_PORTS,
        isBackendServer,
        getApiBaseUrl,
        getBaseUrl,
        detectBackendPort
    };
})();

// ============================================
// UTILITY FUNCTIONS
// ============================================

const Utils = {
    // Show loading overlay
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    },
    
    // Show toast notification
    showToast(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex; align-items: center; gap: 10px; z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    },
    
    // Format date
    formatDate(dateStr, options = {}) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', ...options
        });
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },
    
    // API call wrapper
    async apiCall(endpoint, options = {}) {
        const url = endpoint.startsWith('/api') ? endpoint : `${Config.API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        return response.json();
    }
};

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Config, Utils };
}
