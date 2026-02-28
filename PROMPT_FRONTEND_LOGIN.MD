# PROMPT: Halaman Login dengan Face Recognition

## Tujuan

Buat halaman **Face Login** berbasis React yang memungkinkan user login menggunakan wajah (face recognition) tanpa mengetik password. Halaman ini tampil sebagai **popup window** (OAuth2-style) yang dibuka oleh halaman parent, menangkap gambar wajah dari kamera, mengirim ke backend, dan mengembalikan **JWT/UUID token** ke parent window melalui `postMessage`.

Tersedia dua mode:
- **1:1 Face Verification** — user input email dulu, lalu verifikasi wajah sesuai email tersebut
- **1:N Face Identification** — tidak perlu email, sistem mengidentifikasi siapa user dari database

---

## Alur Lengkap (Flow)

### Mode 1:1 Face Verification (`/login-popup?email=...`)

```
Parent Window
  │
  ├─ User input email di form login
  ├─ Klik "Login dengan Wajah"
  ├─ window.open('/login-popup?email=user@email.com&threshold=0.6')
  │
  └─ Popup Window (/login-popup)
       │
       ├─ [1] Baca email dari URL query parameter
       ├─ [2] startCamera() → getUserMedia({ video: { facingMode: 'user' } })
       ├─ [3] Video stream tampil di <video> element
       ├─ [4] Oval guide overlay ditampilkan di atas video
       ├─ [5] User klik tombol "Capture & Verify"
       ├─ [6] captureFrame() → canvas.drawImage(video) → toDataURL('image/jpeg', 0.95)
       ├─ [7] POST /api/auth/login-face { email, image: base64, threshold }
       │        └─ Backend: decode image → face embedding → 1:1 compare dengan dataset user
       ├─ [8a] Jika SUCCESS (match: true, confidence > threshold):
       │         ├─ Terima { token, user_id, name, email, expires_at, confidence }
       │         ├─ Simpan token ke localStorage parent (via postMessage)
       │         ├─ status = 'success', tampilkan animasi centang
       │         └─ setTimeout 1500ms → window.close()
       └─ [8b] Jika FAILED:
                ├─ Tampilkan pesan error + confidence score
                ├─ status = 'failed'
                └─ Tombol "Coba Lagi" → reset ke step [3]
```

### Mode 1:N Face Identification (`/login-popup-1n`)

```
Parent Window
  │
  ├─ Klik "Masuk Tanpa Email"
  ├─ window.open('/login-popup-1n')
  │
  └─ Popup Window (/login-popup-1n)
       │
       ├─ [1] startCamera() otomatis saat mount
       ├─ [2] User klik "Identifikasi Wajah"
       ├─ [3] captureFrame() → base64 image
       ├─ [4] POST /api/identify/ { image: base64, threshold }
       │        └─ Backend: scan seluruh database → temukan siapa user ini
       ├─ [5] Jika identified: ambil email dari hasil identifikasi
       ├─ [6] POST /api/auth/login-face { email (dari step 5), image, threshold }
       │        └─ Backend: 1:1 verification ulang untuk generate token
       ├─ [7a] SUCCESS → kirim token ke parent, tutup popup
       └─ [7b] FAILED → tampilkan pesan, retry
```

### Komunikasi Parent ↔ Popup (postMessage)

```javascript
// Parent membuka popup
const popup = window.open('/login-popup?email=user@example.com', 'faceLogin', 
  'width=500,height=700,resizable=no')

// Parent mendengarkan hasil
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return
  if (event.data.type === 'FACE_LOGIN_RESULT') {
    if (event.data.success) {
      const { token, user_id, name, email, expires_at } = event.data.data
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user', JSON.stringify({ user_id, name, email }))
      navigate('/dashboard')
    }
  }
})

// Popup mengirim hasil ke parent
window.opener.postMessage({
  type: 'FACE_LOGIN_RESULT',   // atau 'FACE_LOGIN_1N_RESULT'
  success: true,
  data: { token, user_id, name, email, expires_at, confidence },
  message: 'Face login successful'
}, window.location.origin)
```

---

## Teknologi

| Teknologi | Versi / Keterangan |
|-----------|-------------------|
| **React** | 18+ dengan functional components + Hooks |
| **Vite** | Build tool, env variable via `VITE_API_URL` |
| **React Router DOM** | v6, route `/login-popup` dan `/login-popup-1n` |
| **navigator.mediaDevices** | Web API bawaan browser untuk akses kamera |
| **Canvas API** | `HTMLCanvasElement` untuk capture frame dari video |
| **Fetch API** | HTTP request ke backend Flask, JSON body |
| **postMessage API** | Komunikasi cross-window (popup → parent) |
| **CSS Modules / Plain CSS** | Satu file `.css` per komponen |
| **localStorage** | Simpan token dan user info di sisi client |

