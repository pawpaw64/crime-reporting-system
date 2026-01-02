# DISTRICT ADMIN SECURE REGISTRATION & APPROVAL SYSTEM
## Implementation Summary & SQL Queries

---

## ✅ CHANGES COMPLETED

### 1. DATABASE SCHEMA CHANGES
**File:** `backend/database/migrations/003_admin_approval_system.sql`

#### New Tables Created:
1. **`super_admins`** - Super Administrator accounts
2. **`admin_documents`** - Supporting documents for admin requests
3. **`admin_audit_logs`** - Audit trail for all admin actions
4. **`admin_otp_verification`** - OTP codes for login 2FA

#### Modified Tables:
**`admins` table** - Added columns:
- `status` - enum('pending','approved','rejected','suspended')
- `is_active` - tinyint(1) - Controls login access
- `request_date` - When registration was submitted
- `approval_date` - When approved/rejected
- `approved_by` - Super Admin who approved
- `rejection_reason` - Reason for rejection
- `password_reset_token` - For password setup after approval
- `password_reset_expires` - Token expiry
- `email_verified` - Email verification status
- `email_verification_token` - Email verification token
- `phone` - Contact number
- `designation` - Job title (e.g., District Police Chief)
- `official_id` - Official employee/badge ID
- `last_login` - Last login timestamp

---

## 📋 SQL QUERIES TO RUN

### Step 1: Run the Migration File
```bash
cd backend
mysql -u root -p securevoice < database/migrations/003_admin_approval_system.sql
```

### Step 2: Create Super Admin Account
**IMPORTANT:** First, hash the password using bcrypt:

```javascript
// Run this in Node.js to generate hashed password
const bcrypt = require('bcryptjs');
const password = 'SuperAdmin@123'; // Change this!
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

Then insert the Super Admin:
```sql
INSERT INTO `super_admins` (`username`, `email`, `password`, `fullName`, `is_active`) 
VALUES (
  'superadmin', 
  'superadmin@crime.gov.bd', 
  '$2b$10$PASTE_YOUR_HASHED_PASSWORD_HERE', 
  'System Super Administrator', 
  1
);
```

### Step 3: Update Existing Admins (Optional)
If you have existing admins, update them to approved status:
```sql
UPDATE `admins` 
SET `status` = 'approved', 
    `is_active` = 1, 
    `email_verified` = 1,
    `approval_date` = CURRENT_TIMESTAMP,
    `approved_by` = 'system'
