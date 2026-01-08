# District Admin Approval Process Documentation

## Overview
This document explains the complete workflow that occurs when a Super Admin approves a District Admin registration request in the SecureVoice Crime Reporting System.

---

## Process Flow

### 1. **District Admin Registers**
- District Admin visits `/admin-registration.html`
- Fills out registration form with:
  - Username
  - Email
  - Full Name
  - Phone Number
  - District Selection
  - Official ID
  - Designation
  - Date of Birth
  - Supporting Documents (upload)

### 2. **Registration Submission**
- Form data is sent to `/admin-registration` endpoint
- Backend creates two database entries:
  - **admins table**: Core identity information (username, email, full_name, etc.)
  - **admin_approval_workflow table**: Sets status to `'pending'`, records request_date
- Password field is left NULL (will be set after approval)
- District Admin receives confirmation that request is pending review

### 3. **Super Admin Reviews Request**
- Super Admin logs into Super Admin Dashboard
- Navigates to "Pending Requests" tab
- Sees list of all pending admin registration requests with:
  - Username
  - Full Name  
  - Email
  - District
  - Designation
  - Request Date
  - Action buttons: **View**, **Approve**, **Reject**

### 4. **Viewing Admin Details**
Super Admin can click **View** button to see complete admin details:
- Username, Full Name, Email, Phone
- Designation, Official ID
- District
- Status (pending)
- Request Date
- Uploaded documents (if implemented)

---

## What Happens When Super Admin Clicks "Approve"?

### Backend Process (Step-by-Step)

#### Step 1: Database Updates
```sql
-- Update admin_approval_workflow table
UPDATE admin_approval_workflow 
SET 
    status = 'approved',
    approval_date = NOW(),
    approved_by = 'superadmin_username'
WHERE admin_username = 'district_admin_username';
```

#### Step 2: Generate Security Tokens
Two tokens are generated and inserted into `admin_verification_tokens` table:

**A. Password Setup Token**
```javascript
const passwordToken = crypto.randomBytes(32).toString('hex'); // Random 64-character hex string
const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours
```

```sql
INSERT INTO admin_verification_tokens 
(admin_username, token_type, token_value, expires_at, is_used)
VALUES ('district_admin', 'password_setup', 'abc123...', '2026-01-03 12:00:00', 0);
```

**B. Email Verification Token**
```javascript
const emailToken = crypto.randomBytes(32).toString('hex');
```

```sql
INSERT INTO admin_verification_tokens 
(admin_username, token_type, token_value, expires_at, is_used)
VALUES ('district_admin', 'email_verification', 'def456...', '2026-01-09 12:00:00', 0);
```

#### Step 3: Send Approval Email
An automated email is sent to the District Admin's registered email address containing:

**Email Subject:** `District Admin Account Approved`

**Email Content:**
- Congratulations message
- **Password Setup Link**: `http://localhost:3000/admin-password-setup?token=abc123...`
  - This link expires in **24 hours**
  - District Admin must click this link to create their password
- **Email Verification Link**: `http://localhost:3000/verify-admin-email?token=def456...`
  - This link expires in **7 days**
  - District Admin must verify their email address
- Account details summary (Username, Email, District, Designation)
- Login page link: `http://localhost:3000/adminLogin`
- Note about Two-Factor Authentication (OTP required at login)

**Email Template Structure:**
```html
<h2>Your District Admin Account Has Been Approved!</h2>
<p>Dear [Admin Full Name],</p>
<p>Your registration request has been approved by the Super Administrator.</p>

<h3>Next Steps:</h3>
<ol>
    <li>Set Your Password: [Password Setup Link Button]</li>
    <li>Verify Your Email: [Email Verification Link Button]</li>
</ol>

<h3>Your Account Details:</h3>
- Username: district_admin_123
- Email: admin@district.gov.bd
- District: Dhaka
- Designation: Deputy Commissioner
```

---

## What District Admin Receives

