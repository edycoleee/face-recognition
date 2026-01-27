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
  const capture = useCapture()
  const { faceInPosition, validateFace, checkFacePosition } = useFaceValidation()
  
  // Local State
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentStatus, setCurrentStatus] = useState('')
  const [existingFaceCount, setExistingFaceCount] = useState(0)

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
        setCurrentStatus(`✅ Captured ${capture.captures.length + 1}/${capture.TARGET_CAPTURES}`)
        
        // Auto-submit if target reached in auto mode
        if (capture.captures.length + 1 >= capture.TARGET_CAPTURES && capture.captureMode === 'auto') {
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
        {/* Camera Section */}
        <div className="camera-section">
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
              targetCaptures={capture.TARGET_CAPTURES}
              autoInterval={capture.autoInterval}
              onManualMode={handleManualMode}
              onAutoCapture={handleAutoCapture}
              onStopAuto={capture.stopAutoCapture}
              onCapture={handleCapture}
              onStopCamera={camera.stopCamera}
            />
          )}
        </div>

        {/* Captures Grid */}
        <CaptureGrid
          captures={capture.captures}
          targetCaptures={capture.TARGET_CAPTURES}
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
