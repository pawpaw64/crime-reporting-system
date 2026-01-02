// Admin Login with OTP Verification (NEW SECURE SYSTEM)
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("admin-login-form");
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const otpContainer = document.getElementById("otp-container");
    const otpInput = document.getElementById("otp-input");
    const otpError = document.getElementById("otp-error");
    const verifyOtpBtn = document.getElementById("verify-otp-btn");
    const loginBtn = document.getElementById("login-btn");
    const infoMessage = document.getElementById("info-message");
    const infoText = document.getElementById("info-text");

    let currentUsername = '';

    // Show info message
    function showInfo(message) {
        infoMessage.style.display = 'block';
        infoText.textContent = message;
    }

    // Show error message
    function showError(message) {
        otpError.innerHTML = message;
        otpError.style.color = "#f44336";
    }

    // Clear messages
    function clearMessages() {
        infoMessage.style.display = 'none';
        otpError.innerHTML = '';
    }

    // Step 1: Login form submission - Verify credentials & send OTP
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearMessages();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showError("Please enter username and password");
            return;
        }

        loginBtn.value = "Verifying...";
        loginBtn.disabled = true;

        try {
            const response = await fetch('/adminLogin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success && data.requireOTP) {
                // OTP sent successfully
                currentUsername = username;
                showInfo("OTP sent to your registered email. Please check and enter it below.");
                
                // Hide login fields, show OTP field
                usernameInput.disabled = true;
                passwordInput.disabled = true;
                loginBtn.style.display = 'none';
                otpContainer.style.display = 'flex';
                verifyOtpBtn.style.display = 'block';
                
                otpInput.focus();
            } else if (data.success) {
                // Direct login (shouldn't happen with new system)
                window.location.href = data.redirect || '/admin-dashboard';
            } else {
                showError(data.message || "Login failed");
                loginBtn.value = "Login";
                loginBtn.disabled = false;
            }

        } catch (error) {
            console.error('Login error:', error);
            showError("Network error. Please try again.");
            loginBtn.value = "Login";
            loginBtn.disabled = false;
        }
    });

    // Step 2: Verify OTP
    verifyOtpBtn.addEventListener("click", async function() {
        clearMessages();
        
        const otp = otpInput.value.trim();

        if (!otp || otp.length !== 6) {
            showError("Please enter a valid 6-digit OTP");
            return;
        }

        verifyOtpBtn.value = "Verifying...";
        verifyOtpBtn.disabled = true;

        try {
            const response = await fetch('/admin-verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username: currentUsername, 
                    otp: otp 
                })
            });

            const data = await response.json();

            if (data.success) {
                showInfo("Login successful! Redirecting...");
                setTimeout(() => {
                    window.location.href = data.redirect || '/admin-dashboard';
                }, 1000);
            } else {
                showError(data.message || "Invalid OTP. Please try again.");
                verifyOtpBtn.value = "Verify OTP & Login";
                verifyOtpBtn.disabled = false;
            }

        } catch (error) {
            console.error('OTP verification error:', error);
            showError("Network error. Please try again.");
            verifyOtpBtn.value = "Verify OTP & Login";
            verifyOtpBtn.disabled = false;
        }
    });

    // Allow OTP submission with Enter key
    otpInput.addEventListener("keypress", function(e) {
        if (e.key === 'Enter') {
            verifyOtpBtn.click();
        }
    });

    // Check for error parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'inactive') {
        showError("Your account is inactive or pending approval. Please contact Super Admin.");
    }
});
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                otpContainer.style.display = 'block';
                verifyOtpBtn.style.display = "block";
                otpError.innerHTML = "✅ OTP sent to your email";
                otpError.style.color = "#4CAF50";
            } else {
                otpError.innerHTML = "❌ Failed to send OTP: " + data.message;
                otpError.style.color = "#f44336";
            }
        })
        .catch(error => {
            otpError.innerHTML = "❌ Failed to send OTP. Please try again.";
            otpError.style.color = "#f44336";
            console.error('Error:', error);
        });
    });

    // OTP verification handler - Verify via backend then process login
    verifyOtpBtn.addEventListener("click", function () {
        const enteredOTP = otpInputField.value;
        const email = emailInput.value;

        if (!enteredOTP || enteredOTP.length !== 6) {
            otpError.innerHTML = "❌ Please enter a valid 6-digit OTP";
            otpError.style.color = "#f44336";
            return;
        }

        otpError.innerHTML = "Verifying OTP...";
        otpError.style.color = "#2196F3";

        // Verify OTP with backend
        fetch('/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: email,
                otp: enteredOTP 
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                otpError.innerHTML = "✅ OTP verified. Processing login...";
                otpError.style.color = "#4CAF50";

                // Get form data
                const username = usernameInput.value;
                const password = passwordInput.value;
                const district = districtSelect.value;

                // Create AJAX request for admin login
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/adminLogin", true);
                xhr.setRequestHeader("Content-Type", "application/json");
                
                // Prepare data
                const loginData = JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    district_name: district
                });
                
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                otpError.innerHTML = "✅ " + response.message;
                                otpError.style.color = "#4CAF50";
                                
                                // Redirect to admin dashboard after successful login
                                setTimeout(() => {
                                    window.location.href = "/admin-dashboard";
                                }, 2000);
                            } catch (e) {
                                otpError.innerHTML = "✅ Login successful!";
                                otpError.style.color = "#4CAF50";
                                setTimeout(() => {
                                    window.location.href = "/admin-dashboard";
                                }, 2000);
                            }
                        } else {
                            otpError.innerHTML = "❌ Login failed: " + xhr.responseText;
                            otpError.style.color = "#f44336";
                        }
                    }
                };

                xhr.send(loginData);
            } else {
                otpError.innerHTML = "❌ " + (data.message || "Invalid OTP. Please try again.");
                otpError.style.color = "#f44336";
            }
        })
        .catch(error => {
            otpError.innerHTML = "❌ Verification failed. Please try again.";
            otpError.style.color = "#f44336";
            console.error('Error:', error);
        });
    });
});