# SecureVoice - Crime Reporting System
## Complete Project Documentation

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Directory Structure](#directory-structure)
5. [Database Design](#database-design)
6. [Getting Started](#getting-started)

---

## Project Overview

**SecureVoice** is a comprehensive web-based Crime Reporting System designed for citizens to report crimes and for law enforcement administrators to manage and investigate cases. The system supports both authenticated user reports and anonymous crime reporting.

### Key Features Summary

| Feature | Description |
|---------|-------------|
| **User Authentication** | Multi-step registration with OTP, NID verification, face capture |
| **Admin System** | District-based admin management with approval workflow |
| **Super Admin** | System-wide control, admin approval, audit logs |
| **Complaint Management** | File, track, and manage crime complaints |
| **Anonymous Reports** | No-login required, rate-limited, privacy-focused |
| **Evidence Upload** | Support for images, videos, and audio files |
| **Real-time Chat** | Communication between users and admins |
| **Crime Heatmap** | Interactive map visualization of crime locations |
| **Analytics Dashboard** | Charts and statistics for case analysis |
| **Notification System** | Status updates and message alerts |
| **Audit Logging** | Complete trail of admin actions |

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime environment |
| **Express.js** | Web application framework |
| **MySQL** | Relational database |
| **mysql2/promise** | MySQL driver with async/await support |
| **bcryptjs** | Password hashing |
| **express-session** | Session management |
| **multer** | File upload handling |
| **nodemailer** | Email sending |
| **helmet** | Security headers |
| **cors** | Cross-Origin Resource Sharing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **HTML5** | Page structure |
| **CSS3 / Tailwind CSS** | Styling |
| **Vanilla JavaScript** | Client-side logic |
| **Leaflet.js** | Interactive maps |
| **Chart.js** | Analytics charts |
| **OpenStreetMap** | Map tiles |

### Database
| Component | Details |
|-----------|---------|
| **Engine** | MySQL 8.0+ |
| **Database Name** | `securevoice` |
| **Charset** | utf8mb4 |
| **Collation** | utf8mb4_0900_ai_ci |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   HTML      │  │    CSS      │  │      JavaScript         │  │
│  │   Pages     │  │  (Tailwind) │  │  (Vanilla + Leaflet)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS SERVER (Backend)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Middleware Layer                     │   │
│  │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │   │
│  │  │ Helmet │ │  CORS  │ │ Session │ │  Auth   │ │ Multer│ │   │
│  │  └────────┘ └────────┘ └─────────┘ └─────────┘ └───────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       Routes Layer                        │   │
│  │  /api/auth  /reports  /admin  /super-admin  /anonymous   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Controllers Layer                      │   │
│  │  userAuth │ adminAuth │ complaint │ anonymous │ superAdmin│   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Utils Layer                          │   │
│  │  password │ email │ notification │ audit │ helper        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ mysql2
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MySQL DATABASE                             │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌───────────────────┐   │
│  │  users  │ │ admins  │ │ complaint │ │ anonymous_reports │   │
│  └─────────┘ └─────────┘ └───────────┘ └───────────────────┘   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │evidence │ │ category │ │ location │ │   audit_logs      │   │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
crime-reporting-system/
├── backend/
│   ├── package.json              # Backend dependencies
│   ├── .env                      # Environment variables
│   ├── database/                 # SQL migration files
│   │   ├── 001_schema.sql        # Core database schema
│   │   ├── 002_registration_update.sql
│   │   ├── 003_admin_approval_system_SAFE.sql
│   │   ├── 004_add_complaint_coordinates.sql
│   │   ├── 005_add_location_coordinates.sql
│   │   ├── 006_anonymous_reports.sql
│   │   └── ...
│   ├── scripts/
│   │   ├── create-super-admin.js # Super admin creation script
│   │   └── geocode-locations.js  # Location geocoding utility
│   ├── src/
│   │   ├── app.js                # Express app configuration
│   │   ├── server.js             # Server entry point
│   │   ├── db.js                 # Database connection pool
│   │   ├── config/
│   │   │   └── config.js         # Application configuration
│   │   ├── controllers/          # Request handlers
│   │   │   ├── auth/
│   │   │   │   ├── userAuth.js
│   │   │   │   ├── adminAuth.js
│   │   │   │   ├── otp.js
│   │   │   │   ├── registrationSteps.js
│   │   │   │   └── common.js
│   │   │   ├── adminController.js
│   │   │   ├── anonymousReportController.js
│   │   │   ├── complaintController.js
│   │   │   ├── superAdminController.js
│   │   │   └── ...
│   │   ├── middleware/           # Express middleware
│   │   │   ├── authMiddleware.js
│   │   │   ├── securityMiddleware.js
│   │   │   ├── staticMiddleware.js
│   │   │   └── uploadMiddleware.js
│   │   ├── routes/               # API route definitions
│   │   │   ├── index.js          # Main router
│   │   │   ├── api.js            # API routes
│   │   │   ├── admin.js          # Admin routes
│   │   │   ├── anonymous.js      # Anonymous report routes
│   │   │   └── ...
│   │   └── utils/                # Utility functions
│   │       ├── passwordUtils.js
│   │       ├── emailUtils.js
│   │       ├── notificationUtils.js
│   │       ├── auditUtils.js
│   │       └── helperUtils.js
│   ├── Tests/                    # Test files
│   └── uploads/                  # Uploaded files storage
│       └── images/
│
├── frontend/
│   ├── index.html                # Main landing page
│   ├── package.json
│   ├── tailwind.config.js
│   ├── public/
│   │   ├── images/
│   │   └── videos/
│   └── src/
│       ├── css/                  # Stylesheets
│       ├── js/                   # JavaScript files
│       │   ├── register.js
│       │   ├── report-form.js
│       │   ├── anonymous-report.js
│       │   ├── admin-dashboard-new.js
│       │   ├── map.js
│       │   ├── core/
│       │   │   ├── config.js
│       │   │   ├── user-auth.js
│       │   │   └── admin-auth.js
│       │   └── pages/
│       │       ├── login.js
│       │       └── homepage.js
│       └── pages/                # HTML pages
│           ├── login.html
│           ├── register.html
│           ├── profile.html
│           ├── admin_dashboard.html
│           ├── anonymous-report.html
│           └── ...
│
└── document/                     # Documentation files
```

---

## Database Design

### Entity Relationship Overview

```
┌──────────┐       ┌───────────┐       ┌──────────┐
│  users   │──────▶│ complaint │◀──────│  admins  │
└──────────┘       └───────────┘       └──────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐
   │ evidence  │  │ location  │  │ category  │
   └───────────┘  └───────────┘  └───────────┘
```

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Registered user accounts |
| `admins` | District admin accounts |
| `super_admins` | System administrators |
| `complaint` | Crime complaints filed by users |
| `evidence` | Uploaded evidence files |
| `category` | Crime type categories |
| `location` | Location data with coordinates |
| `anonymous_reports` | Anonymous crime reports |
| `complaint_chat` | Chat messages |
| `admin_audit_logs` | Admin action audit trail |

---

## Getting Started

### Prerequisites
- Node.js 16+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd crime-reporting-system
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment variables**
Create `.env` file in backend folder:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=securevoice
DB_PORT=3306
SESSION_SECRET=your-secret-key
NODE_ENV=development
```

4. **Setup database**
```bash
# Run SQL migration files in order
mysql -u root -p securevoice < database/001_schema.sql
mysql -u root -p securevoice < database/002_registration_update.sql
# ... continue with remaining migrations
```

5. **Create Super Admin**
```bash
node scripts/create-super-admin.js
```

6. **Start the server**
```bash
npm start
# or for development
npm run dev
```

7. **Access the application**
- Frontend: http://localhost:3000
- API Health Check: http://localhost:3000/api/health

---

## Documentation Index

Refer to the following documentation files for detailed information on each feature:

1. **[02_USER_AUTHENTICATION.md](02_USER_AUTHENTICATION.md)** - User registration, login, OTP system
2. **[03_ADMIN_SYSTEM.md](03_ADMIN_SYSTEM.md)** - Admin authentication, dashboard, case management
3. **[04_COMPLAINT_SYSTEM.md](04_COMPLAINT_SYSTEM.md)** - Complaint submission, tracking, evidence
4. **[05_ANONYMOUS_REPORTS.md](05_ANONYMOUS_REPORTS.md)** - Anonymous reporting system
5. **[06_SUPER_ADMIN.md](06_SUPER_ADMIN.md)** - Super admin management
6. **[07_UTILITIES_AND_SECURITY.md](07_UTILITIES_AND_SECURITY.md)** - Helper functions, security features

---

*Last Updated: January 2026*