### Environment Variables (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Struktur File

```
frontend/src/
├── pages/
│   ├── FaceLoginPopup.jsx          # Mode 1:1 (dengan email)
│   ├── FaceLoginPopup.css          # CSS khusus popup
│   ├── LoginPopup1N.jsx            # Mode 1:N (tanpa email)
│   └── Login.jsx                   # Login page utama (trigger buka popup)
├── hooks/
│   └── useCamera.js                # Custom hook: start/stop/capture kamera
├── services/
│   └── authApi.js                  # Fungsi API: loginWithFace, loginWithPassword, verifyToken
└── components/
    ├── ProtectedRoute.jsx           # Guard route yang butuh auth
    └── StatusMessage.jsx            # Komponen tampilan pesan status
```

---

## Custom Hook: `useCamera`

```javascript
// src/hooks/useCamera.js
import { useState, useRef, useCallback } from 'react'

export function useCamera() {
  const videoRef = useRef(null)       // ref ke <video> element
  const streamRef = useRef(null)      // ref ke MediaStream aktif
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'          // kamera depan
        }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        // Tunggu metadata loaded sebelum play
        await new Promise((resolve, reject) => {
          videoRef.current.onloadedmetadata = () =>
            videoRef.current.play().then(resolve).catch(reject)
        })
        setCameraActive(true)
      }
    } catch (err) {
      setError('Camera access denied: ' + err.message)
      setCameraActive(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }, [])

  // Capture satu frame → base64 JPEG
  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video?.videoWidth || !video?.videoHeight) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.95)  // kualitas 95%
  }, [])

  return { videoRef, cameraActive, error, startCamera, stopCamera, captureFrame }
}
```

### Catatan Penting Control Kamera

- **`getUserMedia` constraints**: selalu set `facingMode: 'user'` agar pakai kamera depan. Pada mobile, gunakan `{ ideal: 'user' }`.
- **`onloadedmetadata`**: wajib tunggu event ini sebelum memanggil `.play()`, agar video tidak blank.
- **`streamRef`**: simpan stream di `useRef`, bukan `useState`, agar tidak trigger re-render saat stop.
- **Cleanup**: selalu panggil `stopCamera()` di `useEffect` return function untuk mencegah memory leak dan kamera nyala terus.
- **`autoPlay muted playsInline`**: ketiga atribut ini wajib ada di `<video>` agar autoplay bekerja di semua browser (terutama iOS Safari dan Chrome mobile).
- **`toDataURL('image/jpeg', 0.95)`**: JPEG lebih ringan dari PNG untuk dikirim ke backend. Kualitas 0.95 menjaga detail wajah.
- **Canvas sementara**: gunakan `document.createElement('canvas')` (tidak perlu di DOM) untuk capture, lebih efisien.
- **Error handling**: tangani `NotAllowedError` (izin ditolak), `NotFoundError` (tidak ada kamera), `OverconstrainedError` (constraint tidak didukung).

---

## State Machine Popup

```
                    ┌──────────┐
                    │   idle   │ ◄─────────────────────────┐
                    └────┬─────┘                            │
                         │ startCamera() berhasil           │ handleRetry()
                         ▼                                  │
                  ┌─────────────┐                           │
                  │  capturing  │                           │
                  └──────┬──────┘                           │
                         │ captureAndVerify()               │
                         ▼                                  │
                  ┌─────────────┐                           │
                  │  verifying  │                           │
                  └──┬──────┬───┘                           │
                     │      │                               │
              success│      │failed                         │
                     ▼      ▼                               │
              ┌────────┐  ┌────────┐  ──────────────────────┘
              │success │  │ failed │
              └────────┘  └────────┘
                   │
        postMessage + window.close()
```

State values: `'idle'` | `'capturing'` | `'verifying'` | `'success'` | `'failed'`

---

## API Service: `authApi.js`

```javascript
// src/services/authApi.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const apiFetch = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`)
  return data
}

// 1:1 Face Verification Login
export const loginWithFace = async (email, base64Image, threshold = 0.6) => {
  return apiFetch('/auth/login-face', {
    method: 'POST',
    body: JSON.stringify({ email, image: base64Image, threshold }),
  })
}

