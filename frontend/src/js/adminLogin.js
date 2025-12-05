// Admin Login and OTP Verification (Using Nodemailer Backend)
document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".sign-in-form");
    const usernameInput = form.querySelector('input[name="username"]');
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const districtSelect = form.querySelector('select[name="district"]');
    const otpContainer = document.getElementById("otp-container");
    const otpInputField = document.getElementById("otp-input-2");
    const otpError = document.getElementById("otp-error");
    const verifyOtpBtn = document.getElementById("verify-otp-btn");

    // Validation Error Elements
    const nameError = document.getElementById("name-error-admin");
    const emailError = document.getElementById("email-error-admin");
    const passwordError = document.getElementById("password-error-admin");

    // Validation Functions
    function validateUsername() {
        const username = usernameInput.value;
        if (username.length === 0) {
            nameError.innerHTML = "Username is required!";
            return false;
        }
        if (username.length <= 5) {
            nameError.innerHTML = "Username must contain at least 5 characters!";
            return false;
        }
        if (!username.match(/^[^\s]+$/)) {
            nameError.innerHTML = "Username can't contain spaces!";
            return false;
        }
        nameError.innerHTML = '<i class="fas fa-check-circle"></i>';
        return true;
    }

    function validateEmail() {
        const email = emailInput.value;
        if (email.length === 0) {
            emailError.innerHTML = "Email is required";
            return false;
        }
        if (!email.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
            emailError.innerHTML = "Invalid email!";
            return false;
        }
        emailError.innerHTML = '<i class="fas fa-check-circle"></i>';
        return true;
    }

    function validatePassword() {
        const password = passwordInput.value;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

        if (password.length === 0) {
            passwordError.innerHTML = "Password is required!";
            return false;
        }
        if (!passwordRegex.test(password)) {
            passwordError.innerHTML = "Must contain letter, number, special character";
            return false;
        }
        passwordError.innerHTML = '<i class="fas fa-check-circle"></i>';
        return true;
    }

    function validateDistrict() {
        if (districtSelect.value === "" || districtSelect.value === null) {
            return false;
        }
        return true;
    }

    function validateForm() {
        return validateUsername() && validateEmail() && validatePassword() && validateDistrict();
    }

    // Event Listeners
    usernameInput.addEventListener("blur", validateUsername);
    emailInput.addEventListener("blur", validateEmail);
    passwordInput.addEventListener("blur", validatePassword);

    // Form submission handler - Send OTP via backend
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!validateForm()) {
            otpError.innerHTML = "Please fix all errors before proceeding!";
            otpError.style.color = "#f44336";
            return;
        }

        // Send OTP via backend
        const email = emailInput.value;
        otpError.innerHTML = "Sending OTP...";
        otpError.style.color = "#2196F3";

        fetch('/send-otp', {
            method: 'POST',
            headers: {
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