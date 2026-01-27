
# Flask Face Detection & Recognition API

Full-stack aplikasi untuk face detection dan face recognition menggunakan:
- **Frontend**: React + Vite + React Router + JavaScript
- **Backend**: Flask + Flask-RESTX + InsightFace + ONNX
- **Database**: PostgreSQL + pgvector + pgAdmin
- **Containerization**: Docker Compose

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
- 1:N Face identification (compare dengan semua user)
- 1:1 Face verification (verify specific user)
- Cosine similarity matching
- **Oval Face Guide**: Consistent positioning untuk accurate prediction
- Confidence scoring & top-5 matches
- Real-time prediction dari webcam

### Tahap 5 : Optimalisasi face recognition and detection for auth
- input user
- 1:1 Face identification (compare dengan semua user)
- login get token

### Tahap 6 : Attendance from manual capture camera
- input user
- 1:1 Face identification (compare dengan semua user)
- jika tertangkap di kamera maka insert attendance_logs, jika sebelum 1 jam maka tidak insert log lagi, jika >1jam maka insert log lagi

### Tahap 7 : Attendance from camera
- 1:N Face identification (compare dengan semua user)
- jika tertangkap di kamera maka insert attendance_logs, jika sebelum 1 jam maka tidak insert log lagi, jika >1jam maka insert log lagi

---

## 🚀 Setup & Installation

### Backend Setup

```bash
# Buat virtual environment
python3 -m venv venv

# Aktifkan virtual environment
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
cd backend
pip install -r requirements.txt

# Jalankan aplikasi
cd app
python main.py
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

### 5. Face Identification API (/api/identify)

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
      },
      {
        "user_id": 2,
        "user_name": "Jane Smith",
        "confidence": 45.2,
        "similarity": 0.4520
      }
    ]
  }
}
```

**Response (No Match):**
```json
{
  "success": true,
  "message": "No match found (confidence too low)",
  "data": {
    "identified": false,
    "message": "No matching face found in database",
    "confidence": 45.2,
    "threshold": 60,
    "top_matches": [...]
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
- Cards: Halo API, Face Detection, User Management

### 2. Halo API Page (`/halo`)
- Test GET dan POST endpoints
- Simple form interface

### 3. Face Detection Page (`/face-detection`)
- **Upload Image Mode**: Upload gambar dan deteksi wajah
- **Webcam Mode**: 
  - Real-time webcam capture
  - Single capture & detect
  - Continuous detection mode (500ms interval)
- **Visual Features**:
  - Green bounding boxes di wajah
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

### 5. Face Registration Page (`/users/:userId/register-face`)
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

### 6. Face Prediction Page (`/users/:userId/predict`)
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

### Frontend
- **React 18** - UI library
- **Vite** - Build tool & dev server
- **React Router DOM v6** - Client-side routing
- **JavaScript (SWC)** - Fast compilation
- **Canvas API** - Drawing bounding boxes & oval guides
- **Fetch API** - HTTP requests
- **MediaDevices API** - Webcam access

### Database
- **PostgreSQL 16** - Relational database
- **pgvector** - Vector similarity search (IVFFLAT index)
- **pgAdmin 4** - Database management UI

---
```
#Face-recognition/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── halo.py                    # Halo API endpoints
│   │   │   ├── detect.py                  # Face detection endpoints
│   │   │   ├── users.py                   # User CRUD endpoints
│   │   │   ├── face_registration.py       # Face registration endpoints
│   │   │   └── face_identification.py     # Face identification endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── halo_service.py
│   │   │   ├── detection_service.py       # Face detection logic
│   │   │   ├── user_service.py            # User CRUD logic
│   │   │   ├── recognition_service.py     # Face registration logic
│   │   │   └── identification_service.py  # Face matching logic
│   │   ├── utils/
│   │   │   ├── db.py                      # Database connection helpers
│   │   │   ├── logger.py                  # Logging configuration
│   │   │   └── response.py                # Standard response helpers
│   │   ├── tests/
│   │   │   ├── test_users.py              # User API unit tests
│   │   │   └── test_halo.py
│   │   ├── models/
│   │   ├── config.py
│   │   └── main.py                        # Flask app entry point
│   ├── requirements.txt
│   └── install_deps.sh
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FaceDetection.jsx          # Face detection component
│   │   │   └── FaceDetection.css
│   Database Setup
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

### 1. User Registration & Management
```
1. Buka http://localhost:5173/users
2. Klik "+ Add New User"
3. Isi nama, email, password
4. User muncul di table dengan status "❌ Not Registered"
```

### 2. Face Registration (Multi-Image)
```
1. Di Feature Highlights

### ✅ Implemented Features
1. **Face Detection**
   - Upload image detection
   - Real-time webcam detection
   - Continuous detection mode
   - Age & gender prediction
   - Bounding boxes & landmarks

2. **User Management**
   - Complete CRUD operations
   - PostgreSQL persistence
   - Pagination (15 per page)
   - Face registration status tracking

3. **Face Registration**
   - Multi-image capture (5-10 images)
   - Manual & Auto capture modes
   - **🎯 Oval Face Guide** untuk optimal positioning
   - Real-time validation (quality + single face + position)
   - 512-dimensional embedding extraction
   - pgvector storage with IVFFLAT index

4. **Face Identification**
   - 1:N identification (search all users)
   - 1:1 verification (specific user)
   - **🎯 Oval Face Guide** untuk consistent positioning
   - Cosine similarity matching
   - Configurable threshold (default 60%)
   - Top-5 matches dengan confidence scores
   - Real-time webcam prediction

### 🔄 Future Enhancements
1. Face liveness detection
2. Face anti-spoofing
3. Attendance logging system
4. Real-time face tracking
5. Multi-face identification
6. Face clustering & grouping
7. Performance optimization (GPU support)
8. Mobile app integration

---

## 📝 Database Schema

### Table: users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: face_embeddings
```sql
CREATE TABLE face_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding VECTOR(512) NOT NULL,  -- Face embedding vector
    image_path VARCHAR(500),          -- Optional reference image
    quality_score FLOAT,              -- Detection confidence
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IVFFLAT index untuk vector similarity search
CREATE INDEX idx_face_embeddings_vector 
ON face_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```lik "Register X Faces"
6. Backend save embeddings ke PostgreSQL (pgvector)
7. Status di Users table berubah: "✅ Registered (10)"
```

### 3. Face Prediction/Identification
```
1. Di Users table, klik "🔍 Predict" (muncul setelah register)
2. Klik "Start Camera"
3. Klik "Capture & Predict"
4. Backend:
   - Extract embedding dari captured image
   - Compare dengan SEMUA embeddings di database (cosine similarity)
   - Sort by similarity (highest first)
5. Results:
   ✅ Match Found (>= 60%):
      - User name, email
      - Confidence: 87.5%
      - Top 5 matches dengan ranking
   ❌ No Match (< 60%):
      - Best confidence: 45.2%
      - Threshold: 60.0%
      - Top 5 closest matches
---

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


# Stop services
docker compose down


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

## �📝 Git Commands

```bash
git init
git add .
git commit -m "Add face detection feature"
git branch -M main
git remote add origin https://github.com/edycoleee/face-recognition.git
git push -u origin main
```

---

## 🎯 Next Steps

1. ✅ Face Detection - Complete
2. 🔄 Face Recognition - In Progress
   - Face embedding extraction
   - Database integration (PostgreSQL + pgvector)
   - Face registration endpoint
   - Face matching endpoint
3. 🔄 Docker Compose setup
4. 🔄 Production deployment

---

## 📄 License

MIT License

---

## 👨‍💻 Author

Edy Cole