WHERE `status` IS NULL OR `status` = 'pending';
```

### Step 4: Verify Tables Were Created
```sql
USE securevoice;
SHOW TABLES;
DESC super_admins;
DESC admin_audit_logs;
DESC admin_documents;
DESC admin_otp_verification;
DESC admins;
```

---

## 🔄 NEW WORKFLOW

### District Admin Registration Flow:
1. **Submit Request** → Admin visits `/admin-registration.html`
2. **Pending Review** → Request stored with status='pending'
3. **Super Admin Approval** → Super Admin reviews from dashboard
4. **Email Notification** → Admin receives password setup link
5. **Password Setup** → Admin creates password (link expires in 24h)
6. **Email Verification** → Admin verifies email address
7. **Login with OTP** → Admin logs in with username/password + OTP
8. **Access Dashboard** → Full access to district-scoped data

### District Admin Login Flow:
1. Enter username & password
2. System sends OTP to registered email
3. Enter 6-digit OTP
4. Access granted to dashboard
5. All actions logged in `admin_audit_logs`

---

## 📁 FILES MODIFIED

### Backend:
1. **`backend/src/controllers/authController.js`**
   - ✅ Removed old self-registration
   - ✅ Added `adminRegistrationRequest()` - Submit registration
   - ✅ Added `adminLogin()` - Step 1: Verify credentials & send OTP
   - ✅ Added `adminVerifyOTP()` - Step 2: Verify OTP & login
   - ✅ Added `setupAdminPassword()` - Password setup after approval
   - ✅ Added `verifyAdminEmail()` - Email verification
   - ✅ Added `adminLogout()` - With audit logging
   - ✅ Added `checkAdminAuth()` - Check authentication status

2. **`backend/src/controllers/adminController.js`**
   - ✅ Added audit logging import
   - ✅ Modified `getAdminDashboard()` - Added district-scoped access
   - ✅ Modified `updateComplaintStatus()` - Added audit logging
   - ✅ Added `getAdminLogs()` - View own audit logs

3. **`backend/src/controllers/superAdminController.js`** (NEW FILE)
   - ✅ `superAdminLogin()` - Super admin authentication
   - ✅ `getPendingAdminRequests()` - List pending requests
   - ✅ `getAllAdminRequests()` - List all requests with filters
   - ✅ `approveAdminRequest()` - Approve and send setup email
   - ✅ `rejectAdminRequest()` - Reject with reason
   - ✅ `suspendAdminAccount()` - Suspend active admin
   - ✅ `reactivateAdminAccount()` - Reactivate suspended admin
   - ✅ `getAuditLogs()` - View all audit logs
   - ✅ `getSuperAdminStats()` - Dashboard statistics
   - ✅ `superAdminLogout()` - Logout

4. **`backend/src/utils/auditUtils.js`** (NEW FILE)
   - ✅ `logAdminAction()` - Log any admin action
   - ✅ `getAdminAuditLogs()` - Get logs for specific admin
   - ✅ `getAllAuditLogs()` - Get all logs (super admin only)

5. **`backend/src/routes.js`**
   - ✅ Updated admin auth routes
   - ✅ Added super admin routes
   - ✅ Added audit log routes

### Frontend:
1. **`frontend/src/pages/adminLogin.html`**
   - ✅ Changed to login-only page (no registration)
   - ✅ Added OTP verification UI
   - ✅ Added link to registration page
   - ✅ Improved security messages

2. **`frontend/src/pages/admin-registration.html`** (NEW FILE)
   - ✅ Registration request form
   - ✅ Fields: username, email, fullName, phone, designation, official_id, district
   - ✅ Important notice about approval process
   - ✅ Real-time validation
   - ✅ Success/error messages

3. **`frontend/src/js/adminLogin.js`**
   - ✅ Removed old login/registration logic
   - ✅ Added two-step login with OTP
   - ✅ Better error handling
   - ✅ Info messages for user guidance

---

## 🔐 SECURITY FEATURES IMPLEMENTED

1. **No Self-Registration** - Admins cannot create their own accounts
2. **Manual Approval** - Super Admin must review and approve each request
3. **Time-Limited Links** - Password setup links expire in 24 hours
4. **Email Verification** - Admins must verify their email
5. **Two-Factor Authentication** - OTP required for every login
6. **Password Hashing** - Bcrypt with salt rounds
7. **Audit Logging** - All actions logged with IP and timestamp
8. **District-Scoped Access** - Admins only see their district's data
9. **Session Management** - Secure session handling
10. **Account Status Control** - Can suspend/reactivate accounts

---

## 🎯 API ENDPOINTS

### District Admin:
- `POST /admin-registration-request` - Submit registration request
- `POST /adminLogin` - Login step 1 (credentials + send OTP)
- `POST /admin-verify-otp` - Login step 2 (verify OTP)
- `POST /admin-password-setup` - Set password after approval
- `GET /verify-admin-email` - Verify email address
- `POST /admin-logout` - Logout
- `GET /check-admin-auth` - Check if authenticated
- `GET /admin-audit-logs` - View own audit logs

### Super Admin:
- `POST /super-admin-login` - Super admin login
- `GET /super-admin/pending-requests` - List pending requests
- `GET /super-admin/all-requests` - List all requests
- `POST /super-admin/approve-admin` - Approve request
- `POST /super-admin/reject-admin` - Reject request
- `POST /super-admin/suspend-admin` - Suspend account
- `POST /super-admin/reactivate-admin` - Reactivate account
- `GET /super-admin/audit-logs` - View all audit logs
- `GET /super-admin/stats` - Dashboard statistics
- `POST /super-admin-logout` - Logout

---

## 📊 AUDIT LOG ACTIONS TRACKED

- `login` - Successful login
- `login_attempt` - Failed login attempt
- `otp_sent` - OTP sent to email
- `otp_verification` - OTP verification (success/failure)
- `password_setup` - Password setup completed
- `email_verified` - Email verification completed
- `logout` - Logout
- `dashboard_access` - Dashboard accessed
- `status_update` - Complaint status updated
- `status_update_denied` - Unauthorized status update attempt
- `complaint_viewed` - Complaint details viewed
- `chat_message_sent` - Chat message sent

---

## 🚀 NEXT STEPS (MANUAL IMPLEMENTATION NEEDED)

### 1. Super Admin Dashboard UI
Create `frontend/src/pages/super-admin-dashboard.html` with:
- Pending requests table
- Approve/Reject buttons
- Admin list with status filters
- Audit log viewer
- Statistics cards

### 2. Password Setup Page
Create `frontend/src/pages/admin-password-setup.html`:
- Token verification
- Password input fields
- Strength indicator
- Submit to `/admin-password-setup`

### 3. Email Verification Page
Create `frontend/src/pages/admin-email-verify.html`:
- Auto-verify on page load
- Success/error message
- Redirect to login

### 4. Environment Variables
Add to `.env`:
```env
SUPER_ADMIN_EMAIL=superadmin@crime.gov.bd
FRONTEND_URL=http://localhost:3000
```

### 5. Email Templates
Customize email templates in:
- `authController.js` - Approval email
- `authController.js` - Password setup email
- `superAdminController.js` - Rejection email

---

## 🎨 DESIGN CONSISTENCY

All new pages use the existing design system:
- Same color scheme (blue/white theme)
- Same fonts and icons (Font Awesome)
- Same form styling (adminLogin.css)
- Same layout structure
- Responsive design maintained

---

## ✅ TESTING CHECKLIST

1. ☐ Run migration SQL file
2. ☐ Create super admin account
3. ☐ Test admin registration request submission
4. ☐ Test super admin login
5. ☐ Test request approval/rejection
6. ☐ Test password setup after approval
7. ☐ Test email verification
8. ☐ Test admin login with OTP
9. ☐ Test district-scoped dashboard access
10. ☐ Test audit log creation
11. ☐ Test account suspension/reactivation

---

## 🔧 TROUBLESHOOTING

### Issue: Super admin can't login
- Check if super_admins table exists
- Verify password hash is correct
- Check is_active = 1

### Issue: OTP not received
- Check email configuration in .env
- Verify SMTP settings
- Check spam folder

### Issue: Password setup link expired
- Super admin must re-approve to generate new link
- Check password_reset_expires timestamp

### Issue: District admin can't see complaints
- Verify admin.district_name matches location.district_name
- Check user.district matches admin's district
- Verify is_active = 1 and status = 'approved'

---

## 📞 SUPPORT

For issues or questions:
1. Check audit logs for detailed error information
2. Review console logs in browser (F12)
3. Check backend server logs
4. Verify database schema matches migration file

---

**Implementation Date:** January 1, 2026
**Version:** 2.0 - Secure Hierarchical Authorization Model
**Status:** ✅ Backend Complete | ⏳ Super Admin UI Pending
