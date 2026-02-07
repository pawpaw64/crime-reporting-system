# SecureVoice Crime Reporting System

A comprehensive web-based crime reporting platform designed to enable citizens to report crimes securely and efficiently while providing law enforcement with powerful tools for managing and responding to incidents. The system features multi-step user verification, real-time reporting capabilities, location tracking, and an administrative dashboard for case management.

## Project Overview

SecureVoice is a full-stack crime reporting application that bridges the gap between citizens and law enforcement agencies. The platform ensures secure user authentication through a multi-step registration process including OTP verification, National ID validation, and face capture for identity verification. Users can file complaints with detailed information including photos, location data, and supporting evidence. The system also supports anonymous reporting for sensitive cases.

The administrative side provides hierarchical access control with multiple admin levels, case assignment capabilities, status tracking, analytics dashboards, and automated notification systems. The platform emphasizes security, data integrity, and user privacy throughout the entire reporting and investigation workflow.

## Key Features

### User Features

**Multi-Step Registration Process**
- Seven-step registration flow with comprehensive identity verification
- Mobile number verification via OTP (One-Time Password)
- National ID (NID) validation with date of birth verification
- Facial recognition capture through webcam for identity verification
- Hierarchical address selection with cascading dropdowns for Division, District, Police Station, Union, and Village
- Secure account creation with username, email, and password protection

**Crime Reporting System**
- Detailed complaint filing with incident description, date, time, and location
- Photo upload capability for evidence documentation
- Location tracking with geographic coordinates and heatmap visualization
- Real-time complaint status tracking from submission to resolution
- Complaint history and status updates accessible from user dashboard
- Emergency SOS button for urgent situations

**Anonymous Reporting**
- Option to file complaints anonymously without revealing identity
- Secure tracking mechanism for anonymous reports using unique identifiers
- Protection for whistleblowers and sensitive cases

**User Dashboard**
- Profile management with personal information editing
- View all filed complaints with current status
- Track complaint progress through different stages
- Receive notifications for complaint updates
- Access complaint history and resolution details

### Administrative Features

**Admin Authentication and Approval System**
- Separate admin registration process requiring super admin approval
- Multi-level admin hierarchy for different access levels
- Pending admin queue management for approvals and rejections
- Role-based access control for sensitive operations

**Case Management**
- View all reported complaints in centralized dashboard
- Filter and search complaints by status, date, location, and category
- Assign complaints to specific admins or departments
- Update complaint status through workflow stages
- Add internal notes and comments for case documentation
- Manage evidence files and supporting documents

**Analytics and Reporting**
- Crime statistics dashboard with visual charts and graphs
- Location-based crime heatmaps for pattern identification
- Trend analysis over time periods
- Complaint resolution metrics and performance indicators
- Export reports for external analysis

**Super Admin Capabilities**
- Approve or reject admin registration requests
- Manage admin accounts and permissions
- View system-wide analytics and statistics
- Access audit logs for security monitoring
- Configure system settings and parameters

### Security and Privacy Features

**Authentication and Authorization**
- Bcrypt password hashing for secure credential storage
- Express session management with secure cookies
- JWT token-based authentication for API requests
- Role-based access control for different user types
- Session timeout and automatic logout for inactive users

**Data Protection**
- Input validation and sanitization to prevent injection attacks
- Secure file upload handling with type and size restrictions
- HTTPS enforcement in production environment
- SQL injection prevention through parameterized queries
- XSS protection through content security policies

**Audit and Compliance**
- Comprehensive audit logging for user actions
- Admin activity tracking for accountability
- Timestamp tracking for all database operations
- Data retention policies for complaint records
- Privacy controls for sensitive user information

## Technology Stack

### Frontend Technologies

**Core Technologies**
- HTML5 for semantic markup and structure
- CSS3 with Tailwind CSS framework for responsive styling
- Vanilla JavaScript for client-side logic and interactions

**UI/UX Components**
- Custom CSS modules for component-specific styling
- Responsive design supporting mobile, tablet, and desktop viewports
- Interactive forms with real-time validation
- Dynamic DOM manipulation for multi-step workflows
- Webcam API integration for face capture functionality

