# Face Detection API - Quick Start Guide

## 🚀 Cara Menjalankan

### 1. Backend (Flask API)
```bash
cd /home/ubuntusvr/flask-docker/backend
source venv/bin/activate  # Aktifkan virtual environment jika belum
cd app
python main.py
```
Backend berjalan di: **http://localhost:5000**
Swagger Docs: **http://localhost:5000/api/docs**

### 2. Frontend (React)
```bash
cd /home/ubuntusvr/flask-docker/frontend
npm run dev
```
Frontend berjalan di: **http://localhost:5173**

---

## 📋 Fitur yang Sudah Dibuat

### ✅ Backend API Endpoints

1. **POST /api/detect/image** - Upload gambar untuk deteksi
2. **POST /api/detect/image/base64** - Deteksi dari base64 string
3. **POST /api/detect/webcam** - Deteksi dari webcam capture
4. **POST /api/detect/video/frame** - Deteksi dari video frame
5. **POST /api/detect/image/annotated** - Return gambar dengan bounding boxes

### ✅ Frontend Features

- **Upload Image Mode**: Upload dan deteksi wajah dari file
- **Webcam Mode**: 
  - Capture sekali dan deteksi
  - Continuous detection (real-time)
- **Visualization**:
  - Green bounding boxes
  - Confidence scores
  - Facial landmarks (red dots)
  - Age & gender prediction
  - Face count display

---

## 🧪 Testing

### Test dengan Frontend
1. Buka http://localhost:5173
2. Pilih tab "Face Detection"
3. Pilih mode:
   - **Upload Image**: Upload foto dengan wajah
   - **Webcam**: Klik "Start Webcam" → "Capture & Detect" atau "Start Continuous"

### Test dengan cURL

```bash
# Upload image
curl -X POST http://localhost:5000/api/detect/image \
  -F "file=@/path/to/image.jpg"

# Webcam/Base64
curl -X POST http://localhost:5000/api/detect/webcam \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,YOUR_BASE64_STRING"}'
```

### Test dengan Swagger UI
1. Buka http://localhost:5000/api/docs
2. Expand endpoint `/api/detect/image`
3. Klik "Try it out"
4. Upload file dan klik "Execute"

---

## 📦 Dependencies yang Dibutuhkan

### Backend
- flask>=3.0.0
- flask-restx>=1.3.0
- flask-cors
- insightface>=0.7.3
- onnxruntime>=1.23.0
- opencv-python-headless>=4.9.0
- Pillow>=10.0.0
- numpy>=1.24.0

### Frontend
- react
- vite
- No additional packages needed (uses browser APIs)

---

## 🔍 Response Format

```json
{
  "faces": [
    {
      "bbox": [100, 150, 300, 400],
      "confidence": 0.9876,
      "landmarks": [[120, 180], [150, 180], ...],
      "age": 28,
      "gender": "Female"
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

## 🐛 Troubleshooting

### Backend tidak jalan
```bash
# Pastikan dependencies terinstall
pip install -r requirements.txt

# Check port 5000 tidak dipakai
lsof -i :5000
```

### Frontend tidak bisa akses API
- Pastikan CORS sudah enabled di backend (sudah ada di main.py)
- Check API_BASE_URL di FaceDetection.jsx sesuai dengan backend URL

### Webcam tidak bisa akses
- Browser harus HTTPS atau localhost
- Allow permission webcam di browser
- Check webcam tidak dipakai aplikasi lain

### Model InsightFace download error
- Model akan auto-download pertama kali (buffalo_l ~200MB)
- Lokasi: `~/.insightface/models/`
- Butuh koneksi internet untuk download pertama

---

## 📝 Files yang Dibuat/Dimodifikasi

### Backend
- ✅ `/backend/app/services/detection_service.py` - Face detection logic
- ✅ `/backend/app/api/detect.py` - API endpoints
- ✅ `/backend/app/main.py` - Add detect namespace

### Frontend
- ✅ `/frontend/src/components/FaceDetection.jsx` - Main component
- ✅ `/frontend/src/components/FaceDetection.css` - Styling
- ✅ `/frontend/src/App.jsx` - Add tab navigation
- ✅ `/frontend/src/App.css` - Add tab styles

### Documentation
- ✅ `/README.md` - Complete documentation

---

## 🎯 Next Phase: Face Recognition

Tahap berikutnya yang akan dikerjakan:
1. Face embedding extraction
2. PostgreSQL + pgvector setup
3. Face registration endpoint
4. Face matching/identification endpoint
5. Docker Compose configuration

---

Dibuat: 25 Januari 2026
