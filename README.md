
# Flask Face Detection & Recognition API

Full-stack aplikasi untuk face detection dan face recognition menggunakan:
- **Frontend**: React + Vite + React Router + JavaScript
- **Backend**: Flask + Flask-RESTX + InsightFace + ONNX
- **Database**: PostgreSQL + pgvector + pgAdmin
- **Containerization**: Docker Compose

---
### Arsitektur :
- Model: InsightFace (buffalo_l) dengan ONNX Runtime
- Database: PostgreSQL + pgvector untuk vector similarity
- Algoritma: Cosine Similarity untuk face matching
- Backend: Flask + Flask-RESTX
- Strategi Embedding: Averaging, Save All, Top-K, Clustering
### Kelebihan Sistem Sekarang:
✅ Solid foundation - InsightFace adalah state-of-the-art (SOTA) untuk face recognition
✅ Sudah ada refactoring - Clean code structure, service pattern
✅ pgvector integration - Scalable untuk jutaan wajah
✅ Multiple authentication - Face + Password hybrid
✅ Production-ready - Docker, Nginx, multi-environment

### Kelemahan:
⚠️ CPU-only - Lambat untuk real-time jika banyak user
⚠️ Monolithic Flask - Sulit scale horizontal
⚠️ No caching - Setiap request hit model & database
⚠️ Single model - Tidak ada fallback jika InsightFace gagal

---

## 📋 Tahap Pengembangan

### ✅ Tahap 1: Face Detection
- Upload image dan deteksi wajah
- Webcam real-time face detection
- Continuous detection mode
- Bounding boxes dengan confidence score
- Age dan gender prediction

### ✅ Tahap 2: User Management
- CRUD operations untuk user
- PostgreSQL database integration
- User pagination (15 per page)
- Face registration status tracking

### ✅ Tahap 3: Face Registration
- Multi-image capture (5-10 gambar per user)
- Manual & Auto capture modes
- Real-time face validation (quality check)
- **Oval Face Guide**: Visual template untuk optimal positioning
- **Position validation**: Reject capture jika wajah di luar oval
- Face embedding extraction (512-dim vectors)
- **⭐ Averaging Method**: 10 gambar → 1 optimized embedding (90% storage reduction)
- PostgreSQL pgvector storage

### ✅ Tahap 4: Face Recognition & Identification
- **Standard Mode**: Upload image atau webcam dengan mode selector
- **Optimized Popup Mode**: 
  - Dual canvas architecture (input + output separation)
  - Downscaling 320px untuk API call lebih cepat
  - Manual capture & continuous mode (3s interval)
  - Real-time bounding box dengan identity label
  - Confidence scoring display
- 1:N Face identification (compare dengan semua user)
- 1:1 Face verification (verify specific user)
- Cosine similarity matching
- Real-time prediction dari webcam

### ✅ Tahap 5: Authentication System
- **Face Login Popup**: OAuth2-style popup authentication
- **Login Page**: Username/password + Face Login option
- JWT token generation & validation
- Session management dengan localStorage
- Protected routes dengan ProtectedRoute component
- Auto-redirect untuk authenticated users

### ✅ Tahap 6: Face Attendance System
- **Single Attendance** (`1:1`): Manual capture untuk specific user
- **Multi Attendance** (`N:N`): Multi-face detection dalam 1 frame
- **Continuous Attendance**: Auto-recognition setiap 3 detik
  - Dual canvas optimization
  - 2-hour duplicate protection
  - Session statistics (total detected, successful records)
  - Real-time attendance rate display