// Verify token masih valid
export const verifyToken = async (token) => {
  return apiFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
```

### Endpoint Backend

| Method | URL | Body | Response sukses |
|--------|-----|------|-----------------|
| `POST` | `/api/auth/login-face` | `{ email, image, threshold }` | `{ success, data: { token, user_id, name, email, expires_at, confidence } }` |
| `POST` | `/api/identify/` | `{ image, threshold }` | `{ success, data: { identified, user_id, user_name, user_email, similarity_score } }` |
| `POST` | `/api/auth/verify` | `{ token }` | `{ success, data: { user_id, name, email } }` |
| `POST` | `/api/auth/logout` | `{ token }` | `{ success, message }` |

---

## Komponen JSX: `FaceLoginPopup.jsx`

```jsx
// src/pages/FaceLoginPopup.jsx
import { useState, useRef, useEffect } from 'react'
import { loginWithFace } from '../services/authApi'
import './FaceLoginPopup.css'

function FaceLoginPopup() {
  // ── State ──────────────────────────────────────────────────────────
  const [status, setStatus] = useState('idle')
  // 'idle' | 'capturing' | 'verifying' | 'success' | 'failed'
  const [message, setMessage] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [cameraActive, setCameraActive] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────
  const videoRef = useRef(null)
  const canvasRef = useRef(null)   // canvas hidden, untuk capture
  const streamRef = useRef(null)

  // ── URL Params ─────────────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search)
  const email = params.get('email')
  const threshold = parseFloat(params.get('threshold') || '0.6')

  // ── Lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (email) startCamera()
    else { setMessage('Email tidak ditemukan'); setStatus('failed') }
    return () => stopCamera()
  }, [])

  // ── Camera Control ─────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      videoRef.current.srcObject = stream
      streamRef.current = stream
      await new Promise((res, rej) => {
        videoRef.current.onloadedmetadata = () =>
          videoRef.current.play().then(res).catch(rej)
      })
      setCameraActive(true)
      setMessage('Arahkan wajah ke dalam oval')
    } catch (err) {
      setMessage('Izin kamera ditolak: ' + err.message)
      setStatus('failed')
      sendToParent({ success: false, message: err.message })
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  // ── Capture & Verify ───────────────────────────────────────────────
  const captureAndVerify = async () => {
    setStatus('capturing')
    setMessage('Mengambil gambar...')

    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const base64Image = canvas.toDataURL('image/jpeg', 0.95)

    setStatus('verifying')
    setMessage('Memverifikasi wajah...')

    try {
      const response = await loginWithFace(email, base64Image, threshold)
      if (!response.success) throw new Error(response.message || 'Verifikasi gagal')

      const { confidence: conf, token, name } = response.data
      setConfidence(conf)
      setStatus('success')
      setMessage(`✅ Login berhasil! Halo, ${name}!`)
      stopCamera()
      sendToParent({ success: true, data: response.data })
      setTimeout(() => window.close(), 1500)
    } catch (err) {
      setStatus('failed')
      setMessage('❌ ' + (err.message || 'Verifikasi gagal, coba lagi'))
    }
  }

  // ── postMessage ────────────────────────────────────────────────────
  const sendToParent = (payload) => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'FACE_LOGIN_RESULT', ...payload },
        window.location.origin
      )
    }
  }

  const handleCancel = () => {
    sendToParent({ success: false, message: 'Dibatalkan user' })
    window.close()
  }

  const handleRetry = () => {
    setStatus('idle')
    setMessage('Arahkan wajah ke dalam oval')
    setConfidence(0)
    if (!cameraActive) startCamera()
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="face-login-popup">
      {/* Header */}
      <div className="popup-header">
        <h2>🔐 Face Login</h2>
        <p className="email-display">{email}</p>
        <button onClick={handleCancel} className="btn-close">✕</button>
      </div>

      {/* Body */}
      <div className="popup-content">
        {/* Kamera */}
        <div className="camera-section">
          <div className="camera-container">
            {!cameraActive && status !== 'success' && (
              <div className="camera-placeholder">
                <p>📷</p>
                <p>Memulai kamera...</p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="video-preview"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {/* Oval Guide */}
            {cameraActive && status === 'idle' && (
              <div className="face-oval-overlay">
                <svg viewBox="0 0 100 100" className="oval-guide">
                  <ellipse cx="50" cy="50" rx="30" ry="40"
                    fill="none" stroke="white" strokeWidth="0.5"
                    strokeDasharray="5,5" opacity="0.8"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="status-section">
          {status === 'verifying' && (
            <div className="status-verifying">
              <div className="spinner" />
              <p>⏳ {message}</p>
            </div>
          )}
          {status === 'success' && (
            <div className="status-success">
              <div className="success-icon">✓</div>
              <p>{message}</p>
              <p className="confidence-score">
                Confidence: {(confidence * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {(status === 'idle' || status === 'capturing' || status === 'failed') && (
            <p className="status-text">{message}</p>
          )}
        </div>

        {/* Tombol */}
        <div className="popup-actions">
          {(status === 'idle' || status === 'capturing') && (
            <>
              <button
                onClick={captureAndVerify}
                disabled={!cameraActive || status === 'capturing'}
                className="btn-capture"
              >
                📸 Ambil Gambar & Verifikasi
              </button>
              <button onClick={handleCancel} className="btn-cancel">Batal</button>
            </>
          )}
          {status === 'verifying' && (
            <button disabled className="btn-capture">⏳ Memverifikasi...</button>
          )}
          {status === 'failed' && (
            <>
              <button onClick={handleRetry} className="btn-retry">🔄 Coba Lagi</button>
              <button onClick={handleCancel} className="btn-cancel">Batal</button>
            </>
          )}
          {status === 'success' && (
            <p className="redirect-msg">Jendela akan tertutup otomatis...</p>
          )}
        </div>

        <div className="threshold-info">
          <small>Threshold: {(threshold * 100).toFixed(0)}%</small>
        </div>
      </div>
    </div>
  )
}

export default FaceLoginPopup
```

---

## CSS Detail: `FaceLoginPopup.css`

### Prinsip Visual

- Background: **gradient ungu-biru** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Layout: **flexbox column** memenuhi `100vh`, tidak scroll (overflow hidden)
- Efek glassmorphism: `backdrop-filter: blur(10px)` + `rgba(255,255,255,0.2)` untuk overlay
- Animasi: fade-in pada mount, pulse pada oval, spin pada spinner, scale-in pada status sukses
- Warna teks: **putih** di atas gradient gelap
- Tombol: kontras tinggi, putih untuk primary, semi-transparan untuk secondary

### Struktur CSS Lengkap

```css
/* ═══ ROOT LAYOUT ═══════════════════════════════════════════════════ */
.face-login-popup {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow: hidden;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ═══ HEADER ════════════════════════════════════════════════════════ */
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;    /* untuk email-display absolute center */
}

.popup-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

/* Email badge di tengah header */
.email-display {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tombol X tutup popup */
.btn-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  line-height: 1;
  z-index: 1;
}
.btn-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

/* ═══ BODY CONTENT ══════════════════════════════════════════════════ */
.popup-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1.5rem;
  overflow-y: auto;
}

/* ═══ CAMERA SECTION ════════════════════════════════════════════════ */
.camera-section {
  width: 100%;
  max-width: 480px;
}

/* Kotak kamera dengan rasio 4:3 */
.camera-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
  background: rgba(0, 0, 0, 0.3);
}

/* Placeholder sebelum kamera aktif */
.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  gap: 0.5rem;
  font-size: 1rem;
}
.camera-placeholder p:first-child { font-size: 4rem; margin: 0; }

/* Video stream */
.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ═══ FACE OVAL OVERLAY ═════════════════════════════════════════════ */
/* SVG overlay di atas video sebagai panduan posisi wajah */
.face-oval-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;   /* tidak menghalangi interaksi */
}

.oval-guide {
  width: 100%;
  height: 100%;
}

/* Ellipse beranimasi pulse */
.oval-guide ellipse {
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
  animation: pulseOval 2s ease-in-out infinite;
}

@keyframes pulseOval {
  0%, 100% { opacity: 0.8; stroke: white; }
  50%       { opacity: 1;   stroke: #a5f3fc; }  /* biru muda saat pulse */
}

/* ═══ STATUS SECTION ════════════════════════════════════════════════ */
.status-section {
  width: 100%;
  max-width: 480px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.status-text {
  font-size: 0.95rem;
  opacity: 0.9;
  margin: 0;
}

/* Verifying: spinner + teks */
.status-verifying {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Spinner lingkaran berputar */
.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Success state */
.status-success {
  animation: fadeInScale 0.5s ease-out;
  text-align: center;
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 3px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  animation: checkmark 0.5s ease-out;
}

@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes checkmark {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}

.confidence-score {
  font-size: 0.9rem;
  opacity: 0.8;
  margin: 0.25rem 0 0;
}

/* ═══ ACTION BUTTONS ════════════════════════════════════════════════ */
.popup-actions {
  display: flex;
  gap: 1rem;
  width: 100%;
  max-width: 480px;
  flex-wrap: wrap;
}

/* Primary button (Capture) */
.btn-capture {
  flex: 1;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  background: white;
  color: #667eea;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  min-width: 180px;
}
.btn-capture:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
.btn-capture:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Secondary button (Cancel / Retry) */
.btn-cancel,
.btn-retry {
  flex: 1;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.5);
}
.btn-cancel:hover { background: rgba(255, 255, 255, 0.25); border-color: white; }

.btn-retry {
  background: rgba(251, 191, 36, 0.3);   /* kuning hangat untuk retry */
  color: white;
  border: 2px solid rgba(251, 191, 36, 0.7);
}
.btn-retry:hover { background: rgba(251, 191, 36, 0.45); }

/* ═══ THRESHOLD INFO ════════════════════════════════════════════════ */
.threshold-info {
  text-align: center;
  opacity: 0.6;
  font-size: 0.8rem;
}

.redirect-msg {
  text-align: center;
  opacity: 0.75;
  font-size: 0.9rem;
  padding: 1rem;
  width: 100%;
}

/* ═══ RESPONSIVE (mobile < 640px) ══════════════════════════════════ */
@media (max-width: 640px) {
  .popup-header   { padding: 0.75rem 1rem; }
  .popup-header h2 { font-size: 1.25rem; }

  .email-display {
    position: static;
    transform: none;
    width: 100%;
    text-align: center;
    margin-top: 0.5rem;
    font-size: 0.8rem;
  }

  .popup-content { padding: 1rem; gap: 1rem; }

  .popup-actions { flex-direction: column; }

  .btn-capture,
  .btn-cancel,
  .btn-retry { width: 100%; min-width: unset; }
}
```

---

## Token Management di Parent Window

```javascript
// src/pages/Login.jsx — bagian yang membuka popup dan mengelola token

const openFaceLoginPopup = (email) => {
  const width  = 500
  const height = 680
  const left   = (screen.width  - width)  / 2
  const top    = (screen.height - height) / 2

  const popup = window.open(
    `/login-popup?email=${encodeURIComponent(email)}&threshold=0.6`,
    'faceLogin',
    `width=${width},height=${height},left=${left},top=${top},resizable=no,scrollbars=no`
  )

  // Listener untuk menerima token dari popup
  const handleMessage = (event) => {
    if (event.origin !== window.location.origin) return
    if (event.data?.type !== 'FACE_LOGIN_RESULT') return

    if (event.data.success) {
      const { token, user_id, name, email, expires_at } = event.data.data

      // Simpan ke localStorage
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user', JSON.stringify({ user_id, name, email, expires_at }))

      // Hapus listener setelah selesai
      window.removeEventListener('message', handleMessage)

      // Redirect ke dashboard
      navigate('/dashboard')
    } else {
      console.warn('Face login failed:', event.data.message)
      // Tampilkan notifikasi error di parent jika perlu
    }
  }

  window.addEventListener('message', handleMessage)

  // Bersihkan listener jika popup ditutup paksa
  const checkClosed = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkClosed)
      window.removeEventListener('message', handleMessage)
    }
  }, 500)
}
```

---

## Checklist Implementasi

- [ ] Route `/login-popup` dan `/login-popup-1n` terdaftar di `App.jsx`
- [ ] `useCamera` hook menghandle semua kasus error kamera
- [ ] `<video>` memiliki atribut `autoPlay`, `playsInline`, `muted`
- [ ] `<canvas>` hidden dipakai capture, bukan canvas yang terlihat
- [ ] `stopCamera()` dipanggil di `useEffect` cleanup
- [ ] `postMessage` menggunakan `window.location.origin` (bukan `'*'`) untuk keamanan
- [ ] Token disimpan di `localStorage` oleh parent window setelah menerima postMessage
- [ ] State `'verifying'` menonaktifkan semua tombol
- [ ] State `'failed'` menampilkan tombol retry tanpa menutup stream kamera
- [ ] State `'success'` memanggil `stopCamera()` dan `setTimeout → window.close()`
- [ ] CSS menggunakan `aspect-ratio: 4/3` pada container kamera
- [ ] Oval SVG overlay menggunakan `pointer-events: none`
- [ ] Responsive: di mobile tombol stack vertikal, email badge tidak absolute
- [ ] `VITE_API_URL` dibaca dari env variable, fallback ke `localhost:5000/api`
