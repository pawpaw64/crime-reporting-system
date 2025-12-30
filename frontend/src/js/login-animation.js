// login-animation.js
document.addEventListener("DOMContentLoaded", function() {
    const sign_in_btn = document.getElementById("sign-in-btn");
    const sign_up_btn = document.getElementById("sign-up-btn");
    const container = document.querySelector(".container");

    console.log("Login Animation Initialized");
    console.log("Elements found:", {
        sign_up_btn: !!sign_up_btn,
        sign_in_btn: !!sign_in_btn,
        container: !!container
    });

    // Sign Up Button Click
    if (sign_up_btn) {
        sign_up_btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Sign Up button clicked");
            if (container) {
                container.classList.add("sign-up-mode");
                console.log("Added sign-up-mode class");
                
                // Clear any errors when switching forms
                clearFormErrors('login');
                clearFormErrors('signup');
                
                // Reset OTP section if visible
                const otpContainer = document.getElementById('otpContainer');
                const verifyBtn = document.getElementById('verify-otp-btn');
                if (otpContainer) {
                    otpContainer.classList.remove('active');
                    otpContainer.classList.remove('success');
                    otpContainer.style.display = 'none';
                }
                if (verifyBtn) {
                    verifyBtn.classList.remove('active');
                    verifyBtn.style.display = 'none';
                }
            }
        });
    }
    
    // Sign In Button Click
    if (sign_in_btn) {
        sign_in_btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Sign In button clicked");
            if (container) {
                container.classList.remove("sign-up-mode");
                console.log("Removed sign-up-mode class");
                
                // Clear any errors when switching forms
                clearFormErrors('login');
                clearFormErrors('signup');
                
                // Reset OTP section if visible
                const otpContainer = document.getElementById('otpContainer');
                const verifyBtn = document.getElementById('verify-otp-btn');
                if (otpContainer) {
                    otpContainer.classList.remove('active');
                    otpContainer.classList.remove('success');
                    otpContainer.style.display = 'none';
                }
                if (verifyBtn) {
                    verifyBtn.classList.remove('active');
                    verifyBtn.style.display = 'none';
                }
            }
        });
    }

    // Also make panel content buttons clickable
    const panelButtons = document.querySelectorAll('.panel .btn.transparent');
    panelButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const isSignUp = this.textContent.includes('Sign Up');
            console.log("Panel button clicked - isSignUp:", isSignUp);
            
            if (isSignUp) {
                container.classList.add("sign-up-mode");
                clearFormErrors('login');
                clearFormErrors('signup');
            } else {
                container.classList.remove("sign-up-mode");
                clearFormErrors('login');
                clearFormErrors('signup');
            }
        });
    });

    // Add toggle password visibility for all password fields
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            if (passwordInput) {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // Toggle eye icon
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            }
        });
    });

    // Function to clear form errors
    function clearFormErrors(formType) {
        if (formType === 'login') {
            const nameError = document.getElementById('name-error-sign-in');
            const passwordError = document.getElementById('password-error-sign-in');
            if (nameError) nameError.textContent = '';
            if (passwordError) passwordError.textContent = '';
        } else if (formType === 'signup') {
            const nameError = document.getElementById('name-error-signup');
            const emailError = document.getElementById('email-error');
            const passwordError = document.getElementById('password-error');
            const confirmError = document.getElementById('confirm-password-error');
            const submitError = document.getElementById('submit-error');
            
            if (nameError) nameError.textContent = '';
            if (emailError) emailError.textContent = '';
            if (passwordError) passwordError.textContent = '';
            if (confirmError) confirmError.textContent = '';
            if (submitError) submitError.textContent = '';
        }
    }

    console.log("Animation system ready");
});