**Mapping and Visualization**
- Leaflet.js for interactive maps and location selection
- Heatmap visualization for crime density mapping
- Geographic coordinate handling for precise location tracking
- Chart.js for analytics dashboards and data visualization

### Backend Technologies

**Server Framework**
- Node.js runtime environment for server-side JavaScript execution
- Express.js web application framework for RESTful API development
- Middleware architecture for request processing pipeline

**Database Management**
- MySQL relational database for structured data storage
- Connection pooling for efficient database connections
- Prepared statements for SQL injection prevention
- Database normalization following 3NF standards

**Authentication and Security**
- Express-session for server-side session management
- Bcrypt for password hashing and verification
- Custom middleware for authentication and authorization
- CORS configuration for cross-origin request handling
- Helmet.js for security headers

**File Handling**
- Multer middleware for multipart form data and file uploads
- File type validation for uploaded images
- Storage management for complaint evidence and user photos
- Base64 encoding for image data transmission

**Communication Services**
- Nodemailer for email delivery (OTP codes, notifications, welcome emails)
- Email templating for formatted notifications
- SMTP integration for reliable email delivery

**Utilities and Helpers**
- Custom utility modules for common operations
- Password strength validation
- Date and time formatting functions
- Location string builders for address formatting
- OTP generation and validation logic

### Development Tools

**Version Control**
- Git for source code management
- GitHub for remote repository hosting

**Testing**
- Selenium WebDriver for automated browser testing
- Python test scripts for end-to-end testing
- Test case documentation and validation

**Code Organization**
- Modular architecture with separation of concerns
- MVC pattern implementation
- RESTful API design principles
- Configuration management through environment variables

## Project Structure

```
crime-reporting-system/
├── backend/
│   ├── src/
│   │   ├── app.js                          # Express application setup
│   │   ├── server.js                       # Server entry point
│   │   ├── db.js                           # Database connection pool
│   │   ├── config/
│   │   │   └── config.js                   # Configuration management
│   │   ├── controllers/
│   │   │   ├── addressController.js        # Address hierarchy endpoints
│   │   │   ├── adminController.js          # Admin management logic
│   │   │   ├── analyticsController.js      # Statistics and reports
│   │   │   ├── anonymousReportController.js # Anonymous reporting
│   │   │   ├── complaintController.js      # Complaint CRUD operations
│   │   │   ├── pageController.js           # Page rendering
│   │   │   ├── superAdminController.js     # Super admin operations
│   │   │   ├── userController.js           # User profile management
│   │   │   └── auth/                       # Authentication controllers
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js           # Authentication checks
│   │   │   ├── securityMiddleware.js       # Security configurations
│   │   │   ├── staticMiddleware.js         # Static file serving
│   │   │   └── uploadMiddleware.js         # File upload handling
│   │   ├── routes/
│   │   │   ├── address.js                  # Address API routes
│   │   │   ├── admin.js                    # Admin routes
│   │   │   ├── anonymous.js                # Anonymous report routes
│   │   │   ├── api.js                      # API route aggregator
│   │   │   ├── complaints.js               # Complaint routes
│   │   │   ├── index.js                    # Main router
│   │   │   ├── pages.js                    # Page routes
│   │   │   └── superAdmin.js               # Super admin routes
│   │   ├── utils/
│   │   │   ├── auditUtils.js               # Audit logging
│   │   │   ├── emailUtils.js               # Email sending
│   │   │   ├── helperUtils.js              # Helper functions
│   │   │   ├── notificationUtils.js        # Notification system
│   │   │   └── passwordUtils.js            # Password hashing
│   │   └── views/                          # Server-side templates
│   ├── database/
│   │   ├── 001_schema.sql                  # Initial database schema
│   │   ├── 002_registration_update.sql     # Registration enhancements
│   │   ├── 003_admin_approval_system_SAFE.sql # Admin approval system
│   │   ├── 004_add_complaint_coordinates.sql # Location tracking
│   │   ├── 005_add_location_coordinates.sql # Address coordinates
│   │   ├── 006_anonymous_reports.sql       # Anonymous reporting
│   │   ├── 007_anonymous_admin_assignment.sql # Admin assignment
│   │   ├── 008_add_discard_column.sql      # Complaint archiving
│   │   ├── 009_3nf_normalization.sql       # Database normalization
│   │   └── QUICK_START_QUERIES.sql         # Sample queries
│   ├── scripts/
│   │   ├── create-super-admin.js           # Super admin creation
│   │   └── geocode-locations.js            # Location geocoding
│   ├── Tests/
│   │   ├── auth/                           # Authentication tests
│   │   ├── complaints/                     # Complaint filing tests
│   │   ├── SELENIUM_SETUP.md               # Test setup guide
│   │   └── TEST_CASES.md                   # Test documentation
│   ├── uploads/
│   │   └── images/                         # Uploaded files storage
│   └── package.json                        # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── js/
│   │   │   ├── register.js                 # Registration flow logic
│   │   │   ├── login.js                    # Login functionality
│   │   │   ├── complaint.js                # Complaint filing
│   │   │   ├── profile.js                  # User profile
│   │   │   ├── adminLogin.js               # Admin authentication
│   │   │   ├── adminDashboard.js           # Admin dashboard
│   │   │   └── ...                         # Additional scripts
│   │   ├── css/
│   │   │   ├── base.css                    # Base styles
│   │   │   ├── auth-header.css             # Authentication pages
│   │   │   ├── complainForm.css            # Complaint form styling
│   │   │   ├── adminDashboard.css          # Admin dashboard styling
│   │   │   └── ...                         # Component styles
│   │   └── pages/                          # HTML pages
│   ├── public/
│   │   ├── images/                         # Static images
│   │   └── videos/                         # Media files
│   ├── index.html                          # Landing page
│   ├── tailwind.config.js                  # Tailwind configuration
│   └── package.json                        # Frontend dependencies
└── document/
    ├── 01_PROJECT_OVERVIEW.md              # Project introduction
    ├── 02_USER_AUTHENTICATION.md           # Authentication documentation
    ├── 03_ADMIN_SYSTEM.md                  # Admin system guide
    ├── 04_COMPLAINT_SYSTEM.md              # Complaint workflow
    ├── 05_ANONYMOUS_REPORTS.md             # Anonymous reporting
    ├── 06_SUPER_ADMIN.md                   # Super admin documentation
    ├── 07_UTILITIES_AND_SECURITY.md        # Security features
    ├── 3NF_NORMALIZATION.md                # Database design
    ├── ADMIN_APPROVAL_PROCESS.md           # Admin approval workflow
    └── QUICK_START.md                      # Getting started guide
```