- Database logging ke `attendance_logs` table
- Duplicate prevention (can't record within 2 hours)
- Attendance history tracking per user

### ✅ Tahap 7: Face Detection Enhancement
- **3-Tab Navigation**: Upload Image | Webcam | Webcam Continuous
- **Upload Mode**: Drag & drop atau file selector
- **Standard Webcam**: Single capture dengan bounding boxes
- **Continuous Detection Popup**:
  - Dual canvas (input capture + output render)
  - Downscaling 320px untuk accurate bounding boxes
  - Auto-detection setiap interval
  - Summary-focused layout (stats cards + latest detection)
  - Detection rate monitoring

---

## 🚀 Setup & Installation

### Backend Setup

```bash
# Buat virtual environment
cd /home/sultan/face-recognition/backend
python3 -m venv venv
# Aktifkan virtual environment
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

Backend akan berjalan di: `http://localhost:5000`

### Frontend Setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v


# Install dependencies
cd frontend
npm install

# Jalankan dev server
npm run dev
```

Frontend akan berjalan di: `http://localhost:5173`

---

## 📡 API Specification

Base URL: `http://localhost:5000/api`

### Swagger Documentation
📖 Akses dokumentasi lengkap: `http://localhost:5000/api/docs`

---

### 1. Halo API Endpoints

#### GET /api/halo/
Mengembalikan pesan halo sederhana.

**Response:**
```json
{
  "message": "Halo! Welcome to Flask API"
}
```

#### POST /api/halo/
Mengirim data nama dan nomor handphone.

**Request Body:**
```json
{
  "nama": "Edy",
  "handphone": "08111111"
}
```

**Response:**
```json
{
  "message": "Halo Edy!",
  "nama": "Edy",
  "handphone": "08111111"
}
```

---

### 2. User Management API (/api/users)

#### GET /api/users
Get all users dengan face registration status.

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2026-01-27T10:00:00",
      "face_count": 10,
      "face_registered": true
    }
  ]
}
```

#### GET /api/users/{id}
Get user by ID.

#### POST /api/users
Create new user.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123"
}
```

#### PUT /api/users/{id}
Update user.

#### DELETE /api/users/{id}
Delete user (cascade delete face embeddings).

---

### 3. Face Detection API (/api/detect)

#### POST /api/detect/image
Deteksi wajah dari uploaded image file.

**Request:**
```http
POST /api/detect/image
Content-Type: multipart/form-data

file: [image file]
```

**Response:**
```json
{
  "faces": [
    {
      "bbox": [x1, y1, x2, y2],
      "confidence": 0.99,
      "landmarks": [[x1, y1], [x2, y2], ...],
      "age": 25,
      "gender": "Male"
    }
  ],
  "count": 1
}
```

#### POST /api/detect/webcam
Deteksi wajah dari webcam capture (base64).

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

#### POST /api/detect/image/annotated
Return annotated image dengan bounding boxes.

---

### 4. Face Registration API (/api/face)

#### POST /api/face/validate
Validate face dari image (quality & single face check).

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Face validated successfully",
  "data": {
    "bbox": [x1, y1, x2, y2],
    "confidence": 0.95,
    "age": 25,
    "gender": "Male"
  }
}
```

#### POST /api/face/users/{user_id}/register
Register multiple face images untuk user (5-10 images recommended).

**Request Body:**
```json
{
  "images": [
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,...",
    ...
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully registered 10/10 faces",
  "data": {
    "total": 10,
    "successful": 10,
    "failed": 0,
    "embeddings": [
      {"id": 1, "index": 1},
      {"id": 2, "index": 2},
      ...
    ]
  }
}
```

#### GET /api/face/users/{user_id}/embeddings
Get all face embeddings untuk user.

**Response:**
```json
{
  "success": true,
  "message": "Found 10 face embeddings",
  "data": {
    "user_id": 1,
    "user_name": "John Doe",
    "embeddings_count": 10,
    "embeddings": [
      {
        "id": 1,
        "quality_score": 0.95,
        "created_at": "2026-01-27T10:00:00"
      }
    ]
  }
}
```

#### DELETE /api/face/users/{user_id}/embeddings
Delete all face embeddings untuk user.

---

### 5. Face Recognition API (/api/detect/recognize)

#### POST /api/detect/recognize
Detect dan recognize faces dalam image (combined detection + identification).

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "threshold": 0.6
}
```

**Response:**
```json
{
  "faces": [
    {
      "bbox": [x1, y1, x2, y2],
      "confidence": 0.99,
      "identified": true,
      "name": "John Doe",
      "email": "john@example.com",
      "user_id": 1,
      "confidence": 0.875
    },
    {
      "bbox": [x1, y1, x2, y2],
      "confidence": 0.95,
      "identified": false,
      "name": "Unknown",
      "confidence": 0.0
    }
  ],
  "count": 2,
  "image_shape": [480, 640, 3]
}
```

---

### 6. Authentication API (/api/auth)

#### POST /api/auth/login
Login dengan username & password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### POST /api/auth/face-login
Login dengan face recognition.

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "threshold": 0.6
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Face login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "confidence": 87.5
  }
}
```

#### GET /api/auth/verify
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user_id": 1,
    "email": "john@example.com"
  }
}
```

---

### 7. Attendance API (/api/attendance)

#### POST /api/attendance/face-single
Record attendance untuk specific user (1:1).

