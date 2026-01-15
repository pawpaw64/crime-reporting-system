// ============================================
// LOGIN PAGE HANDLER
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initLoginForm();
    initSignupForm();
    initFormToggle();
    initPasswordToggles();
});

// ===== FORM TOGGLE =====
function initFormToggle() {
    const signInBtn = document.getElementById('sign-in-btn');
    const signUpBtn = document.getElementById('sign-up-btn');
    const container = document.querySelector('.container');
    
    if (!signInBtn || !signUpBtn || !container) return;
    
    signUpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        container.classList.add('sign-up-mode');
        clearAllErrors();
        resetOTPSection();
    });
    
    signInBtn.addEventListener('click', (e) => {
        e.preventDefault();
        container.classList.remove('sign-up-mode');
        clearAllErrors();
        resetOTPSection();
    });
    
    // Panel buttons
    document.querySelectorAll('.panel .btn.transparent').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const isSignUp = btn.textContent.includes('Sign Up');
            container.classList.toggle('sign-up-mode', isSignUp);
            clearAllErrors();
        });
    });
}

// ===== LOGIN FORM =====
function initLoginForm() {
    const form = document.getElementById('loginForm');
    const username = document.getElementById('login-username');
    const password = document.getElementById('login-password');
    
    if (!form) return;
    
    // Real-time validation
    username?.addEventListener('input', () => validateField(username, 'name-error-sign-in', validateUsername));
    password?.addEventListener('input', () => validateField(password, 'password-error-sign-in', validatePassword));
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isValid = validateField(username, 'name-error-sign-in', validateUsername) &&
                       validateField(password, 'password-error-sign-in', validatePassword);
        
        if (!isValid) return;
        
        showLoading(true);
        
        try {
            const API_BASE = getApiBase();
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    username: username.value.trim(),
                    password: password.value.trim()
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('login', 'Login successful! Redirecting...', false);
                setTimeout(() => window.location.href = data.redirect || '/profile', 1000);
            } else {
                showMessage('login', data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('login', 'Network error. Please try again.');
        } finally {
            showLoading(false);
        }
    });
}

// ===== SIGNUP FORM =====
function initSignupForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;
    
    const username = document.getElementById('signup-username');
    const email = document.getElementById('contact-email');
    const password = document.getElementById('signup-password');
    const confirmPwd = document.getElementById('confirm-password');
    
    // Real-time validation
    username?.addEventListener('input', () => validateField(username, 'name-error-signup', validateSignupUsername));
    email?.addEventListener('input', () => validateField(email, 'email-error', validateEmail));
    password?.addEventListener('input', () => validateField(password, 'password-error', validateSignupPassword));
    confirmPwd?.addEventListener('input', () => validateConfirmPassword());
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isValid = validateField(username, 'name-error-signup', validateSignupUsername) &&
                       validateField(email, 'email-error', validateEmail) &&
                       validateField(password, 'password-error', validateSignupPassword) &&
                       validateConfirmPassword();
        
        if (!isValid) {
            showSubmitError('Please fix errors to submit!');
            return;
        }
        
        showLoading(true);
        
        try {
            const response = await fetch('/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.value.trim() })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showOTPSection();
                showOTPMessage('OTP sent to your email', false);
            } else {
                showOTPMessage(data.message || 'Failed to send OTP');
            }
        } catch (error) {
            showOTPMessage('Network error. Please try again.');
        } finally {
            showLoading(false);
        }
    });
}

// ===== VALIDATION HELPERS =====
function validateUsername(value) {
    if (!value) return 'Username is required!';
    if (value.length < 3) return 'Username must be at least 3 characters!';
    return null;
}

function validatePassword(value) {
    if (!value) return 'Password is required!';
    if (value.length < 6) return 'Password must be at least 6 characters!';
    return null;
}

function validateSignupUsername(value) {
    if (!value) return 'Username is required!';
    if (value.length < 5) return 'Username must be at least 5 characters!';
    if (!/^[^\s]+$/.test(value)) return "Username can't contain spaces!";
    return null;
}

function validateEmail(value) {
    if (!value) return 'Email is required!';
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) return 'Invalid email!';
    return null;
}

function validateSignupPassword(value) {
    if (!value) return 'Password is required!';
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(value)) {
        return 'Must contain letter, number, special character';
    }
    return null;
}

function validateConfirmPassword() {
    const pwd = document.getElementById('signup-password')?.value;
    const confirm = document.getElementById('confirm-password')?.value;
    const error = document.getElementById('confirm-password-error');
    
    if (!confirm) {
        if (error) error.textContent = 'Please confirm your password!';
        return false;
    }
    if (pwd !== confirm) {
        if (error) error.textContent = 'Passwords do not match!';
        return false;
    }
    if (error) error.innerHTML = '<i class="fas fa-check-circle"></i>';
    return true;
}

function validateField(input, errorId, validator) {
    const error = document.getElementById(errorId);
    const message = validator(input?.value?.trim() || '');
    
    if (error) {
        if (message) {
            error.textContent = message;
            error.style.color = '#e74c3c';
            return false;
        } else {
            error.innerHTML = '<i class="fas fa-check-circle"></i>';
            return true;
        }
    }
    return !message;
}

// ===== UI HELPERS =====
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function showMessage(form, message, isError = true) {
    const container = document.getElementById(`${form}-message`) || 
                     document.getElementById('submit-error');
    if (container) {
        container.style.display = 'block';
        container.style.color = isError ? '#e74c3c' : '#22c55e';
        container.textContent = message;
    }
}

function showSubmitError(message) {
    const error = document.getElementById('submit-error');
    if (error) {
        error.style.display = 'block';
        error.textContent = message;
        setTimeout(() => error.style.display = 'none', 3000);
    }
}

function showOTPSection() {
    const container = document.getElementById('otp-container');
    const verifyBtn = document.getElementById('verify-otp-btn');
    if (container) container.style.display = 'block';
    if (verifyBtn) verifyBtn.style.display = 'block';
}

function resetOTPSection() {
    const container = document.getElementById('otp-container') || document.getElementById('otpContainer');
    const verifyBtn = document.getElementById('verify-otp-btn');
    if (container) {
        container.style.display = 'none';
        container.classList.remove('active', 'success');
    }
    if (verifyBtn) verifyBtn.style.display = 'none';
}

function showOTPMessage(message, isError = true) {
    const error = document.getElementById('otp-error');
    if (error) {
        error.textContent = message;
        error.style.color = isError ? '#e74c3c' : '#22c55e';
    }
}

function clearAllErrors() {
    ['name-error-sign-in', 'password-error-sign-in', 'name-error-signup', 
     'email-error', 'password-error', 'confirm-password-error', 'otp-error', 'submit-error']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });
}

function initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                this.classList.toggle('fa-eye', !isPassword);
                this.classList.toggle('fa-eye-slash', isPassword);
            }
        });
    });
}

function getApiBase() {
    const port = window.location.port;
    if (['3000', '3001', '5000', '5500'].includes(port)) {
        return window.location.origin + '/api';
    }
    return `http://${window.location.hostname}:3000/api`;
}
