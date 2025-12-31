// Global State
let currentStep = 1;
const totalSteps = 7;
let otpTimer = null;
let cameraStream = null;
let capturedImageData = null;
let registrationSessionId = null; // Track registration session

// API Base URL - Try common backend ports
const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    // If already running from backend server, use same origin
    if (window.location.port === '3000' || window.location.port === '30001' || window.location.port === '5000') {
        return window.location.origin + '/api';
    }
    // Default to port 3000 for development
    return `http://${hostname}:3000/api`;
})();

// User Data Object
const userData = {
    mobile: '',
    otp: '',
    nid: '',
    dob: '',
    nameEn: '',
    nameBn: '',
    fatherName: '',
    motherName: '',
    faceImage: '',
    division: '',
    district: '',
    policeStation: '',
    union: '',
    village: '',
    placeDetails: '',
    username: '',
    email: '',
    password: ''
};

// Initialize OTP Input Handlers
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOMContentLoaded: Initializing event listeners');
    
    initializeOTPInputs();
    initializePasswordValidation();
    initializeEventListeners();
});

// Initialize all event listeners (replaces inline onclick/onchange handlers)
function initializeEventListeners() {
    console.log('[DEBUG] initializeEventListeners: Setting up button and select handlers');
    
    // Logo error handler
    const logoImg = document.getElementById('logo-img');
    if (logoImg) {
        logoImg.addEventListener('error', function() {
            this.style.display = 'none';
        });
    }
    
    // Step 1: Mobile submit
    const step1Submit = document.getElementById('step1-submit');
    if (step1Submit) {
        step1Submit.addEventListener('click', validateStep1);
    }
    
    // Step 2: OTP submit and resend
    const step2Submit = document.getElementById('step2-submit');
    if (step2Submit) {
        step2Submit.addEventListener('click', validateStep2);
    }
    
    const resendOtpBtn = document.getElementById('resend-otp');
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', resendOTP);
    }
    
    // Step 3: NID verification
    const step3Submit = document.getElementById('step3-submit');
    if (step3Submit) {
        step3Submit.addEventListener('click', validateStep3);
    }
    
    // Step 4: Face capture
    const captureBtn = document.getElementById('capture-btn');
    if (captureBtn) {
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    const retakeBtn = document.getElementById('retake-btn');
    if (retakeBtn) {
        retakeBtn.addEventListener('click', retakePhoto);
    }
    
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', validateStep4);
    }
    
    // Step 5: Address dropdowns
    const divisionSelect = document.getElementById('division');
    if (divisionSelect) {
        divisionSelect.addEventListener('change', loadDistricts);
    }
    
    const districtSelect = document.getElementById('district');
    if (districtSelect) {
        districtSelect.addEventListener('change', loadPoliceStations);
    }
    
    const policeStationSelect = document.getElementById('police-station');
    if (policeStationSelect) {
        policeStationSelect.addEventListener('change', loadUnions);
    }
    
    const unionSelect = document.getElementById('union');
    if (unionSelect) {
        unionSelect.addEventListener('change', loadVillages);
    }
    
    const step5Submit = document.getElementById('step5-submit');
    if (step5Submit) {
        step5Submit.addEventListener('click', validateStep5);
    }
    
    // Step 6: Password toggles and submit
    const togglePassword = document.getElementById('toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            togglePasswordVisibility('password');
        });
    }
    
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function() {
            togglePasswordVisibility('confirm-password');
        });
    }
    
    const step6Submit = document.getElementById('step6-submit');
    if (step6Submit) {
        step6Submit.addEventListener('click', validateStep6);
    }
    
    // Step 7: Login redirect
    const loginRedirectBtn = document.getElementById('login-redirect-btn');
    if (loginRedirectBtn) {
        loginRedirectBtn.addEventListener('click', redirectToLogin);
    }
    
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', previousStep);
    }
    
    console.log('[DEBUG] initializeEventListeners: All event listeners attached');
}