## Setup Instructions

### Prerequisites

Before running the application, ensure you have the following installed:

- Node.js (version 14.x or higher)
- npm (Node Package Manager)
- MySQL Server (version 5.7 or higher)
- Git for version control

### Database Setup

**Step 1: Create MySQL Database**

```sql
CREATE DATABASE crime_reporting_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Step 2: Run Migration Scripts**

Execute the SQL migration files in order from the database directory:

```bash
mysql -u root -p crime_reporting_db < backend/database/001_schema.sql
mysql -u root -p crime_reporting_db < backend/database/002_registration_update.sql
mysql -u root -p crime_reporting_db < backend/database/003_admin_approval_system_SAFE.sql
mysql -u root -p crime_reporting_db < backend/database/004_add_complaint_coordinates.sql
mysql -u root -p crime_reporting_db < backend/database/005_add_location_coordinates.sql
mysql -u root -p crime_reporting_db < backend/database/006_anonymous_reports.sql
mysql -u root -p crime_reporting_db < backend/database/007_anonymous_admin_assignment.sql
mysql -u root -p crime_reporting_db < backend/database/008_add_discard_column.sql
mysql -u root -p crime_reporting_db < backend/database/009_3nf_normalization.sql
```

**Step 3: Load Sample Data (Optional)**

```bash
mysql -u root -p crime_reporting_db < backend/database/QUICK_START_QUERIES.sql
```

### Backend Setup

**Step 1: Navigate to Backend Directory**

```bash
cd backend
```

**Step 2: Install Dependencies**

```bash
npm install
```

**Step 3: Configure Environment Variables**

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=crime_reporting_db
DB_PORT=3306

# Session Configuration
SESSION_SECRET=your_secure_session_secret_key_here

# Email Configuration (for OTP and notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password

# Application URLs
FRONTEND_URL=http://localhost:5500
```

