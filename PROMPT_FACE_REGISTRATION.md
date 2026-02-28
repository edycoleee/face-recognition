# PROMPT: Halaman Face Registration

## Tujuan

Buat halaman **Face Registration** berbasis React yang memungkinkan admin mendaftarkan data wajah seorang user ke database. Halaman ini dapat diakses via route `/users/:userId/register-face` dengan dua mode:

- **`register`** — pendaftaran wajah pertama kali untuk user baru
- **`update`** — menambahkan lebih banyak gambar wajah ke dataset user yang sudah ada

Halaman ini mendukung tiga metode input gambar: **kamera langsung**, **upload satu gambar**, dan **upload banyak gambar sekaligus**. Setiap gambar divalidasi ke backend sebelum disimpan. Setelah minimal 5 gambar terkumpul, user dapat menekan tombol submit untuk mendaftarkan semua gambar sekaligus ke database.

---

## Struktur Data (Gelar Data)

### Data dari URL / Route

| Sumber | Nama | Tipe | Keterangan |
|--------|------|------|-----------|
| `useParams()` | `userId` | `string` | ID user yang wajahnya akan didaftarkan |
| `useSearchParams()` | `mode` | `'register' \| 'update'` | Default `'register'` |

### State Utama di `FaceRegistration.jsx`

| State | Tipe | Default | Keterangan |
|-------|------|---------|-----------|
| `user` | `object \| null` | `null` | Data user: `{ id, name, email, ... }` |
| `loading` | `boolean` | `false` | True saat submit ke backend |
| `error` | `string \| null` | `null` | Pesan error submit |
| `currentStatus` | `string` | `''` | Pesan status per aksi (capture, validasi, dll) |
| `existingFaceCount` | `number` | `0` | Jumlah embedding wajah yang sudah ada (mode update) |
| `inputMethod` | `'camera' \| 'upload-single' \| 'upload-multiple'` | `'camera'` | Metode input yang dipilih |

### Data Captures (dari `useCapture`)

```javascript
// Setiap item dalam array captures:
{
  id: 1708900000000,          // Date.now() sebagai unique key
  image: 'data:image/jpeg;base64,...',  // base64 JPEG
  faceData: {
    bbox: [x1, y1, x2, y2],   // bounding box wajah dari backend
    confidence: 0.98,           // confidence score deteksi wajah
    // field tambahan dari backend validate
  },
  timestamp: '10:23:45'        // waktu capture (toLocaleTimeString)
}
```

### Response API

#### `GET /api/users/:userId`
```json
{
  "success": true,
  "data": { "id": 3, "name": "Budi Santoso", "email": "budi@example.com" }
}
```

#### `POST /api/face/validate`
```json
{
  "success": true,
  "message": "Face is valid",
  "data": {
    "bbox": [120, 80, 320, 350],
    "confidence": 0.98,
    "face_width": 200,
    "face_height": 270
  }
}
```

#### `GET /api/face/users/:userId/embeddings`
```json
{
  "success": true,
  "data": { "user_id": 3, "embeddings_count": 12 }
}
```

#### `POST /api/face/users/:userId/register`
```json
// Request body:
{ "images": ["data:image/jpeg;base64,...", ...] }

// Response sukses:
{
  "success": true,
  "message": "Registered 10 faces",
  "data": { "successful": 10, "failed": 0 }
}
```

---

## Alur Lengkap (Flow)

### Inisialisasi Halaman

```
Route: /users/3/register-face?mode=register
           │
           ├─ useParams() → userId = "3"
           ├─ useSearchParams() → mode = "register"
           ├─ useEffect:
           │    ├─ faceApi.getUser(userId) → setUser(data)
           │    ├─ jika mode === 'update':
           │    │    └─ faceApi.getExistingFaceCount(userId) → setExistingFaceCount(n)
           │    └─ cleanup: camera.stopCamera()
           └─ Render halaman
```

### Alur Mode Kamera (Input Method: Camera)