// OTP Input Auto-Focus
function initializeOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-digit');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow digits
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Auto-focus next input
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').slice(0, 6);
            
            if (/^\d+$/.test(pastedData)) {
                pastedData.split('').forEach((digit, i) => {
                    if (otpInputs[i]) {
                        otpInputs[i].value = digit;
                    }
                });
                
                const focusIndex = Math.min(pastedData.length, otpInputs.length - 1);
                otpInputs[focusIndex].focus();
            }
        });
    });
}

// Password Validation Live Check
function initializePasswordValidation() {
    const passwordInput = document.getElementById('password');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            validatePasswordRequirements(e.target.value);
        });
    }
}

function validatePasswordRequirements(password) {
    const requirements = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    document.getElementById('req-length').classList.toggle('valid', requirements.length);
    document.getElementById('req-upper').classList.toggle('valid', requirements.upper);
    document.getElementById('req-number').classList.toggle('valid', requirements.number);
    document.getElementById('req-special').classList.toggle('valid', requirements.special);
    
    return Object.values(requirements).every(Boolean);
}

// Navigation Functions
function goToStep(step) {
    // Hide current step
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.add('completed');
    
    // Show new step
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.add('active');
    
    // Update progress bar
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.getElementById('progress').style.width = `${progress}%`;
    
    // Show/hide back button
    document.getElementById('back-btn').style.display = currentStep > 1 && currentStep < 7 ? 'flex' : 'none';
    
    // Special handling for face detection step
    if (currentStep === 4) {
        startCamera();
    } else {
        stopCamera();
    }
    
    // Special handling for account creation step
    if (currentStep === 6) {
        document.getElementById('verified-face').src = capturedImageData;
    }
    
    // Special handling for success step
    if (currentStep === 7) {
        populateSuccessSummary();
    }
}

function previousStep() {
    if (currentStep > 1) {
        // Remove completed class from current step indicator
        document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.remove('active');
        
        // Hide current step
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        
        // Show previous step
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.remove('completed');
        document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.add('active');
        
        // Update progress bar
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        document.getElementById('progress').style.width = `${progress}%`;
        
        // Show/hide back button
        document.getElementById('back-btn').style.display = currentStep > 1 ? 'flex' : 'none';
        
        // Handle camera
        if (currentStep === 4) {
            startCamera();
        } else {
            stopCamera();
        }
    }
}

// Step 1: Mobile Number Validation
async function validateStep1() {
    console.log('[DEBUG] Step 1: validateStep1() called');
    
    const mobile = document.getElementById('mobile').value.trim();
    const errorEl = document.getElementById('mobile-error');
    const sendOtpBtn = document.querySelector('#step-1 .btn-primary');
    
    console.log('[DEBUG] Step 1: Mobile number entered:', mobile);
    
    // Bangladesh phone format: 01XXXXXXXXX (11 digits starting with 01)
    const phoneRegex = /^01[3-9]\d{8}$/;
    
    if (!mobile) {
        console.log('[DEBUG] Step 1: Validation FAILED - Empty mobile number');
        errorEl.textContent = 'Please enter your mobile number';
        return;
    }
    
    if (!phoneRegex.test(mobile)) {
        console.log('[DEBUG] Step 1: Validation FAILED - Invalid format:', mobile);
        errorEl.textContent = 'Please enter a valid Bangladesh mobile number (01XXXXXXXXX)';
        return;
    }
    
    console.log('[DEBUG] Step 1: Validation PASSED - Valid mobile number');
    errorEl.textContent = '';
    userData.mobile = mobile;
    
    // Show loading state
    sendOtpBtn.classList.add('loading');
    sendOtpBtn.disabled = true;
    
    console.log('[DEBUG] Step 1: Sending API request to:', `${API_BASE_URL}/auth/send-otp`);
    console.log('[DEBUG] Step 1: Request payload:', JSON.stringify({ phone: mobile }));
    
    try {
        // Send OTP via backend API
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ phone: mobile })
        });
        
        console.log('[DEBUG] Step 1: Response status:', response.status);
        const result = await response.json();
        console.log('[DEBUG] Step 1: Response data:', result);
        
        if (result.success) {
            console.log('[DEBUG] Step 1: SUCCESS - SessionId received:', result.sessionId);
            registrationSessionId = result.sessionId;
            
            // For development - show OTP in console
            if (result.devOTP) {
                console.log(`[DEV] Your OTP is: ${result.devOTP}`);
            }
            
            console.log('[DEBUG] Step 1: Navigating to Step 2 (OTP verification)');
            goToStep(2);
            startOTPTimer();
            console.log('[DEBUG] Step 1: OTP timer started');
        } else {
            console.log('[DEBUG] Step 1: FAILED - Server returned error:', result.message);
            errorEl.textContent = result.message || 'Failed to send OTP';

        }
    } catch (error) {
        console.error('[DEBUG] Step 1: NETWORK ERROR:', error);
        errorEl.textContent = 'Network error. Please try again.';
    } finally {
        console.log('[DEBUG] Step 1: Resetting button state');
        sendOtpBtn.classList.remove('loading');
        sendOtpBtn.disabled = false;
    }
}

