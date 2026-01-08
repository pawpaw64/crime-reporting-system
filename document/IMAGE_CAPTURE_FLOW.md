# Picture Capture & Saving Flow Documentation

## Overview
The system has **two main image capture flows**:
1. **Face Image Capture** (during user registration)
2. **Evidence Image Upload** (when filing complaints)

---

## 1. FACE IMAGE CAPTURE FLOW (Registration Step 4)

### Frontend Flow - `register.js`

```
┌─────────────────────────────────────────────────────────┐
│ USER CLICKS "START CAMERA"                              │
├─────────────────────────────────────────────────────────┤
│ startCamera()                                            │
│ ├─ navigator.mediaDevices.getUserMedia()                │
│ │  └─ Requests camera permission                        │
│ ├─ Sets video.srcObject = cameraStream                  │
│ └─ Shows live camera feed in <video> element            │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ USER SEES LIVE CAMERA FEED (mirrored)                   │
├─────────────────────────────────────────────────────────┤
│ <video id="camera-feed"> (displays live stream)         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ USER CLICKS "CAPTURE PHOTO"                             │
├─────────────────────────────────────────────────────────┤
│ capturePhoto()                                           │
│ ├─ Get canvas element                                   │
│ ├─ canvas.width = video.videoWidth                      │
│ ├─ canvas.height = video.videoHeight                    │
│ │                                                        │
│ ├─ ctx = canvas.getContext('2d')                        │
│ ├─ ctx.translate(canvas.width, 0)  // flip horizontally │
│ ├─ ctx.scale(-1, 1)                                     │
│ ├─ ctx.drawImage(video, 0, 0)  // capture frame         │
│ │                                                        │
│ ├─ capturedImageData = canvas.toDataURL('image/jpeg')   │
│ │  └─ Converts to Base64 string                         │
│ │                                                        │
│ ├─ Show preview image                                   │
│ └─ Stop camera stream                                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ IMAGE DATA (Base64 String)                              │
├─────────────────────────────────────────────────────────┤
│ data:image/jpeg;base64,/9j/4AAQSkZJRgABA...            │
│                                                         │
│ Size: Compressed JPEG (~80% quality)                    │
│ Resolution: 640x480 (ideal from getUserMedia)           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ USER CONFIRMS & CLICKS "CONTINUE"                       │
├─────────────────────────────────────────────────────────┤
│ validateStep4()                                          │
│ └─ userData.faceImage = capturedImageData               │
│                                                         │
│ saveFaceToBackend()                                     │
│ └─ POST /api/auth/save-face                             │
│    ├─ Headers: Content-Type: application/json           │
│    └─ Body: {                                           │
│       "faceImage": "data:image/jpeg;base64/...",        │
│       "sessionId": "<session_id>"                       │
│    }                                                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ (Network Request)
┌─────────────────────────────────────────────────────────┐
│ BACKEND - authController.saveFaceImage()                │
├─────────────────────────────────────────────────────────┤
│ req.body = {                                            │
│   faceImage: "data:image/jpeg;base64/...",              │
│   sessionId: "<session_id>"                             │
│ }                                                       │
│                                                         │
│ 1. Validate Base64 format                               │
│    ├─ Check if starts with 'data:image/'                │
│    └─ Return error if invalid                           │
│                                                         │
│ 2. Update registration session                          │
│    ├─ registrationSessions.get(sessionId)               │
│    ├─ session.faceVerified = true                       │
│    ├─ session.step = 4                                  │
│    ├─ session.data.faceImage = Base64 string            │
│    └─ Save back to registrationSessions Map             │
│                                                         │
│ 3. Return success response                              │
│    └─ { success: true, message: "Face saved" }          │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ IMAGE STORED IN MEMORY (registrationSessions)           │
├─────────────────────────────────────────────────────────┤
│ Map {                                                   │
│   "<session_id>": {                                     │
│     step: 4,                                            │
│     faceVerified: true,                                 │
│     data: {                                             │
│       faceImage: "data:image/jpeg;base64/..."           │
│     }                                                   │
│   }                                                     │
│ }                                                       │
│                                                         │
│ ⚠️  Note: Image stays in memory until signup is complete│
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ USER COMPLETES REGISTRATION (Step 7 - Final)            │
├─────────────────────────────────────────────────────────┤
│ submitRegistration()                                    │
│ └─ POST /api/signup                                     │
│    └─ Body includes: faceImage: userData.faceImage      │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ BACKEND - authController.signup()                       │
├─────────────────────────────────────────────────────────┤
│ 1. Extract userData from request body                   │
│    └─ faceImage: "data:image/jpeg;base64/..."           │
│                                                         │
│ 2. INSERT INTO users table                              │
│    ├─ Column: face_image (LONGTEXT)                     │
│    ├─ Value: Full Base64 string                         │
│    └─ is_face_verified = 1 (if faceImage exists)        │
│                                                         │
│ 3. Commit to MySQL Database                             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ FINAL STORAGE IN DATABASE                               │
├─────────────────────────────────────────────────────────┤
│ Table: users                                            │
│ Column: face_image (LONGTEXT - max 4GB)                 │
│                                                         │
│ Stored as: Complete Base64 string                       │
│   data:image/jpeg;base64,/9j/4AAQSkZJRgABA...          │
│                                                         │
│ Size: ~500KB-1MB per face (varies with image quality)   │
│                                                         │
│ Additional Columns Updated:                             │
│ ├─ is_face_verified = 1 (boolean flag)                  │
│ ├─ created_at = timestamp                               │
│ └─ is_verified = 1 (overall account verified)           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. EVIDENCE IMAGE UPLOAD FLOW (Complaint Filing)

### Frontend Flow - `report-form.js`

```
┌─────────────────────────────────────────────────────────┐
│ USER SELECTS FILE(S) VIA FILE INPUT                     │
├─────────────────────────────────────────────────────────┤
│ <input id="imageUpload" type="file" accept="image/*">   │
│                                                         │
│ addEventListener('change', (e) => {                    │
│   selectedFiles.image = e.target.files[0]               │
│   updateUploadDisplay('image', file)                    │
│ })                                                      │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ FILE STORED IN MEMORY                                   │
├─────────────────────────────────────────────────────────┤
│ selectedFiles = {                                       │
│   image: File { name, size, type, ... },                │
│   video: null,                                          │
│   audio: null                                           │
│ }                                                       │
│                                                         │
│ File object contains:                                   │
│ ├─ name: "evidence-photo.jpg"                           │
│ ├─ size: 2048576 bytes                                  │
│ ├─ type: "image/jpeg"                                   │
│ ├─ lastModified: timestamp                              │
│ └─ Raw binary data in memory                            │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ USER FILLS COMPLAINT FORM & SUBMITS                     │
├─────────────────────────────────────────────────────────┤
│ createFormData()                                        │
│ ├─ formData = new FormData()                            │
│ ├─ formData.append('complaintType', value)              │
│ ├─ formData.append('description', value)                │
│ ├─ formData.append('incidentDate', value)               │
│ ├─ formData.append('location', value)                   │
│ │                                                       │
│ ├─ if (selectedFiles.image)                             │
│ │  └─ formData.append('evidence', selectedFiles.image)  │
│ ├─ if (selectedFiles.video)                             │
│ │  └─ formData.append('evidence', selectedFiles.video)  │
│ └─ if (selectedFiles.audio)                             │
│    └─ formData.append('evidence', selectedFiles.audio)  │
│                                                         │
│ POST /api/submit-complaint                              │
│ ├─ Headers: auto (multipart/form-data)                  │
│ ├─ Body: FormData (binary)                              │
│ └─ Middleware: upload.array('evidence', 10)             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ (Network Request - Binary)
┌─────────────────────────────────────────────────────────┐
│ BACKEND MIDDLEWARE - uploadMiddleware.js                │
├─────────────────────────────────────────────────────────┤
│ multer.diskStorage() config:                            │
│                                                         │
│ 1. Determine destination folder:                        │
│    ├─ image/* → /backend/uploads/images/                │
│    ├─ video/* → /backend/uploads/videos/                │
│    └─ audio/* → /backend/uploads/audio/                 │
│                                                         │
│ 2. Create directory if not exists                       │
│    └─ fs.mkdirSync(uploadPath, { recursive: true })    │
│                                                         │
│ 3. Generate unique filename:                            │
│    └─ Date.now() + '-' + Math.random() + ext            │
│    └─ Example: 1704268800000-123456789.jpg              │
│                                                         │
│ 4. Write file to disk:                                  │
│    └─ Stream binary data → uploads/images/1704268...    │
│                                                         │
│ 5. File size limit: 50MB per file                       │
│    └─ Check: fileSize < 50 * 1024 * 1024                │
│                                                         │
│ 6. File type validation:                                │
│    ├─ Accept: image/, video/, audio/ only               │
│    └─ Reject: other types with error                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ FILE SAVED ON DISK                                      │
├─────────────────────────────────────────────────────────┤
│ Location: /backend/uploads/images/                      │
│                                                         │
│ Example:                                                │
│ ├─ 1704268800000-987654321.jpg (2.3 MB)                 │
│ ├─ 1704268805432-123456789.jpg (1.8 MB)                 │
│ └─ 1704268810765-456789123.jpg (3.1 MB)                 │
│                                                         │
│ Directory structure:                                    │
│ backend/                                                │
│ ├─ uploads/                                             │
│ │  ├─ images/                                           │
│ │  │  ├─ 1704268800000-987654321.jpg                    │
│ │  │  └─ ...                                            │
│ │  ├─ videos/                                           │
│ │  │  └─ ...                                            │
│ │  └─ audio/                                            │
│ │     └─ ...                                            │
│ └─ ...                                                  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ BACKEND CONTROLLER - complaintController.js             │
├─────────────────────────────────────────────────────────┤
│ submitComplaint(req, res)                               │
│                                                         │
│ 1. Access uploaded files:                               │
│    ├─ req.files = [                                     │
│    │   {                                                │
│    │     fieldname: 'evidence',                          │
│    │     originalname: 'photo.jpg',                      │
│    │     encoding: '7bit',                               │
│    │     mimetype: 'image/jpeg',                         │
│    │     destination: '/backend/uploads/images/',       │
│    │     filename: '1704268800000-987654321.jpg',       │
│    │     path: '/backend/uploads/images/1704268...',    │
│    │     size: 2048576                                  │
│    │   }                                                │
│    │ ]                                                  │
│                                                         │
│ 2. Extract complaint data from request:                 │
│    ├─ complaintType                                     │
│    ├─ description                                       │
│    ├─ incidentDate                                      │
│    ├─ location                                          │
│    ├─ latitude, longitude, accuracyRadius               │
│    └─ username (from session)                           │
│                                                         │
│ 3. INSERT complaint into database:                      │
│    └─ INSERT INTO complaint (                           │
│       description, created_at, status, username,       │
│       admin_username, location_id, complaint_type,      │
│       location_address, category_id                     │
│    ) VALUES (...)                                       │
│    └─ Get complaintId from result                       │
│                                                         │
│ 4. For each uploaded file:                              │
│    ├─ Determine fileType (image/video/audio)            │
│    ├─ Create relative path:                             │
│    │  └─ "images/1704268800000-987654321.jpg"           │
│    │                                                    │
│    └─ INSERT INTO evidence table:                       │
│       INSERT INTO evidence (                            │
│         uploaded_at, file_type, file_path, complaint_id │
│       ) VALUES (                                        │
│         "2024-01-03 12:30:45",                           │
│         "image",                                        │
│         "images/1704268800000-987654321.jpg",           │
│         12345                                           │
│       )                                                 │
│                                                         │
│ 5. Return success response                              │
│    └─ { success: true, complaintId: 12345 }            │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ DATA STORED IN DATABASE                                 │
├─────────────────────────────────────────────────────────┤
│ Table: complaint                                        │
│ ├─ complaint_id: 12345                                  │
│ ├─ description: "..."                                   │
│ ├─ created_at: "2024-01-03 12:30:45"                    │
│ ├─ status: "pending"                                    │
│ ├─ username: "john_doe"                                 │
│ ├─ admin_username: "admin_dhaka"                        │
│ ├─ location_id: 456                                     │
│ ├─ complaint_type: "Theft"                              │
│ └─ location_address: "Dhaka, Bangladesh"                │
│                                                         │
│ Table: evidence                                         │
│ ├─ evidence_id: 78901                                   │
│ ├─ uploaded_at: "2024-01-03 12:30:45"                   │
│ ├─ file_type: "image"                                   │
│ ├─ file_path: "images/1704268800000-987654321.jpg"      │
│ └─ complaint_id: 12345 (FK)                             │
│                                                         │
│ Table: evidence                                         │
│ ├─ evidence_id: 78902                                   │
│ ├─ uploaded_at: "2024-01-03 12:30:45"                   │
│ ├─ file_type: "image"                                   │
│ ├─ file_path: "images/1704268805432-123456789.jpg"      │
│ └─ complaint_id: 12345 (FK)                             │
└─────────────────────────────────────────────────────────┘
```

---

## Key Differences

| Aspect | Face Image | Evidence Images |
|--------|-----------|-----------------|
| **Capture Method** | Camera (getUserMedia) | File picker / Upload |
| **Format** | Base64 data URL | Binary file |
| **Storage** | Database (LONGTEXT) | Disk (/uploads/) + DB metadata |
| **Size** | ~500KB-1MB | Up to 50MB per file |
| **Encoding** | canvas.toDataURL() | FormData + multer |
| **Retrieval** | From users table | From disk + serve via API |
| **Registration Step** | Step 4 (middle) | Part of Step 7 (final) |
| **Complaint Step** | N/A | When filing complaint |

---

## File Storage Locations

```
backend/
└── uploads/
    ├── images/
    │   ├── 1704268800000-987654321.jpg
    │   ├── 1704268805432-123456789.jpg
    │   └── ...more image files
    ├── videos/
    │   ├── 1704268810765-456789123.mp4
    │   └── ...more video files
    └── audio/
        ├── 1704268815098-789123456.mp3
        └── ...more audio files
```

---

## Database Schema

### Users Table (Face Images)
```sql
CREATE TABLE users (
  userid INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  face_image LONGTEXT,           -- Base64 string stored here
  is_face_verified TINYINT(1),   -- Boolean flag
  created_at TIMESTAMP,
  ...
);
```

### Evidence Table (Evidence Files)
```sql
CREATE TABLE evidence (
  evidence_id INT AUTO_INCREMENT PRIMARY KEY,
  uploaded_at DATETIME,
  file_type ENUM('image', 'video', 'audio'),  -- Categorized
  file_path VARCHAR(255),        -- Relative path on disk
  complaint_id INT,              -- Foreign key
  FOREIGN KEY (complaint_id) REFERENCES complaint(complaint_id)
);
```

---

## Code Files Involved

### Frontend
- [register.js](../../frontend/src/js/register.js#L605) - Camera capture & face image handling
- [report-form.js](../../frontend/src/js/report-form.js#L31) - Evidence file upload handling

### Backend
- [uploadMiddleware.js](../middleware/uploadMiddleware.js) - File upload processing
- [authController.js](../controllers/authController.js#L968) - Face image saving
- [complaintController.js](../controllers/complaintController.js#L105) - Evidence file handling
- [routes.js](../routes.js#L76) - API endpoints

---

## Summary

**Face Images** flow through **memory** (Base64 → memory session → database) while **Evidence Files** flow through **disk** (uploaded → saved on filesystem → referenced in database).

Both are tied together:
- Face images identify the user during registration
- Evidence images provide proof for complaints filed by that user