### 1. **Approval Email Notification**
District Admin receives email with subject "District Admin Account Approved" containing:
- ✅ Password setup link (24-hour validity)
- ✅ Email verification link (7-day validity)
- ✅ Account credentials (username, district)
- ✅ Next steps instructions
- ✅ Login page URL

### 2. **Password Setup Page**
When District Admin clicks the password setup link:
- Redirected to `/admin-password-setup?token=abc123...`
- Token is validated against database:
  - Checks if token exists
  - Checks if token is not expired
  - Checks if token is not already used
- District Admin enters:
  - New password (must meet security requirements)
  - Confirm password
- Upon submission:
  - Password is hashed using bcrypt (10 salt rounds)
  - Password is updated in `admins` table
  - Token is marked as used (`is_used = 1`)
  - District Admin is redirected to email verification

### 3. **Email Verification Page**
District Admin clicks email verification link:
- Redirected to `/verify-admin-email?token=def456...`
- Token validation occurs
- If valid:
  - `email_verified` flag is set to 1 (or token marked as used)
  - Success message displayed
  - Redirect to login page after 3 seconds

---

## Login Process After Approval

### Step 1: Navigate to Admin Login
District Admin visits `/adminLogin`

### Step 2: Enter Credentials
- Enters **username**
- Enters **password** (set during password setup)

### Step 3: Two-Factor Authentication (OTP)
After username/password verification:
- System generates 6-digit OTP
- OTP is sent to District Admin's registered email
- OTP is stored in `admin_otp_verification` table with 10-minute expiration
- District Admin enters OTP code
- If OTP is correct and not expired:
  - Session is created
  - District Admin is redirected to Admin Dashboard

### Step 4: Access Admin Dashboard
District Admin can now:
- View complaints in their district
- Manage complaint status
- Access admin tools
- Update profile settings

---

## Database Schema Summary

### Tables Involved in Approval Process

**1. admins (Core Identity - 13 columns)**
```sql
adminid, username, email, password, fullName, phone, 
designation, official_id, district_name, is_active, 
created_at, last_login, dob
```

**2. admin_approval_workflow (Approval Status - 8 columns)**
```sql
workflow_id, admin_username, status, request_date, 
approval_date, approved_by, rejection_reason, notes
```

**3. admin_verification_tokens (Temporary Tokens - 7 columns)**
```sql
id, admin_username, token_type, token_value, 
expires_at, is_used, created_at
```

**4. admin_otp_verification (Login OTP - 8 columns)**
```sql
id, admin_username, otp, expires_at, is_used, 
created_at, ip_address, user_agent
```

**5. admin_audit_logs (Activity Tracking - 10 columns)**
```sql
log_id, admin_username, action, action_details, 
ip_address, user_agent, complaint_id, target_username, 
result, timestamp
```

---

## Security Features

### 1. **Token-Based Verification**
- All tokens are cryptographically secure (crypto.randomBytes)
- Tokens are single-use only
- Tokens have expiration times:
  - Password setup: 24 hours
  - Email verification: 7 days
  - OTP: 10 minutes

### 2. **Password Security**
- Passwords are hashed using bcrypt with 10 salt rounds
- Password never stored in plain text
- Password requirements enforced on frontend

### 3. **Two-Factor Authentication**
- OTP sent via email for every login
- Prevents unauthorized access even if password is compromised

### 4. **Audit Logging**
- All admin actions logged in `admin_audit_logs`
- Includes IP address, user agent, timestamp
- Super Admin can review all admin activities

---

## Rejection Process (Alternative Flow)

If Super Admin clicks **Reject** instead:

1. **Rejection Reason Required**
   - Modal appears asking for rejection reason
   - Super Admin must provide explanation

2. **Database Updates**
```sql
UPDATE admin_approval_workflow 
SET 
    status = 'rejected',
    rejection_reason = 'Reason provided by super admin',
    approval_date = NOW(),
    approved_by = 'superadmin_username'
WHERE admin_username = 'district_admin_username';
```

3. **Rejection Email Sent**
   - Subject: "District Admin Registration Request Rejected"
   - Contains rejection reason
   - Provides contact information for appeals

