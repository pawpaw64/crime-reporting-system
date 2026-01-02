// login-validation.js
document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("login-btn");
    const loadingOverlay = document.getElementById("loadingOverlay");

    console.log("Login Validation Initialized");

    // Real-time validation
    const loginUsername = document.getElementById("login-username");
    const loginPassword = document.getElementById("login-password");

    if (loginUsername) {
        loginUsername.addEventListener('input', validateLoginUsername);
        loginUsername.addEventListener('blur', validateLoginUsername);
    }

    if (loginPassword) {
        loginPassword.addEventListener('input', validateLoginPassword);
        loginPassword.addEventListener('blur', validateLoginPassword);
    }

    // Form submission
    if (loginForm) {
        loginForm.addEventListener("submit", function(e) {
            e.preventDefault();
            console.log("Login form submitted");

            if (validateLoginForm()) {
                showLoading(true);
                submitLoginForm();
            }
        });
    }

    // Validation functions
    function validateLoginUsername() {
        const username = loginUsername.value.trim();
        const nameError = document.getElementById("name-error-sign-in");
        
        if (!username) {
            nameError.textContent = "Username is required!";
            nameError.style.color = "#e74c3c";
            return false;
        }
        
        if (username.length < 3) {
            nameError.textContent = "Username must be at least 3 characters!";
            nameError.style.color = "#e74c3c";
            return false;
        }
        
        nameError.textContent = "";
        return true;
    }

    function validateLoginPassword() {
        const password = loginPassword.value.trim();
        const passwordError = document.getElementById("password-error-sign-in");
        
        if (!password) {
            passwordError.textContent = "Password is required!";
            passwordError.style.color = "#e74c3c";
            return false;
        }
        
        if (password.length < 6) {
            passwordError.textContent = "Password must be at least 6 characters!";
            passwordError.style.color = "#e74c3c";
            return false;
        }
        
        passwordError.textContent = "";
        return true;
    }

    function validateLoginForm() {
        const isUsernameValid = validateLoginUsername();
        const isPasswordValid = validateLoginPassword();
        
        return isUsernameValid && isPasswordValid;
    }

    function submitLoginForm() {
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();

        // API Base URL - Use same origin if running from backend server
        const API_BASE_URL = (() => {
            const port = window.location.port;
            if (port === '3000' || port === '30001' || port === '5000'|| port === '5500') {
                return window.location.origin + '/api';
            }
            return `http://${window.location.hostname}:3000/api`;
        })();

        // Create AJAX request
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/login`, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.withCredentials = true; // Enable cookies for session

        // Prepare data
        const data = JSON.stringify({
            username: username,
            password: password
        });

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                showLoading(false);
                const passwordErrorElement = document.getElementById("password-error-sign-in");

                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            // Show success message
                            passwordErrorElement.textContent = "Login successful! Redirecting...";
                            passwordErrorElement.style.color = "#2ecc71";
                            
                            // Redirect to dashboard or profile page
                            setTimeout(() => {
                                window.location.href = response.redirect || "/";
                            }, 1000);
                        } else {
                            passwordErrorElement.textContent = response.message || "Invalid credentials!";
                            passwordErrorElement.style.color = "#e74c3c";
                        }
                    } catch (e) {
                        passwordErrorElement.textContent = "Error processing response";
                        passwordErrorElement.style.color = "#e74c3c";
                        console.error("Parse error:", e);
                    }
                } else if (xhr.status === 401) {
                    passwordErrorElement.textContent = "Invalid username or password!";
                    passwordErrorElement.style.color = "#e74c3c";
                } else if (xhr.status === 429) {
                    passwordErrorElement.textContent = "Too many attempts. Please try again later.";
                    passwordErrorElement.style.color = "#e74c3c";
                } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        passwordErrorElement.textContent = response.message || "Login failed. Please try again.";
                        passwordErrorElement.style.color = "#e74c3c";
                    } catch (e) {
                        passwordErrorElement.textContent = "Server error. Please try again.";
                        passwordErrorElement.style.color = "#e74c3c";
                    }
                }
            }
        };

        xhr.onerror = function() {
            showLoading(false);
            document.getElementById("password-error-sign-in").textContent = "Network error. Please check your connection.";
            document.getElementById("password-error-sign-in").style.color = "#e74c3c";
        };

        xhr.timeout = 10000; // 10 second timeout
        xhr.ontimeout = function() {
            showLoading(false);
            document.getElementById("password-error-sign-in").textContent = "Request timeout. Please try again.";
            document.getElementById("password-error-sign-in").style.color = "#e74c3c";
        };

        xhr.send(data);
    }

    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? "flex" : "none";
        }
        if (loginBtn) {
            loginBtn.disabled = show;
            if (show) {
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            } else {
                loginBtn.innerHTML = 'Login';
            }
        }
    }

    // Enter key to submit
    if (loginUsername) {
        loginUsername.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (validateLoginForm()) {
                    showLoading(true);
                    submitLoginForm();
                }
            }
        });
    }

    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (validateLoginForm()) {
                    showLoading(true);
                    submitLoginForm();
                }
            }
        });
    }
});