**Request Body:**
```json
{
  "user_id": 1,
  "image": "data:image/jpeg;base64,...",
  "threshold": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance recorded for John Doe",
  "data": {
    "attendance_id": 123,
    "user_id": 1,
    "user_name": "John Doe",
    "timestamp": "2026-01-30T10:30:00",
    "confidence": 87.5
  }
}
```

#### POST /api/attendance/face-multi
Record attendance untuk multiple faces dalam 1 image (N:N).

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "threshold": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance recorded for 3 users",
  "data": {
    "total_faces": 5,
    "recognized": 3,
    "recorded": 2,
    "skipped": 1,
    "attendances": [
      {
        "user_id": 1,
        "user_name": "John Doe",
        "recorded": true,
        "reason": "Success",
        "confidence": 87.5
      },
      {
        "user_id": 2,
        "user_name": "Jane Smith",
        "recorded": false,
        "reason": "Already recorded within 2 hours",
        "confidence": 85.2
      }
    ]
  }
}
```

#### GET /api/attendance/users/{user_id}
Get attendance logs untuk specific user.

**Query Parameters:**
- `limit` (optional): Number of records (default 50)
- `offset` (optional): Pagination offset (default 0)

**Response:**
```json
{
  "success": true,
  "message": "Found 10 attendance records",
  "data": {
    "user_id": 1,
    "user_name": "John Doe",
    "total": 10,
    "logs": [
      {
        "id": 123,
        "timestamp": "2026-01-30T10:30:00",
        "confidence": 87.5
      }
    ]
  }
}
```

---

### 8. Face Identification API (/api/identify)

#### POST /api/identify/
Identify face dari image (1:N matching - compare dengan semua user).

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "threshold": 0.6
}
```

**Response (Match Found):**
```json
{
  "success": true,
  "message": "Face identified as John Doe",
  "data": {
    "identified": true,
    "user_id": 1,
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "confidence": 87.5,
    "similarity_score": 0.8750,
    "threshold": 0.6,
    "top_matches": [
      {
        "user_id": 1,
        "user_name": "John Doe",
        "confidence": 87.5,
        "similarity": 0.8750
      }
    ]
  }
}
```

