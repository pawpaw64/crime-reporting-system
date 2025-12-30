// otp-handler.js
class OTPHandler {
    constructor() {
        this.otpInputs = document.querySelectorAll('.otp-input');
        this.otpContainer = document.getElementById('otpContainer');
        this.verifyBtn = document.getElementById('verify-otp-btn');
        this.resendBtn = document.getElementById('resend-otp');
        this.otpError = document.getElementById('otp-error');
        this.timerElement = document.getElementById('otp-timer');
        
        this.timer = null;
        this.timeLeft = 300; // 5 minutes in seconds
        this.canResend = false;
        this.resendCountdown = 60;
        
        this.init();
    }
    
    init() {
        console.log("OTP Handler Initialized");
        
        // Add event listeners to OTP inputs
        this.otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => this.handleOTPInput(e, index));
            input.addEventListener('keydown', (e) => this.handleOTPKeyDown(e, index));
            input.addEventListener('paste', (e) => this.handleOTPPaste(e));
        });
        
        // Add event listeners to buttons
        if (this.verifyBtn) {
            this.verifyBtn.addEventListener('click', () => this.verifyOTP());
        }
        
        if (this.resendBtn) {
            this.resendBtn.addEventListener('click', () => this.resendOTP());
        }
        
        // Auto-start timer if OTP container is visible
        if (this.otpContainer && this.otpContainer.classList.contains('active')) {
            this.startTimer();
            this.focusFirstInput();
        }
    }
    
    handleOTPInput(e, index) {
        const input = e.target;
        const value = input.value;
        
        // Only allow digits
        if (!/^\d$/.test(value)) {
            input.value = '';
            return;
        }
        
        if (value.length === 1) {
            input.classList.add('filled');
            
            // Move to next input if available
            if (index < this.otpInputs.length - 1) {
                this.otpInputs[index + 1].focus();
            }
        } else {
            input.classList.remove('filled');
        }
        
        // Check if all inputs are filled
        this.checkOTPComplete();
    }
    
    handleOTPKeyDown(e, index) {
        const input = e.target;
        
        // Handle backspace
        if (e.key === 'Backspace' && !input.value && index > 0) {
            this.otpInputs[index - 1].focus();
            this.otpInputs[index - 1].value = '';
            this.otpInputs[index - 1].classList.remove('filled');
        }
        
        // Handle arrow keys
        if (e.key === 'ArrowLeft' && index > 0) {
            this.otpInputs[index - 1].focus();
        }
        
        if (e.key === 'ArrowRight' && index < this.otpInputs.length - 1) {
            this.otpInputs[index + 1].focus();
        }
    }
    
    handleOTPPaste(e) {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').trim();
        
        if (/^\d{6}$/.test(pasteData)) {
            const digits = pasteData.split('');
            this.otpInputs.forEach((input, index) => {
                if (digits[index]) {
                    input.value = digits[index];
                    input.classList.add('filled');
                }
            });
            
            // Focus last input
            if (digits.length === 6) {
                this.otpInputs[5].focus();
            }
            
            this.checkOTPComplete();
        }
    }
    
    checkOTPComplete() {
        const otp = this.getOTP();
        if (otp.length === 6) {
            // Auto-enable verify button
            if (this.verifyBtn) {
                this.verifyBtn.disabled = false;
            }
        }
    }
    
    getOTP() {
        return Array.from(this.otpInputs)
            .map(input => input.value)
            .join('');
    }
    
    startTimer() {
        this.stopTimer();
        this.timeLeft = 300; // Reset to 5 minutes
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.showError('OTP has expired. Please request a new code.');
                this.enableResend();
            }
        }, 1000);
        
        // Start resend countdown
        this.startResendCountdown();
    }
    
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    updateTimerDisplay() {
        if (!this.timerElement) return;
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    startResendCountdown() {
        this.canResend = false;
        this.resendCountdown = 60;
        
        if (this.resendBtn) {
            this.resendBtn.disabled = true;
            this.updateResendButton();
            
            const resendTimer = setInterval(() => {
                this.resendCountdown--;
                this.updateResendButton();
                
                if (this.resendCountdown <= 0) {
                    clearInterval(resendTimer);
                    this.enableResend();
                }
            }, 1000);
        }
    }
    
    updateResendButton() {
        if (this.resendBtn) {
            this.resendBtn.textContent = `Resend code (${this.resendCountdown}s)`;
        }
    }
    
    enableResend() {
        this.canResend = true;
        if (this.resendBtn) {
            this.resendBtn.disabled = false;
            this.resendBtn.textContent = 'Resend code';
        }
    }
    
    showError(message) {
        if (this.otpError) {
            this.otpError.textContent = message;
            this.otpError.style.color = '#e74c3c';
        }
    }
    
    showSuccess(message) {
        if (this.otpError) {
            this.otpError.textContent = message;
            this.otpError.style.color = '#2ecc71';
        }
    }
    
    clearError() {
        if (this.otpError) {
            this.otpError.textContent = '';
        }
    }
    
    async verifyOTP() {
        const otp = this.getOTP();
        
        if (otp.length !== 6) {
            this.showError('Please enter the complete 6-digit code');
            return;
        }
        
        // Disable inputs and show loading
        this.otpInputs.forEach(input => input.disabled = true);
        if (this.verifyBtn) {
            this.verifyBtn.disabled = true;
            this.verifyBtn.classList.add('loading');
            this.verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        }
        
        try {
            // Here you would make an API call to verify OTP
            const isValid = await this.verifyOTPWithServer(otp);
            
            if (isValid) {
                this.showSuccess('Email verified successfully!');
                this.otpContainer.classList.add('success');
                
                // Complete the signup process
                setTimeout(() => {
                    this.completeSignup();
                }, 1500);
                
            } else {
                throw new Error('Invalid verification code');
            }
            
        } catch (error) {
            this.showError(error.message || 'Invalid OTP code');
            this.otpInputs.forEach(input => input.disabled = false);
            this.focusFirstInput();
        } finally {
            if (this.verifyBtn) {
                this.verifyBtn.disabled = false;
                this.verifyBtn.classList.remove('loading');
                this.verifyBtn.innerHTML = 'Verify & Complete Signup';
            }
        }
    }
    
    async verifyOTPWithServer(otp) {
        // Simulate API call
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // For demo purposes, accept 123456 as valid
                if (otp === '123456') {
                    resolve(true);
                } else {
                    reject(new Error('Invalid verification code'));
                }   
            }, 1500);
        });
    }   
    completeSignup() {
        // Redirect to profile or dashboard after successful signup
        window.location.href = '/profile';
    }
    focusFirstInput() {
        if (this.otpInputs.length > 0) {
            this.otpInputs[0].focus();
        }
    }
}

// Initialize OTP Handler if OTP container exists
document.addEventListener('DOMContentLoaded', () => {
    const otpContainer = document.getElementById('otpContainer');
    if (otpContainer) {
        new OTPHandler();
    }
});