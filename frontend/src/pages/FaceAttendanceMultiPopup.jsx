import { useState, useRef, useEffect, useCallback } from 'react'
import { attendanceApi } from '../services/attendanceApi'
import './FaceAttendanceMultiPopup.css'

function FaceAttendanceMultiPopup() {
  const [cameraActive, setCameraActive] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [results, setResults] = useState(null)
  const [status, setStatus] = useState('Ready to start')
  const [capturing, setCapturing] = useState(false)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const isRecognizingRef = useRef(false)

  // Get params from URL
  const params = new URLSearchParams(window.location.search)
  const presence = params.get('presence') || 'incoming'
  const threshold = parseFloat(params.get('threshold') || '0.6')

  useEffect(() => {
    // Auto-start camera when popup opens
    startCamera()
    
    return () => {
      stopCamera()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
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
            setStatus('Failed to start video')
          })
        }
        
        setCameraActive(true)
        setStatus('Camera ready - Click Capture to record attendance')
      }
    } catch (err) {
      console.error('Camera error:', err)
      setStatus('Camera access denied. Please allow camera access.')
      
      // Notify parent about camera error
      sendMessageToParent({
        success: false,
        message: 'Camera access denied: ' + err.message
      })
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
    setCameraActive(false)
  }

  const recognizeFrame = useCallback(async () => {
    if (isRecognizingRef.current || !videoRef.current || !canvasRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video.videoWidth || !video.videoHeight) {
      return
    }

    // Prevent concurrent calls
    isRecognizingRef.current = true

    try {
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const ctx = canvas.getContext('2d')
      
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get base64 image
      const base64Image = canvas.toDataURL('image/jpeg', 0.9)

      // Call attendance API
      const response = await attendanceApi.attendanceFaceMulti(base64Image, presence, threshold)

      if (response.success && response.data) {
        setResults(response)
        
        // Redraw frame with results
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Draw bounding boxes for identified faces
        if (response.faces && response.faces.length > 0) {
          response.faces.forEach((face) => {
            if (!face.bbox) return
            
            const [x1, y1, x2, y2] = face.bbox
            
            // Determine color based on status
            let color = '#FF9800' // Unknown (orange)
            if (face.identified) {
              color = face.skipped ? '#2196F3' : '#4CAF50' // Blue for skipped, Green for recorded
            }
            
            // Draw rectangle
            ctx.strokeStyle = color
            ctx.lineWidth = 4
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
            
            // Draw label
            let label = 'Unknown'
            if (face.identified) {
              if (face.skipped) {
                label = `${face.name} (Already recorded)`
              } else {
                label = `${face.name} ✓`
              }
            }
            
            ctx.font = 'bold 20px Arial'
            const textWidth = ctx.measureText(label).width
            const padding = 10
            
            // Background for text
            ctx.fillStyle = color
            ctx.fillRect(x1, y1 - 35, textWidth + padding * 2, 35)
            
            // Text
            ctx.fillStyle = 'white'
            ctx.fillText(label, x1 + padding, y1 - 10)
          })
        }
        
        setStatus(response.message)
      }
    } catch (error) {
      console.error('Recognition error:', error)
    } finally {
      isRecognizingRef.current = false
    }
  }, [presence, threshold])

  const handleCaptureAndRecord = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      setStatus('Camera not ready')
      return
    }

    setCapturing(true)
    setStatus('Capturing and recording attendance...')
    setResults(null)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      
      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get base64 image
      const base64Image = canvas.toDataURL('image/jpeg', 0.9)

      setStatus('Identifying faces and recording attendance...')

      // Call attendance API
      const response = await attendanceApi.attendanceFaceMulti(base64Image, presence, threshold)

      if (response.success && response.data) {
        setResults(response)
        
        // Redraw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Draw bounding boxes
        if (response.faces && response.faces.length > 0) {
          response.faces.forEach((face) => {
            if (!face.bbox) return
            
            const [x1, y1, x2, y2] = face.bbox
            
            // Determine color
            let color = '#FF9800' // Unknown
            if (face.identified) {
              color = face.skipped ? '#2196F3' : '#4CAF50' // Blue or Green
            }
            
            // Draw rectangle
            ctx.strokeStyle = color
            ctx.lineWidth = 4
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
            
            // Draw label
            let label = 'Unknown'
            if (face.identified) {
              if (face.skipped) {
                label = `${face.name} (Already recorded)`
              } else {
                label = `${face.name} ✓`
              }
            }
            
            ctx.font = 'bold 20px Arial'
            const textWidth = ctx.measureText(label).width
            const padding = 10
            
            // Background
            ctx.fillStyle = color
            ctx.fillRect(x1, y1 - 35, textWidth + padding * 2, 35)
            
            // Text
            ctx.fillStyle = 'white'
            ctx.fillText(label, x1 + padding, y1 - 10)
          })
        }
        
        setStatus(response.message)
        
        // Send success to parent window
        sendMessageToParent({
          success: true,
          data: response.data,
          message: response.message
        })
      } else {
        throw new Error(response.message || 'Attendance failed')
      }
      
    } catch (err) {
      console.error('Attendance error:', err)
      setStatus(`❌ ${err.message || 'Attendance failed. Please try again.'}`)
    } finally {
      setCapturing(false)
    }
  }

  const sendMessageToParent = (data) => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'FACE_ATTENDANCE_MULTI_RESULT',
        ...data
      }, window.location.origin)
    }
  }

  const handleClose = () => {
    sendMessageToParent({
      success: false,
      message: 'User closed window'
    })
    window.close()
  }

  const handleClear = () => {
    setResults(null)
    setStatus('Camera ready - Click Capture to record attendance')
    
    // Clear canvas
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    }
  }

  return (
    <div className="face-attendance-multi-popup">
      <div className="popup-header">
        <h2>✅ Face Attendance (N:N Multiple)</h2>
        <p className="presence-display">
          {presence === 'incoming' ? '📥 Incoming' : '📤 Outcoming'}
        </p>
        <button onClick={handleClose} className="btn-close" title="Close">✕</button>
      </div>

      <div className="popup-content">
        {/* Camera View - Wider */}
        <div className="camera-section">
          <div className="camera-container-wide">
            {!cameraActive && (
              <div className="camera-placeholder">
                <p>📷</p>
                <p>Starting camera...</p>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-preview"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />
            
            <canvas 
              ref={canvasRef} 
              className="canvas-overlay"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />
          </div>

          {/* Status */}
          <div className="status-bar">
            <p>{status}</p>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              onClick={handleCaptureAndRecord}
              disabled={!cameraActive || capturing}
              className="btn-capture-large"
            >
              {capturing ? '⏳ Recording...' : '📸 Capture & Record Attendance'}
            </button>
            
            {results && (
              <button onClick={handleClear} className="btn-clear">
                🔄 Clear Results
              </button>
            )}
            
            <button onClick={handleClose} className="btn-cancel">
              Close
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && results.data && results.data.length > 0 && (
          <div className="results-section">
            <h3>Attendance Results ({results.data.length} face{results.data.length !== 1 ? 's' : ''})</h3>
            
            <div className="results-grid">
              {results.data.map((record, index) => (
                <div 
                  key={index} 
                  className={`result-card ${record.identified ? (record.skipped ? 'skipped' : 'success') : 'unknown'}`}
                >
                  <div className="result-header">
                    <span className="result-icon">
                      {record.identified ? (record.skipped ? '⏭️' : '✅') : '❓'}
                    </span>
                    <span className="result-name">
                      {record.identified ? record.user_name : 'Unknown Person'}
                    </span>
                  </div>
                  
                  {record.identified && (
                    <div className="result-details">
                      <p><strong>Email:</strong> {record.user_email}</p>
                      <p><strong>Confidence:</strong> {(record.face_confidence * 100).toFixed(1)}%</p>
                      {record.skipped ? (
                        <p className="skip-reason"><strong>Status:</strong> {record.skip_reason}</p>
                      ) : (
                        <p><strong>Status:</strong> ✅ Recorded</p>
                      )}
                    </div>
                  )}
                  
                  {!record.identified && (
                    <div className="result-details">
                      <p>Face not identified in database</p>
                      {record.face_confidence > 0 && (
                        <p><small>Confidence: {(record.face_confidence * 100).toFixed(1)}% (below threshold)</small></p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Threshold Info */}
        <div className="threshold-info">
          <small>Threshold: {(threshold * 100).toFixed(0)}% | 2 hour minimum between records</small>
        </div>
      </div>
    </div>
  )
}

export default FaceAttendanceMultiPopup
