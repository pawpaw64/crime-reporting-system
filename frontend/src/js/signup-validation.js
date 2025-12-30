// signup-validation.js
document.addEventListener("DOMContentLoaded", function() {
    const signupForm = document.getElementById("signupForm");
    const signupBtn = document.getElementById("signup-btn");
    const loadingOverlay = document.getElementById("loadingOverlay");

    console.log("Signup Validation Initialized");

    // Elements
    const signupUsername = document.getElementById("signup-username");
    const contactEmail = document.getElementById("contact-email");
    const signupPassword = document.getElementById("signup-password");
    const confirmPassword = document.getElementById("confirm-password");

    // Real-time validation
    if (signupUsername) {
        signupUsername.addEventListener('input', validateName);
        signupUsername.addEventListener('blur', validateName);
    }

    if (contactEmail) {
        contactEmail.addEventListener('input', validateEmail);
        contactEmail.addEventListener('blur', validateEmail);
    }

    if (signupPassword) {
        signupPassword.addEventListener('input', validatePassword);
        signupPassword.addEventListener('blur', validatePassword);
    }

    if (confirmPassword) {
        confirmPassword.addEventListener('input', validateConfirmPassword);
        confirmPassword.addEventListener('blur', validateConfirmPassword);
    }

    // Form submission
    if (signupForm) {
        signupForm.addEventListener("submit", function(e) {
            e.preventDefault();
            console.log("Signup form submitted");

            if (validateSignupForm()) {
                showLoading(true);
                // Instead of immediate submission, show OTP
                setTimeout(() => {
                    showLoading(false);
                    showOTPSection();
                }, 1000);
            }
        });
    }

    // Validation functions
    function validateName() {
        const name = signupUsername.value.trim();
        const nameError = document.getElementById("name-error-signup");
        const nameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        
        if (!name) {
            nameError.textContent = "Username is required!";
            nameError.style.color = "#e74c3c";
            return false;
        }
        
        if (name.length < 3) {
            nameError.textContent = "Username must be at least 3 characters!";
            nameError.style.color = "#e74c3c";
            return false;
        }
        
        if (name.length > 20) {
            nameError.textContent = "Username must be less than 20 characters!";
            nameError.style.color = "#e74c3c";
            return false;
        }
        
        if (!nameRegex.test(name)) {
            nameError.textContent = "Only letters, numbers and underscores allowed!";
            nameError.style.color = "#e74c3c";
            return false;
        }
        
        nameError.textContent = "";
        return true;
    }

    function validateEmail() {
        const email = contactEmail.value.trim();
        const emailError = document.getElementById("email-error");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            emailError.textContent = "Email is required!";
            emailError.style.color = "#e74c3c";
            return false;
        }
        
        if (!emailRegex.test(email)) {
            emailError.textContent = "Please enter a valid email address!";
            emailError.style.color = "#e74c3c";
            return false;
        }
        
        // Check for common email providers
        const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
        const domain = email.split('@')[1];
        if (!allowedDomains.includes(domain.toLowerCase())) {
            emailError.textContent = "Please use a common email provider (Gmail, Yahoo, Outlook, etc.)";
            emailError.style.color = "#e74c3c";
            return false;
        }
        
        emailError.textContent = "";
        return true;
    }

    function validatePassword() {
        const password = signupPassword.value;
        const passwordError = document.getElementById("password-error");
        
        if (!password) {
            passwordError.textContent = "Password is required!";
            passwordError.style.color = "#e74c3c";
            return false;
        }
        
        if (password.length < 8) {
            passwordError.textContent = "Password must be at least 8 characters!";
            passwordError.style.color = "#e74c3c";
            return false;
        }
        
        // Check password strength
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        let strengthMessages = [];
        if (!hasUpperCase) strengthMessages.push("one uppercase letter");
        if (!hasLowerCase) strengthMessages.push("one lowercase letter");
        if (!hasNumbers) strengthMessages.push("one number");
        if (!hasSpecialChar) strengthMessages.push("one special character");
        
        if (strengthMessages.length > 0) {
            passwordError.textContent = "Password must contain at least " + strengthMessages.join(", ");
            passwordError.style.color = "#e74c3c";
            return false;
        }
        
        passwordError.textContent = "";
        return true;
    }

    function validateConfirmPassword() {
        const password = signupPassword.value;
        const confirm = confirmPassword.value;
        const confirmError = document.getElementById("confirm-password-error");
        
        if (!confirm) {
            confirmError.textContent = "Please confirm your password!";
            confirmError.style.color = "#e74c3c";
            return false;
        }
        
        if (password !== confirm) {
            confirmError.textContent = "Passwords do not match!";
            confirmError.style.color = "#e74c3c";
            return false;
        }
        
        confirmError.textContent = "";
        return true;
    }

    function validateSignupForm() {
        const isNameValid = validateName();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isConfirmValid = validateConfirmPassword();
        
        const submitError = document.getElementById("submit-error");
        
        if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
            submitError.textContent = "Please fix all errors before submitting!";
            submitError.style.color = "#e74c3c";
            return false;
        }
        
        submitError.textContent = "";
        return true;
    }

    function showOTPSection() {
        const otpContainer = document.getElementById('otpContainer');
        const verifyBtn = document.getElementById('verify-otp-btn');
        
        if (otpContainer) {
            otpContainer.classList.add('active');
            otpContainer.style.display = 'flex';
            
            // Scroll to OTP section
            otpContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        if (verifyBtn) {
            verifyBtn.classList.add('active');
            verifyBtn.style.display = 'block';
        }
        
        // Trigger OTP sending (simulate)
        simulateSendOTP();
    }

    function simulateSendOTP() {
        console.log("Simulating OTP sending to email...");
        // In real app, make API call to send OTP
        // For demo, we'll just show success message
        const otpError = document.getElementById('otp-error');
        if (otpError) {
            otpError.textContent = "Verification code sent to your email!";
            otpError.style.color = "#2ecc71";
            
            // Clear after 3 seconds
            setTimeout(() => {
                otpError.textContent = "";
            }, 3000);
        }
    }

    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? "flex" : "none";
        }
        if (signupBtn) {
            signupBtn.disabled = show;
            if (show) {
                signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            } else {
                signupBtn.innerHTML = 'Sign Up';
            }
        }
    }

    // Enter key to submit
    [signupUsername, contactEmail, signupPassword, confirmPassword].forEach(input => {
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (validateSignupForm()) {
                        showLoading(true);
                        setTimeout(() => {
                            showLoading(false);
                            showOTPSection();
                        }, 1000);
                    }
                }
            });
        }
    });
});