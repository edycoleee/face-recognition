# 📸 Face Prediction - File Upload Feature

## ✅ Fitur Baru

Halaman **Face Prediction** sekarang mendukung **2 mode input**:

### 📷 Mode Camera (Existing)
- Gunakan webcam untuk menangkap wajah
- Real-time capture
- Langsung predict setelah capture

### 📁 Mode Upload (NEW!)
- Upload file gambar dari komputer
- Drag & drop support
- Preview sebelum predict
- Mendukung JPG, PNG, JPEG
- Maksimal 10MB

## 🚀 Cara Menggunakan

### Mode Camera
1. Klik tombol **"📷 Camera"**
2. Klik **"Start Camera"**
3. Posisikan wajah di depan kamera
4. Klik **"🔍 Capture & Predict"**
5. Lihat hasil identifikasi

### Mode Upload
1. Klik tombol **"📁 Upload File"**
2. **Cara 1**: Klik area upload untuk memilih file
3. **Cara 2**: Drag & drop file gambar ke area upload
4. Preview gambar akan muncul
5. Klik **"🔍 Predict Face"**
6. Lihat hasil identifikasi

## 📁 File Baru

### Frontend Components
```
frontend/src/
├── components/FacePrediction/
│   ├── FileUploadSection.jsx      (NEW)
│   ├── FileUploadSection.css      (NEW)
│   └── PredictionResults.jsx      (Updated)
├── hooks/
│   └── useFileUpload.js           (NEW)
└── pages/
    ├── FacePrediction.jsx         (Updated)
    └── FacePrediction.css         (Updated)
```

## ✨ Fitur Upload

- ✅ **Drag & Drop** - Tarik dan lepas file gambar
- ✅ **Click to Select** - Klik untuk membuka file picker
- ✅ **Image Preview** - Lihat gambar sebelum predict
- ✅ **File Validation** - Validasi tipe dan ukuran file
- ✅ **Error Handling** - Pesan error yang jelas
- ✅ **File Info** - Tampilkan nama dan ukuran file
- ✅ **Remove File** - Hapus file dan pilih ulang

## 🔧 Technical Details

### API Endpoint
Menggunakan endpoint yang sama dengan camera:
```
POST /api/identify/
```

Payload:
```json
{
  "image": "data:image/jpeg;base64,...",
  "threshold": 0.6
}
```

### File Processing
1. User select file (drag/drop or click)
2. Validate file type and size
3. Convert to base64 using FileReader
4. Send to API
5. Display results

### Validasi File
- **Type**: Hanya file gambar (JPG, PNG, JPEG)
- **Size**: Maksimal 10MB
- **Format**: Otomatis convert ke base64

## 🎨 User Interface

### Mode Selector
```
┌─────────────┬──────────────┐
│ 📷 Camera   │ 📁 Upload    │
└─────────────┴──────────────┘
```
- Toggle antara camera dan upload
- Active mode ditandai dengan warna hijau

### Upload Area (Empty)
```
┌────────────────────────────┐
│           📁               │
│  Click to select or        │
│  drag & drop an image      │
│                            │
│  Supports: JPG, PNG        │
│  Max: 10MB                 │
└────────────────────────────┘
```

### Upload Area (With File)
```
┌────────────────────────────┐
│    [Preview Image]         │
│                            │
│  📄 photo.jpg             │
│  245.67 KB                 │
│                            │
│  [✕ Remove]               │
└────────────────────────────┘
```

## 📱 Compatibility

✅ Chrome, Firefox, Safari, Edge
✅ Desktop & Tablet
✅ Responsive design
✅ Modern browsers only

## 🔄 Workflow Comparison

### Camera Mode
```
Start Camera → Capture → Predict → Results
```

### Upload Mode
```
Select File → Preview → Predict → Results
```

Kedua mode menggunakan API yang sama dan menghasilkan hasil yang identik!

## 🐛 Error Handling

- File terlalu besar → Alert message
- File bukan gambar → Alert message
- Gagal convert base64 → Error message
- API error → Error message di results
- No file selected → Error message

## 💡 Tips

1. **Kualitas Gambar**: Gunakan gambar dengan pencahayaan baik
2. **Ukuran Wajah**: Pastikan wajah cukup besar dan jelas
3. **Satu Wajah**: Pastikan hanya ada satu wajah di gambar
4. **Format**: JPG biasanya lebih kecil dari PNG
5. **Switch Mode**: Bisa switch mode kapan saja

## 📊 Testing

Telah ditest untuk:
- ✅ Upload JPG file
- ✅ Upload PNG file
- ✅ Drag & drop
- ✅ File validation (type & size)
- ✅ Switch between modes
- ✅ API integration
- ✅ Error handling
- ✅ Reset functionality

---

**Status**: ✅ Ready to Use
**Backend Changes**: None (menggunakan API existing)
**Breaking Changes**: None
**Backward Compatible**: Yes

Selamat mencoba! 🎉