#### POST /api/identify/verify
Verify face matches specific user (1:1 verification).

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "user_id": 1,
  "threshold": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "message": "Face verified as John Doe",
  "data": {
    "verified": true,
    "user_id": 1,
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "best_similarity": 0.8750,
    "avg_similarity": 0.8320,
    "confidence": 87.5,
    "threshold": 0.6,
    "embeddings_checked": 10
  }
}
```

---

## 🎨 Frontend Features

### 1. Landing Page (`/`)
- Navigation ke semua fitur aplikasi
- Protected dashboard access
- Feature cards: Detection, Recognition, Attendance, Users

### 2. Login Page (`/login`)
- **Standard Login**: Email + Password authentication
- **Face Login**: OAuth2-style popup dengan face recognition
- JWT token generation & storage
- Auto-redirect untuk authenticated users
- Session persistence dengan localStorage

### 3. Dashboard (`/dashboard`)
- Protected route (requires authentication)
- Quick access ke semua features
- User profile display
- Logout functionality

### 4. Face Detection Page (`/face-detection`)
- **3-Tab Navigation**:
  1. **Upload Image**: Drag & drop atau file selector
  2. **Webcam**: Standard single capture mode
  3. **Webcam Continuous**: Popup dengan dual canvas
- **Webcam Continuous Popup Features**:
  - Dual canvas architecture (input + output)
  - Downscaling 320px untuk accurate bounding boxes
  - Auto-detection dengan interval
  - Summary stats (total detected, detection rate)
  - Latest detection display
- **Visual Features**:
  - Green bounding boxes
  - Confidence scores
  - Face count display
  - Confidence score display
  - Facial landmarks (red dots)
  - Age & gender prediction
  - Face count & detection info

### 4. User Management Page (`/users`)
- **User Table dengan Pagination** (15 users per page)
- **Face Registration Status**: 
  - ✅ Registered (X) - Hijau
  - ❌ Not Registered - Merah
- **CRUD Operations**:
  - Add New User
  - Edit User
  - Delete User (cascade delete embeddings)
- **Action Buttons**:
  - 📷 Register Face - Navigate ke registration page
  - 🔍 Predict - Navigate ke prediction page (only for registered users)

### 5. Face Recognition Page (`/face-recognition`)
- **2-Tab Navigation**:
  1. **Standard Mode**: Upload image atau webcam dengan mode selector
  2. **Webcam Popup Optimized**: Dual canvas optimization
- **Optimized Popup Features**:
  - Dual canvas (input capture + output render)
  - Downscaling 320px untuk faster API calls
  - **Manual Capture**: Single click recognition
  - **Start Continuous**: Auto-recognition setiap 3 detik
  - Real-time bounding box dengan identity labels
  - Result panel dengan user info (name, email, confidence)
  - Detection counter untuk continuous mode
- **Results Display**:
  - Avatar dengan initial letter
  - User name & email
  - Confidence percentage dengan progress bar
  - Success badge indicator
  - Tips untuk optimal recognition

### 6. Attendance Page (`/attendance`)
- **5-Tab Navigation**:
  1. **Face 1:1**: Single user attendance (specific user)
  2. **Face N:N**: Multi-face attendance (multiple users)
  3. **Face N:N Popup**: Multi-face dengan popup window
  4. **Face N:N Start Continuous**: Multi-face popup dengan continuous mode
  5. **Face N:N Continuous**: Auto-recognition popup setiap 3 detik
- **Continuous Popup Features**:
  - Dual canvas architecture
  - Auto-recognition every 3 seconds
  - 2-hour duplicate protection
  - Session statistics:
    * Total faces detected
    * Successfully recorded
    * Detection rate percentage
  - Real-time attendance logging
  - Result cards dengan user info
- **Attendance Tracking**:
  - Database logging ke `attendance_logs`
  - Cannot record within 2 hours (duplicate prevention)
  - Timestamp & confidence score recording

### 7. User Management Page (`/users`)
- **User Table dengan Pagination** (15 users per page)
- **Face Registration Status**: 
  - ✅ Registered (X) - Hijau
  - ❌ Not Registered - Merah
- **CRUD Operations**:
  - Add New User
  - Edit User
  - Delete User (cascade delete embeddings)
- **Action Buttons**:
  - 📷 Register Face - Navigate ke registration page
  - 🔍 Predict - Navigate ke prediction page (only for registered users)

### 8. Face Registration Page (`/users/:userId/register-face`)
- **Camera Control**: Start/Stop webcam
- **🎯 Oval Face Guide**: 
  - Visual template berbentuk oval untuk optimal positioning
  - Semi-transparent overlay di luar area oval
  - Dashed border (cyan → green saat face detected)
  - Real-time instruction text
  - Position validation (reject jika wajah di luar oval)
- **2 Capture Modes**:
  - **Manual**: User klik "Capture" button (kontrol penuh)
  - **Auto**: Capture otomatis tiap 2 detik (hands-free)
- **Real-time Validation**: 
  - Validate setiap capture (1 face only, quality > 80%)
  - Validate face position (must be inside oval)
  - Live status feedback dengan color indicators
- **Capture Management**:
  - Preview grid dengan timestamp & confidence score
  - Delete individual captures
  - Target: 5-10 images per user
- **Submit**: Register semua captures ke database

### 9. Face Prediction Page (`/users/:userId/predict`)
- **Camera Capture**: Webcam integration
- **🎯 Oval Face Guide**:
  - Same visual template untuk consistency
  - Ensure face position matches registration data
  - Green border indicator saat ready to capture
- **Real-time Identification**: 
  - Capture & predict button
  - API call ke `/api/identify/`
- **Results Display**:
  - **Match Found** (confidence >= 60%):
    - ✅ Green card dengan user info
    - User name, email, confidence %
    - Similarity score
  - **No Match** (confidence < 60%):
    - ❌ Red card
    - Best confidence vs threshold
  - **Top 5 Matches Table**:
    - Ranking dengan confidence scores
    - Highlight best match
- **Try Again**: Reset untuk predict ulang

---

## 🛠️ Tech Stack

### Backend
- **Flask 3.0+** - Web framework
- **Flask-RESTX** - REST API dengan Swagger UI
- **InsightFace 0.7.3** - Face detection & recognition
- **ONNX Runtime** - Model inference engine
- **OpenCV 4.9** - Image processing
- **NumPy <2.0** - Numerical operations
- **Pillow** - Image handling
- **Flask-CORS** - Cross-origin support
- **psycopg2-binary** - PostgreSQL driver
- **pgvector** - Vector similarity search extension
- **PyJWT** - JWT token generation & validation
- **Werkzeug** - Password hashing (pbkdf2:sha256)

### Frontend
- **React 18** - UI library
- **Vite 7.3.1** - Build tool & dev server (fast HMR)
- **React Router DOM v6** - Client-side routing
- **JavaScript (ES6+)** - Modern JavaScript
- **Custom Hooks Pattern** - useCamera, useFaceLogin, usePasswordLogin
- **Component Composition** - Reusable CameraPreview & StatusMessage
- **Canvas API** - Drawing bounding boxes & oval guides
- **Fetch API** - HTTP requests dengan base apiFetch wrapper
- **MediaDevices API** - Webcam access
- **LocalStorage API** - Session persistence
- **Window.postMessage** - Popup communication (OAuth2-style)
- **PropTypes** - Runtime type checking
- **ESLint** - Code quality & consistency

### Database
- **PostgreSQL 16** - Relational database
- **pgvector** - Vector similarity search (IVFFLAT index)
- **pgAdmin 4** - Database management UI

---

## 📁 Project Structure

```
face-recognition/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── halo.py                    # Halo API endpoints
│   │   │   ├── detect.py                  # Face detection & recognition
│   │   │   ├── users.py                   # User CRUD endpoints
│   │   │   ├── auth.py                    # Authentication (login, face-login)
│   │   │   ├── face_registration.py       # Face registration endpoints
│   │   │   └── face_identification.py     # Face identification endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── halo_service.py
│   │   │   ├── detection_service.py       # Face detection logic
│   │   │   ├── user_service.py            # User CRUD logic
│   │   │   ├── auth_service.py            # Authentication & JWT logic
│   │   │   ├── recognition_service.py     # Face registration logic
│   │   │   └── identification_service.py  # Face matching logic
│   │   ├── utils/
│   │   │   ├── db.py                      # Database helpers
│   │   │   ├── logger.py                  # Logging
│   │   │   ├── response.py                # Response helpers
│   │   │   ├── decorators.py              # JWT validation
│   │   │   └── validators.py              # Input validation
│   │   ├── tests/
│   │   │   ├── test_users.py
│   │   │   └── test_halo.py
│   │   ├── config.py                      # Configuration
│   │   └── main.py                        # Flask app entry
│   ├── requirements.txt
│   └── install_deps.sh
├── frontend/
│   ├── src/
│   │   ├── components/                    # 🔄 REFACTORED: Shared UI components
│   │   │   ├── FaceDetection.jsx
│   │   │   ├── FaceRecognition.jsx
│   │   │   ├── ProtectedRoute.jsx         # Auth protection
│   │   │   ├── CameraPreview.jsx          # ✨ NEW: Reusable camera component
│   │   │   ├── CameraPreview.css          # Camera styling dengan oval guide
│   │   │   ├── StatusMessage.jsx          # ✨ NEW: Status display (error/success/loading)
│   │   │   ├── StatusMessage.css          # Status message styling
│   │   │   └── *.css
│   │   ├── hooks/                         # ✨ NEW: Custom React hooks
│   │   │   ├── useCamera.js               # Camera state & capture logic
│   │   │   ├── useFaceLogin.js            # Face verification & login flow
│   │   │   └── usePasswordLogin.js        # Password authentication flow
│   │   ├── pages/                         # 🔄 REFACTORED: Login.jsx & LoginPopup1N.jsx
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx                  # 🔄 Uses custom hooks (539→405 lines, -25%)
│   │   │   ├── LoginPopup1N.jsx           # 🔄 Uses useCamera hook (329→265 lines, -21%)
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FaceLoginPopup.jsx
│   │   │   ├── FaceDetectionPage.jsx      # 3 tabs
│   │   │   ├── FaceDetectionContinuousPopup.jsx
│   │   │   ├── FaceRecognitionPage.jsx    # 2 tabs
│   │   │   ├── FaceRecognitionOptimizedPopup.jsx
│   │   │   ├── AttendancePage.jsx         # 5 tabs
│   │   │   ├── FaceAttendancePopup.jsx
│   │   │   ├── FaceAttendanceMultiPopup.jsx
│   │   │   ├── FaceAttendanceContinuousPopup.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   ├── FaceRegistration.jsx
│   │   │   ├── FacePrediction.jsx
│   │   │   └── *.css
│   │   ├── services/                      # 🔄 REFACTORED: DRY pattern dengan base fetch
│   │   │   ├── authApi.js                 # 🔄 Base apiFetch() function (318→280 lines, -12%)
│   │   │   ├── attendanceApi.js
│   │   │   └── userApi.js
│   │   ├── utils/
│   │   │   ├── popupAuth.js
│   │   │   ├── popupAttendance.js
│   │   │   ├── popupDetection.js
│   │   │   └── popupRecognition.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── database/
│   ├── docker-compose.yml                 # PostgreSQL + pgAdmin
│   ├── init.sql                           # Database schema
│   └── apply_schema.sh                    # Schema update script
├── docker/
│   ├── dev/
│   │   └── docker-compose.yml
│   └── prod/
│       ├── docker-compose.yml
│       ├── generate-self-signed.sh
│       └── nginx.conf
├── QUICKSTART.md
├── CONTINUOUS_DETECTION_IMPROVEMENTS.mdkage.json
│   └── vite.config.js
├── database/
├── docker/
└── README.md
```
## DOCKER Setup (PostgreSQL + pgAdmin)

```bash
# Start PostgreSQL + pgAdmin
cd database
docker-compose up -d