**Step 4: Create Super Admin (Optional)**

```bash
node scripts/create-super-admin.js
```

**Step 5: Start Backend Server**

```bash
npm run dev
```

The backend server will start on http://localhost:3000

### Frontend Setup

**Step 1: Navigate to Frontend Directory**

```bash
cd frontend
```

**Step 2: Install Dependencies**

```bash
npm install
```

**Step 3: Start Development Server**

```bash
npm run dev
```

The frontend will be served on http://localhost:5500 (or your configured port)

**Alternative: Direct File Opening**

You can also open `frontend/index.html` directly in a web browser for development, though running through a development server is recommended for full functionality.

## API Endpoints Overview

### User Authentication

- **POST** `/api/auth/signup` - User registration with multi-step data
- **POST** `/api/auth/login` - User login with credentials
- **POST** `/api/auth/logout` - User logout and session destruction
- **GET** `/api/auth/check` - Check authentication status
- **POST** `/api/auth/send-otp` - Send OTP for verification
- **POST** `/api/auth/verify-otp` - Verify OTP code
- **POST** `/api/auth/resend-otp` - Resend OTP with rate limiting
- **POST** `/api/auth/verify-nid` - Verify National ID
- **POST** `/api/auth/save-face` - Save facial recognition data
- **POST** `/api/auth/save-address` - Save user address information
- **GET** `/api/auth/session-status` - Get registration session status

### Complaint Management

- **POST** `/api/complaints/create` - File a new complaint
- **GET** `/api/complaints/user` - Get user's complaints
- **GET** `/api/complaints/:id` - Get complaint details
- **PUT** `/api/complaints/:id` - Update complaint information
- **DELETE** `/api/complaints/:id` - Delete complaint
- **POST** `/api/complaints/:id/status` - Update complaint status

### Admin Operations

- **POST** `/api/admin/auth/register` - Admin registration request
- **POST** `/api/admin/auth/login` - Admin login
- **GET** `/api/admin/complaints` - View all complaints
- **PUT** `/api/admin/complaints/:id/assign` - Assign complaint to admin
- **PUT** `/api/admin/complaints/:id/status` - Update complaint status
- **GET** `/api/admin/analytics` - Get system analytics
- **POST** `/api/admin/notes/:id` - Add notes to complaint

### Super Admin

- **GET** `/api/super-admin/pending-admins` - View pending admin approvals
- **POST** `/api/super-admin/approve-admin/:id` - Approve admin request
- **POST** `/api/super-admin/reject-admin/:id` - Reject admin request
- **GET** `/api/super-admin/all-admins` - View all admin accounts
- **DELETE** `/api/super-admin/admin/:id` - Remove admin account

### Address Hierarchy

- **GET** `/api/address/divisions` - Get all divisions
- **GET** `/api/address/districts` - Get districts by division
- **GET** `/api/address/police-stations` - Get police stations by district
- **GET** `/api/address/unions` - Get unions by police station
- **GET** `/api/address/villages` - Get villages by union

### Anonymous Reporting

- **POST** `/api/anonymous/report` - Submit anonymous complaint
- **GET** `/api/anonymous/track/:trackingId` - Track anonymous report status

## Database Schema Overview

### Users Table
Stores user account information including personal details, verification status, and location data.

### Admins Table
Contains admin account information with hierarchical levels and approval status.

### Complaints Table
Stores all complaint records with incident details, status tracking, and assignment information.

### Anonymous Reports Table
Handles anonymous complaint submissions with secure tracking mechanisms.

### Address Tables
Hierarchical tables for divisions, districts, police stations, unions, and villages.

### Audit Logs Table
Tracks all system activities for security and accountability purposes.

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Commit your changes with clear messages
4. Push to your fork
5. Submit a pull request with detailed description

## License

This project is developed for educational purposes as part of the Software Engineering Laboratory course.

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository or contact the development team.

## Acknowledgments

Developed as part of the Software Engineering Laboratory curriculum, this project demonstrates practical implementation of web application development principles, database design, security practices, and user experience design.

