// ============================================
// ADMIN LOGIN PAGE HANDLER
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('admin-login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const messageContainer = document.getElementById('message-container');
    
    if (!form) return;
    
    // Handle URL error params
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'inactive') {
        showMessage('Your account is inactive or pending approval. Please contact Super Admin.');
    } else if (errorParam === 'session') {
        showMessage('Your session has expired. Please login again.');
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();
        
        const username = usernameInput?.value.trim();
        const password = passwordInput?.value.trim();
        
        if (!username || !password) {
            showMessage('Please enter username and password');
            return;
        }
        
        if (loginBtn) {
            loginBtn.value = 'Logging in...';
            loginBtn.disabled = true;
        }
        
        try {
            const response = await fetch('/adminLogin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('Login successful! Redirecting to dashboard...', false);
                setTimeout(() => {
                    window.location.href = data.redirect || '/admin-dashboard';
                }, 1000);
            } else {
                showMessage(data.message || 'Login failed. Please check your credentials.');
                resetButton();
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Network error. Please try again.');
            resetButton();
        }
    });
    
    function showMessage(message, isError = true) {
        if (messageContainer) {
            messageContainer.innerHTML = `
                <div style="padding: 12px 16px; border-radius: 8px; margin-top: 15px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem;
                    background: ${isError ? '#fee2e2' : '#dcfce7'}; 
                    border-left: 4px solid ${isError ? '#ef4444' : '#22c55e'}; 
                    color: ${isError ? '#991b1b' : '#166534'};">
                    <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;
        }
    }
    
    function clearMessages() {
        if (messageContainer) messageContainer.innerHTML = '';
    }
    
    function resetButton() {
        if (loginBtn) {
            loginBtn.value = 'Login';
            loginBtn.disabled = false;
        }
    }
});