# Apply/Update schema
bash apply_schema.sh

# Verify tables
docker exec $(docker-compose ps -q postgres) psql -U postgres -d face_recognition -c "\dt"

# Expected tables:
# - users
# - face_embeddings
```

**Database Access:**
- PostgreSQL: `192.168.171.184:5432`
- pgAdmin: `http://192.168.171.184:5050`
  - Email: `admin@admin.com`
  - Password: `admin`

### Install InsightFace Models
Model akan otomatis terdownload saat pertama kali digunakan:
- `buffalo_l` - Face detection & analysis model (2GB+)
- Location: `~/.insightface/models/`

### Run Tests

```bash
cd backend/app
pytest tests/test_users.py -v
```

### Test API dengan cURL

```bash
# Test Halo API
curl http://localhost:5000/api/halo/

# Test Face Detection
curl -X POST http://localhost:5000/api/detect/image \
  -F "file=@path/to/image.jpg"

# Test Face Identification
curl -X POST http://localhost:5000/api/identify/ \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/jpeg;base64,...","threshold":0.6}'
```

---

## 🚀 Complete Usage Flow

### 1. Authentication
```
1. Buka http://localhost:5173/login
2. Option 1 - Standard Login:
   - Masukkan email & password
   - Click "Login"
   - Redirect ke dashboard
3. Option 2 - Face Login:
   - Click "Login with Face Recognition"
   - Popup terbuka dengan camera
   - Capture foto wajah
   - Sistem mengenali & auto-login
   - JWT token disimpan di localStorage
```

