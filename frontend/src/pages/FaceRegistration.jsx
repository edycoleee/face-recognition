import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './FaceRegistration.css'

function FaceRegistration() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null) // Store stream reference
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [captureMode, setCaptureMode] = useState('manual') // 'manual' or 'auto'
  const [captures, setCaptures] = useState([])
  const [currentStatus, setCurrentStatus] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [autoInterval, setAutoInterval] = useState(null)
  
  const TARGET_CAPTURES = 10
  const AUTO_INTERVAL_MS = 2000 // 2 seconds
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  useEffect(() => {
    fetchUser()
    return () => {
      stopCamera()
    }
  }, [userId])

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`)
      const data = await res.json()
      if (data.success) {
        setUser(data.data)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to fetch user: ' + err.message)
    }
  }

  const startCamera = async () => {
    try {
      setError(null)
      setCurrentStatus('📷 Starting camera...')
      console.log('1. Requesting camera access...')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })
      
      console.log('2. Got stream:', stream)
      
      if (videoRef.current) {
        console.log('3. Setting srcObject to video element')
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        // Wait for video to load and play
        videoRef.current.onloadedmetadata = () => {
          console.log('4. Metadata loaded, playing video...')
          videoRef.current.play()
            .then(() => {
              console.log('5. ✅ Video playing successfully')
              setCameraActive(true)
              setCurrentStatus('✅ Camera ready')
              setTimeout(() => setCurrentStatus(''), 2000)
            })
            .catch(err => {
              console.error('5. ❌ Play error:', err)
              setError('Failed to play video: ' + err.message)
            })
        }
      } else {
        console.error('3. ❌ videoRef.current is null')
        setError('Video element not found')
      }
    } catch (err) {
      console.error('Camera error:', err)
      setError('Camera access denied: ' + err.message)
      setCurrentStatus('❌ Camera failed')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setCameraActive(false)
    
    // Clear auto capture interval
    if (autoInterval) {
      clearInterval(autoInterval)
      setAutoInterval(null)
    }
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) {
      setCurrentStatus('❌ Camera not ready')
      return null
    }
    
    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Check if video is ready
    if (!video.videoWidth || !video.videoHeight) {
      setCurrentStatus('⏳ Waiting for camera...')
      return null
    }
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    return canvas.toDataURL('image/jpeg', 0.95)
  }

  const validateAndCapture = async () => {
    if (isCapturing) return
    
    setIsCapturing(true)
    setCurrentStatus('📸 Capturing...')
    
    const imageData = captureFrame()
    if (!imageData) {
      setCurrentStatus('❌ Capture failed')
      setIsCapturing(false)
      return
    }

    try {
      // Validate face
      setCurrentStatus('🔍 Validating face...')
      const validateRes = await fetch(`${API_BASE_URL}/face/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      })
      
      const validateData = await validateRes.json()
      
      if (validateData.success) {
        // Face is valid, add to captures
        const newCapture = {
          id: Date.now(),
          image: imageData,
          faceData: validateData.data,
          timestamp: new Date().toLocaleTimeString()
        }
        
        setCaptures(prev => [...prev, newCapture])
        setCurrentStatus(`✅ Captured ${captures.length + 1}/${TARGET_CAPTURES}`)
        
        // Auto-stop if reached target
        if (captures.length + 1 >= TARGET_CAPTURES && captureMode === 'auto') {
          stopAutoCapture()
          setCurrentStatus('✅ All captures completed!')
        }
      } else {
        setCurrentStatus(`❌ ${validateData.message}`)
      }
    } catch (err) {
      setCurrentStatus('❌ Validation error: ' + err.message)
    } finally {
      setIsCapturing(false)
    }
  }

  const startAutoCapture = () => {
    if (autoInterval) return
    
    setCaptureMode('auto')
    setCurrentStatus('🎬 Auto capture started...')
    
    // Immediate first capture
    validateAndCapture()
    
    // Then every 2 seconds
    const interval = setInterval(() => {
      if (captures.length < TARGET_CAPTURES) {
        validateAndCapture()
      } else {
        clearInterval(interval)
        setAutoInterval(null)
        setCurrentStatus('✅ Auto capture completed!')
      }
    }, AUTO_INTERVAL_MS)
    
    setAutoInterval(interval)
  }

  const stopAutoCapture = () => {
    if (autoInterval) {
      clearInterval(autoInterval)
      setAutoInterval(null)
    }
    setCurrentStatus('⏸️ Auto capture stopped')
  }

  const deleteCapture = (id) => {
    setCaptures(prev => prev.filter(c => c.id !== id))
  }

  const resetCaptures = () => {
    setCaptures([])
    setCurrentStatus('')
  }

  const submitRegistration = async () => {
    if (captures.length < 5) {
      setError('Please capture at least 5 images')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const images = captures.map(c => c.image)
      
      const res = await fetch(`${API_BASE_URL}/face/users/${userId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      })
      
      const data = await res.json()
      
      if (data.success) {
        alert(`Success! Registered ${data.data.successful}/${data.data.total} faces`)
        navigate('/users')
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Registration failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="loading">Loading user...</div>
  }

  return (
    <div className="face-registration-page">
      <button className="back-button" onClick={() => navigate('/users')}>
        ← Back to Users
      </button>

      <div className="registration-header">
        <h1>Register Face</h1>
        <p className="user-info">Registering face for: <strong>{user.name}</strong></p>
      </div>

      <div className="registration-content">
        {/* Camera Section */}
        <div className="camera-section">
          <div className="camera-container">
            {!cameraActive && (
              <div className="camera-placeholder">
                <p>📷</p>
                <button onClick={startCamera} className="btn-start-camera">
                  Start Camera
                </button>
              </div>
            )}
            
            {/* Always render video element, but hide when not active */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-preview"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Status */}
          {currentStatus && (
            <div className="status-message">
              {currentStatus}
            </div>
          )}

          {/* Controls */}
          {cameraActive && (
            <div className="camera-controls">
              <div className="mode-buttons">
                <button
                  onClick={() => {
                    stopAutoCapture()
                    setCaptureMode('manual')
                  }}
                  className={captureMode === 'manual' ? 'active' : ''}
                  disabled={isCapturing}
                >
                  Manual Capture
                </button>
                <button
                  onClick={startAutoCapture}
                  className={captureMode === 'auto' && autoInterval ? 'active' : ''}
                  disabled={isCapturing || captures.length >= TARGET_CAPTURES}
                >
                  Auto Capture
                </button>
                {autoInterval && (
                  <button onClick={stopAutoCapture} className="btn-stop">
                    Stop Auto
                  </button>
                )}
              </div>

              {captureMode === 'manual' && (
                <button
                  onClick={validateAndCapture}
                  disabled={isCapturing || captures.length >= TARGET_CAPTURES}
                  className="btn-capture"
                >
                  📸 Capture ({captures.length}/{TARGET_CAPTURES})
                </button>
              )}

              <button onClick={stopCamera} className="btn-stop-camera">
                Stop Camera
              </button>
            </div>
          )}
        </div>

        {/* Captures Grid */}
        <div className="captures-section">
          <div className="captures-header">
            <h3>Captured Images ({captures.length}/{TARGET_CAPTURES})</h3>
            {captures.length > 0 && (
              <button onClick={resetCaptures} className="btn-reset">
                Clear All
              </button>
            )}
          </div>

          <div className="captures-grid">
            {captures.map((capture) => (
              <div key={capture.id} className="capture-item">
                <img src={capture.image} alt="Captured face" />
                <div className="capture-info">
                  <span className="capture-time">{capture.timestamp}</span>
                  <span className="capture-score">
                    {(capture.faceData.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <button
                  onClick={() => deleteCapture(capture.id)}
                  className="btn-delete-capture"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {captures.length >= 5 && (
            <button
              onClick={submitRegistration}
              disabled={loading}
              className="btn-submit"
            >
              {loading ? 'Registering...' : `Register ${captures.length} Faces`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FaceRegistration
