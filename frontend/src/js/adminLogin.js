// Admin Login (Email already verified - no OTP required)
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("admin-login-form");
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById("login-btn");
    const messageContainer = document.getElementById("message-container");

    // Show message (success or error)
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

    // Clear messages
    function clearMessages() {
        if (messageContainer) messageContainer.innerHTML = '';
    }

    // Login form submission - Direct login (no OTP)
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearMessages();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showMessage("Please enter username and password");
            return;
        }

        loginBtn.value = "Logging in...";
        loginBtn.disabled = true;

        try {
            const response = await fetch('/adminLogin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Login successful - redirect to dashboard
                showMessage("Login successful! Redirecting to dashboard...", false);
                setTimeout(() => {
                    window.location.href = data.redirect || '/admin-dashboard';
                }, 1000);
            } else {
                showMessage(data.message || "Login failed. Please check your credentials.");
                loginBtn.value = "Login";
                loginBtn.disabled = false;
            }

        } catch (error) {
            console.error('Login error:', error);
            showMessage("Network error. Please try again.");
            loginBtn.value = "Login";
            loginBtn.disabled = false;
        }
    });

    // Check for error parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'inactive') {
        showMessage("Your account is inactive or pending approval. Please contact Super Admin.");
    } else if (errorParam === 'session') {
        showMessage("Your session has expired. Please login again.");
    }
});