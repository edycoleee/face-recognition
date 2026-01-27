// src/components/FaceDetection.jsx
import { useState, useRef, useEffect } from 'react'
import './FaceDetection.css'

const FaceDetection = () => {
  const [detectionMode, setDetectionMode] = useState('image') // image, webcam, video
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [detectionResult, setDetectionResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [detectionStatus, setDetectionStatus] = useState('') // Status message for continuous detection
  
  // Refs for webcam and canvas
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [isContinuousDetection, setIsContinuousDetection] = useState(false)
  const detectionIntervalRef = useRef(null)
  const isDetectingRef = useRef(false)
  const tempCanvasRef = useRef(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam()
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [])

  // Clear canvas helper
  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  // Reset detection state
  const resetDetectionState = () => {
    setDetectionResult(null)
    setDetectionStatus('')
    setError(null)
    clearCanvas()
  }

  const waitForVideoReady = (video) => {
    if (!video) return Promise.resolve(false)
    if (video.videoWidth && video.videoHeight) {
      return Promise.resolve(true)
    }

    return new Promise((resolve) => {
      const onReady = () => {
        video.removeEventListener('loadedmetadata', onReady)
        resolve(true)
      }
      video.addEventListener('loadedmetadata', onReady, { once: true })
    })
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setDetectionResult(null)
      setError(null)
    }
  }

  // Detect faces from uploaded image
  const detectFromImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${API_BASE_URL}/detect/image`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setDetectionResult(data)
        drawBoundingBoxes(data.faces)
      } else {
        setError(data.error || 'Detection failed')
      }
    } catch (err) {
      setError('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsWebcamActive(true)
        setError(null)
      }
    } catch (err) {
      setError('Error accessing webcam: ' + err.message)
    }
  }

  // Stop webcam
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsWebcamActive(false)
    setIsContinuousDetection(false)
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setDetectionStatus('')
    setDetectionResult(null)
  }

  // Capture from webcam and detect
  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Check if video is ready
    if (!video.videoWidth || !video.videoHeight) {
      setError('Webcam not ready yet. Please wait...')
      return
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    setLoading(true)
    setError(null)
    setDetectionStatus('🔍 Detecting faces...')

    try {
      const response = await fetch(`${API_BASE_URL}/detect/webcam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Image })
      })

      const data = await response.json()

      if (response.ok) {
        setDetectionResult(data)
        drawBoundingBoxesOnCanvas(canvas, data.faces)
        setDetectionStatus(`✅ Detected ${data.count} face(s)`)
      } else {
        setError(data.error || 'Detection failed')
        setDetectionStatus('❌ Detection failed')
      }
    } catch (err) {
      setError('Error: ' + err.message)
      setDetectionStatus('❌ Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Continuous detection - simple version
  const continuousDetect = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return
    }

    if (isDetectingRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Check if video is ready
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Video not ready yet')
      return
    }

    // Set canvas size (only if changed)
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Downscale capture for faster detection
    const targetWidth = 320
    const scale = targetWidth / canvas.width
    const targetHeight = Math.round(canvas.height * scale)
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas')
    }
    const tempCanvas = tempCanvasRef.current
    tempCanvas.width = targetWidth
    tempCanvas.height = targetHeight
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight)

    // Convert to base64 (smaller image)
    const base64Image = tempCanvas.toDataURL('image/jpeg', 0.6).split(',')[1]

    setDetectionStatus('🔍 Detecting...')

    try {
      isDetectingRef.current = true
      const response = await fetch(`${API_BASE_URL}/detect/webcam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Image })
      })

      if (response.ok) {
        const data = await response.json()
        setDetectionResult(data)
        
        // Redraw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Draw bounding boxes
        // Scale boxes back to original canvas size
        const scaleX = canvas.width / targetWidth
        const scaleY = canvas.height / targetHeight
        const scaledFaces = data.faces.map(face => ({
          ...face,
          bbox: [
            face.bbox[0] * scaleX,
            face.bbox[1] * scaleY,
            face.bbox[2] * scaleX,
            face.bbox[3] * scaleY
          ],
          landmarks: face.landmarks
            ? face.landmarks.map(([lx, ly]) => [lx * scaleX, ly * scaleY])
            : null
        }))
        drawBoundingBoxesOnCanvas(canvas, scaledFaces)
        
        setDetectionStatus(`✅ ${data.count} face(s)`)
      }
    } catch (err) {
      console.error('Detection error:', err)
    } finally {
      isDetectingRef.current = false
    }
  }

  // Toggle continuous detection
  const toggleContinuousDetection = async () => {
    if (isContinuousDetection) {
      // Stop
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
      setIsContinuousDetection(false)
      setDetectionStatus('⏸️ Stopped')
    } else {
      // Start - check if video is ready
      if (!videoRef.current) {
        setError('Please wait for webcam to initialize')
        return
      }

      const isReady = await waitForVideoReady(videoRef.current)
      if (!isReady || !videoRef.current.videoWidth) {
        setError('Webcam not ready yet. Please wait...')
        return
      }

      setIsContinuousDetection(true)
      setDetectionStatus('▶️ Started')
      setError(null)
      
      // Initialize canvas with video dimensions
      const video = videoRef.current
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      
      // Run immediately
      continuousDetect()
      
      // Then every 350ms
      detectionIntervalRef.current = setInterval(continuousDetect, 350)
    }
  }

  // Draw bounding boxes on image
  const drawBoundingBoxes = (faces) => {
    if (!canvasRef.current || !previewUrl) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      drawBoundingBoxesOnCanvas(canvas, faces)
    }

    img.src = previewUrl
  }

  // Draw bounding boxes on canvas
  const drawBoundingBoxesOnCanvas = (canvas, faces) => {
    const ctx = canvas.getContext('2d')

    faces.forEach(face => {
      const [x1, y1, x2, y2] = face.bbox

      // Draw rectangle
      ctx.strokeStyle = '#00FF00'
      ctx.lineWidth = 3
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      // Draw confidence
      ctx.fillStyle = '#00FF00'
      ctx.font = '16px Arial'
      ctx.fillText(
        `${(face.confidence * 100).toFixed(1)}%`,
        x1,
        y1 - 5
      )

      // Draw landmarks if available
      if (face.landmarks) {
        ctx.fillStyle = '#FF0000'
        face.landmarks.forEach(([lx, ly]) => {
          ctx.beginPath()
          ctx.arc(lx, ly, 3, 0, 2 * Math.PI)
          ctx.fill()
        })
      }

      // Draw age and gender if available
      if (face.age || face.gender) {
        let label = []
        if (face.gender) label.push(face.gender)
        if (face.age) label.push(`${face.age}y`)
        
        if (label.length > 0) {
          ctx.fillStyle = '#00FF00'
          ctx.fillText(label.join(', '), x1, y2 + 20)
        }
      }
    })
  }

  return (
    <div className="face-detection">
      <h1>Face Detection</h1>

      {/* Mode Selection */}
      <div className="mode-selection">
        <button
          className={detectionMode === 'image' ? 'active' : ''}
          onClick={() => {
            setDetectionMode('image')
            stopWebcam()
            resetDetectionState()
          }}
        >
          Upload Image
        </button>
        <button
          className={detectionMode === 'webcam' ? 'active' : ''}
          onClick={() => {
            setDetectionMode('webcam')
            resetDetectionState()
          }}
        >
          Webcam
        </button>
      </div>

      {/* Image Upload Mode */}
      {detectionMode === 'image' && (
        <div className="image-mode">
          <div className="upload-section">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ marginBottom: '10px' }}
            />
            <button
              onClick={detectFromImage}
              disabled={!selectedFile || loading}
            >
              {loading ? 'Detecting...' : 'Detect Faces'}
            </button>
          </div>

          {previewUrl && (
            <div className="preview-section">
              <h3>Detection Result:</h3>
              <canvas
                ref={canvasRef}
                style={{ maxWidth: '100%', border: '1px solid #ccc' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Webcam Mode */}
      {detectionMode === 'webcam' && (
        <div className="webcam-mode">
          <div className="webcam-controls">
            {!isWebcamActive ? (
              <button onClick={startWebcam}>Start Webcam</button>
            ) : (
              <>
                <button onClick={stopWebcam}>Stop Webcam</button>
                <button 
                  onClick={captureAndDetect} 
                  disabled={loading || isContinuousDetection}
                >
                  Capture & Detect
                </button>
                <button
                  onClick={toggleContinuousDetection}
                  className={isContinuousDetection ? 'active' : ''}
                >
                  {isContinuousDetection ? 'Stop Continuous' : 'Start Continuous'}
                </button>
              </>
            )}
          </div>

          {/* Detection Status */}
          {isWebcamActive && detectionStatus && (
            <div className="detection-status">
              <p>{detectionStatus}</p>
            </div>
          )}

          <div className="webcam-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                display: isWebcamActive ? 'block' : 'none',
                maxWidth: '100%',
                border: '1px solid #ccc'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                display: isWebcamActive ? 'block' : 'none',
                maxWidth: '100%',
                border: '1px solid #ccc',
                marginTop: '10px'
              }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Detection Result */}
      {detectionResult && !error && (
        <div className="result-info">
          <h3>Detection Info:</h3>
          <p><strong>Faces Detected:</strong> {detectionResult.count}</p>
          {detectionResult.faces.map((face, idx) => (
            <div key={idx} className="face-info">
              <h4>Face {idx + 1}:</h4>
              <p>Confidence: {(face.confidence * 100).toFixed(2)}%</p>
              {face.gender && <p>Gender: {face.gender}</p>}
              {face.age && <p>Age: ~{face.age} years</p>}
              <p>BBox: [{face.bbox.join(', ')}]</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FaceDetection
