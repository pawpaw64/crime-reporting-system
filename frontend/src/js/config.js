// ============================================
// CENTRALIZED API CONFIGURATION
// ============================================
// This file provides a single source of truth for
// all API-related configurations across the frontend
// ============================================

const Config = (() => {
    // Default backend port - change this to match your backend .env PORT
    const DEFAULT_PORT = 3000;
    
    // List of known backend ports for auto-detection
    // Includes primary port and fallback ports (3001 if 3000 is busy)
    const BACKEND_PORTS = ['3000', '3001', '5000'];
    
    // Store detected backend port
    let detectedBackendPort = null;
    
    /**
     * Try to detect available backend port
     */
    const detectBackendPort = async () => {
        if (detectedBackendPort) return detectedBackendPort;
        
        const hostname = window.location.hostname;
        
        // Try ports in order
        for (const port of BACKEND_PORTS) {
            try {
                const response = await fetch(`http://${hostname}:${port}/check-auth`, {
                    method: 'GET',
                    credentials: 'include',
                    signal: AbortSignal.timeout(1000)
                });
                if (response) {
                    detectedBackendPort = port;
                    console.log(`Backend detected on port ${port}`);
                    return port;
                }
            } catch (e) {
                // Port not available, try next
            }
        }
        
        return DEFAULT_PORT;
    };
    
    /**
     * Get the API base URL
     * Automatically detects if running from backend server or standalone
     */
    const getApiBaseUrl = () => {
        const hostname = window.location.hostname;
        const currentPort = window.location.port;
        
        // If running from backend server (same origin), use relative path
        if (BACKEND_PORTS.includes(currentPort)) {
            return '/api';
        }
        
        // If running from Live Server (5500) or other dev servers, connect to backend
        // Try 3001 first as fallback since 3000 is often busy
        const backendPort = detectedBackendPort || DEFAULT_PORT;
        return `http://${hostname}:${backendPort}/api`;
    };
    
    /**
     * Get the base URL (without /api path)
     */
    const getBaseUrl = () => {
        const hostname = window.location.hostname;
        const currentPort = window.location.port;
        
        if (BACKEND_PORTS.includes(currentPort)) {
            return window.location.origin;
        }
        
        return `http://${hostname}:${DEFAULT_PORT}`;
    };
    
    /**
     * Check if running on backend server
     */
    const isBackendServer = () => {
        return BACKEND_PORTS.includes(window.location.port);
    };
    
    return {
        API_BASE_URL: getApiBaseUrl(),
        BASE_URL: getBaseUrl(),
        DEFAULT_PORT,
        BACKEND_PORTS,
        isBackendServer,
        getApiBaseUrl,
        getBaseUrl
    };
})();

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