```
User klik "📷 Camera Capture"
  │
  ├─ setInputMethod('camera')
  ├─ Pilih target: 5 gambar (cepat) atau 10 gambar (akurat)
  │    └─ capture.setTargetCaptures(5 atau 10)
  │
  ├─ User klik "Start Camera"
  │    └─ camera.startCamera()
  │         ├─ getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
  │         ├─ video.srcObject = stream
  │         └─ play()
  │
  ├─ [Overlay Canvas aktif]
  │    └─ useOvalGuide: requestAnimationFrame loop
  │         ├─ drawImageData: overlay hitam semi-transparan
  │         ├─ "cut out" ellipse di tengah (destination-out)
  │         └─ gambar border oval:
  │              - Cyan (#00ffff) jika wajah belum dalam oval
  │              - Hijau (#00ff00) jika wajah sudah dalam posisi
  │
  ├─ Pilih mode capture:
  │    ├─ [Manual Mode] → Klik tombol "📸 Capture"
  │    │    └─ handleCapture()
  │    └─ [Auto Mode] → Klik "Auto Capture (N pics)"
  │         └─ capture.startAutoCapture(handleCapture)
  │              └─ Eksekusi handleCapture() setiap 2000ms
  │
  └─ handleCapture():
       ├─ [1] camera.captureFrame()
       │        └─ canvas.drawImage(video) → toDataURL('image/jpeg', 0.95)
       ├─ [2] validateFace(imageData) → POST /api/face/validate
       │        ├─ SUCCESS: dapat faceData (bbox, confidence)
       │        └─ FAILED: tampilkan pesan, skip
       ├─ [3] checkFacePosition(faceData, canvas.width, canvas.height)
       │        ├─ Hitung apakah titik tengah bbox ada di dalam ellipse
       │        ├─ TRUE: lanjut capture
       │        └─ FALSE: "⚠️ Move your face inside the oval guide"
       ├─ [4] capture.addCapture(imageData, faceData)
       │        └─ Tambah ke array captures + sync ke capturesRef
       └─ [5] Jika captures.length >= targetCaptures AND mode === 'auto':
                └─ Auto submit setelah 1000ms
```

### Alur Upload Gambar

```
User klik "🖼️ Upload Single Image" atau "📁 Upload Multiple Images"
  │
  ├─ setInputMethod('upload-single' atau 'upload-multiple')
  ├─ User klik tombol "📂 Choose Image(s)"
  │    └─ handleUploadClick(multiple=false/true)
  │         └─ fileInputRef.current.click()
  │
  ├─ <input type="file"> onChange → handleFileUpload(event)
  │    ├─ Array.from(event.target.files)
  │    └─ Loop setiap file:
  │         ├─ FileReader.readAsDataURL(file) → base64
  │         ├─ validateFace(imageData) → POST /api/face/validate
  │         ├─ SUCCESS: capture.addCapture(imageData, faceData)
  │         └─ FAILED: tampilkan warning, lanjut ke file berikutnya
  └─ Reset input: fileInputRef.current.value = ''
```

### Alur Submit

```
Tombol "Register N Faces" muncul jika captures.length >= 5
  │
  └─ handleSubmit(isAuto = false)
       ├─ Ambil captures (dari state atau capturesRef jika auto)
       ├─ setLoading(true)
       ├─ faceApi.registerFaces(userId, images[])
       │    └─ POST /api/face/users/:userId/register { images: [...] }
       ├─ SUCCESS:
       │    ├─ setCurrentStatus('✅ Registered N faces!')
       │    └─ setTimeout 1500ms → navigate('/users')
       └─ FAILED:
            ├─ setError(data.message)
            └─ setLoading(false)
```

---

## Teknologi

| Teknologi | Keterangan |
|-----------|-----------|
| **React 18** | Functional components + Hooks |
| **React Router DOM v6** | `useParams`, `useSearchParams`, `useNavigate` |
| **Vite** | Build tool, `VITE_API_URL` via env |
| **navigator.mediaDevices** | Web API kamera, `getUserMedia` |
| **Canvas API (2D)** | Capture frame + oval guide via `requestAnimationFrame` |
| **FileReader API** | Baca file gambar dari disk → base64 |
| **Fetch API** | HTTP ke backend Flask |
| **CSS Grid** | Layout 2-kolom: kamera kiri, captures kanan |
| **Custom Hooks** | `useCamera`, `useCapture`, `useFaceValidation`, `useOvalGuide` |