4. **Admin Cannot Login**
   - Account remains in database but cannot be used
   - Super Admin can later approve if resubmitted

---

## Notification System

### Email Notifications
- **To District Admin**: Approval/rejection notification with next steps
- **To Super Admin** (if enabled in settings): New registration request alert

### Browser Notifications (Optional)
- Super Admin can enable browser notifications in Settings tab
- Dashboard checks every 2 minutes for new pending requests
- Shows desktop notification when new request arrives

### Settings Configuration
Super Admin can configure:
- ✅ New Admin Registration Notifications (ON/OFF)
- ✅ Email Notifications (ON/OFF)  
- ✅ Browser Notifications (ON/OFF)
- ✅ Auto-logout After Inactivity (ON/OFF)

---

## Common Issues & Solutions

### Issue 1: District Admin Doesn't Receive Email
**Causes:**
- Email server not configured (.env missing SMTP credentials)
- Email in spam folder
- Invalid email address provided during registration

**Solutions:**
- Configure Gmail app password in `.env` file
- Check spam/junk folder
- Super Admin can manually resend approval email (feature to be added)

### Issue 2: Password Setup Link Expired
**Cause:** More than 24 hours passed since approval

**Solution:**
- Super Admin can re-approve the request to generate new token
- Or manually generate new token via SQL:
```sql
INSERT INTO admin_verification_tokens 
(admin_username, token_type, token_value, expires_at, is_used)
VALUES ('username', 'password_setup', 'new_token', DATE_ADD(NOW(), INTERVAL 24 HOUR), 0);
```

### Issue 3: OTP Not Received During Login
**Causes:**
- Email delay
- Spam filter
- Database connection issue

**Solutions:**
- Wait up to 2 minutes for email
- Check spam folder
- Request OTP resend (if feature implemented)

---

## API Endpoints Reference

### Super Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/super-admin-login` | Super Admin login |
| GET | `/super-admin-check-auth` | Verify authentication |
| GET | `/super-admin-stats` | Dashboard statistics |
| GET | `/super-admin-pending-requests` | List pending registrations |
| GET | `/super-admin-all-admins` | List all admins with filters |
| GET | `/super-admin-admin-details/:id` | Get admin details |
| POST | `/super-admin-approve` | Approve admin request |
| POST | `/super-admin-reject` | Reject admin request |
| POST | `/super-admin-suspend` | Suspend admin account |
| POST | `/super-admin-reactivate` | Reactivate suspended admin |
| GET | `/super-admin-audit-logs` | View activity logs |
| GET | `/super-admin-settings` | Get super admin settings |
| POST | `/super-admin-settings` | Save super admin settings |
| POST | `/super-admin-logout` | Logout |

### District Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin-registration` | Submit registration request |
| POST | `/setup-admin-password` | Set password after approval |
| POST | `/verify-admin-email` | Verify email address |
| POST | `/admin-login` | Login with credentials |
| POST | `/admin-verify-otp` | Verify OTP during login |

---

## Future Enhancements

1. **SMS Notifications**: Send OTP via SMS instead of email
2. **Document Verification**: Allow Super Admin to view uploaded documents
3. **Bulk Actions**: Approve/reject multiple admins at once
4. **Email Template Customization**: Allow Super Admin to customize approval emails
5. **Resend Email Feature**: Manually resend approval/verification emails
6. **Admin Role Hierarchy**: Different permission levels for admins
7. **Activity Dashboard**: Real-time admin activity monitoring
8. **Automated Background Checks**: Integration with government databases

---

## Conclusion

The approval process ensures:
- ✅ Only verified district officials can access the system
- ✅ Secure password setup with token-based verification
- ✅ Two-factor authentication for all logins
- ✅ Complete audit trail of all administrative actions
- ✅ Email notifications keep all parties informed
- ✅ Configurable notification preferences for Super Admin

**Key Takeaway:** When a Super Admin approves a request, the District Admin receives a comprehensive email with step-by-step instructions to set up their password, verify their email, and login to the system with OTP-based two-factor authentication.
