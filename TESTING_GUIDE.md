# Quick Testing Guide - Averaging Method

## 🚀 Cara Cepat Test Metode Averaging

### 1. Restart Backend Server

```bash
cd /home/sultan/face-recognition/backend
python app/main.py
```

### 2. Test Registration dengan Frontend

1. Buka browser: `http://localhost:5173`
2. Buka **Users** page
3. Pilih user atau buat user baru
4. Klik **"Register Face"**
5. Klik **"Start Camera"**
6. Klik **"Auto Capture (10 pics)"**
7. Tunggu sampai 10 gambar ter-capture
8. Sistem akan auto-submit

**Expected Result:**
```json
{
  "success": true,
  "message": "Successfully registered face (averaged from 7 images)",
  "data": {
    "total": 10,
    "processed": 9,
    "failed": 1,
    "strategy": "averaging",
    "successful": 1,
    "embeddings": [
      {
        "id": 123,
        "type": "averaged",
        "source_count": 7,
        "avg_quality": 0.94
      }
    ]
  }
}
```

### 3. Cek Database

```sql
-- Connect ke PostgreSQL
psql -h 192.168.171.184 -U postgres -d face_recognition_db

-- Cek jumlah embeddings untuk user
SELECT 
    u.id,
    u.name,
    COUNT(fe.id) as embedding_count,
    AVG(fe.quality_score) as avg_quality
FROM users u
LEFT JOIN face_embeddings fe ON u.id = fe.user_id
GROUP BY u.id, u.name
ORDER BY u.id DESC
LIMIT 10;
```

**Expected:**
- User baru: `embedding_count = 1` (metode averaging) ✅
- User lama: `embedding_count = 10` (metode save_all) ✅

### 4. Test Prediction

1. Kembali ke Users page
2. Klik **"🔍 Predict"** pada user yang sudah register
3. Start camera dan posisikan wajah
4. Klik capture

**Expected:**
- Prediction speed lebih cepat
- Confidence score tetap tinggi (> 0.8)

### 5. Compare Performance

#### Test A: User dengan Averaging (1 embedding)
```bash
# Time prediction
curl -X POST http://localhost:5000/api/face/identify \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_string_here"}'
```

#### Test B: User dengan Save All (10 embeddings)
```bash
# Same request, different user
curl -X POST http://localhost:5000/api/face/identify \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_string_here"}'
```

**Expected:**
- User A (averaging): ~10-20ms response time
- User B (save_all): ~50-100ms response time
- **Improvement: 5-10x faster** ⚡

---

## 🔧 Switch Strategy (Testing)

### Temporarily Use Old Method

```bash
# Set environment variable
export EMBEDDING_STRATEGY=save_all

# Restart backend
cd /home/sultan/face-recognition/backend
python app/main.py
```

### Switch Back to Averaging

```bash
export EMBEDDING_STRATEGY=averaging
# Restart backend
```

### Permanent Config

Edit `backend/app/config.py`:
```python
FACE_RECOGNITION_CONFIG = {
    'embedding_strategy': 'averaging',  # atau 'save_all'
    # ...
}
```

---

## 📊 Monitor Logs

```bash
# Watch backend logs
cd /home/sultan/face-recognition/backend
tail -f app.log | grep -i "averaging\|register"
```

**Expected Log Output:**
```
2026-01-27 10:30:45 - INFO - Registering faces for user 123 using strategy: averaging
2026-01-27 10:30:46 - INFO - Using 7 high-quality embeddings (quality >= 0.9)
2026-01-27 10:30:46 - INFO - Saved averaged embedding for user 123: 7 images averaged, quality=0.943
```

---

## ✅ Success Indicators

**Registration:**
- ✅ Response message: "Successfully registered face (averaged from X images)"
- ✅ `results.strategy === 'averaging'`
- ✅ `results.successful === 1` (hanya 1 embedding tersimpan)
- ✅ `results.embeddings[0].type === 'averaged'`

**Database:**
- ✅ User baru: 1 embedding (bukan 10)
- ✅ Quality score tinggi (avg dari best images)

**Prediction:**
- ✅ Speed improvement terlihat
- ✅ Accuracy tetap tinggi
- ✅ No errors

---

## 🐛 Common Issues

### Issue 1: "Need at least 3 valid images"
**Cause:** Terlalu banyak gambar rejected karena quality rendah

**Solution:**
```python
# Edit config.py
'averaging': {
    'min_quality_threshold': 0.85,  # Turunkan dari 0.9
    'fallback_top_k': 5              # Atau turunkan top_k
}
```

### Issue 2: "Import error: cannot import FACE_RECOGNITION_CONFIG"
**Cause:** Backend belum restart setelah update config.py

**Solution:**
```bash
# Restart backend
cd /home/sultan/face-recognition/backend
python app/main.py
```

### Issue 3: Akurasi turun setelah averaging
**Cause:** Mungkin terlalu sedikit high-quality images

**Solution:**
```python
# Increase fallback top_k
'fallback_top_k': 10  # Gunakan semua 10 images jika perlu
```

---

## 📈 Performance Benchmark

### Test Script (Optional)

Create `test_averaging_performance.py`:
```python
import requests
import time
import base64

API_URL = "http://localhost:5000/api"

def benchmark_prediction(user_id, test_image_b64, iterations=10):
    times = []
    
    for i in range(iterations):
        start = time.time()
        response = requests.post(
            f"{API_URL}/face/identify",
            json={"image": test_image_b64}
        )
        elapsed = (time.time() - start) * 1000  # ms
        times.append(elapsed)
    
    avg_time = sum(times) / len(times)
    print(f"User {user_id}: Avg prediction time = {avg_time:.2f}ms")
    return avg_time

# Test user dengan averaging vs save_all
averaging_user = benchmark_prediction(1, test_image)
saveall_user = benchmark_prediction(2, test_image)

print(f"\nImprovement: {saveall_user / averaging_user:.2f}x faster")
```

---

## 🎯 Next Actions

1. **Test dengan 5-10 users** menggunakan metode averaging
2. **Compare accuracy** dengan user yang pakai save_all
3. **Monitor database size** seiring bertambahnya user
4. **Measure prediction latency** improvement
5. **Document findings** untuk evaluasi

---

**Happy Testing!** 🚀

Jika ada issues atau questions, refer to:
- `PILIHAN_STRATEGI.md` - Strategy documentation
- `CHANGELOG_OPTIMIZATION.md` - Implementation details