### 2. User Registration & Management
```
1. Login ke dashboard
2. Navigate ke /users
3. Click "+ Add New User"
4. Isi nama, email, password
5. User muncul di table dengan status "❌ Not Registered"
```

### 3. Face Registration (Multi-Image)
```
1. Di Users table, click "📷 Register Face" button
2. Camera terbuka dengan Oval Face Guide
3. Position wajah di dalam oval (cyan border → green)
4. Pilih mode:
   - Manual: Click "Capture" untuk tiap gambar (kontrol penuh)
   - Auto: Auto-capture tiap 2 detik (hands-free)
5. Capture 5-10 gambar (berbagai angle & ekspresi)
6. System validate otomatis (quality > 80%, single face, inside oval)
7. Review captures (dapat delete yang kurang bagus)
8. Click "Register X Faces"
9. Backend save embeddings ke PostgreSQL (pgvector)
10. Status berubah: "✅ Registered (10)"
```

### 4. Face Recognition
```
1. Navigate ke /face-recognition
2. Option 1 - Standard Mode:
   - Upload image atau gunakan webcam
   - Click "Recognize"
   - Lihat hasil (name, email, confidence)
3. Option 2 - Optimized Popup:
   - Click "Open Optimized Recognition"
   - Popup dengan dual canvas terbuka
   - Manual: Click "Capture & Recognize"
   - Continuous: Click "Start Continuous" (auto setiap 3s)
   - Hasil tampil di panel kanan dengan confidence bar
```

### 5. Face Detection
```
1. Navigate ke /face-detection
2. Pilih tab:
   - Upload Image: Drag & drop file
   - Webcam: Single capture detection
   - Webcam Continuous: Popup dengan dual canvas
3. Webcam Continuous features:
   - Auto-detection dengan downscaling 320px
   - Summary stats (total detected, detection rate)
   - Accurate bounding boxes
```

### 6. Face Attendance
```
1. Navigate ke /attendance
2. Pilih mode (5 tabs):
   - Face 1:1: Specific user attendance
   - Face N:N: Multi-face attendance
   - Face N:N Popup: Multi-face dengan popup
   - Face N:N Start Continuous: Multi-face continuous
   - Face N:N Continuous: Auto-recognition setiap 3s
3. Continuous mode features:
   - Auto-recognize multiple faces
   - 2-hour duplicate protection
   - Session statistics
   - Real-time attendance logging
4. Database:
   - Attendance logged ke attendance_logs table
   - Cannot record within 2 hours (same user)
```