// OTP Functions
async function sendOTP(mobile) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ phone: mobile })
        });
        
        const result = await response.json();
        
        if (result.success) {
            registrationSessionId = result.sessionId;
            console.log(`OTP sent to ${mobile}`);
            if (result.devOTP) {
            console.log(`[DEV] Your OTP is: ${result.devOTP}`);
            }
        } else {
            console.error('Failed to send OTP:', result.message);
        }
    } catch (error) {
        console.error('Send OTP error:', error);
    }
}

function startOTPTimer() {
    // Clear any existing timer first
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
    
    let timeLeft = 120; // 2 minutes
    const timerEl = document.getElementById('timer');
    const resendBtn = document.getElementById('resend-otp');
    
    if (resendBtn) resendBtn.disabled = true;
    
    otpTimer = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        if (timerEl) timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            otpTimer = null;
            if (resendBtn) resendBtn.disabled = false;
            if (timerEl) timerEl.textContent = '00:00';
        }
    }, 1000);
}

function resendOTP() {
    // Prevent multiple rapid clicks
    const resendBtn = document.getElementById('resend-otp');
    if (resendBtn && resendBtn.disabled) return;
    
    sendOTP(userData.mobile);
    startOTPTimer();
}

// Step 2: OTP Validation
async function validateStep2() {
    const otpInputs = document.querySelectorAll('.otp-digit');
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    const errorEl = document.getElementById('otp-error');
    const verifyBtn = document.querySelector('#step-2 .btn-primary');
    
    if (otp.length !== 6) {
        errorEl.textContent = 'Please enter all 6 digits';
        return;
    }
    
    // Show loading state
    verifyBtn.classList.add('loading');
    verifyBtn.disabled = true;
    
    try {
        // Verify OTP via backend API
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                phone: userData.mobile, 
                otp: otp,
                sessionId: registrationSessionId 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            errorEl.textContent = '';
            userData.otp = otp;
            clearInterval(otpTimer);
            goToStep(3);
        } else {
            errorEl.textContent = result.message || 'Invalid OTP';
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        errorEl.textContent = 'Network error. Please try again.';
    } finally {
        verifyBtn.classList.remove('loading');
        verifyBtn.disabled = false;
    }
}

