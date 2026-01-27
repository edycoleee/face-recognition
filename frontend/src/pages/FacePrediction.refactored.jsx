import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCamera } from '../hooks/useCamera'
import { useFacePrediction } from '../hooks/useFacePrediction'
import { faceApi } from '../services/faceApi'
import CameraSection from '../components/FaceRegistration/CameraSection'
import PredictionResults from '../components/FacePrediction/PredictionResults'
import './FacePrediction.css'

function FacePrediction() {
  const navigate = useNavigate()
  const { userId } = useParams()
  
  // Custom Hooks
  const camera = useCamera()
  const prediction = useFacePrediction()
  
  // Local State
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [currentStatus, setCurrentStatus] = useState('')
  const [capturedImage, setCapturedImage] = useState(null)
  const [faceInPosition] = useState(false) // Can be enhanced with position detection

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

    fetchUserData()

    return () => {
      camera.stopCamera()
    }
  }, [userId])

  // Handle capture and predict
  const handleCaptureAndPredict = useCallback(async () => {
    setCurrentStatus('📸 Capturing...')
    prediction.resetPrediction()
    setError(null)
    
    const imageData = camera.captureFrame()
    if (!imageData) {
      setCurrentStatus('⏳ Waiting for camera...')
      return
    }
    
    setCapturedImage(imageData)
    setCurrentStatus('🔍 Identifying face...')

    const result = await prediction.predictFace(imageData, 0.6)
    
    if (result.success) {
      if (result.data.identified) {
        setCurrentStatus(`✅ Identified: ${result.data.user_name}`)
      } else {
        setCurrentStatus('❌ No match found')
      }
    } else {
      setError(result.error)
      setCurrentStatus('❌ Prediction failed')
    }
  }, [camera, prediction])

  // Reset prediction
  const handleReset = useCallback(() => {
    prediction.resetPrediction()
    setCapturedImage(null)
    setCurrentStatus('')
    setError(null)
  }, [prediction])

  if (!user) {
    return <div className="loading">Loading user...</div>
  }

  return (
    <div className="face-prediction-page">
      <button className="back-button" onClick={() => navigate('/users')}>
        ← Back to Users
      </button>

      <div className="prediction-header">
        <h1>Face Prediction</h1>
        <p className="user-info">
          Testing prediction for reference: <strong>{user.name}</strong>
        </p>
        <p className="subtitle">Capture a face to identify who it matches in the database</p>
      </div>

      <div className="prediction-content">
        {/* Camera Section */}
        <div className="camera-section">
          <CameraSection
            cameraActive={camera.cameraActive}
            faceInPosition={faceInPosition}
            videoRef={camera.videoRef}
            onStartCamera={camera.startCamera}
          />

          {currentStatus && (
            <div className="status-message">{currentStatus}</div>
          )}

          {camera.cameraActive && (
            <div className="camera-controls">
              <button
                onClick={handleCaptureAndPredict}
                disabled={prediction.loading}
                className="btn-predict"
              >
                {prediction.loading ? '⏳ Predicting...' : '🔍 Capture & Predict'}
              </button>
              <button onClick={camera.stopCamera} className="btn-stop-camera">
                Stop Camera
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="results-section">
          <h3>Prediction Results</h3>
          
          <PredictionResults
            predictionResult={prediction.predictionResult}
            capturedImage={capturedImage}
            error={error}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  )
}

export default FacePrediction
