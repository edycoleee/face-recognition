import { useState, useRef, useEffect } from 'react'
import './FaceDetectionContinuousPopup.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function FaceDetectionContinuousPopup() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState('')
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    withFaces: 0,
    noFaces: 0
  })
  const [results, setResults] = useState([])

  // Refs
  const videoRef = useRef(null)
  const inputCanvasRef = useRef(null)
  const outputCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const tempCanvasRef = useRef(null) // For downscaling

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search)
  const confidenceThreshold = parseFloat(urlParams.get('threshold')) || 0.5

  useEffect(() => {
    startCamera()

    return () => {
      stopDetection()
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err)
            setError('Failed to play video stream')
          })
        }

        setError('')
      }
    } catch (err) {
      console.error('Camera error:', err)
      setError('Failed to access camera: ' + err.message)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startDetection = () => {
    setIsDetecting(true)
    setError('')

    // Run detection every 3 seconds
    intervalRef.current = setInterval(() => {
      detectFrame()
    }, 3000)
  }

  const stopDetection = () => {
    setIsDetecting(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const detectFrame = async () => {
    if (!videoRef.current || !inputCanvasRef.current || !outputCanvasRef.current) {
      return
    }

    const video = videoRef.current
    const inputCanvas = inputCanvasRef.current
    const outputCanvas = outputCanvasRef.current

    if (!video.videoWidth || !video.videoHeight) {
      return
    }

    try {
      // Step 1: Capture to input canvas (no drawing, just capture)
      inputCanvas.width = video.videoWidth
      inputCanvas.height = video.videoHeight
      const inputCtx = inputCanvas.getContext('2d')
      inputCtx.drawImage(video, 0, 0, inputCanvas.width, inputCanvas.height)

      // Step 2: Downscale for better detection accuracy (same as webcam mode)
      const targetWidth = 320
      const scale = targetWidth / inputCanvas.width
      const targetHeight = Math.round(inputCanvas.height * scale)
      
      if (!tempCanvasRef.current) {
        tempCanvasRef.current = document.createElement('canvas')
      }
      
      const tempCanvas = tempCanvasRef.current
      tempCanvas.width = targetWidth
      tempCanvas.height = targetHeight
      
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.drawImage(inputCanvas, 0, 0, targetWidth, targetHeight)

      // Step 3: Convert downscaled image to base64
      const base64Image = tempCanvas.toDataURL('image/jpeg', 0.6)

      // Step 4: Call detection API
      const response = await fetch(`${API_BASE_URL}/detect/image/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      })

      if (!response.ok) {
        throw new Error('Detection failed')
      }

      const data = await response.json()

      // Step 5: Draw on output canvas (separate from input)
      outputCanvas.width = video.videoWidth
      outputCanvas.height = video.videoHeight
      const outputCtx = outputCanvas.getContext('2d')
      
      // Draw the captured frame on output canvas
      outputCtx.drawImage(video, 0, 0, outputCanvas.width, outputCanvas.height)

      // Step 6: Scale bounding boxes back to original size and draw
      if (data.faces && data.faces.length > 0) {
        const scaleX = inputCanvas.width / targetWidth
        const scaleY = inputCanvas.height / targetHeight

        data.faces.forEach((face) => {
          const [x, y, w, h] = face.bbox

          // Scale coordinates back to original size
          const scaledX = x * scaleX
          const scaledY = y * scaleY
          const scaledW = w * scaleX
          const scaledH = h * scaleY

          // Draw bounding box
          outputCtx.strokeStyle = '#10B981'
          outputCtx.lineWidth = 3
          outputCtx.strokeRect(scaledX, scaledY, scaledW, scaledH)

          // Draw confidence label
          outputCtx.fillStyle = '#10B981'
          outputCtx.fillRect(scaledX, scaledY - 25, scaledW, 25)
          outputCtx.fillStyle = '#FFFFFF'
          outputCtx.font = '14px Arial'
          const confidenceText = `Conf: ${(face.det_score * 100).toFixed(1)}%`
          outputCtx.fillText(confidenceText, scaledX + 5, scaledY - 7)
        })
      }

      // Update stats
      setSessionStats(prev => ({
        total: prev.total + 1,
        withFaces: data.count > 0 ? prev.withFaces + 1 : prev.withFaces,
        noFaces: data.count === 0 ? prev.noFaces + 1 : prev.noFaces
      }))

      // Add to results (limit to last 50)
      const newResult = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        faceCount: data.count,
        faces: data.faces || []
      }

      setResults(prev => {
        const updated = [newResult, ...prev]
        return updated.slice(0, 50)
      })

    } catch (err) {
      console.error('Detection error:', err)
      setError('Detection failed: ' + err.message)
    }
  }

  const handleClose = () => {
    stopDetection()
    stopCamera()

    // Send result back to parent window
    if (window.opener) {
      window.opener.postMessage({
        type: 'FACE_DETECTION_CONTINUOUS_RESULT',
        success: true,
        data: {
          sessionStats,
          results: results.slice(0, 10) // Send last 10 results
        },
        message: 'Continuous detection session ended'
      }, window.location.origin)
    }

    window.close()
  }

  return (
    <div className="detection-popup">
      <div className="popup-header">
        <h2>🔄 Continuous Face Detection</h2>
        <div className={`status-indicator ${isDetecting ? 'active' : ''}`}>
          <div className="status-dot"></div>
          <span>{isDetecting ? 'Detecting...' : 'Stopped'}</span>
        </div>
      </div>

      <div className="popup-content">
        {/* Main Content */}
        <div className="main-content">
          {/* Video Feed */}
          <div className="video-section">
            <h3>📹 Camera Input</h3>
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-feed"
              />
            </div>
          </div>

          {/* Canvases Grid */}
          <div className="canvases-grid">
            <div className="canvas-box">
              <h4>📥 Capture Canvas</h4>
              <canvas ref={inputCanvasRef} className="input-canvas" />
              <p className="canvas-info">Frame captured from camera</p>
            </div>

            <div className="canvas-box">
              <h4>📤 Detection Result</h4>
              <canvas ref={outputCanvasRef} className="output-canvas" />
              <p className="canvas-info">Bounding boxes & confidence</p>
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            {!isDetecting ? (
              <button onClick={startDetection} className="btn btn-start">
                ▶️ Start Detection
              </button>
            ) : (
              <button onClick={stopDetection} className="btn btn-stop">
                ⏸️ Pause Detection
              </button>
            )}
            <button onClick={handleClose} className="btn btn-close">
              ⏹️ Stop & Close
            </button>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="summary-section">
          <h3>📊 Session Summary</h3>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{sessionStats.total}</div>
                <div className="stat-label">Total Frames</div>
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{sessionStats.withFaces}</div>
                <div className="stat-label">With Faces</div>
              </div>
            </div>

            <div className="stat-card neutral">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <div className="stat-value">{sessionStats.noFaces}</div>
                <div className="stat-label">No Faces</div>
              </div>
            </div>
          </div>

          {/* Latest Detection */}
          {results.length > 0 && (
            <div className="latest-detection">
              <h4>🕐 Latest Detection</h4>
              <div className="latest-info">
                <div className="info-row">
                  <span className="info-label">Time:</span>
                  <span className="info-value">{results[0].timestamp}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Faces:</span>
                  <span className={`info-value ${results[0].faceCount > 0 ? 'success' : 'neutral'}`}>
                    {results[0].faceCount > 0 ? `${results[0].faceCount} face(s) detected` : 'No faces'}
                  </span>
                </div>
                {results[0].faceCount > 0 && (
                  <div className="faces-list">
                    {results[0].faces.map((face, idx) => (
                      <div key={idx} className="face-item">
                        <span>Face {idx + 1}:</span>
                        <span className="confidence-badge">
                          {(face.det_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detection Rate */}
          {sessionStats.total > 0 && (
            <div className="detection-rate">
              <h4>📈 Detection Rate</h4>
              <div className="rate-bar">
                <div 
                  className="rate-fill"
                  style={{ 
                    width: `${(sessionStats.withFaces / sessionStats.total) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="rate-text">
                {((sessionStats.withFaces / sessionStats.total) * 100).toFixed(1)}% frames with faces
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FaceDetectionContinuousPopup