### Env Variable
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Struktur File

```
frontend/src/
├── pages/
│   ├── FaceRegistration.jsx         # Halaman utama, orchestrator
│   └── FaceRegistration.css         # Semua style halaman ini
├── hooks/
│   ├── useCamera.js                  # Start/stop/capture kamera
│   ├── useCapture.js                 # Manajemen array captures + auto mode
│   ├── useFaceValidation.js          # Validasi wajah + check posisi oval
│   └── useOvalGuide.js               # Canvas overlay animasi oval
├── components/
│   └── FaceRegistration/
│       ├── CameraSection.jsx         # Video + canvas overlay
│       ├── CameraControls.jsx        # Tombol manual/auto/stop
│       └── CaptureGrid.jsx           # Grid thumbnail hasil capture
└── services/
    └── faceApi.js                    # Semua panggilan API wajah
```

---

## Custom Hooks Detail

### `useCamera.js`

```javascript
// Sama dengan useCamera di face login (lihat PROMPT_FRONTEND_LOGIN.MD)
// Ekspor: { videoRef, cameraActive, error, startCamera, stopCamera, captureFrame }

// captureFrame() — capture satu frame sebagai base64 JPEG
const captureFrame = useCallback(() => {
  const video = videoRef.current
  if (!video?.videoWidth || !video?.videoHeight) return null
  const canvas = document.createElement('canvas')
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.95)
}, [])
```

---

### `useCapture.js`

```javascript
// Manajemen array gambar yang sudah di-capture
// AUTO_INTERVAL_MS = 2000 (capture tiap 2 detik pada auto mode)

export function useCapture(initialTargetCaptures = 10) {
  const [captures, setCaptures] = useState([])
  const [captureMode, setCaptureMode] = useState('manual')
  const [isCapturing, setIsCapturing] = useState(false)
  const [autoInterval, setAutoInterval] = useState(null)
  const [targetCaptures, setTargetCaptures] = useState(initialTargetCaptures)
  const capturesRef = useRef([])  // Sync dari captures untuk akses di interval

  // Sync state → ref agar setInterval bisa baca nilai terkini
  useEffect(() => { capturesRef.current = captures }, [captures])

  // Auto-stop ketika target tercapai
  useEffect(() => {
    if (captures.length >= targetCaptures && autoInterval) stopAutoCapture()
  }, [captures.length, targetCaptures, autoInterval])

  const addCapture = useCallback((imageData, faceData) => {
    const item = {
      id: Date.now(),
      image: imageData,
      faceData,
      timestamp: new Date().toLocaleTimeString()
    }
    setCaptures(prev => [...prev, item])
    return item
  }, [])

  const startAutoCapture = useCallback((captureFunction) => {
    if (autoInterval) return
    setCaptureMode('auto')
    captureFunction()  // Langsung capture pertama kali
    const interval = setInterval(captureFunction, AUTO_INTERVAL_MS)
    setAutoInterval(interval)
  }, [autoInterval])

  const stopAutoCapture = useCallback(() => {
    if (autoInterval) { clearInterval(autoInterval); setAutoInterval(null) }
  }, [autoInterval])

  return {
    captures, capturesRef, captureMode, setCaptureMode,
    isCapturing, setIsCapturing, autoInterval, targetCaptures,
    setTargetCaptures, addCapture, deleteCapture, resetCaptures,
    startAutoCapture, stopAutoCapture
  }
}
```

**Catatan penting `useCapture`:**
- `capturesRef` — wajib untuk membaca jumlah captures terkini di dalam `setInterval`, karena closure di dalam interval menangkap nilai stale dari state
- `stopAutoCapture()` dipanggil otomatis via `useEffect` saat `captures.length >= targetCaptures`
- `isAuto` di `handleSubmit`: gunakan `capturesRef.current` bukan `captures` karena saat submit dari auto mode state mungkin belum ter-update

