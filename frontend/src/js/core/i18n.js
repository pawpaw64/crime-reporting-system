// ============================================
// INTERNATIONALIZATION (i18n) - English & Bangla
// ============================================

const i18n = (() => {
    const STORAGE_KEY = 'securevoice_language';
    let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

    // Translation dictionary
    const translations = {
        // ============================================
        // COMMON / NAVIGATION
        // ============================================
        'nav.home': { en: 'Home', bn: 'হোম' },
        'nav.howItWorks': { en: 'How It Works', bn: 'কিভাবে কাজ করে' },
        'nav.casesWeHandle': { en: 'Cases We Handle', bn: 'আমরা যেসব কেস দেখি' },
        'nav.trackReport': { en: 'Track Report', bn: 'রিপোর্ট ট্র্যাক করুন' },
        'nav.contactUs': { en: 'Contact Us', bn: 'যোগাযোগ করুন' },
        'nav.aboutUs': { en: 'About Us', bn: 'আমাদের সম্পর্কে' },
        'nav.user': { en: 'User', bn: 'ব্যবহারকারী' },
        'nav.admin': { en: 'Admin', bn: 'অ্যাডমিন' },
        'nav.login': { en: 'Login', bn: 'লগইন' },
        'nav.logout': { en: 'Logout', bn: 'লগআউট' },
        'nav.signup': { en: 'Sign Up', bn: 'সাইন আপ' },
        'nav.profile': { en: 'Profile', bn: 'প্রোফাইল' },
        'nav.dashboard': { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
        'nav.settings': { en: 'Settings', bn: 'সেটিংস' },

        // ============================================
        // HEADER & BRANDING
        // ============================================
        'brand.name': { en: 'SecureVoice', bn: 'সিকিউরভয়েস' },
        'brand.tagline': { en: 'Crime Reporting System', bn: 'অপরাধ রিপোর্টিং সিস্টেম' },
        'header.welcome': { en: 'Welcome', bn: 'স্বাগতম' },

        // ============================================
        // MAP SECTION
        // ============================================
        'map.findMyLocation': { en: 'Find My Location', bn: 'আমার লোকেশন খুঁজুন' },
        'map.resetView': { en: 'Reset View', bn: 'ভিউ রিসেট করুন' },
        'map.crimeHeatmap': { en: 'Crime Heatmap', bn: 'অপরাধের হিটম্যাপ' },
        'map.divisionMarkers': { en: 'Division Markers', bn: 'বিভাগ মার্কার' },
        'map.highActivity': { en: 'High Activity', bn: 'বেশি' },
        'map.mediumActivity': { en: 'Medium Activity', bn: 'মাঝারি' },
        'map.lowActivity': { en: 'Low Activity', bn: 'কম' },
        'map.totalReports': { en: 'Total Reports', bn: 'মোট রিপোর্ট' },
        'map.pending': { en: 'Pending', bn: 'পেন্ডিং' },

        // ============================================
        // BUTTONS & ACTIONS
        // ============================================
        'btn.anonymousReport': { en: 'Anonymous Report', bn: 'বেনামে রিপোর্ট' },
        'btn.reportCrime': { en: 'Report a Crime', bn: 'অপরাধ রিপোর্ট করুন' },
        'btn.submitComplaint': { en: 'Submit a Complaint', bn: 'অভিযোগ জমা দিন' },
        'btn.submit': { en: 'Submit', bn: 'জমা দিন' },
        'btn.cancel': { en: 'Cancel', bn: 'বাতিল' },
        'btn.confirm': { en: 'Confirm', bn: 'নিশ্চিত করুন' },
        'btn.save': { en: 'Save', bn: 'সেভ করুন' },
        'btn.edit': { en: 'Edit', bn: 'এডিট' },
        'btn.delete': { en: 'Delete', bn: 'মুছুন' },
        'btn.search': { en: 'Search', bn: 'খুঁজুন' },
        'btn.trackStatus': { en: 'Track Status', bn: 'স্ট্যাটাস ট্র্যাক করুন' },
        'btn.viewAll': { en: 'View All', bn: 'সব দেখুন' },
        'btn.close': { en: 'Close', bn: 'বন্ধ করুন' },
        'btn.createAccount': { en: 'Create an Account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
        'btn.exploreUs': { en: 'Explore Us', bn: 'আমাদের জানুন' },
        'btn.refresh': { en: 'Refresh', bn: 'রিফ্রেশ' },
        'btn.approve': { en: 'Approve', bn: 'অনুমোদন' },
        'btn.reject': { en: 'Reject', bn: 'বাতিল করুন' },
        'btn.viewDetails': { en: 'View Details', bn: 'বিস্তারিত দেখুন' },
        'btn.goBack': { en: 'Go Back', bn: 'ফিরে যান' },
        'btn.continue': { en: 'Continue', bn: 'চালিয়ে যান' },
        'btn.sendOTP': { en: 'Send OTP', bn: 'OTP পাঠান' },
        'btn.verifyOTP': { en: 'Verify OTP', bn: 'OTP যাচাই করুন' },
        'btn.resendOTP': { en: 'Resend OTP', bn: 'আবার OTP পাঠান' },
        'btn.updateProfile': { en: 'Update Profile', bn: 'প্রোফাইল আপডেট করুন' },
        'btn.changePassword': { en: 'Change Password', bn: 'পাসওয়ার্ড পরিবর্তন করুন' },
        'btn.uploadImage': { en: 'Upload Image', bn: 'ছবি আপলোড করুন' },
        'btn.back': { en: 'Back', bn: 'ফিরে যান' },
        'btn.submitReport': { en: 'Submit Report', bn: 'রিপোর্ট জমা দিন' },
        'btn.submitting': { en: 'Submitting...', bn: 'জমা হচ্ছে...' },
        'btn.confirmLocation': { en: 'Confirm Location', bn: 'স্থান নিশ্চিত করুন' },
        'btn.viewMyComplaints': { en: 'View My Complaints', bn: 'আমার অভিযোগ দেখুন' },
        'btn.tryAgain': { en: 'Try Again', bn: 'আবার চেষ্টা করুন' },
        'btn.markAllRead': { en: 'Mark All Read', bn: 'সব পড়া হয়েছে' },

        // ============================================
        // TRACK ANONYMOUS REPORT
        // ============================================
        'track.title': { en: 'Track Your Anonymous Report', bn: 'আপনার বেনামে রিপোর্ট ট্র্যাক করুন' },
        'track.description': { en: 'Already submitted an anonymous report? Enter your Report ID to check its current status.', bn: 'আগে বেনামে রিপোর্ট করেছেন? স্ট্যাটাস দেখতে আপনার রিপোর্ট আইডি দিন।' },
        'track.placeholder': { en: 'Enter Report ID (e.g., SV-XXXXXXXX)', bn: 'রিপোর্ট আইডি দিন (যেমন: SV-XXXXXXXX)' },
        'track.hint': { en: 'Your Report ID was provided when you submitted your anonymous report. Keep it safe!', bn: 'বেনামে রিপোর্ট করার সময় এই আইডি দেওয়া হয়েছিল। এটা সযত্নে রাখুন!' },
        'track.searching': { en: 'Searching...', bn: 'খোঁজা হচ্ছে...' },
        'track.reportFound': { en: 'Report Found', bn: 'রিপোর্ট পাওয়া গেছে' },
        'track.reportId': { en: 'Report ID', bn: 'রিপোর্ট আইডি' },
        'track.crimeType': { en: 'Crime Type', bn: 'অপরাধের ধরন' },
        'track.submitted': { en: 'Submitted', bn: 'জমা দেওয়া হয়েছে' },
        'track.status': { en: 'Status', bn: 'স্ট্যাটাস' },
        'track.invalidId': { en: 'Please enter a valid Report ID (e.g., SV-XXXXXXXX)', bn: 'সঠিক রিপোর্ট আইডি দিন (যেমন: SV-XXXXXXXX)' },
        'track.notFound': { en: 'Report not found. Please check your Report ID and try again.', bn: 'রিপোর্ট পাওয়া যায়নি। রিপোর্ট আইডি চেক করে আবার চেষ্টা করুন।' },
        'track.error': { en: 'Unable to check status. Please try again later.', bn: 'স্ট্যাটাস দেখা যাচ্ছে না। পরে আবার চেষ্টা করুন।' },

        // ============================================
        // HOW IT WORKS SECTION
        // ============================================
        'howItWorks.title': { en: 'How It Works', bn: 'কিভাবে কাজ করে' },
        'howItWorks.description': { en: 'Our platform makes it easy to report crimes and track their investigation progress.', bn: 'আমাদের প্ল্যাটফর্মে সহজেই অপরাধ রিপোর্ট এবং তদন্তের অগ্রগতি ট্র্যাক করা যায়।' },
        'howItWorks.step1.title': { en: 'Create an Account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
        'howItWorks.step1.desc': { en: 'Sign up with your personal details to create a secure account for reporting crimes.', bn: 'আপনার তথ্য দিয়ে সাইন আপ করুন এবং অপরাধ রিপোর্টের জন্য একটি নিরাপদ অ্যাকাউন্ট তৈরি করুন।' },
        'howItWorks.step2.title': { en: 'Submit a Complaint', bn: 'অভিযোগ জমা দিন' },
        'howItWorks.step2.desc': { en: 'Provide details about the incident, including location, time, and any evidence you may have.', bn: 'ঘটনার বিস্তারিত দিন - স্থান, সময় এবং যদি কোনো প্রমাণ থাকে।' },
        'howItWorks.step3.title': { en: 'Track Progress', bn: 'অগ্রগতি ট্র্যাক করুন' },
        'howItWorks.step3.desc': { en: 'Monitor the status of your complaint as it moves through verification, investigation, and resolution.', bn: 'আপনার অভিযোগের স্ট্যাটাস দেখুন - যাচাই, তদন্ত এবং সমাধান পর্যন্ত।' },

        // ============================================
        // CASES SECTION
        // ============================================
        'cases.title': { en: 'Cases We Handle', bn: 'আমরা যেসব কেস দেখি' },
        'cases.description': { en: 'We handle a wide range of criminal complaints with utmost care and confidentiality.', bn: 'আমরা সর্বোচ্চ যত্ন ও গোপনীয়তার সাথে বিভিন্ন ধরনের অপরাধমূলক অভিযোগ সামলাই।' },
        'cases.personalSafety': { en: 'Personal Safety', bn: 'ব্যক্তিগত নিরাপত্তা' },
        'cases.personalSafety.desc': { en: 'Harassment, assault, domestic violence, stalking, and threats to personal safety. We ensure your voice is heard and action is taken promptly.', bn: 'হয়রানি, হামলা, পারিবারিক সহিংসতা, পিছু নেওয়া এবং নিরাপত্তার হুমকি। আমরা নিশ্চিত করি আপনার কথা শোনা হবে এবং দ্রুত পদক্ষেপ নেওয়া হবে।' },
        'cases.propertyCrimes': { en: 'Property Crimes', bn: 'সম্পত্তি সংক্রান্ত অপরাধ' },
        'cases.propertyCrimes.desc': { en: 'Theft, burglary, vandalism, property damage, and trespassing. Report property-related incidents with detailed evidence support.', bn: 'চুরি, ডাকাতি, ভাংচুর, সম্পত্তির ক্ষতি এবং অনুমতি ছাড়া প্রবেশ। বিস্তারিত প্রমাণসহ সম্পত্তি সংক্রান্ত ঘটনা রিপোর্ট করুন।' },
        'cases.financialFraud': { en: 'Financial Fraud', bn: 'আর্থিক প্রতারণা' },
        'cases.financialFraud.desc': { en: 'Online scams, identity theft, credit card fraud, and financial crimes.', bn: 'অনলাইন প্রতারণা, পরিচয় চুরি, ক্রেডিট কার্ড জালিয়াতি এবং আর্থিক অপরাধ।' },
        'cases.cyberCrimes': { en: 'Cyber Crimes', bn: 'সাইবার অপরাধ' },
        'cases.cyberCrimes.desc': { en: 'Online harassment, cyberbullying, hacking, data breaches, and digital threats.', bn: 'অনলাইন হয়রানি, সাইবারবুলিং, হ্যাকিং, ডেটা চুরি এবং ডিজিটাল হুমকি।' },
        'cases.trafficViolations': { en: 'Traffic Violations', bn: 'ট্রাফিক আইন ভঙ্গ' },
        'cases.trafficViolations.desc': { en: 'Reckless driving, hit-and-run incidents, traffic accidents, and road rage. Quick response and proper documentation.', bn: 'বেপরোয়া গাড়ি চালানো, ধাক্কা দিয়ে পালানো, ট্রাফিক দুর্ঘটনা এবং রোড রেজ। দ্রুত সাড়া এবং সঠিক ডকুমেন্টেশন।' },
        'cases.publicSafety': { en: 'Public Safety', bn: 'জনসাধারণের নিরাপত্তা' },
        'cases.publicSafety.desc': { en: 'Public disturbances, noise complaints. Building safer neighborhoods together.', bn: 'জনসাধারণের বিশৃঙ্খলা, শব্দ দূষণের অভিযোগ। একসাথে নিরাপদ এলাকা গড়ি।' },

        // ============================================
        // SECURITY FEATURES
        // ============================================
        'security.title': { en: 'How We Ensure Secure Complaints', bn: 'আমরা কিভাবে অভিযোগ নিরাপদ রাখি' },
        'security.description': { en: 'Your safety and privacy are our top priorities. We use advanced security measures to protect your identity and information.', bn: 'আপনার নিরাপত্তা এবং গোপনীয়তা আমাদের কাছে সবার আগে। আমরা আপনার পরিচয় ও তথ্য রক্ষায় উন্নত নিরাপত্তা ব্যবস্থা ব্যবহার করি।' },
        'security.encryption': { en: 'End-to-End Encryption', bn: 'এন্ড-টু-এন্ড এনক্রিপশন' },
        'security.encryption.desc': { en: 'Military-grade security protocols', bn: 'সামরিক মানের নিরাপত্তা প্রোটোকল' },
        'security.anonymous': { en: 'Anonymous Reporting', bn: 'বেনামে রিপোর্টিং' },
        'security.anonymous.desc': { en: 'Complete anonymity option', bn: 'সম্পূর্ণ বেনামে থাকার সুযোগ' },
        'security.storage': { en: 'Secure Storage', bn: 'নিরাপদ স্টোরেজ' },
        'security.storage.desc': { en: 'Protected servers with backups', bn: 'ব্যাকআপসহ সুরক্ষিত সার্ভার' },
        'security.privacy': { en: 'Privacy Protection', bn: 'গোপনীয়তা রক্ষা' },
        'security.privacy.desc': { en: 'Strict confidentiality policies', bn: 'কঠোর গোপনীয়তা নীতি' },
        'security.monitoring': { en: '24/7 Monitoring', bn: '২৪/৭ মনিটরিং' },
        'security.monitoring.desc': { en: 'Round-the-clock security', bn: 'সার্বক্ষণিক নিরাপত্তা' },
        'security.verified': { en: 'Verified Officials', bn: 'যাচাইকৃত কর্মকর্তা' },
        'security.verified.desc': { en: 'Authenticated law enforcement', bn: 'প্রমাণীকৃত আইন প্রয়োগকারী' },
        'security.features': { en: 'Security Features', bn: 'নিরাপত্তা বৈশিষ্ট্য' },
        'security.encryptedSessions': { en: 'Encrypted Sessions', bn: 'এনক্রিপ্টেড সেশন' },

        // ============================================
        // READY TO GET STARTED
        // ============================================
        'getStarted.title': { en: 'Ready to Get Started?', bn: 'শুরু করতে প্রস্তুত?' },
        'getStarted.description': { en: 'Join our platform today to report incidents to help make your community safer.', bn: 'আজই আমাদের প্ল্যাটফর্মে যোগ দিন এবং আপনার এলাকাকে নিরাপদ করতে সাহায্য করুন।' },

        // ============================================
        // FOOTER
        // ============================================
        'footer.links': { en: 'LINKS', bn: 'লিংক' },
        'footer.contact': { en: 'CONTACT', bn: 'যোগাযোগ' },
        'footer.location': { en: 'Dhaka, Bangladesh', bn: 'ঢাকা, বাংলাদেশ' },
        'footer.open24': { en: 'Open 24/7', bn: '২৪ ঘণ্টা খোলা' },
        'footer.copyright': { en: '© 2025, Secure Voice - Crime Reporting System. All rights reserved.', bn: '© ২০২৫, সিকিউর ভয়েস - অপরাধ রিপোর্টিং সিস্টেম। সর্বস্বত্ব সংরক্ষিত।' },

        // ============================================
        // LOGIN / SIGNUP PAGE
        // ============================================
        'auth.loginTitle': { en: 'Login', bn: 'লগইন' },
        'auth.signupTitle': { en: 'Sign Up', bn: 'সাইন আপ' },
        'auth.welcomeBack': { en: 'Welcome Back!', bn: 'স্বাগতম!' },
        'auth.joinUs': { en: 'Join SecureVoice', bn: 'সিকিউরভয়েসে যোগ দিন' },
        'auth.email': { en: 'Email', bn: 'ইমেইল' },
        'auth.password': { en: 'Password', bn: 'পাসওয়ার্ড' },
        'auth.confirmPassword': { en: 'Confirm Password', bn: 'পাসওয়ার্ড নিশ্চিত করুন' },
        'auth.fullName': { en: 'Full Name', bn: 'পুরো নাম' },
        'auth.username': { en: 'Username', bn: 'ইউজারনেম' },
        'auth.phone': { en: 'Phone Number', bn: 'ফোন নম্বর' },
        'auth.nid': { en: 'National ID', bn: 'জাতীয় পরিচয়পত্র' },
        'auth.division': { en: 'Division', bn: 'বিভাগ' },
        'auth.district': { en: 'District', bn: 'জেলা' },
        'auth.thana': { en: 'Police Station', bn: 'থানা' },
        'auth.address': { en: 'Address', bn: 'ঠিকানা' },
        'auth.forgotPassword': { en: 'Forgot Password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
        'auth.rememberMe': { en: 'Remember Me', bn: 'মনে রাখুন' },
        'auth.noAccount': { en: "Don't have an account?", bn: 'অ্যাকাউন্ট নেই?' },
        'auth.haveAccount': { en: 'Already have an account?', bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে?' },
        'auth.loginBtn': { en: 'Login', bn: 'লগইন' },
        'auth.signupBtn': { en: 'Sign Up', bn: 'সাইন আপ' },
        'auth.signUp': { en: 'Sign Up', bn: 'সাইন আপ' },
        'auth.orContinueWith': { en: 'Or continue with', bn: 'অথবা ব্যবহার করুন' },
        'auth.registerWith': { en: 'Register with a secure account', bn: 'নিরাপদ অ্যাকাউন্ট দিয়ে নিবন্ধন করুন' },
        'auth.faceVerification': { en: 'Face Verification', bn: 'ফেস ভেরিফিকেশন' },
        'auth.nidVerification': { en: 'NID Verification', bn: 'NID যাচাই' },
        'auth.otpVerification': { en: 'OTP Verification', bn: 'OTP যাচাই' },
        'auth.verifyEmail': { en: 'Verify your email', bn: 'ইমেইল যাচাই করুন' },
        'auth.otpSent': { en: 'OTP sent to your email', bn: 'আপনার ইমেইলে OTP পাঠানো হয়েছে' },
        'auth.enterOTP': { en: 'Enter OTP', bn: 'OTP দিন' },
        'auth.invalidCredentials': { en: 'Invalid email or password', bn: 'ভুল ইমেইল বা পাসওয়ার্ড' },
        'auth.accountCreated': { en: 'Account created successfully!', bn: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' },
        'auth.loginSuccess': { en: 'Login successful!', bn: 'সফলভাবে লগইন হয়েছে!' },
        'auth.backToLogin': { en: 'Back to Login', bn: 'লগইনে ফিরে যান' },
        'auth.enterUsername': { en: 'Enter your username', bn: 'আপনার ইউজারনেম দিন' },
        'auth.enterPassword': { en: 'Enter your password', bn: 'আপনার পাসওয়ার্ড দিন' },
        'auth.enterEmail': { en: 'Enter your email', bn: 'আপনার ইমেইল দিন' },
        'auth.emailPlaceholder': { en: 'Enter your email address', bn: 'আপনার ইমেইল ঠিকানা দিন' },
        'auth.passwordPlaceholder': { en: 'Enter password', bn: 'পাসওয়ার্ড দিন' },
        'auth.confirmPasswordPlaceholder': { en: 'Confirm your password', bn: 'আপনার পাসওয়ার্ড নিশ্চিত করুন' },

        // ============================================
        // ANONYMOUS REPORT PAGE
        // ============================================
        'anon.title': { en: 'Submit Anonymous Report', bn: 'বেনামে রিপোর্ট জমা দিন' },
        'anon.subtitle': { en: 'Your identity is completely protected. No login required.', bn: 'আপনার পরিচয় সম্পূর্ণ গোপন। লগইন লাগবে না।' },
        'anon.backToHome': { en: 'Back to Home', bn: 'হোমে ফিরে যান' },
        'anon.anonymousMode': { en: 'Anonymous Mode', bn: 'বেনামে মোড' },
        'anon.important': { en: 'Important Information', bn: 'গুরুত্বপূর্ণ তথ্য' },
        'anon.importantInfo': { en: 'Important Information', bn: 'গুরুত্বপূর্ণ তথ্য' },
        'anon.disclaimerIntro': { en: 'Before submitting an anonymous report, please understand the following:', bn: 'বেনামে রিপোর্ট জমা দেওয়ার আগে নিচের বিষয়গুলো বুঝুন:' },
        'anon.completeAnonymity': { en: 'Complete Anonymity', bn: 'সম্পূর্ণ বেনামে' },
        'anon.anonymityDesc': { en: 'We do not collect your name, email, phone number, or any personal information. Your IP address is hashed and cannot be traced back to you.', bn: 'আমরা আপনার নাম, ইমেইল, ফোন নম্বর বা কোনো ব্যক্তিগত তথ্য সংগ্রহ করি না। আপনার IP অ্যাড্রেস হ্যাশ করা হয় এবং আপনাকে ট্র্যাক করা যায় না।' },
        'anon.evidenceRequired': { en: 'Evidence Required', bn: 'প্রমাণ প্রয়োজন' },
        'anon.evidenceDesc': { en: 'To ensure the validity of reports and reduce false submissions, at least one piece of evidence (photo, video, or document) is required.', bn: 'রিপোর্টের সত্যতা নিশ্চিত করতে এবং মিথ্যা রিপোর্ট কমাতে কমপক্ষে একটি প্রমাণ (ছবি, ভিডিও বা ডকুমেন্ট) দিতে হবে।' },
        'anon.rateLimited': { en: 'Rate Limited', bn: 'সীমিত সংখ্যক রিপোর্ট' },
        'anon.rateLimitDesc': { en: 'To prevent abuse, you can submit up to 3 anonymous reports per day from your location.', bn: 'অপব্যবহার রোধে আপনি দিনে সর্বোচ্চ ৩টি বেনামে রিপোর্ট করতে পারবেন।' },
        'anon.legalResponsibility': { en: 'Legal Responsibility', bn: 'আইনি দায়িত্ব' },
        'anon.legalDesc': { en: 'Filing false reports is a criminal offense. Only submit genuine reports about real incidents.', bn: 'মিথ্যা রিপোর্ট করা অপরাধ। শুধুমাত্র সত্য ঘটনা রিপোর্ট করুন।' },
        'anon.trackYourReport': { en: 'Track Your Report', bn: 'রিপোর্ট ট্র্যাক করুন' },
        'anon.trackDesc': { en: 'You will receive a unique Report ID. Save it to check the status of your report later.', bn: 'আপনি একটি ইউনিক রিপোর্ট আইডি পাবেন। পরে স্ট্যাটাস দেখতে এটা সেভ করে রাখুন।' },
        'anon.understandContinue': { en: 'I Understand, Continue', bn: 'বুঝেছি, চালিয়ে যান' },
        'anon.disclaimer.intro': { en: 'Before submitting an anonymous report, please understand the following:', bn: 'বেনামে রিপোর্ট জমা দেওয়ার আগে নিচের বিষয়গুলো বুঝুন:' },
        'anon.disclaimer.anonymity': { en: 'Complete Anonymity', bn: 'সম্পূর্ণ বেনামে' },
        'anon.disclaimer.anonymity.desc': { en: 'We do not collect your name, email, phone number, or any personal information. Your IP address is hashed and cannot be traced back to you.', bn: 'আমরা আপনার নাম, ইমেইল, ফোন নম্বর বা কোনো ব্যক্তিগত তথ্য সংগ্রহ করি না। আপনার IP অ্যাড্রেস হ্যাশ করা হয় এবং আপনাকে ট্র্যাক করা যায় না।' },
        'anon.disclaimer.evidence': { en: 'Evidence Required', bn: 'প্রমাণ প্রয়োজন' },
        'anon.disclaimer.evidence.desc': { en: 'To ensure the validity of reports and reduce false submissions, at least one piece of evidence (photo, video, or document) is required.', bn: 'রিপোর্টের সত্যতা নিশ্চিত করতে এবং মিথ্যা রিপোর্ট কমাতে কমপক্ষে একটি প্রমাণ (ছবি, ভিডিও বা ডকুমেন্ট) দিতে হবে।' },
        'anon.disclaimer.rateLimit': { en: 'Rate Limited', bn: 'সীমিত সংখ্যক রিপোর্ট' },
        'anon.disclaimer.rateLimit.desc': { en: 'To prevent abuse, you can submit up to 3 anonymous reports per day from your location.', bn: 'অপব্যবহার রোধে আপনি দিনে সর্বোচ্চ ৩টি বেনামে রিপোর্ট করতে পারবেন।' },
        'anon.disclaimer.legal': { en: 'Legal Responsibility', bn: 'আইনি দায়িত্ব' },
        'anon.disclaimer.legal.desc': { en: 'Filing false reports is a criminal offense. Only submit genuine reports about real incidents.', bn: 'মিথ্যা রিপোর্ট করা অপরাধ। শুধুমাত্র সত্য ঘটনা রিপোর্ট করুন।' },
        'anon.disclaimer.trackId': { en: 'Track Your Report', bn: 'রিপোর্ট ট্র্যাক করুন' },
        'anon.disclaimer.trackId.desc': { en: 'You will receive a unique Report ID. Save it to check the status of your report later.', bn: 'আপনি একটি ইউনিক রিপোর্ট আইডি পাবেন। পরে স্ট্যাটাস দেখতে এটা সেভ করে রাখুন।' },
        'anon.iUnderstand': { en: 'I Understand, Continue', bn: 'বুঝেছি, চালিয়ে যান' },
        'anon.incidentType': { en: 'Incident Type', bn: 'ঘটনার ধরন' },
        'anon.typeOfCrime': { en: 'Type of Crime *', bn: 'অপরাধের ধরন *' },
        'anon.crimeTypeLabel': { en: 'Type of Crime', bn: 'অপরাধের ধরন' },
        'anon.selectCrimeType': { en: 'Select the type of crime', bn: 'অপরাধের ধরন নির্বাচন করুন' },
        'anon.incidentDetails': { en: 'Incident Details', bn: 'ঘটনার বিবরণ' },
        'anon.description': { en: 'Description *', bn: 'বিবরণ *' },
        'anon.descPlaceholder': { en: 'Describe the incident in detail. Include what happened, who was involved (without personal names if unknown), and any other relevant information. Minimum 50 characters required.', bn: 'ঘটনাটি বিস্তারিত লিখুন। কি ঘটেছে, কারা জড়িত ছিল (অজানা হলে নাম ছাড়া), এবং অন্যান্য প্রাসঙ্গিক তথ্য দিন। সর্বনিম্ন ৫০ অক্ষর লাগবে।' },
        'anon.descriptionPlaceholder': { en: 'Describe what happened in detail...', bn: 'কি ঘটেছে বিস্তারিত লিখুন...' },
        'anon.dateOfIncident': { en: 'Date of Incident *', bn: 'ঘটনার তারিখ *' },
        'anon.timeOfIncident': { en: 'Time of Incident *', bn: 'ঘটনার সময় *' },
        'anon.incidentDate': { en: 'Incident Date', bn: 'ঘটনার তারিখ' },
        'anon.incidentTime': { en: 'Incident Time', bn: 'ঘটনার সময়' },
        'anon.location': { en: 'Location *', bn: 'স্থান *' },
        'anon.locationPlaceholder': { en: 'Enter address or location details', bn: 'ঠিকানা বা স্থানের বিবরণ দিন' },
        'anon.useMap': { en: 'Use Map', bn: 'ম্যাপ ব্যবহার করুন' },
        'anon.selectLocation': { en: 'Select Location on Map', bn: 'ম্যাপে স্থান নির্বাচন করুন' },
        'anon.suspectInfo': { en: 'Suspect Information', bn: 'সন্দেহভাজনের তথ্য' },
        'anon.suspectDescription': { en: 'Suspect Description', bn: 'সন্দেহভাজনের বিবরণ' },
        'anon.suspectPlaceholder': { en: 'Describe the suspect if known (appearance, clothing, vehicle, etc.)...', bn: 'সন্দেহভাজন সম্পর্কে জানা থাকলে লিখুন (চেহারা, পোশাক, গাড়ি ইত্যাদি)...' },
        'anon.evidence': { en: 'Evidence', bn: 'প্রমাণ' },
        'anon.uploadEvidence': { en: 'Upload Evidence', bn: 'প্রমাণ আপলোড করুন' },
        'anon.dragDrop': { en: 'Drag and drop files here or click to browse', bn: 'ফাইল টেনে এনে ছাড়ুন অথবা ক্লিক করে ব্রাউজ করুন' },
        'anon.maxFiles': { en: 'Maximum 10 files, 50MB each', bn: 'সর্বোচ্চ ১০টি ফাইল, প্রতিটি ৫০MB' },
        'anon.additionalNotes': { en: 'Additional Notes', bn: 'অতিরিক্ত নোট' },
        'anon.notesPlaceholder': { en: 'Any other information that might help...', bn: 'অন্য কোনো তথ্য যা সাহায্য করতে পারে...' },
        'anon.captcha': { en: 'Security Verification', bn: 'নিরাপত্তা যাচাই' },
        'anon.submitReport': { en: 'Submit Anonymous Report', bn: 'বেনামে রিপোর্ট জমা দিন' },
        'anon.submitting': { en: 'Submitting...', bn: 'জমা হচ্ছে...' },
        'anon.success': { en: 'Report Submitted Successfully!', bn: 'রিপোর্ট সফলভাবে জমা হয়েছে!' },
        'anon.saveReportId': { en: 'Save your Report ID to track status later:', bn: 'স্ট্যাটাস ট্র্যাক করতে রিপোর্ট আইডি সেভ করুন:' },
        'anon.copyId': { en: 'Copy ID', bn: 'আইডি কপি করুন' },
        'anon.copied': { en: 'Copied!', bn: 'কপি হয়েছে!' },

        // ============================================
        // CRIME TYPES
        // ============================================
        'crime.theft': { en: 'Theft / Burglary / Robbery', bn: 'চুরি / ডাকাতি / ছিনতাই' },
        'crime.assault': { en: 'Assault / Physical Violence', bn: 'হামলা / শারীরিক সহিংসতা' },
        'crime.fraud': { en: 'Fraud / Scams', bn: 'প্রতারণা / জালিয়াতি' },
        'crime.vandalism': { en: 'Vandalism / Property Damage', bn: 'ভাংচুর / সম্পত্তির ক্ষতি' },
        'crime.harassment': { en: 'Harassment / Stalking', bn: 'হয়রানি / পিছু নেওয়া' },
        'crime.drug': { en: 'Drug Related Activity', bn: 'মাদক সংক্রান্ত' },
        'crime.drugRelated': { en: 'Drug Related Activity', bn: 'মাদক সংক্রান্ত' },
        'crime.cyber': { en: 'Cybercrime / Online Fraud', bn: 'সাইবার অপরাধ / অনলাইন প্রতারণা' },
        'crime.cybercrime': { en: 'Cybercrime / Online Fraud', bn: 'সাইবার অপরাধ / অনলাইন প্রতারণা' },
        'crime.domestic': { en: 'Domestic Violence', bn: 'পারিবারিক সহিংসতা' },
        'crime.domesticViolence': { en: 'Domestic Violence', bn: 'পারিবারিক সহিংসতা' },
        'crime.corruption': { en: 'Corruption / Bribery', bn: 'দুর্নীতি / ঘুষ' },
        'crime.trafficking': { en: 'Human Trafficking', bn: 'মানব পাচার' },
        'crime.environmental': { en: 'Environmental Crime', bn: 'পরিবেশ অপরাধ' },
        'crime.organized': { en: 'Gang / Organized Crime', bn: 'গ্যাং / সংঘবদ্ধ অপরাধ' },
        'crime.threat': { en: 'Threats / Intimidation', bn: 'হুমকি / ভয় দেখানো' },
        'crime.publicSafety': { en: 'Public Safety Concern', bn: 'জননিরাপত্তা উদ্বেগ' },
        'crime.traffic': { en: 'Serious Traffic Violation', bn: 'গুরুতর ট্রাফিক লঙ্ঘন' },
        'crime.kidnapping': { en: 'Kidnapping / Missing Person', bn: 'অপহরণ / নিখোঁজ ব্যক্তি' },
        'crime.murder': { en: 'Murder / Homicide', bn: 'হত্যা / খুন' },
        'crime.sexualAssault': { en: 'Sexual Assault / Rape', bn: 'যৌন নির্যাতন / ধর্ষণ' },
        'crime.other': { en: 'Other', bn: 'অন্যান্য' },
        
        // ============================================
        // FORM RELATED
        // ============================================
        'form.required': { en: 'Required', bn: 'বাধ্যতামূলক' },
        'form.optional': { en: 'Optional', bn: 'ঐচ্ছিক' },
        'form.error': { en: 'Error', bn: 'ত্রুটি' },
        'form.success': { en: 'Success', bn: 'সফল' },
        'form.loading': { en: 'Loading...', bn: 'লোড হচ্ছে...' },

        // ============================================
        // REGISTER PAGE
        // ============================================
        'register.stepMobile': { en: 'Mobile', bn: 'মোবাইল' },
        'register.stepOTP': { en: 'OTP', bn: 'OTP' },
        'register.stepNID': { en: 'NID', bn: 'NID' },
        'register.stepFace': { en: 'Face', bn: 'ফেস' },
        'register.stepAddress': { en: 'Address', bn: 'ঠিকানা' },
        'register.stepAccount': { en: 'Account', bn: 'অ্যাকাউন্ট' },
        'register.stepDone': { en: 'Done', bn: 'সম্পন্ন' },
        'register.title': { en: 'Create Account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
        'register.mobileNumber': { en: 'Mobile Number', bn: 'মোবাইল নম্বর' },
        'register.enterMobile': { en: 'Enter mobile number here', bn: 'এখানে মোবাইল নম্বর লিখুন' },
        'register.verifyMobile': { en: 'Verify Mobile', bn: 'মোবাইল যাচাই করুন' },
        'register.step1Info': { en: 'Step 1/7: In the first step of sign up, enter your mobile number (e.g., 01XXXXXXXXX).', bn: 'ধাপ ১/৭: সাইন আপের প্রথম ধাপে, আপনার মোবাইল নম্বর লিখুন (যেমন, ০১XXXXXXXXX)।' },
        'register.provideMobile': { en: 'Provide your mobile number', bn: 'আপনার মোবাইল নম্বর দিন' },
        'register.step2Info': { en: 'Step 2/7: Enter the 6-digit OTP code sent to your mobile number.', bn: 'ধাপ ২/৭: আপনার মোবাইল নম্বরে পাঠানো ৬-সংখ্যার OTP কোড লিখুন।' },
        'register.otpPrompt': { en: 'A 6-digit code has been sent to your mobile. Please enter your OTP!', bn: 'আপনার মোবাইলে ৬-সংখ্যার কোড পাঠানো হয়েছে। অনুগ্রহ করে আপনার OTP লিখুন!' },
        'register.resendOtp': { en: 'Resend OTP', bn: 'OTP পুনরায় পাঠান' },
        'register.identityVerification': { en: 'Identity Verification', bn: 'পরিচয় যাচাই' },
        'register.step3Info': { en: 'Step 3/7: Please ensure all information is entered correctly. For successful verification, all details must match your National Identity Card (NID) details.', bn: 'ধাপ ৩/৭: অনুগ্রহ করে সব তথ্য সঠিকভাবে লিখুন। সফল যাচাইয়ের জন্য, সব তথ্য আপনার জাতীয় পরিচয়পত্রের (NID) সাথে মিলতে হবে।' },
        'register.nidNumber': { en: 'National Identity Card Number', bn: 'জাতীয় পরিচয়পত্র নম্বর' },
        'register.nidPlaceholder': { en: 'Enter 10 or 17 digit NID number', bn: '১০ বা ১৭ সংখ্যার NID নম্বর লিখুন' },
        'register.nameEnglish': { en: 'Name (English)', bn: 'নাম (ইংরেজি)' },
        'register.nameEnPlaceholder': { en: 'Enter your name in English', bn: 'আপনার নাম ইংরেজিতে লিখুন' },
        'register.nameBengali': { en: 'Name (Bengali)', bn: 'নাম (বাংলা)' },
        'register.fatherPlaceholder': { en: "Enter father's name", bn: 'পিতার নাম লিখুন' },
        'register.motherPlaceholder': { en: "Enter mother's name", bn: 'মাতার নাম লিখুন' },
        'register.verifyIdentity': { en: 'Verify Identity', bn: 'পরিচয় যাচাই করুন' },
        'register.faceDetection': { en: 'Face Detection', bn: 'ফেস ডিটেকশন' },
        'register.step4Info': { en: "Position your face inside the frame. Make sure you're in a well-lit environment.", bn: 'আপনার মুখ ফ্রেমের মধ্যে রাখুন। নিশ্চিত করুন যে আপনি ভাল আলোতে আছেন।' },
        'register.positionFace': { en: 'Position your face in the frame', bn: 'আপনার মুখ ফ্রেমের মধ্যে রাখুন' },
        'register.retake': { en: 'Retake', bn: 'পুনরায় নিন' },
        'register.capture': { en: 'Capture', bn: 'ছবি তুলুন' },
        // Step 5: Address
        'register.contactInfo': { en: 'Contact Information', bn: 'যোগাযোগের তথ্য' },
        'register.step5Info': { en: 'Step 5/7: Provide your current address. Select Division, District, Police Station, Union, and Village from the dropdowns, and enter any additional details in the text box.', bn: 'ধাপ ৫/৭: আপনার বর্তমান ঠিকানা দিন। ড্রপডাউন থেকে বিভাগ, জেলা, থানা, ইউনিয়ন এবং গ্রাম নির্বাচন করুন এবং টেক্সট বক্সে অতিরিক্ত বিবরণ লিখুন।' },
        'register.division': { en: 'Division (বিভাগ)', bn: 'বিভাগ' },
        'register.selectDivision': { en: 'Select Division', bn: 'বিভাগ নির্বাচন করুন' },
        'register.district': { en: 'District (জেলা)', bn: 'জেলা' },
        'register.selectDistrict': { en: 'Select District', bn: 'জেলা নির্বাচন করুন' },
        'register.policeStation': { en: 'Police Station (থানা)', bn: 'থানা' },
        'register.selectPoliceStation': { en: 'Select Police Station', bn: 'থানা নির্বাচন করুন' },
        'register.union': { en: 'Union (ইউনিয়ন)', bn: 'ইউনিয়ন' },
        'register.selectUnion': { en: 'Select Union', bn: 'ইউনিয়ন নির্বাচন করুন' },
        'register.village': { en: 'Village (গ্রাম)', bn: 'গ্রাম' },
        'register.selectVillage': { en: 'Select Village', bn: 'গ্রাম নির্বাচন করুন' },
        'register.placeDetails': { en: 'Place Details (স্থানের বিবরণ)', bn: 'স্থানের বিবরণ' },
        'register.placeDetailsPlaceholder': { en: 'Enter additional address details...', bn: 'অতিরিক্ত ঠিকানার বিবরণ লিখুন...' },
        'register.saveAddress': { en: 'Save Address', bn: 'ঠিকানা সেভ করুন' },
        // Step 6: Account
        'register.createAccount': { en: 'Create Account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
        'register.step6Info': { en: 'Step 6/7: This is the final step of sign up. Please provide your email, password, and confirm password correctly to successfully create your account.', bn: 'ধাপ ৬/৭: সাইন আপের এটি শেষ ধাপ। সফলভাবে অ্যাকাউন্ট তৈরি করতে আপনার ইমেইল, পাসওয়ার্ড এবং পাসওয়ার্ড নিশ্চিত করুন সঠিকভাবে দিন।' },
        'register.faceVerified': { en: 'Face Verified', bn: 'ফেস যাচাই হয়েছে' },
        'register.usernamePlaceholder': { en: 'Choose a unique username', bn: 'একটি অনন্য ইউজারনেম বেছে নিন' },
        'register.usernameHelper': { en: 'Username must be 3-50 characters (letters, numbers, underscores only)', bn: 'ইউজারনেম ৩-৫০ অক্ষরের হতে হবে (শুধু অক্ষর, সংখ্যা, আন্ডারস্কোর)' },
        'register.createAccountBtn': { en: 'Create Account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
        // Step 7: Success
        'register.successTitle': { en: 'Account Created Successfully!', bn: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' },
        'register.successMessage': { en: 'Welcome to SecureVoice! Your account has been created and verified. You can now login to access the platform and report incidents securely.', bn: 'SecureVoice-এ স্বাগতম! আপনার অ্যাকাউন্ট তৈরি এবং যাচাই হয়েছে। এখন আপনি লগইন করে প্ল্যাটফর্মে প্রবেশ করতে এবং নিরাপদে ঘটনা রিপোর্ট করতে পারবেন।' },
        'register.loginToAccount': { en: 'Login to Your Account', bn: 'আপনার অ্যাকাউন্টে লগইন করুন' },

        // ============================================
        // STATUS
        // ============================================
        'status.pending': { en: 'Pending', bn: 'অপেক্ষমাণ' },
        'status.pendingReview': { en: 'Pending Review', bn: 'পর্যালোচনার অপেক্ষায়' },
        'status.underReview': { en: 'Under Review', bn: 'পর্যালোচনায়' },
        'status.reviewing': { en: 'Reviewing', bn: 'পর্যালোচনা চলছে' },
        'status.reviewed': { en: 'Reviewed', bn: 'পর্যালোচিত' },
        'status.verifying': { en: 'Verifying', bn: 'যাচাই হচ্ছে' },
        'status.verified': { en: 'Verified', bn: 'যাচাই হয়েছে' },
        'status.investigating': { en: 'Investigating', bn: 'তদন্ত চলছে' },
        'status.underInvestigation': { en: 'Under Investigation', bn: 'তদন্তাধীন' },
        'status.resolved': { en: 'Resolved', bn: 'সমাধান হয়েছে' },
        'status.closed': { en: 'Closed', bn: 'বন্ধ' },
        'status.dismissed': { en: 'Dismissed', bn: 'খারিজ' },
        'status.rejected': { en: 'Rejected', bn: 'বাতিল' },
        'status.approved': { en: 'Approved', bn: 'অনুমোদিত' },
        'status.active': { en: 'Active', bn: 'সক্রিয়' },
        'status.suspended': { en: 'Suspended', bn: 'স্থগিত' },

        // ============================================
        // ADMIN DASHBOARD
        // ============================================
        'admin.dashboard': { en: 'Admin Dashboard', bn: 'অ্যাডমিন ড্যাশবোর্ড' },
        'admin.caseAnalytics': { en: 'Case Analytics', bn: 'কেস বিশ্লেষণ' },
        'admin.myProfile': { en: 'My Profile', bn: 'আমার প্রোফাইল' },
        'admin.complaints': { en: 'Complaints', bn: 'অভিযোগ' },
        'admin.anonymousReports': { en: 'Anonymous Reports', bn: 'বেনামে রিপোর্ট' },
        'admin.users': { en: 'Users', bn: 'ব্যবহারকারী' },
        'admin.settings': { en: 'Settings', bn: 'সেটিংস' },
        'admin.home': { en: 'Home', bn: 'হোম' },
        'admin.totalCases': { en: 'Total Cases', bn: 'মোট কেস' },
        'admin.pendingCases': { en: 'Pending', bn: 'পেন্ডিং' },
        'admin.verifyingCases': { en: 'Verifying', bn: 'যাচাই' },
        'admin.investigatingCases': { en: 'Investigating', bn: 'তদন্ত' },
        'admin.resolvedCases': { en: 'Resolved', bn: 'সমাধান' },
        'admin.recentComplaints': { en: 'Recent Complaints', bn: 'সাম্প্রতিক অভিযোগ' },
        'admin.resolutionRate': { en: 'Resolution Rate', bn: 'সমাধানের হার' },
        'admin.avgDaysToResolve': { en: 'Avg. Days to Resolve', bn: 'গড় সমাধান সময় (দিন)' },
        'admin.caseTrends': { en: 'Case Trends', bn: 'কেস ট্রেন্ড' },
        'admin.crimeDistribution': { en: 'Crime Distribution', bn: 'অপরাধের বিন্যাস' },
        'admin.statusOverview': { en: 'Status Overview', bn: 'স্ট্যাটাস ওভারভিউ' },
        'admin.resolutionAnalysis': { en: 'Resolution Analysis', bn: 'সমাধান বিশ্লেষণ' },
        'admin.crimeTypeStats': { en: 'Crime Type Statistics', bn: 'অপরাধের ধরন পরিসংখ্যান' },
        'admin.avgTime': { en: 'Avg. Time', bn: 'গড় সময়' },
        'admin.trend': { en: 'Trend', bn: 'ট্রেন্ড' },
        'admin.last7Days': { en: 'Last 7 Days', bn: 'শেষ ৭ দিন' },
        'admin.last30Days': { en: 'Last 30 Days', bn: 'শেষ ৩০ দিন' },
        'admin.last90Days': { en: 'Last 90 Days', bn: 'শেষ ৯০ দিন' },
        'admin.loadingComplaints': { en: 'Loading Complaints...', bn: 'অভিযোগ লোড হচ্ছে...' },
        'admin.loadingUsers': { en: 'Loading Users...', bn: 'ব্যবহারকারী লোড হচ্ছে...' },
        'admin.complainantUsers': { en: 'Complainant Users', bn: 'অভিযোগকারী ব্যবহারকারী' },
        'admin.adminSettings': { en: 'Admin Settings', bn: 'অ্যাডমিন সেটিংস' },
        'admin.settingsDescription': { en: 'Customize your admin dashboard experience and notification preferences.', bn: 'আপনার অ্যাডমিন ড্যাশবোর্ডের অভিজ্ঞতা এবং নোটিফিকেশন পছন্দ কাস্টমাইজ করুন।' },
        'admin.appearance': { en: 'Appearance', bn: 'অ্যাপিয়ারেন্স' },
        'admin.appearanceDescription': { en: 'Customize the look and feel of your dashboard.', bn: 'আপনার ড্যাশবোর্ডের চেহারা কাস্টমাইজ করুন।' },
        'admin.darkMode': { en: 'Dark Mode', bn: 'ডার্ক মোড' },
        'admin.darkModeDescription': { en: 'Switch between light and dark themes', bn: 'লাইট এবং ডার্ক থিম এর মধ্যে পরিবর্তন করুন' },

        // ============================================
        // ANALYTICS
        // ============================================
        'analytics.last7Days': { en: 'Last 7 Days', bn: 'শেষ ৭ দিন' },
        'analytics.last30Days': { en: 'Last 30 Days', bn: 'শেষ ৩০ দিন' },
        'analytics.last90Days': { en: 'Last 90 Days', bn: 'শেষ ৯০ দিন' },
        'analytics.resolutionRate': { en: 'Resolution Rate', bn: 'সমাধানের হার' },
        'analytics.avgDaysResolve': { en: 'Avg. Days to Resolve', bn: 'গড় সমাধান সময় (দিন)' },
        'analytics.caseTrends': { en: 'Case Trends', bn: 'কেস ট্রেন্ড' },
        'analytics.crimeDistribution': { en: 'Crime Distribution', bn: 'অপরাধের বিন্যাস' },
        'analytics.statusOverview': { en: 'Status Overview', bn: 'স্ট্যাটাস ওভারভিউ' },
        'analytics.resolutionAnalysis': { en: 'Resolution Analysis', bn: 'সমাধান বিশ্লেষণ' },

        'admin.adminProfile': { en: 'Admin Profile', bn: 'অ্যাডমিন প্রোফাইল' },
        'admin.editProfile': { en: 'Edit Profile', bn: 'প্রোফাইল এডিট' },
        'admin.profileInfo': { en: 'Profile Information', bn: 'প্রোফাইল তথ্য' },
        'admin.loading': { en: 'Loading...', bn: 'লোড হচ্ছে...' },
        'admin.login': { en: 'Admin Login', bn: 'অ্যাডমিন লগইন' },
        'admin.welcomeBack': { en: 'Welcome Back', bn: 'স্বাগতম' },
        'admin.districtAdminPortal': { en: 'District Administrator Portal', bn: 'জেলা প্রশাসক পোর্টাল' },
        'admin.secureAccessForAdmins': { en: 'Secure access for district-level administrators', bn: 'জেলা প্রশাসকদের জন্য সুরক্ষিত অ্যাক্সেস' },
        'admin.emailVerificationRequired': { en: 'Email Verification Required', bn: 'ইমেইল যাচাই প্রয়োজন' },
        'admin.superAdminApproval': { en: 'Super Admin Approval', bn: 'সুপার অ্যাডমিন অনুমোদন' },
        'admin.activityAuditLogs': { en: 'Activity Audit Logs', bn: 'কার্যকলাপ অডিট লগ' },
        'admin.welcome': { en: 'Welcome', bn: 'স্বাগতম' },
        'admin.refresh': { en: 'Refresh', bn: 'রিফ্রেশ' },
        'admin.search': { en: 'Search', bn: 'খুঁজুন' },
        'admin.notificationPreferences': { en: 'Notification Preferences', bn: 'নোটিফিকেশন পছন্দ' },
        'admin.emailNotifications': { en: 'Email Notifications', bn: 'ইমেইল নোটিফিকেশন' },
        'admin.browserNotifications': { en: 'Browser Notifications', bn: 'ব্রাউজার নোটিফিকেশন' },
        'admin.securitySettings': { en: 'Security Settings', bn: 'সিকিউরিটি সেটিংস' },
        'admin.autoLogout': { en: 'Auto-logout After Inactivity', bn: 'নিষ্ক্রিয়তার পর স্বয়ংক্রিয় লগআউট' },
        'admin.autoLogoutDesc': { en: 'Automatically log out after 30 minutes of inactivity', bn: '৩০ মিনিট নিষ্ক্রিয় থাকলে স্বয়ংক্রিয় লগআউট' },
        'admin.saveSettings': { en: 'Save Settings', bn: 'সেটিংস সেভ করুন' },
        'admin.designation': { en: 'Designation', bn: 'পদবি' },
        'admin.officialId': { en: 'Official ID', bn: 'অফিসিয়াল আইডি' },
        'admin.accountCreated': { en: 'Account Created', bn: 'অ্যাকাউন্ট তৈরির তারিখ' },
        'admin.searchPlaceholder': { en: 'Search by user or type...', bn: 'ব্যবহারকারী বা ধরন দিয়ে খুঁজুন...' },
        'admin.complaintReports': { en: 'Complaint Reports', bn: 'অভিযোগ রিপোর্ট' },
        'admin.total': { en: 'Total:', bn: 'মোট:' },
        'admin.reports': { en: 'reports', bn: 'রিপোর্ট' },
        'admin.totalAnonymous': { en: 'Total Anonymous', bn: 'মোট বেনামে' },
        'admin.pendingReview': { en: 'Pending Review', bn: 'পর্যালোচনা অপেক্ষমান' },

        // ============================================
        // SUPER ADMIN DASHBOARD
        // ============================================
        'superAdmin.title': { en: 'Super Admin Dashboard', bn: 'সুপার অ্যাডমিন ড্যাশবোর্ড' },
        'superAdmin.adminRequests': { en: 'Admin Requests', bn: 'অ্যাডমিন অনুরোধ' },
        'superAdmin.allAdmins': { en: 'All Admins', bn: 'সকল অ্যাডমিন' },
        'superAdmin.systemStats': { en: 'System Statistics', bn: 'সিস্টেম পরিসংখ্যান' },
        'superAdmin.pendingRequests': { en: 'Pending Requests', bn: 'অপেক্ষমাণ অনুরোধ' },
        'superAdmin.approvedAdmins': { en: 'Approved Admins', bn: 'অনুমোদিত অ্যাডমিন' },
        'superAdmin.totalUsers': { en: 'Total Users', bn: 'মোট ব্যবহারকারী' },
        'superAdmin.totalComplaints': { en: 'Total Complaints', bn: 'মোট অভিযোগ' },
        'superAdmin.approveAdmin': { en: 'Approve Admin', bn: 'অ্যাডমিন অনুমোদন' },
        'superAdmin.rejectAdmin': { en: 'Reject Admin', bn: 'অ্যাডমিন বাতিল' },
        'superAdmin.suspendAdmin': { en: 'Suspend Admin', bn: 'অ্যাডমিন স্থগিত' },
        'superAdmin.activateAdmin': { en: 'Activate Admin', bn: 'অ্যাডমিন সক্রিয় করুন' },
        'superAdmin.activeAdmins': { en: 'Active Admins', bn: 'সক্রিয় অ্যাডমিন' },
        'superAdmin.suspendedAdmins': { en: 'Suspended Admins', bn: 'স্থগিত অ্যাডমিন' },
        'superAdmin.recentActivity': { en: 'Recent Activity', bn: 'সাম্প্রতিক কার্যক্রম' },
        'superAdmin.viewAllLogs': { en: 'View All Logs', bn: 'সব লগ দেখুন' },
        'superAdmin.pendingAdminRequests': { en: 'Pending Admin Requests', bn: 'অপেক্ষমাণ অ্যাডমিন অনুরোধ' },
        'superAdmin.allDistrictAdmins': { en: 'All District Admins', bn: 'সকল জেলা অ্যাডমিন' },
        'superAdmin.filterByStatus': { en: 'Filter by Status', bn: 'স্ট্যাটাস দিয়ে ফিল্টার' },
        'superAdmin.filterByDistrict': { en: 'Filter by District', bn: 'জেলা দিয়ে ফিল্টার' },
        'superAdmin.filterByAdmin': { en: 'Filter by Admin', bn: 'অ্যাডমিন দিয়ে ফিল্টার' },
        'superAdmin.allStatuses': { en: 'All Statuses', bn: 'সব স্ট্যাটাস' },
        'superAdmin.allDistricts': { en: 'All Districts', bn: 'সব জেলা' },
        'superAdmin.approved': { en: 'Approved', bn: 'অনুমোদিত' },
        'superAdmin.active': { en: 'Active', bn: 'সক্রিয়' },
        'superAdmin.suspended': { en: 'Suspended', bn: 'স্থগিত' },
        'superAdmin.rejected': { en: 'Rejected', bn: 'বাতিল' },
        'superAdmin.searchPlaceholder': { en: 'Search by name or username...', bn: 'নাম বা ইউজারনেম দিয়ে খুঁজুন...' },
        'superAdmin.auditLogs': { en: 'Audit Logs', bn: 'অডিট লগ' },
        'superAdmin.dateFrom': { en: 'Date From', bn: 'তারিখ থেকে' },
        'superAdmin.dateTo': { en: 'Date To', bn: 'তারিখ পর্যন্ত' },
        'superAdmin.totalAdmins': { en: 'Total Admins', bn: 'মোট অ্যাডমিন' },
        'superAdmin.districtsCovered': { en: 'Districts Covered', bn: 'কভার করা জেলা' },
        'superAdmin.avgApprovalTime': { en: 'Avg Approval Time (hrs)', bn: 'গড় অনুমোদনের সময় (ঘন্টা)' },
        'superAdmin.totalActionsLogged': { en: 'Total Actions Logged', bn: 'মোট লগকৃত কার্যক্রম' },
        'superAdmin.districtDistribution': { en: 'District Distribution', bn: 'জেলা বিতরণ' },
        'superAdmin.superAdminSettings': { en: 'Super Admin Settings', bn: 'সুপার অ্যাডমিন সেটিংস' },
        'superAdmin.newAdminNotifications': { en: 'New Admin Registration Notifications', bn: 'নতুন অ্যাডমিন রেজিস্ট্রেশন নোটিফিকেশন' },
        'superAdmin.newAdminNotificationsDesc': { en: 'Get notified when a district admin submits a registration request', bn: 'জেলা অ্যাডমিন রেজিস্ট্রেশন অনুরোধ জমা দিলে নোটিফিকেশন পান' },
        'superAdmin.emailNotificationsDesc': { en: 'Receive email alerts for new registration requests', bn: 'নতুন রেজিস্ট্রেশন অনুরোধের জন্য ইমেইল পান' },
        'superAdmin.browserNotificationsDesc': { en: 'Show browser notifications when logged into dashboard', bn: 'ড্যাশবোর্ডে লগইন থাকলে ব্রাউজার নোটিফিকেশন দেখান' },
        
        // Super Admin Login Page
        'superAdmin.subtitle': { en: 'System-wide Control & Management', bn: 'সিস্টেম-ব্যাপী নিয়ন্ত্রণ ও ব্যবস্থাপনা' },
        'superAdmin.systemPrivileges': { en: 'System Privileges', bn: 'সিস্টেম বিশেষাধিকার' },
        'superAdmin.feature1': { en: 'Manage District Admins', bn: 'জেলা অ্যাডমিন পরিচালনা' },
        'superAdmin.feature2': { en: 'Approve/Reject Requests', bn: 'অনুরোধ অনুমোদন/বাতিল' },
        'superAdmin.feature3': { en: 'View Audit Logs', bn: 'অডিট লগ দেখুন' },
        'superAdmin.feature4': { en: 'System Configuration', bn: 'সিস্টেম কনফিগারেশন' },
        'superAdmin.badge': { en: 'Super Administrator', bn: 'সুপার অ্যাডমিনিস্ট্রেটর' },
        'superAdmin.secureLogin': { en: 'Secure Login', bn: 'সুরক্ষিত লগইন' },
        'superAdmin.highestAccess': { en: 'Highest level administrative access', bn: 'সর্বোচ্চ স্তরের প্রশাসনিক অ্যাক্সেস' },
        'superAdmin.usernameLabel': { en: 'Super Admin Username', bn: 'সুপার অ্যাডমিন ইউজারনেম' },
        'superAdmin.usernamePlaceholder': { en: 'Enter super admin username', bn: 'সুপার অ্যাডমিন ইউজারনেম লিখুন' },
        'superAdmin.loginBtn': { en: 'Secure Login', bn: 'সুরক্ষিত লগইন' },
        'superAdmin.securityNotice': { en: 'This area requires highest level security clearance', bn: 'এই এলাকায় সর্বোচ্চ স্তরের নিরাপত্তা ছাড়পত্র প্রয়োজন' },
        'superAdmin.notSuperAdmin': { en: 'Not a Super Admin?', bn: 'সুপার অ্যাডমিন নন?' },
        'superAdmin.goToDistrictAdmin': { en: 'Go to District Admin Login', bn: 'জেলা অ্যাডমিন লগইন এ যান' },
        'superAdmin.backToAdmin': { en: 'Back to Admin Login', bn: 'অ্যাডমিন লগইন এ ফিরুন' },

        // ============================================
        // ADMIN REGISTRATION
        // ============================================
        'adminReg.joinTitle': { en: 'Join SecureVoice', bn: 'SecureVoice এ যোগ দিন' },
        'adminReg.joinSubtitle': { en: 'Request administrative access for your district', bn: 'আপনার জেলার জন্য প্রশাসনিক অ্যাক্সেস অনুরোধ করুন' },
        'adminReg.requirements': { en: 'Requirements', bn: 'প্রয়োজনীয়তা' },
        'adminReg.req1': { en: 'Valid official credentials', bn: 'বৈধ সরকারি পরিচয়পত্র' },
        'adminReg.req2': { en: 'District-level authority', bn: 'জেলা-স্তরের অথরিটি' },
        'adminReg.req3': { en: 'Official email address', bn: 'অফিসিয়াল ইমেইল ঠিকানা' },
        'adminReg.req4': { en: 'Super Admin approval', bn: 'সুপার অ্যাডমিন অনুমোদন' },
        'adminReg.backToLogin': { en: 'Back to Login', bn: 'লগইনে ফিরুন' },
        'adminReg.formTitle': { en: 'District Admin Registration', bn: 'জেলা অ্যাডমিন রেজিস্ট্রেশন' },
        'adminReg.formSubtitle': { en: 'Submit your request for district-level administrative access', bn: 'জেলা-স্তরের প্রশাসনিক অ্যাক্সেসের জন্য আপনার অনুরোধ জমা দিন' },
        'adminReg.officialEmail': { en: 'Official Email', bn: 'অফিসিয়াল ইমেইল' },
        'adminReg.emailPlaceholder': { en: 'official@email.gov.bd', bn: 'official@email.gov.bd' },
        'adminReg.fullNamePlaceholder': { en: 'Enter your full name', bn: 'আপনার পুরো নাম লিখুন' },
        'adminReg.officialId': { en: 'Official/Employee ID', bn: 'অফিসিয়াল/কর্মচারী আইডি' },
        'adminReg.employeeIdPlaceholder': { en: 'Employee ID', bn: 'কর্মচারী আইডি' },
        'adminReg.designationPlaceholder': { en: 'e.g., District Police Chief', bn: 'যেমন, জেলা পুলিশ প্রধান' },
        'adminReg.selectDistrict': { en: 'Select District', bn: 'জেলা নির্বাচন করুন' },
        'adminReg.createPassword': { en: 'Create a strong password', bn: 'একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন' },
        'adminReg.reenterPassword': { en: 'Re-enter your password', bn: 'আপনার পাসওয়ার্ড পুনরায় লিখুন' },
        'adminReg.importantInfo': { en: 'Important Information', bn: 'গুরুত্বপূর্ণ তথ্য' },
        'adminReg.info1': { en: 'A verification email will be sent to confirm your email address', bn: 'আপনার ইমেইল ঠিকানা নিশ্চিত করতে একটি যাচাইকরণ ইমেইল পাঠানো হবে' },
        'adminReg.info2': { en: 'Super Administrator will review your request within 2-3 business days', bn: 'সুপার অ্যাডমিন ২-৩ কার্যদিবসের মধ্যে আপনার অনুরোধ পর্যালোচনা করবেন' },
        'adminReg.info3': { en: "You'll receive email updates at each step of the process", bn: 'প্রক্রিয়ার প্রতিটি ধাপে আপনি ইমেইল আপডেট পাবেন' },
        'adminReg.info4': { en: 'After approval, you can login with your credentials', bn: 'অনুমোদনের পরে, আপনি আপনার পরিচয় দিয়ে লগইন করতে পারবেন' },
        'adminReg.info5': { en: 'All information must be accurate and verifiable', bn: 'সমস্ত তথ্য সঠিক এবং যাচাইযোগ্য হতে হবে' },
        'adminReg.submitBtn': { en: 'Submit Registration Request', bn: 'রেজিস্ট্রেশন অনুরোধ জমা দিন' },

        // ============================================
        // EMAIL VERIFICATION
        // ============================================
        'verify.verifyingEmail': { en: 'Verifying Your Email', bn: 'আপনার ইমেইল যাচাই করা হচ্ছে' },
        'verify.pleaseWait': { en: 'Please wait while we verify your email address...', bn: 'আপনার ইমেইল ঠিকানা যাচাই করার সময় অপেক্ষা করুন...' },
        'verify.successTitle': { en: 'Email Verified Successfully! 🎉', bn: 'ইমেইল সফলভাবে যাচাই হয়েছে! 🎉' },
        'verify.successMessage': { en: 'Your email address has been verified. Your account is now pending Super Admin approval.', bn: 'আপনার ইমেইল ঠিকানা যাচাই করা হয়েছে। আপনার অ্যাকাউন্ট এখন সুপার অ্যাডমিনের অনুমোদনের অপেক্ষায় আছে।' },
        'verify.whatNext': { en: 'What happens next?', bn: 'এরপর কী হবে?' },
        'verify.next1': { en: 'Super Admin will review your request (2-3 business days)', bn: 'সুপার অ্যাডমিন আপনার অনুরোধ পর্যালোচনা করবেন (২-৩ কার্যদিবস)' },
        'verify.next2': { en: "You'll receive an email once approved", bn: 'অনুমোদিত হলে আপনি একটি ইমেইল পাবেন' },
        'verify.next3': { en: 'After approval, you can login with your credentials', bn: 'অনুমোদনের পরে, আপনি আপনার পরিচয় দিয়ে লগইন করতে পারবেন' },
        'verify.goToLogin': { en: 'Go to Admin Login', bn: 'অ্যাডমিন লগইনে যান' },
        'verify.errorTitle': { en: 'Verification Failed', bn: 'যাচাই ব্যর্থ হয়েছে' },
        'verify.errorMessage': { en: 'Unable to verify your email. The link may be invalid or expired.', bn: 'আপনার ইমেইল যাচাই করা যায়নি। লিঙ্কটি অবৈধ বা মেয়াদ শেষ হয়ে থাকতে পারে।' },
        'verify.registerAgain': { en: 'Register Again', bn: 'আবার রেজিস্ট্রেশন করুন' },
        'verify.emailVerifiedSuccess': { en: 'Email Verified Successfully!', bn: 'ইমেইল সফলভাবে যাচাই হয়েছে!' },
        'verify.canNowLogin': { en: 'Your email has been verified. You can now login to your District Admin account.', bn: 'আপনার ইমেইল যাচাই করা হয়েছে। আপনি এখন আপনার জেলা অ্যাডমিন অ্যাকাউন্টে লগইন করতে পারেন।' },
        'verify.proceedToLogin': { en: 'Proceed to Login', bn: 'লগইনে এগিয়ে যান' },
        'verify.redirectingIn': { en: 'Redirecting in', bn: 'রিডাইরেক্ট হচ্ছে' },
        'verify.seconds': { en: 'seconds...', bn: 'সেকেন্ডে...' },
        'verify.linkInvalid': { en: 'The verification link is invalid or has expired.', bn: 'যাচাইকরণ লিঙ্কটি অবৈধ বা মেয়াদ শেষ হয়ে গেছে।' },

        // ============================================
        // PASSWORD SETUP
        // ============================================
        'password.setTitle': { en: 'Set Your Password', bn: 'আপনার পাসওয়ার্ড সেট করুন' },
        'password.setSubtitle': { en: 'Create a secure password for your District Admin account', bn: 'আপনার জেলা অ্যাডমিন অ্যাকাউন্টের জন্য একটি নিরাপদ পাসওয়ার্ড তৈরি করুন' },
        'password.newPassword': { en: 'New Password', bn: 'নতুন পাসওয়ার্ড' },
        'password.requirements': { en: 'Password Requirements', bn: 'পাসওয়ার্ডের প্রয়োজনীয়তা' },
        'password.req1': { en: 'At least 8 characters long', bn: 'কমপক্ষে ৮ অক্ষর দীর্ঘ' },
        'password.req2': { en: 'Contains at least one letter (a-z, A-Z)', bn: 'কমপক্ষে একটি অক্ষর থাকতে হবে (a-z, A-Z)' },
        'password.req3': { en: 'Contains at least one number (0-9)', bn: 'কমপক্ষে একটি সংখ্যা থাকতে হবে (0-9)' },
        'password.req4': { en: 'Contains special character (!@#$%^&*)', bn: 'বিশেষ অক্ষর থাকতে হবে (!@#$%^&*)' },
        'password.req5': { en: 'Both passwords match', bn: 'উভয় পাসওয়ার্ড মিলতে হবে' },
        'password.setBtn': { en: 'Set Secure Password', bn: 'নিরাপদ পাসওয়ার্ড সেট করুন' },

        // ============================================
        // PROFILE PAGE
        // ============================================
        'profile.title': { en: 'My Profile', bn: 'আমার প্রোফাইল' },
        'profile.myProfile': { en: 'My Profile', bn: 'আমার প্রোফাইল' },
        'profile.personalInfo': { en: 'Personal Information', bn: 'ব্যক্তিগত তথ্য' },
        'profile.myComplaints': { en: 'My Complaints', bn: 'আমার অভিযোগ' },
        'profile.newReport': { en: 'New Report', bn: 'নতুন রিপোর্ট' },
        'profile.fileNewComplaint': { en: 'File New Complaint', bn: 'নতুন অভিযোগ দায়ের করুন' },
        'profile.editProfile': { en: 'Edit Profile', bn: 'প্রোফাইল এডিট' },
        'profile.changePassword': { en: 'Change Password', bn: 'পাসওয়ার্ড পরিবর্তন' },
        'profile.nidVerified': { en: 'NID Verified', bn: 'NID যাচাই হয়েছে' },
        'profile.faceVerified': { en: 'Face Verified', bn: 'ফেস যাচাই হয়েছে' },
        'profile.notifications': { en: 'Notifications', bn: 'বিজ্ঞপ্তি' },
        'profile.backToDashboard': { en: 'Back to Dashboard', bn: 'ড্যাশবোর্ডে ফিরুন' },
        'profile.pendingReports': { en: 'Pending Reports', bn: 'অপেক্ষমাণ রিপোর্ট' },
        'profile.quickActions': { en: 'Quick Actions', bn: 'দ্রুত অ্যাকশন' },
        'profile.emergencyComplaint': { en: 'Emergency Complaint', bn: 'জরুরি অভিযোগ' },
        'profile.contactSupport': { en: 'Contact Support', bn: 'সাপোর্টে যোগাযোগ' },
        'profile.recentActivity': { en: 'Recent Activity', bn: 'সাম্প্রতিক কার্যক্রম' },
        'profile.viewAll': { en: 'View All', bn: 'সব দেখুন' },
        'profile.contactInfo': { en: 'Contact Information', bn: 'যোগাযোগের তথ্য' },
        'profile.addressInfo': { en: 'Address Information', bn: 'ঠিকানার তথ্য' },
        'profile.memberSince': { en: 'Member since', bn: 'সদস্য হয়েছেন' },
        'profile.fullNameEn': { en: 'Full Name (English)', bn: 'পুরো নাম (ইংরেজি)' },
        'profile.fullNameBn': { en: 'Full Name (বাংলা)', bn: 'পুরো নাম (বাংলা)' },
        'profile.fatherName': { en: "Father's Name", bn: 'পিতার নাম' },
        'profile.motherName': { en: "Mother's Name", bn: 'মাতার নাম' },
        'profile.dateOfBirth': { en: 'Date of Birth', bn: 'জন্ম তারিখ' },
        'profile.age': { en: 'Age', bn: 'বয়স' },
        'profile.nidNumber': { en: 'NID Number', bn: 'NID নম্বর' },
        'profile.emailAddress': { en: 'Email Address', bn: 'ইমেইল ঠিকানা' },
        'profile.phoneNumber': { en: 'Phone Number', bn: 'ফোন নম্বর' },
        'profile.division': { en: 'Division (বিভাগ)', bn: 'বিভাগ' },
        'profile.district': { en: 'District (জেলা)', bn: 'জেলা' },
        'profile.policeStation': { en: 'Police Station (থানা)', bn: 'থানা' },
        'profile.union': { en: 'Union (ইউনিয়ন)', bn: 'ইউনিয়ন' },
        'profile.village': { en: 'Village (গ্রাম)', bn: 'গ্রাম' },
        'profile.placeDetails': { en: 'Place Details (স্থানের বিবরণ)', bn: 'স্থানের বিবরণ' },
        'profile.loadingActivities': { en: 'Loading recent activities...', bn: 'সাম্প্রতিক কার্যক্রম লোড হচ্ছে...' },
        'profile.loadingComplaints': { en: 'Loading complaints...', bn: 'অভিযোগ লোড হচ্ছে...' },
        'profile.loadingNotifications': { en: 'Loading notifications...', bn: 'বিজ্ঞপ্তি লোড হচ্ছে...' },

        // ============================================
        // FILTER OPTIONS
        // ============================================
        'filter.filterComplaints': { en: 'Filter Complaints', bn: 'অভিযোগ ফিল্টার' },
        'filter.status': { en: 'Status', bn: 'স্ট্যাটাস' },
        'filter.allStatus': { en: 'All Status', bn: 'সব স্ট্যাটাস' },
        'filter.category': { en: 'Category', bn: 'ক্যাটাগরি' },
        'filter.allCategories': { en: 'All Categories', bn: 'সব ক্যাটাগরি' },
        'filter.dateRange': { en: 'Date Range', bn: 'তারিখের সীমা' },
        'filter.apply': { en: 'Apply Filters', bn: 'ফিল্টার প্রয়োগ' },
        'filter.clear': { en: 'Clear', bn: 'মুছুন' },

        // ============================================
        // COMPLAINT FORM
        // ============================================
        'complaintForm.subtitle': { en: 'Please provide details about the incident you wish to report.', bn: 'আপনি যে ঘটনার রিপোর্ট করতে চান তার বিস্তারিত দিন।' },
        'complaintForm.crimeType': { en: 'Complaint Type', bn: 'অভিযোগের ধরন' },
        'complaintForm.selectCrimeType': { en: 'Select complaint type', bn: 'অভিযোগের ধরন নির্বাচন করুন' },
        'complaintForm.incidentDate': { en: 'Date of Incident', bn: 'ঘটনার তারিখ' },
        'complaintForm.incidentTime': { en: 'Time of Incident', bn: 'ঘটনার সময়' },
        'complaintForm.location': { en: 'Location', bn: 'স্থান' },
        'complaintForm.enterLocation': { en: 'Enter address or location details', bn: 'ঠিকানা বা স্থানের বিবরণ দিন' },
        'complaintForm.useMap': { en: 'Use Map', bn: 'ম্যাপ ব্যবহার করুন' },
        'complaintForm.selectAccuracy': { en: 'Select Location Accuracy', bn: 'স্থানের নির্ভুলতা নির্বাচন করুন' },
        'complaintForm.accurateLocation': { en: 'Accurate Location', bn: 'সঠিক স্থান' },
        'complaintForm.accurateDesc': { en: 'Exact incident location', bn: 'ঘটনার সঠিক স্থান' },
        'complaintForm.approximateLocation': { en: 'Approximate Location', bn: 'আনুমানিক স্থান' },
        'complaintForm.approximateDesc': { en: 'General area (privacy protection)', bn: 'সাধারণ এলাকা (গোপনীয়তা রক্ষা)' },
        'complaintForm.mapInstruction': { en: 'Click on the map or drag the marker to select the incident location', bn: 'ম্যাপে ক্লিক করুন বা মার্কার টেনে ঘটনার স্থান নির্বাচন করুন' },
        'complaintForm.useCurrentLocation': { en: 'Use My Current Location', bn: 'আমার বর্তমান অবস্থান ব্যবহার করুন' },
        'complaintForm.privacyArea': { en: 'Privacy Area Shown:', bn: 'গোপনীয়তা এলাকা দেখানো হয়েছে:' },
        'complaintForm.privacyDesc': { en: 'The orange circle shows the 100m approximate area that will be associated with your report. Your exact location remains private.', bn: 'কমলা বৃত্ত ১০০ মিটার আনুমানিক এলাকা দেখায় যা আপনার রিপোর্টের সাথে যুক্ত হবে। আপনার সঠিক অবস্থান গোপন থাকবে।' },
        'complaintForm.selectedLocation': { en: 'Selected Location:', bn: 'নির্বাচিত স্থান:' },
        'complaintForm.noLocation': { en: 'No location selected', bn: 'কোনো স্থান নির্বাচন করা হয়নি' },
        'complaintForm.coordinates': { en: 'Coordinates:', bn: 'স্থানাঙ্ক:' },
        'complaintForm.privacyRadius': { en: 'Privacy radius: 100m', bn: 'গোপনীয়তা ব্যাসার্ধ: ১০০ মিটার' },
        'complaintForm.mapPlaceholder': { en: 'Click "Use Map" to open the map and pin your location', bn: 'ম্যাপ খুলতে এবং আপনার স্থান চিহ্নিত করতে "ম্যাপ ব্যবহার করুন" ক্লিক করুন' },
        'complaintForm.mapPlaceholderHint': { en: 'You can drag the marker or click anywhere on the map to set the location', bn: 'স্থান নির্ধারণ করতে মার্কার টানুন বা ম্যাপে যেকোনো জায়গায় ক্লিক করুন' },
        'complaintForm.description': { en: 'Description', bn: 'বিবরণ' },
        'complaintForm.descriptionPlaceholder': { en: 'Please describe the incident in detail...', bn: 'অনুগ্রহ করে ঘটনার বিস্তারিত বর্ণনা দিন...' },
        'complaintForm.evidence': { en: 'Evidence (Optional)', bn: 'প্রমাণ (ঐচ্ছিক)' },
        'complaintForm.uploadImages': { en: 'Upload Images', bn: 'ছবি আপলোড' },
        'complaintForm.uploadVideo': { en: 'Upload Video', bn: 'ভিডিও আপলোড' },
        'complaintForm.uploadAudio': { en: 'Upload Audio', bn: 'অডিও আপলোড' },
        'complaintForm.witnesses': { en: 'Witnesses (Optional)', bn: 'সাক্ষী (ঐচ্ছিক)' },
        'complaintForm.witnessesPlaceholder': { en: 'Name and contact of any witnesses...', bn: 'সাক্ষীদের নাম এবং যোগাযোগ...' },
        'complaintForm.fileAnonymously': { en: 'File this report anonymously', bn: 'বেনামে এই রিপোর্ট দাখিল করুন' },
        'complaintForm.anonymousHelp': { en: 'Your identity will be kept confidential', bn: 'আপনার পরিচয় গোপন রাখা হবে' },
        'complaintForm.successTitle': { en: 'Complaint Submitted Successfully!', bn: 'অভিযোগ সফলভাবে জমা হয়েছে!' },
        'complaintForm.successMessage': { en: 'Your complaint has been registered in our system.', bn: 'আপনার অভিযোগ আমাদের সিস্টেমে নিবন্ধিত হয়েছে।' },
        'complaintForm.trackNote': { en: 'You can track the status of your complaint from your dashboard.', bn: 'আপনি আপনার ড্যাশবোর্ড থেকে অভিযোগের স্ট্যাটাস ট্র্যাক করতে পারবেন।' },
        'complaintForm.errorTitle': { en: 'Submission Failed', bn: 'জমা দিতে ব্যর্থ' },
        'complaintForm.errorMessage': { en: 'An error occurred while submitting your complaint.', bn: 'আপনার অভিযোগ জমা দেওয়ার সময় একটি ত্রুটি হয়েছে।' },

        // ============================================
        // CONTACT US PAGE
        // ============================================
        'contact.title': { en: 'Contact Us', bn: 'যোগাযোগ করুন' },
        'contact.getInTouch': { en: 'Get in Touch', bn: 'যোগাযোগ করুন' },
        'contact.description': { en: 'Have questions? We\'d love to hear from you.', bn: 'কোনো প্রশ্ন আছে? আমাদের জানান।' },
        'contact.name': { en: 'Your Name', bn: 'আপনার নাম' },
        'contact.email': { en: 'Your Email', bn: 'আপনার ইমেইল' },
        'contact.subject': { en: 'Subject', bn: 'বিষয়' },
        'contact.message': { en: 'Message', bn: 'বার্তা' },
        'contact.sendMessage': { en: 'Send Message', bn: 'বার্তা পাঠান' },
        'contact.address': { en: 'Our Address', bn: 'আমাদের ঠিকানা' },
        'contact.phone': { en: 'Phone', bn: 'ফোন' },
        'contact.emailUs': { en: 'Email Us', bn: 'ইমেইল করুন' },
        'contact.workingHours': { en: 'Working Hours', bn: 'কাজের সময়' },
        'contact.dropYourVoice': { en: 'Drop your voice', bn: 'আপনার কথা বলুন' },
        'contact.welcomeMessage': { en: "Got something to report or ask? We're here to listen. At secureVOICE, your voice matters — whether it's a concern, a suggestion, or a critical complaint. Our team is committed to creating a safer Bangladesh by making communication easier, faster, and more secure. Reach out with confidence, and let us take it from here. Together, we can build a more transparent and responsive system for all", bn: "কিছু রিপোর্ট করতে বা জিজ্ঞাসা করতে চান? আমরা শুনতে এখানে আছি। secureVOICE-এ, আপনার কথা গুরুত্বপূর্ণ — হোক তা উদ্বেগ, পরামর্শ বা গুরুত্বপূর্ণ অভিযোগ। আমাদের টিম যোগাযোগ সহজ, দ্রুত এবং নিরাপদ করে একটি নিরাপদ বাংলাদেশ গড়তে প্রতিজ্ঞাবদ্ধ। আত্মবিশ্বাসের সাথে যোগাযোগ করুন, বাকিটা আমাদের উপর ছেড়ে দিন। একসাথে, আমরা সবার জন্য আরও স্বচ্ছ এবং প্রতিক্রিয়াশীল ব্যবস্থা গড়তে পারি" },
        'contact.connectWithUs': { en: 'Connect with us :', bn: 'আমাদের সাথে যুক্ত হোন :' },
        'contact.username': { en: 'Username', bn: 'ইউজারনেম' },

        // ============================================
        // COMMON / MISC
        // ============================================
        'common.required': { en: 'Required', bn: 'আবশ্যক' },
        'common.optional': { en: 'Optional', bn: 'ঐচ্ছিক' },
        'common.loading': { en: 'Loading...', bn: 'লোড হচ্ছে...' },
        'common.loadingStats': { en: 'Loading statistics...', bn: 'পরিসংখ্যান লোড হচ্ছে...' },
        'common.error': { en: 'Error', bn: 'ত্রুটি' },
        'common.success': { en: 'Success', bn: 'সফল' },
        'common.warning': { en: 'Warning', bn: 'সতর্কতা' },
        'common.info': { en: 'Information', bn: 'তথ্য' },
        'common.yes': { en: 'Yes', bn: 'হ্যাঁ' },
        'common.no': { en: 'No', bn: 'না' },
        'common.ok': { en: 'OK', bn: 'ঠিক আছে' },
        'common.noData': { en: 'No data available', bn: 'কোনো ডেটা নেই' },
        'common.tryAgain': { en: 'Please try again', bn: 'আবার চেষ্টা করুন' },
        'common.somethingWrong': { en: 'Something went wrong', bn: 'কিছু সমস্যা হয়েছে' },
        'common.characters': { en: 'characters', bn: 'অক্ষর' },
        'common.files': { en: 'files', bn: 'ফাইল' },
        'common.date': { en: 'Date', bn: 'তারিখ' },
        'common.time': { en: 'Time', bn: 'সময়' },
        'common.actions': { en: 'Actions', bn: 'অ্যাকশন' },
        'common.total': { en: 'Total', bn: 'মোট' },
        'common.selectOption': { en: 'Select an option', bn: 'একটি অপশন নির্বাচন করুন' },

        // ============================================
        // LANGUAGE TOGGLE
        // ============================================
        'lang.toggle': { en: 'বাং', bn: 'EN' },
        'lang.english': { en: 'English', bn: 'ইংরেজি' },
        'lang.bangla': { en: 'Bangla', bn: 'বাংলা' },
    };

    // Get translation
    function t(key, fallback = '') {
        const translation = translations[key];
        if (!translation) {
            console.warn(`Translation missing for key: ${key}`);
            return fallback || key;
        }
        return translation[currentLang] || translation.en || fallback || key;
    }

    // Set language
    function setLanguage(lang) {
        if (lang !== 'en' && lang !== 'bn') {
            console.warn(`Invalid language: ${lang}. Defaulting to 'en'.`);
            lang = 'en';
        }
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
        applyTranslations();
        updateToggleButtons();
        
        // Dispatch custom event for dynamic content
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }

    // Toggle language
    function toggleLanguage() {
        setLanguage(currentLang === 'en' ? 'bn' : 'en');
    }

    // Get current language
    function getLanguage() {
        return currentLang;
    }

    // Apply translations to DOM elements with data-i18n attribute
    function applyTranslations() {
        // Translate text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = t(key);
            if (translation) {
                el.textContent = translation;
            }
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation) {
                el.placeholder = translation;
            }
        });

        // Translate titles/tooltips
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = t(key);
            if (translation) {
                el.title = translation;
            }
        });

        // Translate aria-labels
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const translation = t(key);
            if (translation) {
                el.setAttribute('aria-label', translation);
            }
        });
    }

    // Update toggle button text
    function updateToggleButtons() {
        document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
            btn.textContent = t('lang.toggle');
            btn.setAttribute('data-lang', currentLang);
        });
    }

    // Create toggle button HTML
    function createToggleButton(className = '') {
        const btn = document.createElement('button');
        btn.className = `lang-toggle-btn ${className}`.trim();
        btn.textContent = t('lang.toggle');
        btn.setAttribute('data-lang', currentLang);
        btn.setAttribute('title', currentLang === 'en' ? 'Switch to Bangla' : 'Switch to English');
        btn.addEventListener('click', toggleLanguage);
        return btn;
    }

    // Initialize i18n
    function init() {
        // Set initial language from storage
        currentLang = localStorage.getItem(STORAGE_KEY) || 'en';
        document.documentElement.lang = currentLang === 'bn' ? 'bn' : 'en';
        
        // Apply initial translations
        applyTranslations();
        updateToggleButtons();

        // Add click handlers to existing toggle buttons
        document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
            btn.addEventListener('click', toggleLanguage);
        });
    }

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        t,
        setLanguage,
        toggleLanguage,
        getLanguage,
        applyTranslations,
        createToggleButton,
        init,
        translations  // Expose for debugging
    };
})();

// Make available globally
window.i18n = i18n;