// Step 3: NID Validation
async function validateStep3() {
    const nid = document.getElementById('nid').value.trim();
    const dob = document.getElementById('dob').value;
    const nameEn = document.getElementById('name-en').value.trim();
    const nameBn = document.getElementById('name-bn').value.trim();
    const fatherName = document.getElementById('father-name').value.trim();
    const motherName = document.getElementById('mother-name').value.trim();
    const verifyBtn = document.querySelector('#step-3 .btn-primary');
    
    let isValid = true;
    
    // NID validation (10 or 17 digits)
    if (!nid || !/^(\d{10}|\d{17})$/.test(nid)) {
        document.getElementById('nid-error').textContent = 'NID must be 10 or 17 digits';
        isValid = false;
    } else {
        document.getElementById('nid-error').textContent = '';
    }
    
    // DOB validation
    if (!dob) {
        document.getElementById('dob-error').textContent = 'Please select your date of birth';
        isValid = false;
    } else {
        document.getElementById('dob-error').textContent = '';
    }
    
    // Name validation
    if (!nameEn) {
        document.getElementById('name-en-error').textContent = 'Please enter your name in English';
        isValid = false;
    } else {
        document.getElementById('name-en-error').textContent = '';
    }
    
    // Father's name validation
    if (!fatherName) {
        document.getElementById('father-error').textContent = "Please enter your father's name";
        isValid = false;
    } else {
        document.getElementById('father-error').textContent = '';
    }
    
    // Mother's name validation
    if (!motherName) {
        document.getElementById('mother-error').textContent = "Please enter your mother's name";
        isValid = false;
    } else {
        document.getElementById('mother-error').textContent = '';
    }
    
    if (isValid) {
        // Show loading state
        verifyBtn.classList.add('loading');
        verifyBtn.disabled = true;
        
        try {
            // Verify NID via backend API
            const response = await fetch(`${API_BASE_URL}/auth/verify-nid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    nid,
                    dob,
                    nameEn,
                    nameBn,
                    fatherName,
                    motherName,
                    sessionId: registrationSessionId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                userData.nid = nid;
                userData.dob = dob;
                userData.nameEn = nameEn;
                userData.nameBn = nameBn;
                userData.fatherName = fatherName;
                userData.motherName = motherName;
                goToStep(4);
            } else {
                document.getElementById('nid-error').textContent = result.message || 'NID verification failed';
            }
        } catch (error) {
            console.error('Verify NID error:', error);
            document.getElementById('nid-error').textContent = 'Network error. Please try again.';
        } finally {
            verifyBtn.classList.remove('loading');
            verifyBtn.disabled = false;
        }
    }
}

// Step 4: Face Detection
async function startCamera() {
    const video = document.getElementById('camera-feed');
    const captureBtn = document.getElementById('capture-btn');
    const continueBtn = document.getElementById('continue-btn');
    const preview = document.getElementById('captured-preview');
    const cameraContainer = document.querySelector('.camera-container');
    
    // Reset UI
    preview.style.display = 'none';
    cameraContainer.style.display = 'flex';
    captureBtn.style.display = 'flex';
    continueBtn.style.display = 'none';
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        video.srcObject = cameraStream;
        
        // Update face status
        document.getElementById('face-status').innerHTML = `
            <i class="fas fa-face-smile"></i>
            <span>Camera ready - Position your face in the frame</span>
        `;
    } catch (err) {
        console.error('Camera error:', err);
        document.getElementById('face-error').textContent = 'Unable to access camera. Please grant permission.';
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function capturePhoto() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('face-canvas');
    const preview = document.getElementById('captured-preview');
    const capturedImage = document.getElementById('captured-image');
    const captureBtn = document.getElementById('capture-btn');
    const continueBtn = document.getElementById('continue-btn');
    const cameraContainer = document.querySelector('.camera-container');
    
    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas (flip horizontally to match mirror view)
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    // Get image data
    capturedImageData = canvas.toDataURL('image/jpeg', 0.8);
    capturedImage.src = capturedImageData;
    
    // Update UI
    cameraContainer.style.display = 'none';
    preview.style.display = 'block';
    captureBtn.style.display = 'none';
    continueBtn.style.display = 'flex';
    
    // Stop camera
    stopCamera();
}

function retakePhoto() {
    capturedImageData = null;
    startCamera();
}

async function validateStep4() {
    const errorEl = document.getElementById('face-error');
    
    if (!capturedImageData) {
        errorEl.textContent = 'Please capture your face photo';
        return;
    }
    
    errorEl.textContent = '';
    userData.faceImage = capturedImageData;
    
    // Save face image to backend
    await saveFaceToBackend();
    goToStep(5);
}

// Save face image to backend
async function saveFaceToBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/save-face`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                faceImage: capturedImageData,
                sessionId: registrationSessionId
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            console.warn('Failed to save face image:', result.message);
        }
    } catch (error) {
        console.error('Save face error:', error);
    }
}

// Step 5: Address - Cascading Dropdowns Data
const locationData = {
    dhaka: {
        districts: ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Manikganj', 'Munshiganj', 'Narsingdi', 'Kishoreganj', 'Netrokona', 'Faridpur', 'Gopalganj', 'Madaripur', 'Rajbari', 'Shariatpur'],
        policeStations: {
            'Dhaka': ['Dhanmondi', 'Gulshan', 'Mirpur', 'Mohammadpur', 'Tejgaon', 'Uttara', 'Badda', 'Khilgaon', 'Ramna', 'Motijheel'],
            'Gazipur': ['Gazipur Sadar', 'Kaliakair', 'Kapasia', 'Kaliganj', 'Sreepur'],
            'Narayanganj': ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon']
        }
    },
    chittagong: {
        districts: ['Chittagong', 'Comilla', 'Brahmanbaria', 'Chandpur', 'Lakshmipur', 'Noakhali', 'Feni', "Cox's Bazar", 'Khagrachari', 'Rangamati', 'Bandarban'],
        policeStations: {
            'Chittagong': ['Kotwali', 'Panchlaish', 'Double Mooring', 'Bakalia', 'Chandgaon', 'Bayezid', 'Halishahar', 'Patenga'],
            "Cox's Bazar": ["Cox's Bazar Sadar", 'Teknaf', 'Ukhia', 'Ramu', 'Chakaria']
        }
    },
    rajshahi: {
        districts: ['Rajshahi', 'Chapainawabganj', 'Naogaon', 'Natore', 'Nawabganj', 'Pabna', 'Sirajganj', 'Bogra', 'Joypurhat'],
        policeStations: {
            'Rajshahi': ['Boalia', 'Rajpara', 'Motihar', 'Shah Makhdum', 'Paba', 'Godagari', 'Tanore', 'Bagmara']
        }
    },
    khulna: {
        districts: ['Khulna', 'Bagerhat', 'Chuadanga', 'Jessore', 'Jhenaidah', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
        policeStations: {
            'Khulna': ['Khulna Sadar', 'Sonadanga', 'Daulatpur', 'Khalishpur', 'Batiaghata', 'Dumuria', 'Phultala']
        }
    },
    barishal: {
        districts: ['Barishal', 'Barguna', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
        policeStations: {
            'Barishal': ['Barishal Sadar', 'Bakerganj', 'Babuganj', 'Wazirpur', 'Banaripara', 'Gournadi', 'Agailjhara', 'Mehendiganj', 'Muladi', 'Hizla']
        }
    },
    sylhet: {
        districts: ['Sylhet', 'Habiganj', 'Moulvibazar', 'Sunamganj'],
        policeStations: {
            'Sylhet': ['Sylhet Sadar', 'South Surma', 'Osmani Nagar', 'Companiganj', 'Golapganj', 'Jaintiapur', 'Kanaighat', 'Zakiganj', 'Beanibazar', 'Bishwanath', 'Fenchuganj', 'Gowainghat', 'Balaganj']
        }
    },
    rangpur: {
        districts: ['Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Thakurgaon'],
        policeStations: {
            'Rangpur': ['Rangpur Sadar', 'Gangachara', 'Taragonj', 'Badargonj', 'Mithapukur', 'Pirgonj', 'Kaunia', 'Pirgacha']
        }
    },
    mymensingh: {
        districts: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur'],
        policeStations: {
            'Mymensingh': ['Mymensingh Sadar', 'Trishal', 'Bhaluka', 'Muktagacha', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Ishwarganj', 'Nandail', 'Phulpur', 'Haluaghat', 'Dhobaura']
        }
    }
};

function loadDistricts() {
    const division = document.getElementById('division').value;
    const districtSelect = document.getElementById('district');
    const policeSelect = document.getElementById('police-station');
    const unionSelect = document.getElementById('union');
    const villageSelect = document.getElementById('village');
    
    // Reset dependent dropdowns
    districtSelect.innerHTML = '<option value="">Select District</option>';
    policeSelect.innerHTML = '<option value="">Select Police Station</option>';
    unionSelect.innerHTML = '<option value="">Select Union</option>';
    villageSelect.innerHTML = '<option value="">Select Village</option>';
    
    policeSelect.disabled = true;
    unionSelect.disabled = true;
    villageSelect.disabled = true;
    
    if (division && locationData[division]) {
        districtSelect.disabled = false;
        locationData[division].districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.toLowerCase().replace(/[^a-z0-9]/g, '-');
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    } else {
        districtSelect.disabled = true;
    }
}

function loadPoliceStations() {
    const division = document.getElementById('division').value;
    const district = document.getElementById('district');
    const districtText = district.options[district.selectedIndex].text;
    const policeSelect = document.getElementById('police-station');
    const unionSelect = document.getElementById('union');
    const villageSelect = document.getElementById('village');
    
    // Reset dependent dropdowns
    policeSelect.innerHTML = '<option value="">Select Police Station</option>';
    unionSelect.innerHTML = '<option value="">Select Union</option>';
    villageSelect.innerHTML = '<option value="">Select Village</option>';
    
    unionSelect.disabled = true;
    villageSelect.disabled = true;
    
    if (division && locationData[division] && locationData[division].policeStations[districtText]) {
        policeSelect.disabled = false;
        locationData[division].policeStations[districtText].forEach(ps => {
            const option = document.createElement('option');
            option.value = ps.toLowerCase().replace(/[^a-z0-9]/g, '-');
            option.textContent = ps;
            policeSelect.appendChild(option);
        });
    } else {
        policeSelect.disabled = false;
        // Add generic options if specific data not available
        ['Sadar', 'Model', 'City'].forEach(ps => {
            const option = document.createElement('option');
            option.value = ps.toLowerCase();
            option.textContent = ps;
            policeSelect.appendChild(option);
        });
    }
}

function loadUnions() {
    const unionSelect = document.getElementById('union');
    const villageSelect = document.getElementById('village');
    
    // Reset village
    villageSelect.innerHTML = '<option value="">Select Village</option>';
    villageSelect.disabled = true;
    
    unionSelect.disabled = false;
    unionSelect.innerHTML = '<option value="">Select Union</option>';
    
    // Add sample unions (in production, this would come from backend)
    ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'].forEach(union => {
        const option = document.createElement('option');
        option.value = union.toLowerCase().replace(/\s/g, '-');
        option.textContent = union;
        unionSelect.appendChild(option);
    });
}

function loadVillages() {
    const villageSelect = document.getElementById('village');
    
    villageSelect.disabled = false;
    villageSelect.innerHTML = '<option value="">Select Village</option>';
    
    // Add sample villages (in production, this would come from backend)
    ['Block A', 'Block B', 'Block C', 'Main Area', 'Extension'].forEach(village => {
        const option = document.createElement('option');
        option.value = village.toLowerCase().replace(/\s/g, '-');
        option.textContent = village;
        villageSelect.appendChild(option);
    });
}

function validateStep5() {
    const division = document.getElementById('division').value;
    const district = document.getElementById('district').value;
    const policeStation = document.getElementById('police-station').value;
    const union = document.getElementById('union').value;
    const village = document.getElementById('village').value;
    const placeDetails = document.getElementById('place-details').value.trim();
    
    let isValid = true;
    
    if (!division) {
        document.getElementById('division-error').textContent = 'Please select a division';
        isValid = false;
    } else {
        document.getElementById('division-error').textContent = '';
    }
    
    if (!district) {
        document.getElementById('district-error').textContent = 'Please select a district';
        isValid = false;
    } else {
        document.getElementById('district-error').textContent = '';
    }
    
    if (!policeStation) {
        document.getElementById('police-error').textContent = 'Please select a police station';
        isValid = false;
    } else {
        document.getElementById('police-error').textContent = '';
    }
    
    if (!union) {
        document.getElementById('union-error').textContent = 'Please select a union';
        isValid = false;
    } else {
        document.getElementById('union-error').textContent = '';
    }
    
    if (!village) {
        document.getElementById('village-error').textContent = 'Please select a village';
        isValid = false;
    } else {
        document.getElementById('village-error').textContent = '';
    }
    
    if (isValid) {
        userData.division = document.getElementById('division').options[document.getElementById('division').selectedIndex].text;
        userData.district = document.getElementById('district').options[document.getElementById('district').selectedIndex].text;
        userData.policeStation = document.getElementById('police-station').options[document.getElementById('police-station').selectedIndex].text;
        userData.union = document.getElementById('union').options[document.getElementById('union').selectedIndex].text;
        userData.village = document.getElementById('village').options[document.getElementById('village').selectedIndex].text;
        userData.placeDetails = placeDetails;
        
        // Save address to backend
        saveAddressToBackend();
        goToStep(6);
    }
}

// Save address to backend
async function saveAddressToBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/save-address`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                division: userData.division,
                district: userData.district,
                policeStation: userData.policeStation,
                union: userData.union,
                village: userData.village,
                placeDetails: userData.placeDetails,
                sessionId: registrationSessionId
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            console.warn('Failed to save address:', result.message);
        }
    } catch (error) {
        console.error('Save address error:', error);
    }
}

// Step 6: Account Creation
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.toggle-password');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function validateStep6() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    let isValid = true;
    
    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!username) {
        document.getElementById('username-error').textContent = 'Please choose a username';
        isValid = false;
    } else if (!usernameRegex.test(username)) {
        document.getElementById('username-error').textContent = 'Username must be 3-50 characters (letters, numbers, underscores only)';
        isValid = false;
    } else {
        document.getElementById('username-error').textContent = '';
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        document.getElementById('email-error').textContent = 'Please enter your email';
        isValid = false;
    } else if (!emailRegex.test(email)) {
        document.getElementById('email-error').textContent = 'Please enter a valid email address';
        isValid = false;
    } else {
        document.getElementById('email-error').textContent = '';
    }
    
    // Password validation
    if (!password) {
        document.getElementById('password-error').textContent = 'Please enter a password';
        isValid = false;
    } else if (!validatePasswordRequirements(password)) {
        document.getElementById('password-error').textContent = 'Password does not meet requirements';
        isValid = false;
    } else {
        document.getElementById('password-error').textContent = '';
    }
    
    // Confirm password validation
    if (!confirmPassword) {
        document.getElementById('confirm-error').textContent = 'Please confirm your password';
        isValid = false;
    } else if (password !== confirmPassword) {
        document.getElementById('confirm-error').textContent = 'Passwords do not match';
        isValid = false;
    } else {
        document.getElementById('confirm-error').textContent = '';
    }
    
    if (isValid) {
        userData.username = username;
        userData.email = email;
        userData.password = password;
        
        // Submit registration (in production, call backend API)
        submitRegistration();
    }
}

async function submitRegistration() {
    const submitBtn = document.querySelector('#step-6 .btn-primary');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    try {
        // Submit registration to backend API
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                username: userData.username,
                email: userData.email,
                password: userData.password,
                sessionId: registrationSessionId,
                // Also send direct data as backup
                phone: userData.mobile,
                nid: userData.nid,
                dob: userData.dob,
                nameEn: userData.nameEn,
                nameBn: userData.nameBn,
                fatherName: userData.fatherName,
                motherName: userData.motherName,
                faceImage: userData.faceImage,
                division: userData.division,
                district: userData.district,
                policeStation: userData.policeStation,
                union: userData.union,
                village: userData.village,
                placeDetails: userData.placeDetails
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Registration successful:', result);
            goToStep(7);
        } else {
            // Show error on appropriate field
            if (result.message.toLowerCase().includes('username')) {
                document.getElementById('username-error').textContent = result.message;
            } else {
                document.getElementById('email-error').textContent = result.message || 'Registration failed';
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        document.getElementById('email-error').textContent = 'Network error. Please try again.';
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// Step 7: Success
function populateSuccessSummary() {
    document.getElementById('summary-name').textContent = userData.nameEn;
    document.getElementById('summary-phone').textContent = userData.mobile;
    document.getElementById('summary-email').textContent = userData.email;
}

function redirectToLogin() {
    window.location.href = 'login.html';
}