---

## 📝 Database Schema
```sql
-- ================================================
-- FACE RECOGNITION ATTENDANCE DATABASE INITIALIZATION
-- PostgreSQL + pgvector
-- ================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================
-- TABLE: users
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk email lookup (sering dipakai untuk login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ================================================
-- TABLE: face_embeddings
-- ================================================
CREATE TABLE IF NOT EXISTS face_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding VECTOR(512) NOT NULL,  -- Face embedding vector (512 dimensions)
    image_path VARCHAR(500),          -- Optional: path to reference image
    quality_score FLOAT,              -- Detection confidence score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk user_id lookup
CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON face_embeddings(user_id);

-- Index untuk vector similarity search (cosine similarity)
-- Lists = 100 adalah default yang baik untuk dataset kecil-menengah
CREATE INDEX IF NOT EXISTS idx_face_embeddings_vector 
ON face_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ================================================
-- TABLE: auth_tokens
-- ================================================
CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    confidence REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index untuk token lookup (primary authentication)
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON auth_tokens(is_active) WHERE is_active = TRUE;

-- ================================================
-- TABLE: attendance
-- ================================================
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL CHECK (method IN ('password', 'face-one', 'face-all', 'face-multi')),
    face_confidence FLOAT,            -- Null untuk password method, berisi nilai untuk face methods
    presence VARCHAR(20) NOT NULL CHECK (presence IN ('incoming', 'outcoming')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk query attendance
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_method ON attendance(method);
CREATE INDEX IF NOT EXISTS idx_attendance_presence ON attendance(presence);
```


## 🔧 Development

### Install InsightFace Models
Model akan otomatis terdownload saat pertama kali digunakan:
- `buffalo_l` - Face detection & analysis model
- Location: `~/.insightface/models/`

### Test API dengan cURL

```bash
# Test Halo API
curl http://localhost:5000/api/halo/

# Test Face Detection dengan image
curl -X POST http://localhost:5000/api/detect/image \
  -F "file=@path/to/image.jpg"
```

---

## 🐳 Docker Setup 

```bash
# Generate SSL self-signed (LAN)
cd docker/prod
sh generate-self-signed.sh

# Build dan jalankan semua services (reverse proxy + frontend + backend)
docker compose up -d
docker compose up -d --build

# Build dan jalankan service reverse proxy (nginx)
docker compose build nginx
docker compose up -d nginx
docker compose up -d --build nginx
docker compose restart nginx

# Build dan jalankan service frontend
docker compose build frontend
docker compose up -d frontend
docker compose up -d --build frontend
docker compose restart frontend

# Build dan jalankan service backend
docker compose build backend
docker compose up -d backend
docker compose up -d --build backend
docker compose restart backend

# Stop services
docker compose down

# Stop specific service
docker compose stop nginx
docker compose stop frontend
docker compose stop backend


docker logs --tail=50 reverse-proxy
docker logs --tail=80 flask-backend
docker logs --tail=50 vite-frontend
```

Akses aplikasi:
- Frontend: `https://192.10.10.154`
- API: `https://192.10.10.154/api`
- Swagger UI `https://192.10.10.154/api/docs`

Catatan:
- Browser akan memberi peringatan karena sertifikat self-signed.
- Untuk akses kamera dari IP lain, HTTPS wajib (non-`localhost`).

---

## � Performance Optimization

### Embedding Strategy: Averaging Method ⭐

**Implementasi:** 27 Januari 2026

Sistem menggunakan **averaging method** untuk optimalisasi:
- 10 gambar input → Extract embeddings → Filter quality → Average → Save 1 embedding
- **Database reduction**: 90% (20KB → 2KB per user)
- **Prediction speed**: 10x faster (100ms → 10ms)
- **Accuracy**: Sama atau lebih baik (+2-5%)

**Konfigurasi:**
```python
# backend/app/config.py
FACE_RECOGNITION_CONFIG = {
    'embedding_strategy': 'averaging',  # Default
    'averaging': {
        'min_quality_threshold': 0.9,
        'fallback_top_k': 7
    }
}
```

