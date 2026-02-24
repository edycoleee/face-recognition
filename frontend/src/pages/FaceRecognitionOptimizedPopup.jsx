import { useState, useRef, useEffect } from 'react'
import './FaceRecognitionOptimizedPopup.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function FaceRecognitionOptimizedPopup() {
  const [error, setError] = useState('')
  const [recognizing, setRecognizing] = useState(false)
  const [result, setResult] = useState(null)
  const [isContinuous, setIsContinuous] = useState(false)
  const [detectionCount, setDetectionCount] = useState(0)

  // Refs
  const videoRef = useRef(null)
  const inputCanvasRef = useRef(null)
  const outputCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const tempCanvasRef = useRef(null)
  const intervalRef = useRef(null)

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search)
  const threshold = parseFloat(urlParams.get('threshold')) || 0.6

  useEffect(() => {
    startCamera()

    return () => {
      stopCamera()
      stopContinuous()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
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

  const handleRecognize = async () => {
    if (!videoRef.current || !inputCanvasRef.current || !outputCanvasRef.current) {
      return
    }

    const video = videoRef.current
    const inputCanvas = inputCanvasRef.current
    const outputCanvas = outputCanvasRef.current

    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera not ready')
      return
    }

    setRecognizing(true)
    setError('')
    if (!isContinuous) {
      setResult(null)
    }

    try {
      // Step 1: Capture to input canvas
      inputCanvas.width = video.videoWidth
      inputCanvas.height = video.videoHeight
      const inputCtx = inputCanvas.getContext('2d')
      inputCtx.drawImage(video, 0, 0, inputCanvas.width, inputCanvas.height)

      // Step 2: Downscale for better detection
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

      // Step 3: Convert to base64
      const base64Image = tempCanvas.toDataURL('image/jpeg', 0.6)

      // Step 4: Call recognition API (new endpoint)
      const response = await fetch(`${API_BASE_URL}/identify/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, threshold: 0.6 })
      })

      if (!response.ok) {
        throw new Error('Recognition failed')
      }

      const result = await response.json()
      const data = result.data || result

      // Step 5: Draw on output canvas
      outputCanvas.width = video.videoWidth
      outputCanvas.height = video.videoHeight
      const outputCtx = outputCanvas.getContext('2d')
      
      // Draw the captured frame
      outputCtx.drawImage(video, 0, 0, outputCanvas.width, outputCanvas.height)

      // Step 6: Draw bounding boxes and identity
      if (data.faces && data.faces.length > 0) {
        const scaleX = inputCanvas.width / targetWidth
        const scaleY = inputCanvas.height / targetHeight

        data.faces.forEach((face) => {
          const bbox = face.bbox
          const [x, y, x2, y2] = bbox
          const w = x2 - x
          const h = y2 - y

          // Scale coordinates
          const scaledX = x * scaleX
          const scaledY = y * scaleY
          const scaledW = w * scaleX
          const scaledH = h * scaleY

          // Determine if recognized
          const isRecognized = face.identified
          const confidence = face.confidence || 0

          // Draw bounding box
          outputCtx.strokeStyle = isRecognized ? '#10B981' : '#F59E0B'
          outputCtx.lineWidth = 3
          outputCtx.strokeRect(scaledX, scaledY, scaledW, scaledH)

          // Draw label
          const labelText = isRecognized 
            ? `${face.name} (${(confidence * 100).toFixed(1)}%)`
            : 'Unknown'
          
          const labelWidth = scaledW
          const labelHeight = 30
          
          outputCtx.fillStyle = isRecognized ? '#10B981' : '#F59E0B'
          outputCtx.fillRect(scaledX, scaledY - labelHeight, labelWidth, labelHeight)
          
          outputCtx.fillStyle = '#FFFFFF'
          outputCtx.font = 'bold 14px Arial'
          outputCtx.fillText(labelText, scaledX + 8, scaledY - 10)
        })

        // Set result for the first recognized face
        const recognizedFace = data.faces.find(f => f.identified)
        if (recognizedFace) {
          setResult({
            name: recognizedFace.name,
            email: recognizedFace.email,
            confidence: recognizedFace.confidence
          })
          setDetectionCount(prev => prev + 1)
        } else {
          if (!isContinuous) {
            setError('No recognized faces found')
          }
        }
      } else {
        if (!isContinuous) {
          setError('No faces detected')
        }
      }

    } catch (err) {
      console.error('Recognition error:', err)
      if (!isContinuous) {
        setError('Recognition failed: ' + err.message)
      }
    } finally {
      setRecognizing(false)
    }
  }

  const startContinuous = () => {
    setIsContinuous(true)
    setDetectionCount(0)
    setError('')
    
    // Run recognition every 3 seconds
    intervalRef.current = setInterval(() => {
      handleRecognize()
    }, 3000)

    // First recognition immediately
    handleRecognize()
  }

  const stopContinuous = () => {
    setIsContinuous(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const toggleContinuous = () => {
    if (isContinuous) {
      stopContinuous()
    } else {
      startContinuous()
    }
  }

  const handleClose = () => {
    stopCamera()
    stopContinuous()

    // Send result back to parent window only if there's a result
    if (window.opener && result) {
      try {
        window.opener.postMessage({
          type: 'FACE_RECOGNITION_OPTIMIZED_RESULT',
          success: true,
          data: result,
          message: 'Face recognized successfully'
        }, window.location.origin)
      } catch (err) {
        console.error('Failed to send message to parent:', err)
      }
    }

    // Always close the window when user clicks close/done
    window.close()
  }

  const handleCancel = () => {
    stopCamera()
    stopContinuous()
    window.close()
  }

  return (
    <div className="recognition-popup">
      <div className="popup-header">
        <h2>⚡ Optimized Face Recognition</h2>
        <button onClick={handleCancel} className="close-btn" disabled={recognizing}>
          ✕
        </button>
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
              <p className="canvas-info">Frame captured</p>
            </div>

            <div className="canvas-box">
              <h4>📤 Recognition Result</h4>
              <canvas ref={outputCanvasRef} className="output-canvas" />
              <p className="canvas-info">With identity & bounding box</p>
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <button 
              onClick={toggleContinuous} 
              className={`btn ${isContinuous ? 'btn-stop' : 'btn-continuous'}`}
            >
              {isContinuous ? '⏸️ Stop Continuous' : '▶️ Start Continuous'}
            </button>
            <button 
              onClick={handleRecognize} 
              className="btn btn-recognize"
              disabled={recognizing || isContinuous}
            >
              {recognizing ? '⏳ Recognizing...' : '🔍 Capture & Recognize'}
            </button>
            <button onClick={handleClose} className="btn btn-close" disabled={recognizing}>
              ✅ Done
            </button>
          </div>

          {isContinuous && (
            <div className="continuous-status">
              🔄 Continuous mode active - Auto-recognizing every 3 seconds
              {detectionCount > 0 && ` | Detected: ${detectionCount}`}
            </div>
          )}

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Result Section */}
        <div className="result-section">
          <h3>👤 Recognition Result</h3>
          
          {!result ? (
            <div className="no-result">
              <div className="placeholder-icon">🔍</div>
              <p>No recognition yet</p>
              <p className="hint">Click "Capture & Recognize" to identify</p>
            </div>
          ) : (
            <div className="result-card">
              <div className="result-header">
                <div className="avatar">
                  {result.name.charAt(0).toUpperCase()}
                </div>
                <div className="result-info">
                  <h4>{result.name}</h4>
                  <p className="email">{result.email}</p>
                </div>
              </div>
              
              <div className="result-details">
                <div className="detail-row">
                  <span className="label">Confidence:</span>
                  <span className="value confidence-value">
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ width: `${result.confidence * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="success-badge">
                ✅ Successfully Recognized
              </div>
            </div>
          )}

          <div className="info-box">
            <h4>💡 Tips:</h4>
            <ul>
              <li>Position face clearly in camera</li>
              <li>Ensure good lighting</li>
              <li>Face camera directly</li>
              <li>Remove obstructions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FaceRecognitionOptimizedPopup
