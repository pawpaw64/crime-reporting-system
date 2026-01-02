# Super Admin Setup Guide

## 📋 Complete Process to Add Super Admin & Approve District Admin Requests

---

## STEP 1: Fix Email Configuration (Optional but Recommended)

The email error occurs because nodemailer needs Gmail credentials. You have two options:

### Option A: Configure Gmail (Recommended for Production)

1. **Get Gmail App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Sign in with your Gmail account
   - Select "Mail" as the app
   - Select "Windows Computer" as the device
   - Click "Generate"
   - Copy the 16-character password

2. **Create `.env` file** in `backend/` directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_mysql_password
   DB_NAME=securevoice

   # Session Secret
   SESSION_SECRET=your_secure_random_string_here

   # Email Configuration
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop   # <-- 16-char app password from Gmail
   SUPER_ADMIN_EMAIL=your.email@gmail.com

   # Server
   PORT=3000
   NODE_ENV=development
   ```

3. **Restart your server** after creating `.env`

### Option B: Disable Email Temporarily (For Development)

If you don't want to configure email right now, the system will still work. The email error is caught and won't break registration.

---

## STEP 2: Create Super Admin Account

### Method 1: Using the Script (Easiest)

1. **Open Terminal** in `backend/` directory:
   ```powershell
   cd "D:\Study\SWE Lab\crime-reporting-system\backend"
   ```

2. **Run the script:**
   ```powershell
   node scripts/create-super-admin.js
   ```

3. **You'll see output like:**
   ```
   ═══════════════════════════════════════════
   🎉 SUPER ADMIN READY TO USE
   ═══════════════════════════════════════════
   
   📍 Login URL: http://localhost:3000/super-admin-login.html
   👤 Username: superadmin
   🔑 Password: SuperAdmin@2026
   📧 Email: superadmin@crime.gov.bd
   ```

4. **Copy the credentials** and proceed to Step 3

### Method 2: Manual SQL (If script fails)

1. **Generate password hash** - Run in Node.js:
   ```javascript
   const bcrypt = require('bcrypt');
   bcrypt.hash('SuperAdmin@2026', 10, (err, hash) => {
       console.log(hash);
   });
   ```

2. **Copy the hash** and run this SQL:
   ```sql
   USE securevoice;
   
   INSERT INTO super_admins (username, email, password, fullName, is_active)
   VALUES (
       'superadmin',
       'superadmin@crime.gov.bd',
       '$2b$10$...your_hash_here...',
       'System Super Administrator',
       1
   );
   ```

---

## STEP 3: Login as Super Admin

1. **Start your server:**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Open browser** and navigate to:
   ```
   http://localhost:3000/super-admin-login.html
   ```

3. **Login with credentials:**
   - **Username:** `superadmin`
   - **Password:** `SuperAdmin@2026`

---

## STEP 4: Approve District Admin Requests

### Current Database State

After a district admin submits a registration request, the data is stored in:
- `admins` table (core identity: username, email, phone, etc.)
- `admin_approval_workflow` table (status: 'pending')

### Manual Approval (Until Super Admin Dashboard is Built)

**Option A: Approve via SQL**

```sql
USE securevoice;

-- 1. View all pending requests
SELECT 
    a.username, 
    a.email, 
    a.fullName, 
    a.district_name, 
    a.designation,
    aw.status,
    aw.request_date
FROM admins a
JOIN admin_approval_workflow aw ON a.username = aw.admin_username
WHERE aw.status = 'pending';

-- 2. Approve a specific admin (replace 'distrcitadmin1' with actual username)
UPDATE admin_approval_workflow
SET status = 'approved',
    approval_date = NOW(),
    approved_by = 'superadmin'
WHERE admin_username = 'distrcitadmin1';

-- 3. Activate the admin account
UPDATE admins
SET is_active = 1
WHERE username = 'distrcitadmin1';
```

**Option B: Quick Approve All Pending (for testing)**

```sql
USE securevoice;

-- Approve all pending requests
UPDATE admin_approval_workflow
SET status = 'approved',
    approval_date = NOW(),
    approved_by = 'superadmin'
WHERE status = 'pending';

