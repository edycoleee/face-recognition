import { useState, useRef, useEffect } from 'react'
import { attendanceApi } from '../services/attendanceApi'
import './FaceAttendancePopup.css'

function FaceAttendancePopup() {
  const [cameraActive, setCameraActive] = useState(false)
  const [status, setStatus] = useState('idle') // idle, capturing, verifying, success, failed
  const [message, setMessage] = useState('')
  const [attendanceData, setAttendanceData] = useState(null)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Get params from URL (passed by parent window)
  const params = new URLSearchParams(window.location.search)
  const presence = params.get('presence') || 'incoming'
  const threshold = parseFloat(params.get('threshold') || '0.6')

  useEffect(() => {
    // Auto-start camera when popup opens
    startCamera()
    
    return () => {
      stopCamera()
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
            setMessage('Failed to start video')
            setStatus('failed')
          })
        }
        
        setCameraActive(true)
        setMessage('Position your face in the oval')
      }
    } catch (err) {
      console.error('Camera error:', err)
      setMessage('Camera access denied. Please allow camera access.')
      setStatus('failed')
      
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

  const captureAndRecord = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setStatus('capturing')
    setMessage('Capturing image...')
    
    const canvas = canvasRef.current
    const video = videoRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.95)

    setStatus('verifying')
    setMessage('Identifying and recording attendance...')

    try {
      const response = await attendanceApi.attendanceFaceAll(base64Image, presence, threshold)
      
      if (response.success) {
        setStatus('success')
        setAttendanceData(response.data)
        setMessage(`✅ Attendance recorded for ${response.data.user_name}!`)
        
        // Stop camera
        stopCamera()
        
        // Send success to parent window
        sendMessageToParent({
          success: true,
          data: response.data,
          message: 'Face attendance successful'
        })
        
        // Close popup after 2 seconds
        setTimeout(() => {
          window.close()
        }, 2000)
      } else {
        throw new Error(response.message || 'Attendance failed')
      }
      
    } catch (err) {
      console.error('Attendance error:', err)
      setStatus('failed')
      setMessage(`❌ ${err.message || 'Attendance failed. Please try again.'}`)
      
      // Don't close popup, allow retry
    }
  }

  const sendMessageToParent = (data) => {
    // Send message to parent window using postMessage (OAuth2 pattern)
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'FACE_ATTENDANCE_RESULT',
        ...data
      }, window.location.origin)
    }
  }

  const handleCancel = () => {
    sendMessageToParent({
      success: false,
      message: 'User cancelled'
    })
    window.close()
  }

  const handleRetry = () => {
    setStatus('idle')
    setMessage('Position your face in the oval')
    setAttendanceData(null)
    if (!cameraActive) {
      startCamera()
    }
  }

  return (
    <div className="face-attendance-popup">
      <div className="popup-header">
        <h2>✅ Face Attendance (1:N Single)</h2>
        <p className="presence-display">
          {presence === 'incoming' ? '📥 Incoming' : '📤 Outcoming'}
        </p>
        <button onClick={handleCancel} className="btn-close" title="Close">✕</button>
      </div>

      <div className="popup-content">
        {/* Camera View */}
        <div className="camera-section">
          <div className="camera-container">
            {!cameraActive && status !== 'success' && (
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
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {/* Oval guide overlay */}
            {cameraActive && status === 'idle' && (
              <div className="oval-guide"></div>
            )}
          </div>
        </div>

        {/* Status & Message */}
        <div className="status-section">
          {status === 'idle' && (
            <div className="status-message">
              <p>{message}</p>
              <p className="hint">Face will be identified automatically</p>
            </div>
          )}
          
          {status === 'capturing' && (
            <div className="status-message">
              <p>📸 {message}</p>
            </div>
          )}
          
          {status === 'verifying' && (
            <div className="status-verifying">
              <div className="spinner"></div>
              <p>⏳ {message}</p>
            </div>
          )}
          
          {status === 'success' && attendanceData && (
            <div className="status-success">
              <div className="success-icon">✓</div>
              <p>{message}</p>
              <div className="attendance-details">
                <p><strong>Name:</strong> {attendanceData.user_name}</p>
                <p><strong>Email:</strong> {attendanceData.user_email}</p>
                <p><strong>Confidence:</strong> {(attendanceData.face_confidence * 100).toFixed(1)}%</p>
                <p><strong>Type:</strong> {presence === 'incoming' ? '📥 Incoming' : '📤 Outcoming'}</p>
              </div>
              <p className="redirect-msg">Window will close automatically...</p>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="status-failed">
              <p>{message}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="popup-actions">
          {(status === 'idle' || status === 'capturing') && (
            <>
              <button 
                onClick={captureAndRecord}
                disabled={!cameraActive || status === 'capturing'}
                className="btn-capture"
              >
                📸 Capture & Record
              </button>
              <button onClick={handleCancel} className="btn-cancel">
                Cancel
              </button>
            </>
          )}
          
          {status === 'verifying' && (
            <button disabled className="btn-capture">
              ⏳ Recording...
            </button>
          )}
          
          {status === 'failed' && (
            <>
              <button onClick={handleRetry} className="btn-retry">
                🔄 Try Again
              </button>
              <button onClick={handleCancel} className="btn-cancel">
                Cancel
              </button>
            </>
          )}
          
          {status === 'success' && (
            <div className="success-actions">
              <p>Attendance recorded successfully!</p>
            </div>
          )}
        </div>

        {/* Threshold Info */}
        <div className="threshold-info">
          <small>Threshold: {(threshold * 100).toFixed(0)}%</small>
        </div>
      </div>
    </div>
  )
}

export default FaceAttendancePopup
