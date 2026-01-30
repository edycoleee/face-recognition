import { useState, useRef, useEffect, useCallback } from 'react'
import { attendanceApi } from '../services/attendanceApi'
import './FaceAttendanceContinuousPopup.css'

function FaceAttendanceContinuousPopup() {
  const [cameraActive, setCameraActive] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('Ready to start')
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    recorded: 0,
    skipped: 0,
    unknown: 0
  })
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const isRecognizingRef = useRef(false)
  const recordedUsersRef = useRef(new Set()) // Track recorded users in this session

  // Get params from URL
  const params = new URLSearchParams(window.location.search)
  const presence = params.get('presence') || 'incoming'
  const threshold = parseFloat(params.get('threshold') || '0.6')

  useEffect(() => {
    // Auto-start camera when popup opens
    startCamera()
    
    return () => {
      stopCamera()
      stopRecognition()
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
        setStatus('Camera ready - Click Start to begin continuous recognition')
      }
    } catch (err) {
      console.error('Camera error:', err)
      setStatus('Camera access denied. Please allow camera access.')
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
      const base64Image = canvas.toDataURL('image/jpeg', 0.85)

      // Call attendance API
      const response = await attendanceApi.attendanceFaceMulti(base64Image, presence, threshold)

      if (response.success && response.data && response.data.length > 0) {
        // Update results
        const timestamp = new Date().toLocaleTimeString()
        const newResults = response.data.map(face => ({
          ...face,
          timestamp
        }))
        
        // Keep only last 50 results
        setResults(prev => [...newResults, ...prev].slice(0, 50))
        
        // Update session stats
        setSessionStats(prev => {
          const newRecorded = newResults.filter(r => r.identified && !r.skipped).length
          const newSkipped = newResults.filter(r => r.skipped).length
          const newUnknown = newResults.filter(r => !r.identified).length
          
          return {
            total: prev.total + newResults.length,
            recorded: prev.recorded + newRecorded,
            skipped: prev.skipped + newSkipped,
            unknown: prev.unknown + newUnknown
          }
        })
        
        // Track recorded users
        newResults.forEach(face => {
          if (face.identified && !face.skipped && face.user_id) {
            recordedUsersRef.current.add(face.user_id)
          }
        })
        
        // Redraw frame with bounding boxes
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        if (response.faces && response.faces.length > 0) {
          response.faces.forEach((face) => {
            if (!face.bbox) return
            
            const [x1, y1, x2, y2] = face.bbox
            
            // Determine color
            let color = '#FF9800' // Unknown
            if (face.identified) {
              color = face.skipped ? '#2196F3' : '#4CAF50'
            }
            
            // Draw rectangle
            ctx.strokeStyle = color
            ctx.lineWidth = 3
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
            
            // Draw label
            let label = 'Unknown'
            if (face.identified) {
              if (face.skipped) {
                label = `${face.name} (Skip)`
              } else {
                label = `${face.name} ✓`
              }
            }
            
            ctx.font = 'bold 18px Arial'
            const textWidth = ctx.measureText(label).width
            const padding = 8
            
            // Background
            ctx.fillStyle = color
            ctx.fillRect(x1, y1 - 30, textWidth + padding * 2, 30)
            
            // Text
            ctx.fillStyle = 'white'
            ctx.fillText(label, x1 + padding, y1 - 8)
          })
        }
        
        setStatus(`Processing... ${newResults.length} face(s) detected`)
      }
    } catch (error) {
      console.error('Recognition error:', error)
      setStatus('Recognition error - continuing...')
    } finally {
      isRecognizingRef.current = false
    }
  }, [presence, threshold])

  const startRecognition = () => {
    if (!cameraActive) {
      setStatus('Camera not ready')
      return
    }

    setRecognizing(true)
    setStatus('Continuous recognition active...')
    
    // Start continuous recognition (every 3 seconds)
    intervalRef.current = setInterval(() => {
      recognizeFrame()
    }, 3000)
  }

  const stopRecognition = () => {
    setRecognizing(false)
    setStatus('Recognition stopped')
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    isRecognizingRef.current = false
  }

  const handleClose = () => {
    stopRecognition()
    stopCamera()
    
    // Send summary to parent
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'FACE_ATTENDANCE_CONTINUOUS_RESULT',
        success: true,
        data: {
          sessionStats,
          totalRecorded: recordedUsersRef.current.size
        },
        message: `Session complete: ${sessionStats.recorded} recorded`
      }, window.location.origin)
    }
    
    window.close()
  }

  const clearResults = () => {
    setResults([])
    setSessionStats({
      total: 0,
      recorded: 0,
      skipped: 0,
      unknown: 0
    })
    recordedUsersRef.current.clear()
    setStatus(recognizing ? 'Continuous recognition active...' : 'Recognition stopped')
  }

  return (
    <div className="face-attendance-continuous-popup">
      <div className="popup-header">
        <h2>🔄 Face Attendance (N:N Continuous)</h2>
        <p className="presence-display">
          {presence === 'incoming' ? '📥 Incoming' : '📤 Outcoming'}
        </p>
        <button onClick={handleClose} className="btn-close" title="Close">✕</button>
      </div>

      <div className="popup-content">
        {/* Camera Section */}
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

          {/* Status & Stats */}
          <div className="status-section">
            <div className="status-bar">
              <span className={`status-indicator ${recognizing ? 'active' : ''}`}></span>
              <p>{status}</p>
            </div>
            
            <div className="stats-bar">
              <div className="stat-item">
                <span className="stat-value">{sessionStats.total}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-item success">
                <span className="stat-value">{sessionStats.recorded}</span>
                <span className="stat-label">Recorded</span>
              </div>
              <div className="stat-item skipped">
                <span className="stat-value">{sessionStats.skipped}</span>
                <span className="stat-label">Skipped</span>
              </div>
              <div className="stat-item unknown">
                <span className="stat-value">{sessionStats.unknown}</span>
                <span className="stat-label">Unknown</span>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="control-buttons">
            {!recognizing ? (
              <button 
                onClick={startRecognition}
                disabled={!cameraActive}
                className="btn-start"
              >
                ▶️ Start Continuous Recognition
              </button>
            ) : (
              <button 
                onClick={stopRecognition}
                className="btn-stop"
              >
                ⏸️ Stop Recognition
              </button>
            )}
            
            <button onClick={clearResults} className="btn-clear">
              🗑️ Clear Results
            </button>
            
            <button onClick={handleClose} className="btn-close-window">
              Close Window
            </button>
          </div>
        </div>

        {/* Results List */}
        {results.length > 0 && (
          <div className="results-section">
            <h3>Recent Detections ({results.length})</h3>
            
            <div className="results-list">
              {results.map((record, index) => (
                <div 
                  key={index} 
                  className={`result-item ${record.identified ? (record.skipped ? 'skipped' : 'success') : 'unknown'}`}
                >
                  <span className="result-time">{record.timestamp}</span>
                  <span className="result-icon">
                    {record.identified ? (record.skipped ? '⏭️' : '✅') : '❓'}
                  </span>
                  <span className="result-name">
                    {record.identified ? record.user_name : 'Unknown'}
                  </span>
                  {record.identified && (
                    <span className="result-confidence">
                      {(record.face_confidence * 100).toFixed(1)}%
                    </span>
                  )}
                  {record.skipped && (
                    <span className="result-badge">Within 2h</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="info-footer">
          <small>Threshold: {(threshold * 100).toFixed(0)}% | Recognition interval: 3s | 2 hour minimum between records</small>
        </div>
      </div>
    </div>
  )
}

export default FaceAttendanceContinuousPopup