-- Activate all approved admins
UPDATE admins a
JOIN admin_approval_workflow aw ON a.username = aw.admin_username
SET a.is_active = 1
WHERE aw.status = 'approved';
```

---

## STEP 5: Send Password Setup Link to District Admin

After approval, the district admin needs to:
1. Receive a password setup link (with token)
2. Set their password
3. Verify their email

### Manual Process (Until Super Admin Dashboard Email Feature is Built)

**Generate password setup token:**

```sql
USE securevoice;

-- Generate a simple token (in production, use crypto.randomBytes)
SET @token = UUID();
SET @admin_username = 'distrcitadmin1'; -- Replace with actual username

-- Insert token into admin_verification_tokens
INSERT INTO admin_verification_tokens 
    (admin_username, token_type, token_value, expires_at, is_used)
VALUES 
    (@admin_username, 'password_setup', @token, DATE_ADD(NOW(), INTERVAL 24 HOUR), 0);

-- Display the password setup URL
SELECT CONCAT(
    'http://localhost:3000/admin-password-setup.html?token=',
    @token
) AS password_setup_url;
```

**Send this URL to the district admin** (via email, WhatsApp, etc.)

---

## STEP 6: District Admin Completes Setup

The district admin will:

1. **Click the password setup link**
2. **Set their password** (min 8 characters)
3. **Verify their email** (receive verification link)
4. **Login** at: http://localhost:3000/adminLogin.html

---

## 🎯 Quick Testing Flow

For rapid testing without emails:

```sql
USE securevoice;

-- 1. Create district admin directly
INSERT INTO admins (username, email, password, fullName, phone, designation, official_id, district_name, is_active)
VALUES ('testadmin', 'test@admin.com', '$2b$10$...bcrypt_hash...', 'Test Admin', '01234567890', 'Test Police Chief', 'TEST001', 'Dhaka', 1);

-- 2. Create approved workflow
INSERT INTO admin_approval_workflow (admin_username, status, request_date, approval_date, approved_by)
VALUES ('testadmin', 'approved', NOW(), NOW(), 'superadmin');

-- 3. Mark email as verified
INSERT INTO admin_verification_tokens (admin_username, token_type, token_value, expires_at, is_used)
VALUES ('testadmin', 'email_verification', 'dummy_token', NOW(), 1);
```

Now `testadmin` can login immediately with the password you set!

---

## 📊 Useful Monitoring Queries

```sql
-- View all admins and their status
SELECT 
    a.username,
    a.email,
    a.district_name,
    a.is_active,
    aw.status AS approval_status,
    aw.approval_date
FROM admins a
LEFT JOIN admin_approval_workflow aw ON a.username = aw.admin_username;

-- View all pending requests
SELECT username, email, fullName, district_name, designation
FROM admins a
JOIN admin_approval_workflow aw ON a.username = aw.admin_username
WHERE aw.status = 'pending';

-- View email verification status
SELECT 
    admin_username,
    token_type,
    is_used AS verified,
    created_at
FROM admin_verification_tokens
WHERE token_type = 'email_verification'
ORDER BY created_at DESC;
```

---

## ⚠️ Troubleshooting

### "Super admin already exists" error
Run: `DELETE FROM super_admins WHERE username = 'superadmin';` then retry

### "Can't login as super admin"
Check: `SELECT * FROM super_admins WHERE username = 'superadmin';`
Ensure `is_active = 1`

### "District admin can't login"
Check workflow status:
```sql
SELECT * FROM admin_approval_workflow WHERE admin_username = 'your_admin_username';
```
Ensure status = 'approved' and admin.is_active = 1

### Email verification failing
Manually mark as verified:
```sql
INSERT INTO admin_verification_tokens (admin_username, token_type, is_used)
VALUES ('your_admin_username', 'email_verification', 1);
```

---

## 🔐 Security Notes

1. **Change default passwords** after first login
2. **Never commit `.env`** file to Git (it's in .gitignore)
3. **Use strong passwords** in production (min 12 characters)
4. **Enable Gmail 2FA** before generating app passwords
5. **Rotate tokens regularly** in production

---

## 📝 Next Steps

Once basic testing is complete, build:
1. Super Admin Dashboard UI
2. Approve/Reject buttons with one-click
3. Automatic email sending on approval
4. Password reset functionality
5. Audit log viewer

---

**Need help?** Check the database with these commands:
```sql
SHOW TABLES;
DESCRIBE admins;
DESCRIBE admin_approval_workflow;
DESCRIBE admin_verification_tokens;
```