**Dokumentasi Lengkap:**
- 📘 [PILIHAN_STRATEGI.md](PILIHAN_STRATEGI.md) - 3 metode optimalisasi
- 📗 [CHANGELOG_OPTIMIZATION.md](CHANGELOG_OPTIMIZATION.md) - Implementation details
- 📕 [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing & benchmark guide

---

## 🔄 Recent Updates

### ✅ CSS Production Deployment Fix (31 Jan 2026)
**Masalah:** CSS berantakan di production (kecuali halaman login)

**Root Cause:**
- Nginx reverse proxy tidak menangani static files dengan benar
- Vite config kurang spesifik untuk production build

**Solusi:**
1. **Nginx reverse proxy** (`docker/prod/nginx.conf`):
   - Tambah location rule untuk static assets (CSS, JS, images)
   - Cache headers: `expires 1y` untuk immutable assets
   - WebSocket support untuk HMR development

2. **Vite configuration** (`frontend/vite.config.js`):
   - `base: '/'` - Absolute paths untuk production
   - `assetsDir: 'assets'` - Explicit folder untuk CSS/JS
   - Asset naming patterns untuk konsistensi

**Hasil:** ✅ CSS loaded correctly di semua halaman (200 OK)

**Dokumentasi:** Lihat [misc/CSS_PRODUCTION_FIX.md](misc/CSS_PRODUCTION_FIX.md)

---

### ✅ Frontend Clean Code Refactoring (31 Jan 2026)
**Tujuan:** Menerapkan best practices React (DRY, SRP, component composition)

**Perubahan:**
1. **Custom Hooks** (3 files baru):
   - `useCamera.js` - Camera state management (startCamera, stopCamera, captureFrame)
   - `useFaceLogin.js` - Face verification & login logic dengan error handling
   - `usePasswordLogin.js` - Password authentication flow

2. **Shared Components** (4 files baru):
   - `CameraPreview.jsx + .css` - Reusable camera component dengan oval guide
   - `StatusMessage.jsx + .css` - Status display (error/success/loading/warning/info)

3. **Refactored Pages**:
   - `Login.jsx` - 539 → 405 lines (-25%) menggunakan custom hooks
   - `LoginPopup1N.jsx` - 329 → 265 lines (-21%) dengan useCamera hook

4. **Refactored Services**:
   - `authApi.js` - 318 → 280 lines (-12%) dengan base `apiFetch()` function
   - Eliminasi 150+ lines duplicate fetch code
   - Consistent error handling (network vs API errors)

**Metrics:**
- Total code reduction: ~17%
- Reusability: 3 custom hooks + 2 shared components
- Maintainability: Separation of concerns (business logic vs UI)
- Build size: 373.51 kB → 105.16 kB gzipped

**Dokumentasi:** Lihat [FRONTEND_CLEAN_CODE_REFACTORING.md](FRONTEND_CLEAN_CODE_REFACTORING.md)

---

## 📝 Git Commands

```bash
git init
git add .
git commit -m "Add face detection feature"
git branch -M main
git remote add origin https://github.com/edycoleee/face-recognition.git
git push -u origin main
```

---

## 🎯 Development Status

1. ✅ Face Detection - Complete
2. ✅ Face Recognition - Complete
   - ✅ Face embedding extraction (512-dim vectors)
   - ✅ Database integration (PostgreSQL + pgvector)
   - ✅ Face registration endpoint (multi-image with averaging)
   - ✅ Face matching endpoint (1:1 & 1:N)
3. ✅ Authentication System - Complete
   - ✅ JWT token authentication
   - ✅ Password & Face login
   - ✅ OAuth2-style popup authentication
4. ✅ Attendance System - Complete
   - ✅ Single, Multi, & Continuous attendance modes
   - ✅ 2-hour duplicate protection
5. ✅ Frontend Refactoring - Complete
   - ✅ Custom hooks pattern
   - ✅ Shared components
   - ✅ DRY services layer
6. 🔄 Docker Compose setup - In Progress
7. 🔄 Production deployment - Planned

---

### UPGRADE KEDEPAN :
```
Phase 1: Performance Optimization (2 minggu)
├─ Tambah Redis caching untuk embeddings
├─ pgvector HNSW indexing
└─ Connection pooling optimization

Phase 2: Scalability (1 bulan)
├─ Microservices separation:
│  ├─ Face Detection Service
│  ├─ Recognition Service
│  └─ Attendance Service
├─ Message Queue (RabbitMQ/Celery)
└─ Load balancer

Phase 3: Model Enhancement (1-2 bulan)
├─ Hybrid model (InsightFace + AdaFace)
├─ Model versioning system
└─ A/B testing framework

Phase 4: Advanced Features
├─ Liveness detection (anti-spoofing)
├─ Multi-camera support
├─ Real-time streaming
└─ Analytics dashboard
```


## 📄 License

MIT License

---

## 👨‍💻 Author

Edy Cole
