# Installation Dependencies

## Problem
Face Registration feature butuh dependencies tambahan yang belum terinstall:
- opencv-python-headless
- insightface + onnxruntime
- psycopg2-binary
- pgvector

## Solution

### 1. Install All Dependencies
```bash
cd /home/sultan/face-recognition/backend
pip install -r requirements.txt --break-system-packages
```

### 2. Verify Installation
```bash
cd /home/sultan/face-recognition/backend/app
python -c "from services.recognition_service import validate_single_face; print('✅ OK')"
```

### 3. Restart Backend
```bash
# Stop current backend (Ctrl+C di terminal python)
cd /home/sultan/face-recognition/backend/app
python main.py
```

### 4. Restart Frontend
```bash
# Di terminal lain
cd /home/sultan/face-recognition/frontend
npm run dev
```

## Dependencies Installed
- ✅ opencv-python-headless==4.9.0.80
- ✅ numpy==1.26.4 (compatible version)
- ✅ insightface==0.7.3
- ✅ onnxruntime==1.23.2
- ✅ psycopg2-binary==2.9.11
- ✅ pgvector==0.4.2
- ✅ flask-restx==1.3.2
- ✅ flask-cors==6.0.2

## Test Face Registration API

### 1. Test Validate Endpoint
```bash
curl -X POST http://localhost:5000/api/face/validate \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,..."}'
```

### 2. Test Register Endpoint
```bash
curl -X POST http://localhost:5000/api/face/users/1/register \
  -H "Content-Type: application/json" \
  -d '{"images": ["data:image/jpeg;base64,.."]}'
```

### 3. Test via Frontend
1. Open http://localhost:5173/users
2. Click "📷 Register Face"
3. Click "Start Camera"
4. Choose Manual/Auto mode
5. Capture 5-10 images
6. Click "Register X Faces"
