# 🚀 Optimization Guide - Face Recognition System

**Last Updated:** 28 January 2026

---

## 📋 Table of Contents
1. [Continuous Face Recognition Optimization](#continuous-face-recognition-optimization)
2. [Face Registration Optimization](#face-registration-optimization)
3. [Hardware Recommendations](#hardware-recommendations)
4. [Backend Optimization](#backend-optimization)
5. [Database Optimization](#database-optimization)
6. [Network Optimization](#network-optimization)

---

## 🎥 Continuous Face Recognition Optimization

### Current Performance
- **Processing Time:** ~500-1000ms per frame (CPU-only)
- **Frame Rate:** ~1-2 fps
- **Bottleneck:** Face detection + embedding extraction (70-80% of time)

### 🔧 Software Optimizations (Free - Quick Wins)

#### 1. **Image Resolution Reduction** ⭐ RECOMMENDED
**Impact:** 2-3x faster processing + less network bandwidth

```javascript
// frontend/src/pages/FaceRecognitionPopup.jsx
// Add this function before handleCaptureAndRecognize

const resizeCanvas = (sourceCanvas, maxWidth = 640) => {
  if (sourceCanvas.width <= maxWidth) {
    return sourceCanvas;
  }
  
  const scale = maxWidth / sourceCanvas.width;
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = maxWidth;
  resizedCanvas.height = sourceCanvas.height * scale;
  
  const ctx = resizedCanvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
  
  return resizedCanvas;
};

// In recognizeFrame() and handleCaptureAndRecognize(), replace:
// const base64Image = canvas.toDataURL('image/jpeg', 0.7);

// With:
const resizedCanvas = resizeCanvas(canvas, 640);
const base64Image = resizedCanvas.toDataURL('image/jpeg', 0.6);
```

**Benefits:**
- ✅ 640px width optimal untuk face detection (vs 1280px/1920px)
- ✅ Faster network transfer (smaller base64 string)
- ✅ Faster backend processing
- ✅ Same detection accuracy

#### 2. **Adjust JPEG Quality**
**Impact:** 20-30% faster encoding + network

```javascript
// Current: 0.7 quality
canvas.toDataURL('image/jpeg', 0.7);

// Optimized: 0.5 quality (still good for faces)
canvas.toDataURL('image/jpeg', 0.5);

// Production recommended: 0.6
canvas.toDataURL('image/jpeg', 0.6);
```

#### 3. **Interval Timing Adjustment**
**Impact:** Balance between smoothness and CPU usage

```javascript
// Current: 350ms interval (~2.8 fps max)
setInterval(recognizeFrame, 350);

// Options:
setInterval(recognizeFrame, 500);  // 2 fps - less CPU, smoother
setInterval(recognizeFrame, 250);  // 4 fps - more responsive (if GPU available)
setInterval(recognizeFrame, 1000); // 1 fps - minimal CPU (monitoring mode)
```

**Use Cases:**
- **350ms** - Default, balanced
- **500ms** - CPU-friendly, production recommended
- **250ms** - For GPU setups only
- **1000ms** - Attendance/monitoring (periodic check)

#### 4. **Skip Frames When Busy**
Already implemented with `isRecognizingRef.current` flag ✅

```javascript
// Prevents concurrent API calls
if (isRecognizingRef.current) return;
isRecognizingRef.current = true;
// ... process ...
isRecognizingRef.current = false;
```

#### 5. **Debounce Face Detection**
**Impact:** Reduce unnecessary API calls

```javascript
// Only send if faces are likely present (motion detection)
// Or: Only send if different from last frame (frame diff)
// TODO: Implement frame comparison
```

---

### 💻 Hardware Optimizations

#### GPU Acceleration ⭐⭐⭐ **BIGGEST IMPACT**

**Current:** CPU-only processing (~500-1000ms/frame)  
**With GPU:** ~50-100ms/frame (5-10x faster!)

**Installation:**
```bash
# 1. Install CUDA Toolkit (NVIDIA GPU required)
# Download from: https://developer.nvidia.com/cuda-downloads

# 2. Install ONNX Runtime GPU
pip uninstall onnxruntime
pip install onnxruntime-gpu

# 3. InsightFace will auto-detect GPU
# No code changes needed!
```

**Verify GPU Usage:**
```python
# backend/app/services/detection_service.py
import onnxruntime as ort
print("Available providers:", ort.get_available_providers())
# Should show: ['CUDAExecutionProvider', 'CPUExecutionProvider']
```

**GPU Requirements:**
- NVIDIA GPU with CUDA support
- Minimum: GTX 1060 (6GB VRAM)
- Recommended: RTX 3060 (12GB VRAM) or higher
- RTX 4060/4070 for best performance

**Performance Gains:**
| GPU Model | Speed | Price (approx) |
|-----------|-------|----------------|
| GTX 1060 6GB | ~150-200ms/frame | Rp 2-3jt (used) |
| RTX 3060 12GB | ~80-100ms/frame | Rp 4-5jt |
| RTX 4060 8GB | ~50-80ms/frame | Rp 5-6jt |
| RTX 4070 12GB | ~30-50ms/frame | Rp 8-10jt |

#### CPU Recommendations

**Current Bottleneck:** Single-thread performance matters most

**Recommended CPUs (2026):**
- **Budget:** Intel i5-12400 / AMD Ryzen 5 5600X (Rp 2-3jt)
- **Optimal:** Intel i7-13700 / AMD Ryzen 7 7700X (Rp 4-6jt)
- **Overkill:** Intel i9-14900K / AMD Ryzen 9 7950X (not worth it without GPU)

**DON'T Buy:**
- ❌ Xeon server CPUs (designed for multi-core, slower single-thread)
- ❌ High-end CPU without GPU (inefficient spending)

#### Memory (RAM)
- **Minimum:** 8GB (basic operation)
- **Recommended:** 16GB (smooth multi-tasking)
- **Optimal:** 32GB (if processing multiple streams)

#### Camera
**Current webcam is sufficient!** ✅

- ❌ Don't upgrade to 60fps/120fps camera
- ✅ Standard 30fps webcam works fine
- ✅ Focus on good lighting instead
- ❌ 4K camera = waste (we resize to 640px anyway)

---

### 🔄 Model Optimization

#### Use Smaller Model (Trade-off: Speed vs Accuracy)

```python
# backend/app/services/detection_service.py

# Current: buffalo_l (most accurate, slowest)
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])

# Option 1: buffalo_s (smaller, 1.5x faster, slightly less accurate)
app = FaceAnalysis(name='buffalo_s', providers=['CPUExecutionProvider'])

# Option 2: buffalo_sc (smallest, 2x faster, acceptable accuracy)
app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
```

**Comparison:**
| Model | Speed | Accuracy | Use Case |
|-------|-------|----------|----------|
| buffalo_l | Baseline | Best | Production (recommended) |
| buffalo_s | 1.5x faster | Very Good | High-volume scenarios |
| buffalo_sc | 2x faster | Good | Real-time, less critical |

---

## 📝 Face Registration Optimization

### Current Performance
- **Registration Time:** ~2-5 seconds per person (5 captures)
- **Main Cost:** Multiple face detections + database writes

### 🔧 Optimizations

#### 1. **Reduce Number of Captures**

```javascript
// frontend/src/pages/FaceRegistration.jsx
// Current: 5 captures
const REQUIRED_SAMPLES = 5;

// Option 1: 3 captures (faster, acceptable quality)
const REQUIRED_SAMPLES = 3;

// Option 2: Dynamic based on quality
// If all 3 captures are high quality (>0.8), skip to 3
// Otherwise continue to 5
```

**Benefits:**
- ✅ 40% faster registration (5 → 3 captures)
- ⚠️ Slightly less robust averaging

#### 2. **Parallel Processing** (Backend)

```python
# backend/app/api/face_registration.py
# Current: Sequential processing (5 images processed one-by-one)

# Optimized: Batch processing
# Process all 5 images in single API call
# Extract embeddings in parallel (if multiple CPUs)

from concurrent.futures import ThreadPoolExecutor

def process_images_parallel(images):
    with ThreadPoolExecutor(max_workers=4) as executor:
        embeddings = list(executor.map(extract_embedding, images))
    return embeddings
```

**Benefits:**
- ✅ 2-3x faster with multi-core CPU
- ✅ Single database transaction

#### 3. **Quality Threshold Optimization**

```python
# backend/app/services/detection_service.py
# Current quality filter in embedding_utils.py

def filter_high_quality_embeddings(embeddings, det_scores, min_score=0.7):
    # Current: 0.7 threshold
    # Option: Adjust based on use case
    
    # Stricter (0.8) = Better quality, might reject good samples
    # Looser (0.6) = More samples pass, might include poor quality
    
    # Recommended: Keep 0.7 (balanced)
```

#### 4. **Auto-Capture Mode** (Already Implemented ✅)

```javascript
// frontend/src/hooks/useCapture.js
// Automatically captures when face is:
// ✅ Centered
// ✅ Facing forward
// ✅ Good distance
// ✅ No rapid movement

// This is already optimal!
```

#### 5. **Guided Feedback** (Enhancement)

```javascript
// TODO: Add more specific guidance
// Instead of: "Move closer"
// Show: "Move 10cm closer" with visual indicator
// Show face oval overlay for perfect positioning
```

---

## 🗄️ Database Optimization

### PostgreSQL + pgvector

#### Current Setup
```sql
-- Vector index for similarity search
CREATE INDEX idx_face_embeddings_vector ON face_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

#### Optimizations

##### 1. **Adjust Index Lists Parameter**

```sql
-- Current: lists = 100 (good for <10k faces)

-- For larger datasets:
-- 1k-10k faces: lists = 100 (current)
-- 10k-100k faces: lists = 500
-- 100k+ faces: lists = 1000

-- Rebuild index:
DROP INDEX idx_face_embeddings_vector;
CREATE INDEX idx_face_embeddings_vector ON face_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 500);
```

##### 2. **Connection Pooling**

```python
# backend/app/utils/db.py
# Already using SQLAlchemy pool ✅

# Tune pool size for high-traffic:
engine = create_engine(
    DATABASE_URL,
    pool_size=10,        # Default: 5
    max_overflow=20,     # Default: 10
    pool_pre_ping=True,  # Check connection before use
    pool_recycle=3600    # Recycle connections every hour
)
```

##### 3. **Query Optimization**

```python
# backend/app/services/recognition_service.py
# Current query already optimized with:
# ✅ Vector index
# ✅ Cosine similarity
# ✅ Limit results

# For multiple faces, consider batch query:
# Instead of: N queries for N faces
# Use: Single query with OR conditions (if applicable)
```

##### 4. **Database Maintenance**

```bash
# Run regularly (weekly/monthly)
docker exec -it postgres_container psql -U postgres -d face_recognition

# Vacuum and analyze
VACUUM ANALYZE face_embeddings;

# Reindex if performance degrades
REINDEX INDEX idx_face_embeddings_vector;

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE tablename = 'face_embeddings';
```

---

## 🌐 Network Optimization

### 1. **Use WebSocket for Continuous Mode** (Advanced)

```javascript
// Instead of: HTTP POST every 350ms
// Use: WebSocket stream

// Benefits:
// ✅ Lower latency (no HTTP overhead)
// ✅ Persistent connection
// ✅ Server can push results

// Implementation:
// Frontend: WebSocket client sends frames
// Backend: Flask-SocketIO processes stream
```

### 2. **Compression**

```python
# backend/app/main.py
from flask_compress import Compress

app = Flask(__name__)
Compress(app)  # Auto-compress JSON responses

# Benefits:
# ✅ Smaller response size
# ✅ Faster network transfer
```

### 3. **CDN/Edge Deployment** (Production)

```
User → CDN (Frontend) → Backend API → Database
     └─> Cached static assets

# Benefits:
# ✅ Faster frontend load
# ✅ Reduced server load
```

---

## 📊 Performance Benchmarks

### Current Setup (CPU-only, No Optimization)
```
📌 Continuous Recognition:
- Image: 1280x720, JPEG 0.7 quality
- Processing: 500-1000ms/frame
- Frame Rate: 1-2 fps
- CPU Usage: 80-100% (single core)

📌 Face Registration:
- 5 captures: 2-5 seconds total
- Database write: <100ms
```

### With Software Optimizations
```
📌 Continuous Recognition:
- Image: 640x480, JPEG 0.6 quality
- Processing: 200-400ms/frame
- Frame Rate: 2-3 fps
- CPU Usage: 60-80%

📌 Face Registration:
- 3 captures: 1-2 seconds total
- Parallel processing: 40% faster
```

### With GPU (RTX 3060)
```
📌 Continuous Recognition:
- Image: 640x480, JPEG 0.6 quality
- Processing: 50-100ms/frame
- Frame Rate: 10-15 fps (limited by 350ms interval)
- CPU Usage: 20-30%
- GPU Usage: 40-60%

📌 Face Registration:
- 3 captures: <1 second total
- Real-time feedback possible
```

---

## 🎯 Recommended Implementation Order

### Phase 1: Software Optimizations (Now - Free)
1. ✅ Resize images to 640px
2. ✅ Lower JPEG quality to 0.6
3. ✅ Adjust interval to 500ms
4. ✅ Enable Flask-Compress
5. ✅ Reduce registration captures to 3 (with quality check)

**Expected Gain:** 2-3x faster, ~200-400ms/frame

### Phase 2: Hardware Upgrade (If Budget Available)
1. ✅ Install NVIDIA GPU (RTX 3060 or better)
2. ✅ Install CUDA + onnxruntime-gpu
3. ✅ Verify GPU acceleration working

**Expected Gain:** 5-10x faster, ~50-100ms/frame

### Phase 3: Advanced Optimizations (Production)
1. ⏳ Implement WebSocket streaming
2. ⏳ Database connection pooling tuning
3. ⏳ Multi-stream support
4. ⏳ Load balancing (if high traffic)

**Expected Gain:** Scalability to multiple users

---

## 🛠️ Implementation Checklist

### Continuous Recognition
- [ ] Add image resize function (640px)
- [ ] Change JPEG quality to 0.6
- [ ] Test with 500ms interval
- [ ] Install GPU drivers (if available)
- [ ] Install onnxruntime-gpu
- [ ] Verify GPU usage in logs
- [ ] Benchmark before/after

### Face Registration
- [ ] Reduce captures from 5 to 3
- [ ] Test quality with 3 captures
- [ ] Add quality threshold check
- [ ] Consider parallel processing
- [ ] Add better user guidance

### Backend
- [ ] Enable Flask-Compress
- [ ] Tune database pool size
- [ ] Add performance logging
- [ ] Monitor query execution time
- [ ] Consider model downgrade if needed

### Database
- [ ] Schedule VACUUM ANALYZE
- [ ] Monitor index usage
- [ ] Adjust lists parameter if >10k users
- [ ] Set up backup strategy

---

## 💡 Quick Reference

### Cost-Benefit Analysis

| Optimization | Cost | Time | Performance Gain | Recommended |
|--------------|------|------|------------------|-------------|
| Resize images | Free | 30 min | 2x faster | ✅✅✅ YES |
| Lower JPEG quality | Free | 5 min | 1.3x faster | ✅✅✅ YES |
| Adjust interval | Free | 2 min | Better UX | ✅✅ YES |
| NVIDIA GPU | Rp 4-5jt | 2 hours | 5-10x faster | ✅✅✅ Production |
| High-end CPU | Rp 6-8jt | 2 hours | 1.5x faster | ❌ No |
| Smaller model | Free | 5 min | 2x faster | ⚠️ Less accurate |
| WebSocket | Free | 2 days | 1.5x faster | ⏳ Advanced |
| 3 captures | Free | 10 min | 1.5x faster | ✅✅ YES |

---

## 📞 Support & Monitoring

### Performance Monitoring

```bash
# Monitor backend CPU/Memory
htop

# Monitor GPU usage (if available)
nvidia-smi -l 1

# Monitor database performance
docker exec -it postgres_container psql -U postgres -d face_recognition
SELECT * FROM pg_stat_activity WHERE datname = 'face_recognition';

# Check slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### Logging Performance Metrics

```python
# backend/app/services/detection_service.py
import time

def recognize_faces_from_base64(base64_image, threshold=0.6):
    start_time = time.time()
    
    # ... processing ...
    
    processing_time = time.time() - start_time
    logger.info(f"⏱️ Recognition took {processing_time*1000:.0f}ms")
    
    return result
```

---

## 🔗 Additional Resources

- [InsightFace Documentation](https://github.com/deepinsight/insightface)
- [ONNX Runtime GPU Setup](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html)
- [pgvector Performance Tuning](https://github.com/pgvector/pgvector#performance)
- [Flask Performance Best Practices](https://flask.palletsprojects.com/en/2.3.x/deploying/)

---

**Last Review:** 28 January 2026  
**Next Review:** When deploying to production or if performance degrades
