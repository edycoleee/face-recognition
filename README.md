
# Flask Face Detection & Recognition API

Full-stack aplikasi untuk face detection dan face recognition menggunakan:
- **Frontend**: React + Vite + JavaScript
- **Backend**: Flask + Flask-RESTX + InsightFace + ONNX
- **Database**: PostgreSQL + pgvector + pgAdmin
- **Containerization**: Docker Compose

---

## 📋 Tahap Pengembangan

### ✅ Tahap 1: Face Detection (Current)
- Upload image dan deteksi wajah
- Webcam real-time face detection
- Continuous detection mode
- Bounding boxes dengan confidence score
- Age dan gender prediction

### 🔄 Tahap 2: Face Recognition (Next)
- Face embedding extraction
- Face registration & database storage
- Face matching & identification
- PostgreSQL pgvector integration

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

### Halo API Endpoints

#### 1. GET /api/halo/
Mengembalikan pesan halo sederhana.

**Request:**
```http
GET /api/halo/
```

**Response:**
```json
{
  "message": "Halo! Welcome to Flask API"
}
```

---

#### 2. POST /api/halo/
Mengirim data nama dan nomor handphone.

**Request:**
```http
POST /api/halo/
Content-Type: application/json
```

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

### Face Detection API Endpoints

#### 1. POST /api/detect/image
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
  "count": 1,
  "image_shape": {
    "height": 480,
    "width": 640,
    "channels": 3
  }
}
```

---

#### 2. POST /api/detect/image/base64
Deteksi wajah dari base64 encoded image.

**Request:**
```http
POST /api/detect/image/base64
Content-Type: application/json
```

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:** Same as `/api/detect/image`

---

#### 3. POST /api/detect/webcam
Deteksi wajah dari webcam capture (base64).

**Request:**
```http
POST /api/detect/webcam
Content-Type: application/json
```

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:** Same as `/api/detect/image`

---

#### 4. POST /api/detect/video/frame
Deteksi wajah dari single video frame.

**Request:**
```http
POST /api/detect/video/frame
Content-Type: application/json
```

**Request Body:**
```json
{
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:** Same as `/api/detect/image`

---

#### 5. POST /api/detect/image/annotated
Deteksi wajah dan return annotated image dengan bounding boxes.

**Request:**
```http
POST /api/detect/image/annotated
Content-Type: multipart/form-data

file: [image file]
```

**Response:**
- Content-Type: `image/jpeg`
- Returns image dengan bounding boxes tergambar

---

## 🎨 Frontend Features

### Face Detection Tab
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

### Halo API Tab
- Test GET dan POST endpoints
- Simple form interface

---

## 🛠️ Tech Stack

### Backend
- **Flask** - Web framework
- **Flask-RESTX** - REST API dengan Swagger UI
- **InsightFace** - Face detection & recognition
- **ONNX Runtime** - Model inference
- **OpenCV** - Image processing
- **NumPy** - Numerical operations
- **Pillow** - Image handling
- **Flask-CORS** - Cross-origin support

### Frontend
- **React 18** - UI library
- **Vite** - Build tool & dev server
- **JavaScript (SWC)** - Fast compilation
- **Canvas API** - Drawing bounding boxes
- **Fetch API** - HTTP requests
- **MediaDevices API** - Webcam access

### Database (Coming Soon)
- **PostgreSQL** - Relational database
- **pgvector** - Vector similarity search
- **pgAdmin** - Database management

---

## 📁 Project Structure

```
flask-docker/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── halo.py
│   │   │   └── detect.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── halo_service.py
│   │   │   └── detection_service.py
│   │   ├── models/
│   │   ├── config.py
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FaceDetection.jsx
│   │   │   └── FaceDetection.css
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── database/
├── docker/
└── README.md
```

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

## 🐳 Docker Setup (Coming Soon)

```bash
# Build dan jalankan semua services
docker-compose up -d

# Stop services
docker-compose down
```

---

## 📝 Git Commands

```bash
git init
git add .
git commit -m "Add face detection feature"
git branch -M main
git remote add origin https://github.com/edycoleee/flask-face.git
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

Edy
