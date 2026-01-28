import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCamera } from '../hooks/useCamera'
import { useCapture } from '../hooks/useCapture'
import { useFaceValidation } from '../hooks/useFaceValidation'
import { faceApi } from '../services/faceApi'
import CameraSection from '../components/FaceRegistration/CameraSection'
import CameraControls from '../components/FaceRegistration/CameraControls'
import CaptureGrid from '../components/FaceRegistration/CaptureGrid'
import './FaceRegistration.css'

function FaceRegistration() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'register'
  
  // Custom Hooks
  const camera = useCamera()
  const capture = useCapture(10) // Default 10 images
  const { faceInPosition, validateFace, checkFacePosition } = useFaceValidation()
  
  // Local State
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentStatus, setCurrentStatus] = useState('')
  const [existingFaceCount, setExistingFaceCount] = useState(0)
  const [inputMethod, setInputMethod] = useState('camera') // 'camera', 'upload-single', 'upload-multiple'
  const fileInputRef = useCallback(() => {
    const ref = { current: null }
    return ref
  }, [])()

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await faceApi.getUser(userId)
        if (data.success) {
          setUser(data.data)
        } else {
          setError(data.message)
        }
      } catch (err) {
        setError('Failed to fetch user: ' + err.message)
      }
    }

    const fetchFaceCount = async () => {
      if (mode === 'update') {
        try {
          const data = await faceApi.getExistingFaceCount(userId)
          if (data.success) {
            setExistingFaceCount(data.data.embeddings_count || 0)
          }
        } catch (err) {
          console.error('Failed to fetch face count:', err)
        }
      }
    }

    fetchUserData()
    fetchFaceCount()

    return () => {
      camera.stopCamera()
    }
  }, [userId, mode])

  // Handle capture with validation
  const handleCapture = useCallback(async () => {
    if (capture.isCapturing) return
    
    capture.setIsCapturing(true)
    setCurrentStatus('📸 Capturing...')
    
    const imageData = camera.captureFrame()
    if (!imageData) {
      setCurrentStatus('❌ Capture failed')
      capture.setIsCapturing(false)
      return
    }

    try {
      setCurrentStatus('🔍 Validating face...')
      const validateData = await validateFace(imageData)
      
      if (validateData.success) {
        const faceData = validateData.data
        
        // Check position if overlay canvas exists
        const overlayCanvas = document.querySelector('.overlay-canvas')
        if (overlayCanvas) {
          const isInPosition = checkFacePosition(
            faceData,
            overlayCanvas.width,
            overlayCanvas.height
          )
          
          if (!isInPosition) {
            setCurrentStatus('⚠️ Move your face inside the oval guide')
            capture.setIsCapturing(false)
            return
          }
        }
        
        // Add capture
        capture.addCapture(imageData, faceData)
        setCurrentStatus(`✅ Captured ${capture.captures.length + 1}/${capture.targetCaptures}`)
        
        // Auto-submit if target reached in auto mode
        if (capture.captures.length + 1 >= capture.targetCaptures && capture.captureMode === 'auto') {
          setTimeout(() => {
            capture.stopAutoCapture()
            setCurrentStatus('✅ All captures completed! Submitting...')
            setTimeout(() => handleSubmit(true), 1000)
          }, 500)
        }
      } else {
        setCurrentStatus(`❌ ${validateData.message}`)
      }
    } catch (err) {
      setCurrentStatus('❌ Validation error: ' + err.message)
    } finally {
      capture.setIsCapturing(false)
    }
  }, [camera, capture, validateFace, checkFacePosition])

  // Handle file upload (single or multiple)
  const handleFileUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    setLoading(true)
    setCurrentStatus(`📤 Processing ${files.length} image(s)...`)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Convert to base64
        const reader = new FileReader()
        const imageData = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // Validate face
        setCurrentStatus(`🔍 Validating image ${i + 1}/${files.length}...`)
        const validateData = await validateFace(imageData)
        
        if (validateData.success) {
          capture.addCapture(imageData, validateData.data)
          setCurrentStatus(`✅ Added ${i + 1}/${files.length} - Total: ${capture.captures.length + 1}`)
        } else {
          setCurrentStatus(`⚠️ Image ${i + 1} skipped: ${validateData.message}`)
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      }

      setCurrentStatus(`✅ Successfully processed ${files.length} image(s)`)
    } catch (err) {
      setError('Upload failed: ' + err.message)
      setCurrentStatus('❌ Upload failed')
    } finally {
      setLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [validateFace, capture, fileInputRef])

  // Trigger file input click
  const handleUploadClick = useCallback((multiple = false) => {
    if (fileInputRef.current) {
      fileInputRef.current.multiple = multiple
      fileInputRef.current.click()
    }
  }, [fileInputRef])

  // Handle submission
  const handleSubmit = useCallback(async (isAuto = false) => {
    const currentCaptures = isAuto ? capture.capturesRef.current : capture.captures
    
    if (currentCaptures.length < 5) {
      setError('Please capture at least 5 images')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const images = currentCaptures.map(c => c.image)
      const data = await faceApi.registerFaces(userId, images)
      
      if (data.success) {
        const count = data.data.successful || currentCaptures.length
        setCurrentStatus(`✅ Registered ${count} faces!`)
        setTimeout(() => navigate('/users'), 1500)
      } else {
        setError(data.message)
        setLoading(false)
      }
    } catch (err) {
      setError('Registration failed: ' + err.message)
      setLoading(false)
    }
  }, [userId, capture, navigate])

  // Camera controls handlers
  const handleManualMode = () => {
    capture.stopAutoCapture()
    capture.setCaptureMode('manual')
  }

  const handleAutoCapture = () => {
    capture.startAutoCapture(handleCapture)
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
        <h1>{mode === 'update' ? 'Update Face Data' : 'Register Face'}</h1>
        <p className="user-info">
          {mode === 'update' ? 'Adding more face data for: ' : 'Registering face for: '}
          <strong>{user.name}</strong>
        </p>
        {mode === 'update' && existingFaceCount > 0 && (
          <p className="existing-count">
            Currently has <strong>{existingFaceCount}</strong> face images registered
          </p>
        )}
      </div>

      <div className="registration-content">
        {/* Input Method Selection */}
        <div className="input-method-selector">
          <h3>Choose Input Method:</h3>
          <div className="method-buttons">
            <button 
              className={`method-btn ${inputMethod === 'camera' ? 'active' : ''}`}
              onClick={() => setInputMethod('camera')}
            >
              📷 Camera Capture
            </button>
            <button 
              className={`method-btn ${inputMethod === 'upload-single' ? 'active' : ''}`}
              onClick={() => setInputMethod('upload-single')}
            >
              🖼️ Upload Single Image
            </button>
            <button 
              className={`method-btn ${inputMethod === 'upload-multiple' ? 'active' : ''}`}
              onClick={() => setInputMethod('upload-multiple')}
            >
              📁 Upload Multiple Images
            </button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {/* Upload Section */}
        {(inputMethod === 'upload-single' || inputMethod === 'upload-multiple') && (
          <div className="upload-section">
            <div className="upload-area">
              <div className="upload-icon">📤</div>
              <h3>
                {inputMethod === 'upload-single' 
                  ? 'Upload Single Face Image' 
                  : 'Upload Multiple Face Images'}
              </h3>
              <p>
                {inputMethod === 'upload-single'
                  ? 'Select one clear face image'
                  : 'Select multiple face images at once'}
              </p>
              <button 
                className="btn-upload"
                onClick={() => handleUploadClick(inputMethod === 'upload-multiple')}
                disabled={loading}
              >
                {inputMethod === 'upload-single' 
                  ? '📂 Choose Image' 
                  : '📂 Choose Images'}
              </button>
            </div>
          </div>
        )}

        {/* Camera Section */}
        {inputMethod === 'camera' && (
          <div className="camera-section">
            {/* Target Captures Selection */}
            <div className="target-selection">
              <h3>Number of Images to Capture:</h3>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="targetCaptures"
                    value="5"
                    checked={capture.targetCaptures === 5}
                    onChange={(e) => capture.setTargetCaptures(Number(e.target.value))}
                    disabled={capture.captures.length > 0}
                  />
                  <span>5 Images (Faster ⚡)</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="targetCaptures"
                    value="10"
                    checked={capture.targetCaptures === 10}
                    onChange={(e) => capture.setTargetCaptures(Number(e.target.value))}
                    disabled={capture.captures.length > 0}
                  />
                  <span>10 Images (More Accurate 🎯)</span>
                </label>
              </div>
              {capture.captures.length > 0 && (
                <p className="selection-note">
                  ℹ️ Reset captures to change target
                </p>
              )}
            </div>

            <CameraSection
              cameraActive={camera.cameraActive}
              faceInPosition={faceInPosition}
              videoRef={camera.videoRef}
              onStartCamera={camera.startCamera}
            />

            {/* Status Message */}
            {currentStatus && (
              <div className="status-message">{currentStatus}</div>
            )}

            {/* Camera Controls */}
            {camera.cameraActive && !loading && (
              <CameraControls
                captureMode={capture.captureMode}
                isCapturing={capture.isCapturing}
                capturesCount={capture.captures.length}
                targetCaptures={capture.targetCaptures}
                autoInterval={capture.autoInterval}
                onManualMode={handleManualMode}
                onAutoCapture={handleAutoCapture}
                onStopAuto={capture.stopAutoCapture}
                onCapture={handleCapture}
                onStopCamera={camera.stopCamera}
              />
            )}
          </div>
        )}

        {/* Status Message for Upload */}
        {inputMethod !== 'camera' && currentStatus && (
          <div className="status-message">{currentStatus}</div>
        )}

        {/* Captures Grid */}
        <CaptureGrid
          captures={capture.captures}
          targetCaptures={capture.targetCaptures}
          loading={loading}
          onDeleteCapture={capture.deleteCapture}
          onResetCaptures={capture.resetCaptures}
        />

        {/* Loading & Error States */}
        {loading && (
          <div className="loading-message">
            <div className="spinner"></div>
            <p>⏳ {mode === 'update' ? 'Adding' : 'Registering'} {capture.captures.length} faces to database...</p>
          </div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* Submit Button */}
        {capture.captures.length >= 5 && !loading && (
          <button onClick={() => handleSubmit(false)} className="btn-submit">
            {mode === 'update' 
              ? `Add ${capture.captures.length} More Faces` 
              : `Register ${capture.captures.length} Faces`}
          </button>
        )}
      </div>
    </div>
  )
}

export default FaceRegistration