---

### `useFaceValidation.js`

```javascript
// Validasi satu gambar ke backend + cek posisi wajah dalam oval

export function useFaceValidation() {
  const [faceInPosition, setFaceInPosition] = useState(false)

  // Kirim gambar ke POST /api/face/validate
  const validateFace = useCallback(async (imageData) => {
    const response = await fetch(`${API_BASE_URL}/face/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    })
    return await response.json()
    // Returns: { success, message, data: { bbox, confidence, ... } }
  }, [])

  // Cek apakah titik tengah bbox wajah ada di dalam ellipse guide
  // Oval: centerX = W/2, centerY = H/2, radiusX = W*0.30, radiusY = H*0.40
  // Formula: (dx/radiusX)² + (dy/radiusY)² <= 1
  const checkFacePosition = useCallback((faceData, canvasWidth, canvasHeight) => {
    const [x1, y1, x2, y2] = faceData.bbox
    const faceCenterX = (x1 + x2) / 2
    const faceCenterY = (y1 + y2) / 2
    const dx = (faceCenterX - canvasWidth / 2)  / (canvasWidth  * 0.30)
    const dy = (faceCenterY - canvasHeight / 2) / (canvasHeight * 0.40)
    const isInOval = (dx * dx + dy * dy) <= 1
    setFaceInPosition(isInOval)
    return isInOval
  }, [])

  return { faceInPosition, validateFace, checkFacePosition }
}
```

---

### `useOvalGuide.js`

```javascript
// Canvas overlay dengan oval yang beranimasi menggunakan requestAnimationFrame
// Teknik: gambar overlay hitam penuh, lalu "potong" elips dengan destination-out

