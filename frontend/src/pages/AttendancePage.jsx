import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { attendanceApi } from '../services/attendanceApi'
import { authApi } from '../services/authApi'
import { openFaceAttendanceSinglePopup, openFaceAttendanceMultiPopup, openFaceAttendanceContinuousPopup } from '../utils/popupAttendance'
import './AttendancePage.css'

function AttendancePage() {
  const navigate = useNavigate()
  
  // Mode state: 'password', 'face', 'face-single', 'face-multi', or 'face-continuous'
  const [attendanceMode, setAttendanceMode] = useState('password')
  
  // Common state
  const [email, setEmail] = useState('')
  const [presence, setPresence] = useState('incoming')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  
  // Password mode
  const [password, setPassword] = useState('')
  
  // Face mode
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [threshold, setThreshold] = useState(0.6)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Cleanup camera on unmount
  useEffect(() => {
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
            setError('Failed to play video stream')
          })
        }
        
        setCameraActive(true)
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
    setCameraActive(false)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.95)
    
    canvas.toBlob(async (blob) => {
      setCapturedImage(blob)
      setError('')
      stopCamera()
      
      // Auto verify face attendance
      await verifyFaceAttendance(base64Image)
    }, 'image/jpeg', 0.95)
  }

  const verifyFaceAttendance = async (base64Image) => {
    if (!email) {
      setError('Please enter your email first')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      // Get user by email
      const userResponse = await authApi.getUserByEmail(email)
      
      if (!userResponse.success) {
        throw new Error('User not found')
      }

      const userId = userResponse.data.id

      // Record face attendance
      const response = await attendanceApi.attendanceFaceOne(
        userId,
        base64Image,
        presence,
        threshold
      )

      if (!response.success) {
        throw new Error(response.message || 'Face attendance failed')
      }

      setSuccess(response.data)
      
    } catch (err) {
      console.error('Face attendance error:', err)
      setError(err.message || 'Face attendance failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordAttendance = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const response = await attendanceApi.attendancePassword(
        email,
        password,
        presence
      )

      if (!response.success) {
        throw new Error(response.message || 'Attendance failed')
      }

      setSuccess(response.data)
      setEmail('')
      setPassword('')
      
    } catch (err) {
      setError(err.message || 'Failed to record attendance')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (mode) => {
    setAttendanceMode(mode)
    setError('')
    setSuccess(null)
    setPassword('')
    setCapturedImage(null)
    
    if (mode === 'password') {
      stopCamera()
    }
  }

  const resetCapture = () => {
    setCapturedImage(null)
    setError('')
    setSuccess(null)
    startCamera()
  }

  const handleFaceSingleAttendance = async () => {
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const result = await openFaceAttendanceSinglePopup({
        presence,
        threshold
      })

      if (result.success) {
        setSuccess(result.data)
      }
    } catch (err) {
      setError(err.message || 'Face attendance failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFaceMultiAttendance = async () => {
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const result = await openFaceAttendanceMultiPopup({
        presence,
        threshold
      })

      if (result.success && result.data) {
        // Show summary for multiple faces
        const recorded = result.data.filter(r => r.identified && !r.skipped).length
        const skipped = result.data.filter(r => r.skipped).length
        const unknown = result.data.filter(r => !r.identified).length
        
        setSuccess({
          summary: true,
          total: result.data.length,
          recorded,
          skipped,
          unknown,
          message: result.message,
          details: result.data
        })
      }
    } catch (err) {
      setError(err.message || 'Face attendance failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFaceContinuousAttendance = async () => {
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const result = await openFaceAttendanceContinuousPopup({
        presence,
        threshold
      })

      if (result.success && result.data) {
        // Show session summary
        setSuccess({
          summary: true,
          sessionEnded: true,
          total: result.data.sessionStats.total,
          recorded: result.data.sessionStats.recorded,
          skipped: result.data.sessionStats.skipped,
          unknown: result.data.sessionStats.unknown,
          message: result.message
        })
      }
    } catch (err) {
      setError(err.message || 'Continuous attendance session ended')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="attendance-page">
      <div className="attendance-wrapper">
        <h1 className="attendance-main-title">✅ Face Attendance System</h1>
        
        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${attendanceMode === 'password' ? 'active' : ''}`}
            onClick={() => switchMode('password')}
          >
            🔑 Password
          </button>
          <button
            className={`mode-btn ${attendanceMode === 'face' ? 'active' : ''}`}
            onClick={() => switchMode('face')}
          >
            📷 Face 1:1
          </button>
          <button
            className={`mode-btn ${attendanceMode === 'face-single' ? 'active' : ''}`}
            onClick={() => switchMode('face-single')}
          >
            🎭 Face 1:N
          </button>
          <button
            className={`mode-btn ${attendanceMode === 'face-multi' ? 'active' : ''}`}
            onClick={() => switchMode('face-multi')}
          >
            👥 Face N:N
          </button>
          <button
            className={`mode-btn ${attendanceMode === 'face-continuous' ? 'active' : ''}`}
            onClick={() => switchMode('face-continuous')}
          >
            🔄 N:N Continuous
          </button>
        </div>

        <div className="attendance-content">
          {/* Left Side - Attendance Form */}
          <div className="attendance-form-card">
            <h2 className="form-title">
              {attendanceMode === 'face' && '📷 Face Attendance (1:1)'}
              {attendanceMode === 'password' && '🔑 Password Attendance'}
              {attendanceMode === 'face-single' && '🎭 Face Attendance (1:N Single)'}
              {attendanceMode === 'face-multi' && '👥 Face Attendance (N:N Multiple)'}
              {attendanceMode === 'face-continuous' && '🔄 Face Attendance (N:N Continuous)'}
            </h2>

            {/* Presence Radio Buttons (Common) */}
            <div className="form-group">
              <label>Presence Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="presence"
                    value="incoming"
                    checked={presence === 'incoming'}
                    onChange={(e) => setPresence(e.target.value)}
                    disabled={loading}
                  />
                  <span>📥 Incoming</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="presence"
                    value="outcoming"
                    checked={presence === 'outcoming'}
                    onChange={(e) => setPresence(e.target.value)}
                    disabled={loading}
                  />
                  <span>📤 Outcoming</span>
                </label>
              </div>
            </div>

            {/* Email Input (Common for password and face 1:1) */}
            {(attendanceMode === 'password' || attendanceMode === 'face') && (
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            )}

            {/* Face Attendance Mode - Controls Only */}
            {attendanceMode === 'face' && (
              <div className="face-attendance-section">
                <div className="form-group">
                  <label>Confidence Threshold</label>
                  <div className="threshold-control">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      disabled={loading}
                    />
                    <span className="threshold-value">{threshold.toFixed(2)}</span>
                  </div>
                </div>

                <div className="attendance-instructions">
                  <p>📋 Instructions:</p>
                  <ol>
                    <li>Select presence type (Incoming/Outcoming)</li>
                    <li>Enter your email address</li>
                    <li>Click "Start Camera" on the right</li>
                    <li>Position your face in the frame</li>
                    <li>Click "Capture & Record" to submit</li>
                  </ol>
                  <p style={{ marginTop: '0.75rem', fontSize: '13px', color: '#666' }}>
                    ℹ️ Attendance recorded automatically after face verification
                  </p>
                </div>
              </div>
            )}

            {/* Password Attendance Mode */}
            {attendanceMode === 'password' && (
              <div className="password-attendance-section">
                <form onSubmit={handlePasswordAttendance}>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-submit"
                    disabled={loading || !email || !password}
                  >
                    {loading ? '⏳ Recording...' : '✅ Record Attendance'}
                  </button>
                </form>
              </div>
            )}

            {/* Face Single Attendance Mode - Popup */}
            {attendanceMode === 'face-single' && (
              <div className="face-single-attendance-section">
                <div className="form-group">
                  <label>Confidence Threshold</label>
                  <div className="threshold-control">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      disabled={loading}
                    />
                    <span className="threshold-value">{threshold.toFixed(2)}</span>
                  </div>
                </div>

                <div className="attendance-instructions">
                  <p>📋 Instructions:</p>
                  <ol>
                    <li>Select presence type (Incoming/Outcoming)</li>
                    <li>Adjust confidence threshold if needed</li>
                    <li>Click "Open Camera Popup" button below</li>
                    <li>Position your face in the oval guide</li>
                    <li>Click "Capture & Record" in the popup</li>
                  </ol>
                  <p style={{ marginTop: '0.75rem', fontSize: '13px', color: '#666' }}>
                    ℹ️ Your face will be automatically identified from the database
                  </p>
                </div>

                <button
                  onClick={handleFaceSingleAttendance}
                  className="btn btn-submit"
                  disabled={loading}
                >
                  {loading ? '⏳ Opening...' : '📷 Open Camera Popup'}
                </button>
              </div>
            )}

            {/* Face Multi Attendance Mode - Popup for Multiple Faces */}
            {attendanceMode === 'face-multi' && (
              <div className="face-multi-attendance-section">
                <div className="form-group">
                  <label>Confidence Threshold</label>
                  <div className="threshold-control">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      disabled={loading}
                    />
                    <span className="threshold-value">{threshold.toFixed(2)}</span>
                  </div>
                </div>

                <div className="attendance-instructions">
                  <p>📋 Instructions:</p>
                  <ol>
                    <li>Select presence type (Incoming/Outcoming)</li>
                    <li>Adjust confidence threshold if needed</li>
                    <li>Click "Open Camera Popup" button below</li>
                    <li>Position multiple people in the camera frame</li>
                    <li>Click "Capture & Record" to process all faces</li>
                  </ol>
                  <p style={{ marginTop: '0.75rem', fontSize: '13px', color: '#666' }}>
                    ℹ️ All faces will be identified and recorded. Minimum 2 hours between records per person.
                  </p>
                </div>

                <button
                  onClick={handleFaceMultiAttendance}
                  className="btn btn-submit"
                  disabled={loading}
                >
                  {loading ? '⏳ Opening...' : '👥 Open Camera Popup (Multi)'}
                </button>
              </div>
            )}

            {/* Face Continuous Attendance Mode - Automatic Recognition */}
            {attendanceMode === 'face-continuous' && (
              <div className="face-continuous-attendance-section">
                <div className="form-group">
                  <label>Confidence Threshold</label>
                  <div className="threshold-control">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      disabled={loading}
                    />
                    <span className="threshold-value">{threshold.toFixed(2)}</span>
                  </div>
                </div>

                <div className="attendance-instructions">
                  <p>📋 Instructions:</p>
                  <ol>
                    <li>Select presence type (Incoming/Outcoming)</li>
                    <li>Adjust confidence threshold if needed</li>
                    <li>Click "Start Continuous Recognition" button</li>
                    <li>Camera will automatically recognize faces every 3 seconds</li>
                    <li>View live results on the right side of the popup</li>
                    <li>Click "Stop & Close" when finished</li>
                  </ol>
                  <p style={{ marginTop: '0.75rem', fontSize: '13px', color: '#666' }}>
                    ℹ️ Continuous mode: Auto-recognition every 3 seconds. 2-hour protection per person.
                  </p>
                </div>

                <button
                  onClick={handleFaceContinuousAttendance}
                  className="btn btn-submit"
                  disabled={loading}
                >
                  {loading ? '⏳ Opening...' : '🔄 Start Continuous Recognition'}
                </button>
              </div>
            )}

            {/* Messages */}
            {error && <div className="message error-message">❌ {error}</div>}
            {success && !success.summary && (
              <div className="message success-message">
                <div className="success-header">✅ Attendance Recorded!</div>
                <div className="success-details">
                  <p><strong>Name:</strong> {success.user_name}</p>
                  <p><strong>Email:</strong> {success.user_email}</p>
                  <p><strong>Method:</strong> {success.method === 'password' ? 'Password' : 'Face Recognition (1:1)'}</p>
                  {success.face_confidence && (
                    <p><strong>Confidence:</strong> {(success.face_confidence * 100).toFixed(1)}%</p>
                  )}
                  <p><strong>Type:</strong> {success.presence === 'incoming' ? '📥 Incoming' : '📤 Outcoming'}</p>
                  <p><strong>Time:</strong> {new Date(success.created_at).toLocaleString()}</p>
                </div>
              </div>
            )}
            {success && success.summary && (
              <div className="message success-message">
                <div className="success-header">
                  {success.sessionEnded ? '🔄 Continuous Session Complete!' : '✅ Multi-Face Attendance Complete!'}
                </div>
                <div className="success-details">
                  <p><strong>Total Faces:</strong> {success.total}</p>
                  <p><strong>✅ Recorded:</strong> {success.recorded}</p>
                  {success.skipped > 0 && <p><strong>⏭️ Skipped (within 2h):</strong> {success.skipped}</p>}
                  {success.unknown > 0 && <p><strong>❓ Unknown:</strong> {success.unknown}</p>}
                  <p style={{ marginTop: '0.75rem', fontSize: '14px', color: '#059669' }}>
                    {success.message}
                  </p>
                </div>
              </div>
            )}

            {/* Back to Home */}
            <button
              onClick={() => navigate('/')}
              className="btn btn-text"
              disabled={loading}
            >
              ← Back to Home
            </button>
          </div>

          {/* Right Side - Camera/Preview for Face Attendance */}
          {attendanceMode === 'face' && (
            <div className="camera-preview-card">
              <h3 className="preview-title">Camera Preview</h3>
              
              {!capturedImage ? (
                <div className="camera-section">
                  <div className="camera-container">
                    {!cameraActive && (
                      <div className="camera-placeholder">
                        <p>📷</p>
                        <button onClick={startCamera} className="btn-start-camera" disabled={loading}>
                          Start Camera
                        </button>
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
                  </div>

                  {cameraActive && (
                    <>
                      <p className="video-instruction">Position your face in the frame</p>
                      <div className="camera-controls">
                        <button onClick={captureImage} className="btn-predict" disabled={loading || !email}>
                          📸 Capture & Record Attendance
                        </button>
                        <button onClick={stopCamera} className="btn-stop-camera" disabled={loading}>
                          Stop Camera
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="captured-section">
                  <div className="captured-preview">
                    <img
                      src={URL.createObjectURL(capturedImage)}
                      alt="Captured face"
                    />
                  </div>
                  
                  {loading && (
                    <div className="verification-status verifying">
                      <div className="spinner"></div>
                      <p>⏳ Recording attendance...</p>
                    </div>
                  )}
                  
                  {!loading && error && (
                    <div className="verification-status failed">
                      <p>❌ Recording Failed</p>
                      <button onClick={resetCapture} className="btn-reset">
                        🔄 Try Again
                      </button>
                    </div>
                  )}
                  
                  {!loading && success && (
                    <div className="verification-status success">
                      <p>✅ Attendance Recorded Successfully!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right Side - Info for Password Attendance */}
          {attendanceMode === 'password' && (
            <div className="info-card">
              <h3>🔑 Password Attendance</h3>
              <div className="info-content">
                <p>✅ Quick and simple method</p>
                <p>💻 No camera required</p>
                <p>⚡ Instant verification</p>
                <p>🔄 Fallback option</p>
              </div>
              <div className="security-note">
                <strong>Security Note:</strong>
                <p>Your password is encrypted and securely stored using SHA256 hashing.</p>
              </div>
            </div>
          )}

          {/* Right Side - Info for Face Single Attendance */}
          {attendanceMode === 'face-single' && (
            <div className="info-card">
              <h3>🎭 Face 1:N Single</h3>
              <div className="info-content">
                <p>🎯 Automatic identification</p>
                <p>📸 No email required</p>
                <p>🪟 Popup window interface</p>
                <p>🔒 Secure and fast</p>
              </div>
              <div className="security-note">
                <strong>How it works:</strong>
                <p>Your face is automatically matched against all registered users in the database. The system identifies you and records your attendance in one step.</p>
              </div>
            </div>
          )}

          {/* Right Side - Info for Face Multi Attendance */}
          {attendanceMode === 'face-multi' && (
            <div className="info-card">
              <h3>👥 Face N:N Multiple</h3>
              <div className="info-content">
                <p>👨‍👩‍👧‍👦 Multiple people at once</p>
                <p>🖼️ Wider camera view</p>
                <p>⚡ Batch attendance recording</p>
                <p>⏰ 2 hour minimum interval</p>
              </div>
              <div className="security-note">
                <strong>Smart Features:</strong>
                <p>Detects and identifies all faces in the frame. Each person is recorded only if they haven't attended within the last 2 hours, preventing duplicate records.</p>
              </div>
            </div>
          )}

          {/* Right Side - Info for Face Continuous Attendance */}
          {attendanceMode === 'face-continuous' && (
            <div className="info-card">
              <h3>🔄 N:N Continuous</h3>
              <div className="info-content">
                <p>🎬 Automatic recognition every 3s</p>
                <p>📊 Live results feed</p>
                <p>👥 Handles multiple people</p>
                <p>⏰ Session-based tracking</p>
              </div>
              <div className="security-note">
                <strong>Continuous Mode:</strong>
                <p>Camera automatically recognizes faces every 3 seconds. Perfect for monitoring entry/exit points. View live results with color-coded status: Green (recorded), Blue (skipped - within 2h), Orange (unknown).</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AttendancePage