export function useOvalGuide(overlayCanvasRef, videoRef, cameraActive, faceInPosition) {
  useEffect(() => {
    if (!cameraActive || !overlayCanvasRef.current || !videoRef.current) return

    let animationId

    const drawOvalGuide = () => {
      const video  = videoRef.current
      const canvas = overlayCanvasRef.current
      if (!video?.videoWidth) { animationId = requestAnimationFrame(drawOvalGuide); return }

      // Samakan ukuran canvas dengan resolusi video
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight

      const ctx     = canvas.getContext('2d')
      const centerX = canvas.width  / 2
      const centerY = canvas.height / 2
      const radiusX = canvas.width  * 0.30
      const radiusY = canvas.height * 0.40

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Layer 1: overlay hitam semi-transparan
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Layer 2: potong area oval → wajah terlihat jelas
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      ctx.fill()

      // Layer 3: border oval berwarna
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      ctx.strokeStyle = faceInPosition ? '#00ff00' : '#00ffff'  // hijau atau cyan
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      ctx.stroke()

      // Layer 4: teks panduan
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Position your face inside the oval', centerX, 40)
      ctx.font = '14px Arial'
      ctx.fillText('Look straight at the camera', centerX, canvas.height - 30)

      animationId = requestAnimationFrame(drawOvalGuide)
    }

    drawOvalGuide()
    return () => { if (animationId) cancelAnimationFrame(animationId) }
  }, [cameraActive, faceInPosition, overlayCanvasRef, videoRef])
}
```

**Catatan penting `useOvalGuide`:**
- `destination-out` compositing mode memotong piksel yang digambar, menghasilkan "lubang" transparan berbentuk oval di atas overlay hitam
- Canvas harus di-resize setiap frame (`canvas.width = video.videoWidth`) agar sesuai resolusi video
- Canvas diposisikan `position: absolute; top: 0; left: 0; width: 100%; height: 100%` dengan `pointer-events: none` agar tidak menghalangi klik
- `faceInPosition` sebagai dependency useEffect akan memicu re-run (dan perubahan warna border) saat nilai berubah

---

## API Service: `faceApi.js`

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const faceApi = {
  // Ambil data user berdasarkan ID
  async getUser(userId) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`)
    return await res.json()
  },

  // Ambil jumlah embedding wajah yang sudah ada (mode update)
  async getExistingFaceCount(userId) {
    const res = await fetch(`${API_BASE_URL}/face/users/${userId}/embeddings`)
    return await res.json()
    // Returns: { success, data: { embeddings_count: 12 } }
  },

  // Daftarkan array gambar wajah ke database
  async registerFaces(userId, images) {
    const res = await fetch(`${API_BASE_URL}/face/users/${userId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images })  // images: string[] base64
    })
    return await res.json()
    // Returns: { success, message, data: { successful: 10, failed: 0 } }
  }
}
```

### Tabel Semua Endpoint

| Method | URL | Body | Response |
|--------|-----|------|----------|
| `GET` | `/api/users/:userId` | — | `{ success, data: { id, name, email } }` |
| `GET` | `/api/face/users/:userId/embeddings` | — | `{ success, data: { embeddings_count } }` |
| `POST` | `/api/face/validate` | `{ image }` | `{ success, data: { bbox, confidence } }` |
| `POST` | `/api/face/users/:userId/register` | `{ images[] }` | `{ success, data: { successful, failed } }` |

---

## Komponen Anak

### `CameraSection.jsx`
```jsx
// Menampilkan <video> + <canvas overlay>
// Props: { cameraActive, faceInPosition, videoRef, onStartCamera }
// Menggunakan useOvalGuide(overlayCanvasRef, videoRef, cameraActive, faceInPosition)

// Penting: canvas overlay harus ABSOLUTE di atas video:
// style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:10 }}
```

### `CameraControls.jsx`
```jsx
// Tombol kontrol mode capture
// Props: { captureMode, isCapturing, capturesCount, targetCaptures,
//          autoInterval, onManualMode, onAutoCapture, onStopAuto,
//          onCapture, onStopCamera }
//
// Logika tombol:
// - Manual mode button: disabled jika isCapturing || capturesCount >= targetCaptures
// - Auto mode button: disabled jika autoInterval sudah berjalan
// - "Stop Auto" hanya muncul jika autoInterval !== null
// - "📸 Capture (N/M)" hanya muncul jika captureMode === 'manual' && !autoInterval
```

### `CaptureGrid.jsx`
```jsx
// Grid thumbnail gambar yang sudah di-capture
// Props: { captures, targetCaptures, loading, onDeleteCapture, onResetCaptures }
//
// Setiap tile menampilkan:
// - <img src={capture.image} /> → thumbnail wajah
// - timestamp (capture.timestamp)
// - confidence score (capture.faceData.confidence * 100)%
// - tombol ✕ untuk hapus capture individual (disabled saat loading)
```

---

## CSS Detail: `FaceRegistration.css`

### Prinsip Visual

- Background halaman: **putih / abu-abu terang**, bukan gelap (berbeda dari popup login)
- Layout utama: **CSS Grid 2 kolom** (`grid-template-columns: 1fr 1fr`) untuk desktop; stack ke 1 kolom di `max-width: 1024px`
- Lebar maksimal seluruh konten: `1400px`
- Accent color: **hijau** `#4CAF50` / `#28a745` untuk aksi positif
- Tombol berbahaya: **merah** `#dc3545`
- Spinner loading: biru `#1976d2`

### CSS Lengkap

```css
/* ═══ ROOT PAGE ════════════════════════════════════════════════════ */
.face-registration-page {
  width: 100%;
  min-height: 100vh;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f5f6fa;
}

/* ═══ TOMBOL BACK ═══════════════════════════════════════════════════ */
.back-button {
  align-self: flex-start;
  margin-bottom: 1.5rem;
  padding: 0.6rem 1.2rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.2s;
  width: 100%;
  max-width: 1400px;
}
.back-button:hover { background: #5a6268; }

/* ═══ HEADER ════════════════════════════════════════════════════════ */
.registration-header {
  text-align: center;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 1400px;
}
.registration-header h1 {
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}
.user-info { font-size: 1.1rem; color: #666; margin-bottom: 0.5rem; }

/* Badge jumlah embedding yang sudah ada */
.existing-count {
  font-size: 0.95rem;
  color: #17a2b8;
  padding: 0.5rem 1rem;
  background: #e3f2fd;
  border-radius: 6px;
  display: inline-block;
}

/* ═══ LAYOUT KONTEN (2 kolom) ═══════════════════════════════════════ */
.registration-content {
  width: 100%;
  max-width: 1400px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

/* ═══ PILIHAN METODE INPUT ══════════════════════════════════════════ */
.input-method-selector {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  width: 100%;
  max-width: 1400px;
}
.input-method-selector h3 {
  margin: 0 0 15px;
  color: #333;
  font-size: 18px;
}
.method-buttons { display: flex; gap: 12px; flex-wrap: wrap; }

.method-btn {
  flex: 1;
  min-width: 180px;
  padding: 15px 20px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}
.method-btn:hover {
  border-color: #4CAF50;
  background: #f0f9f0;
  transform: translateY(-2px);
}
.method-btn.active {
  border-color: #4CAF50;
  background: #4CAF50;
  color: white;
  box-shadow: 0 4px 12px rgba(76,175,80,0.3);
}

/* ═══ UPLOAD SECTION ════════════════════════════════════════════════ */
.upload-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  width: 100%;
  max-width: 1400px;
}
.upload-area {
  border: 3px dashed #ddd;
  border-radius: 12px;
  padding: 50px 30px;
  text-align: center;
  background: #fafafa;
  transition: all 0.3s ease;
}
.upload-area:hover { border-color: #4CAF50; background: #f0f9f0; }
.upload-icon { font-size: 64px; margin-bottom: 20px; }
.upload-area h3 { margin: 0 0 10px; color: #333; font-size: 20px; }
.upload-area p  { color: #666; margin: 0 0 25px; font-size: 14px; }

.btn-upload {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-upload:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76,175,80,0.3);
}
.btn-upload:disabled { background: #ccc; cursor: not-allowed; }

/* ═══ PILIHAN TARGET CAPTURES ═══════════════════════════════════════ */
.target-selection {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}
.target-selection h3 { margin: 0 0 15px; color: #333; font-size: 16px; font-weight: 600; }
.radio-group { display: flex; gap: 15px; flex-wrap: wrap; }

.radio-option {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}
.radio-option:hover {
  border-color: #4CAF50;
  background: #f0f9f0;
  transform: translateY(-2px);
}
.radio-option input[type="radio"] {
  margin-right: 12px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #4CAF50;
}
.radio-option input[type="radio"]:checked + span {
  font-weight: 600;
  color: #4CAF50;
}
.radio-option span { font-size: 15px; color: #333; transition: all 0.3s ease; }

/* Note: tidak bisa ganti target setelah ada captures */
.selection-note {
  margin-top: 12px;
  padding: 10px 15px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  font-size: 13px;
  color: #856404;
}

/* ═══ KAMERA ════════════════════════════════════════════════════════ */
.camera-section { display: flex; flex-direction: column; gap: 1rem; }

/* Container video + canvas overlay */
.camera-container {
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 4/3;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Canvas overlay HARUS absolute di atas video */
.camera-container .overlay-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 10;
}

.camera-placeholder { text-align: center; color: white; }
.camera-placeholder p { font-size: 4rem; margin-bottom: 1rem; }

.video-preview {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
}

.btn-start-camera {
  padding: 1rem 2rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
}
.btn-start-camera:hover { background: #0056b3; }

/* ═══ STATUS MESSAGE ════════════════════════════════════════════════ */
.status-message {
  padding: 1rem;
  background: #e9ecef;
  border-radius: 8px;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

/* ═══ KONTROL KAMERA ════════════════════════════════════════════════ */
.camera-controls { display: flex; flex-direction: column; gap: 1rem; }

.mode-buttons { display: flex; gap: 0.5rem; }
.mode-buttons button {
  flex: 1;
  padding: 0.75rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.mode-buttons button.active { background: #28a745; }
.mode-buttons button:hover:not(:disabled) { opacity: 0.9; }
.mode-buttons button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Tombol stop auto - merah */
.btn-stop { background: #dc3545 !important; }
.btn-stop:hover { background: #c82333 !important; }

/* Tombol capture utama - biru */
.btn-capture {
  padding: 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
}
.btn-capture:hover:not(:disabled) { background: #0056b3; }
.btn-capture:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-stop-camera {
  padding: 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
.btn-stop-camera:hover { background: #c82333; }

/* ═══ CAPTURE GRID ══════════════════════════════════════════════════ */
.captures-section { display: flex; flex-direction: column; gap: 1rem; }

.captures-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.captures-header h3 { font-size: 1.3rem; color: #2c3e50; }

.btn-reset {
  padding: 0.5rem 1rem;
  background: #ffc107;
  color: #000;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
.btn-reset:hover { background: #e0a800; }

/* Grid thumbnail: auto-fill kolom min 150px */
.captures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

/* Tiap tile captures */
.capture-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.capture-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}
.capture-info {
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}
.capture-time  { color: #666; }
.capture-score { color: #28a745; font-weight: 600; }

/* Tombol hapus di sudut kanan atas setiap tile */
.btn-delete-capture {
  position: absolute;
  top: 0.5rem; right: 0.5rem;
  width: 28px; height: 28px;
  background: rgba(220,53,69,0.9);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-delete-capture:hover { background: rgba(200,35,51,0.95); }

/* ═══ LOADING & ERROR ═══════════════════════════════════════════════ */
.loading-message {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
}
.loading-message .spinner {
  width: 40px; height: 40px;
  margin: 0 auto 1rem;
  border: 4px solid #bbdefb;
  border-top: 4px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border-radius: 6px;
  border: 1px solid #f5c6cb;
}

/* ═══ TOMBOL SUBMIT ══════════════════════════════════════════════════ */
/* Muncul saat captures.length >= 5 */
.btn-submit {
  padding: 1rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s;
}
.btn-submit:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40,167,69,0.3);
}
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

/* ═══ RESPONSIVE ════════════════════════════════════════════════════ */
/* Di bawah 1024px: 1 kolom, captures grid lebih pendek */
@media (max-width: 1024px) {
  .registration-content {
    grid-template-columns: 1fr;
  }
  .captures-grid {
    max-height: 400px;
  }
}

/* Di bawah 640px: method buttons stack vertikal */
@media (max-width: 640px) {
  .method-buttons { flex-direction: column; }
  .face-registration-page { padding: 1rem; }
  .registration-header h1 { font-size: 1.5rem; }
}
```

---

## Checklist Implementasi

- [ ] Route `/users/:userId/register-face` terdaftar di `App.jsx`
- [ ] `useParams()` mengambil `userId`, `useSearchParams()` mengambil `mode`
- [ ] `useEffect` fetch data user + face count (mode update) dengan cleanup `stopCamera()`
- [ ] `inputMethod` state mengontrol tampilan section (camera / upload-single / upload-multiple)
- [ ] `<input type="file">` hidden, di-trigger programatik via `fileInputRef.current.click()`
- [ ] `fileInputRef.current.multiple` diset `true/false` sebelum `.click()` sesuai mode
- [ ] `useOvalGuide` menggunakan `requestAnimationFrame` loop, di-cancel saat cleanup
- [ ] `destination-out` compositing untuk efek "lubang oval" di overlay
- [ ] Canvas overlay: `position: absolute`, `z-index: 10`, `pointer-events: none`
- [ ] `capturesRef` di-sync via `useEffect` agar `setInterval` dapat nilai terkini
- [ ] Auto-stop capture via `useEffect` yang watch `captures.length >= targetCaptures`
- [ ] `handleSubmit(isAuto)`: gunakan `capturesRef.current` saat `isAuto === true`
- [ ] Validasi wajah per gambar sebelum masuk ke array captures (manual, auto, maupun upload)
- [ ] Minimum 5 captures sebelum tombol submit muncul
- [ ] Setelah submit sukses: `setTimeout 1500ms → navigate('/users')`
- [ ] CSS Grid 2 kolom desktop, 1 kolom mobile (`max-width: 1024px`)
- [ ] `max-width: 1400px` pada semua section konten
