import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCamera } from '../hooks/useCamera'
import { useFacePrediction } from '../hooks/useFacePrediction'
import { useFileUpload } from '../hooks/useFileUpload'
import { faceApi } from '../services/faceApi'
import CameraSection from '../components/FaceRegistration/CameraSection'
import FileUploadSection from '../components/FacePrediction/FileUploadSection'
import PredictionResults from '../components/FacePrediction/PredictionResults'
import './FacePrediction.css'

function FacePrediction() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const [searchParams] = useSearchParams()
  const predictionMode = searchParams.get('mode') || '1-n' // '1-n' or '1-1'
  
  // Custom Hooks
  const camera = useCamera()
  const prediction = useFacePrediction()
  const fileUpload = useFileUpload()
  
  // Local State
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [currentStatus, setCurrentStatus] = useState('')
  const [capturedImage, setCapturedImage] = useState(null)
  const [faceInPosition] = useState(false)
  const [inputMode, setInputMode] = useState('camera') // 'camera' or 'upload'

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
    
    let result
    if (predictionMode === '1-1') {
      setCurrentStatus('🔍 Verifying face...')
      result = await prediction.verifyFace(imageData, userId, 0.6)
      
      if (result.success) {
        if (result.data.verified) {
          setCurrentStatus(`✅ Verified: ${result.data.user_name}`)
        } else {
          setCurrentStatus('❌ Verification failed')
        }
      } else {
        setError(result.error)
        setCurrentStatus('❌ Verification error')
      }
    } else {
      setCurrentStatus('🔍 Identifying face...')
      result = await prediction.predictFace(imageData, 0.6)
      
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
    }
  }, [camera, prediction, predictionMode, userId])

  // Handle file upload and predict
  const handleFileUploadAndPredict = useCallback(async (file) => {
    setCurrentStatus('📤 Processing file...')
    prediction.resetPrediction()
    setError(null)
    setCapturedImage(null)
    
    try {
      const base64 = await fileUpload.handleFileSelect(file)
      
      let result
      if (predictionMode === '1-1') {
        setCurrentStatus('🔍 Verifying face...')
        result = await prediction.verifyFace(base64, userId, 0.6)
        
        if (result.success) {
          if (result.data.verified) {
            setCurrentStatus(`✅ Verified: ${result.data.user_name}`)
          } else {
            setCurrentStatus('❌ Verification failed')
          }
        } else {
          setError(result.error)
          setCurrentStatus('❌ Verification error')
        }
      } else {
        setCurrentStatus('🔍 Identifying face...')
        result = await prediction.predictFace(base64, 0.6)
        
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
      }
    } catch (err) {
      setError('Failed to process file: ' + err.message)
      setCurrentStatus('❌ File processing failed')
    }
  }, [fileUpload, prediction, predictionMode, userId])

  // Predict from uploaded file
  const handlePredictFromFile = useCallback(async () => {
    if (!fileUpload.base64Image) {
      setError('No file selected')
      return
    }
    
    prediction.resetPrediction()
    setError(null)
    
    let result
    if (predictionMode === '1-1') {
      setCurrentStatus('🔍 Verifying face...')
      result = await prediction.verifyFace(fileUpload.base64Image, userId, 0.6)
      
      if (result.success) {
        if (result.data.verified) {
          setCurrentStatus(`✅ Verified: ${result.data.user_name}`)
        } else {
          setCurrentStatus('❌ Verification failed')
        }
      } else {
        setError(result.error)
        setCurrentStatus('❌ Verification error')
      }
    } else {
      setCurrentStatus('🔍 Identifying face...')
      result = await prediction.predictFace(fileUpload.base64Image, 0.6)
      
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
    }
  }, [fileUpload.base64Image, prediction, predictionMode, userId])

  // Reset prediction
  const handleReset = useCallback(() => {
    prediction.resetPrediction()
    setCapturedImage(null)
    setCurrentStatus('')
    setError(null)
    fileUpload.clearFile()
  }, [prediction, fileUpload])

  // Switch input mode
  const handleModeChange = useCallback((mode) => {
    setInputMode(mode)
    handleReset()
    if (mode === 'camera') {
      fileUpload.clearFile()
    } else {
      camera.stopCamera()
    }
  }, [camera, fileUpload, handleReset])

  if (!user) {
    return <div className="loading">Loading user...</div>
  }

  return (
    <div className="face-prediction-page">
      <button className="back-button" onClick={() => navigate('/users')}>
        ← Back to Users
      </button>

      <div className="prediction-header">
        <h1>Face {predictionMode === '1-1' ? 'Verification (1:1)' : 'Identification (1:N)'}</h1>
        <p className="user-info">
          {predictionMode === '1-1' 
            ? `Verifying against specific user: ` 
            : `Reference user: `}
          <strong>{user.name}</strong>
        </p>
        <p className="subtitle">
          {predictionMode === '1-1'
            ? `Verify if the captured face matches ${user.name} specifically`
            : 'Capture a face to identify who it matches in the database'}
        </p>
      </div>

      <div className="prediction-content">
        {/* Input Mode Selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${inputMode === 'camera' ? 'active' : ''}`}
            onClick={() => handleModeChange('camera')}
          >
            📷 Camera
          </button>
          <button
            className={`mode-btn ${inputMode === 'upload' ? 'active' : ''}`}
            onClick={() => handleModeChange('upload')}
          >
            📁 Upload File
          </button>
        </div>

        {/* Input Section */}
        <div className="input-section">
          {inputMode === 'camera' ? (
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
          ) : (
            <div className="upload-section">
              <FileUploadSection
                onFileSelect={handleFileUploadAndPredict}
                selectedFile={fileUpload.selectedFile}
                previewImage={fileUpload.previewImage}
                onClearFile={fileUpload.clearFile}
              />

              {currentStatus && (
                <div className="status-message">{currentStatus}</div>
              )}

              {fileUpload.selectedFile && !prediction.predictionResult && (
                <div className="upload-controls">
                  <button
                    onClick={handlePredictFromFile}
                    disabled={prediction.loading}
                    className="btn-predict"
                  >
                    {prediction.loading ? '⏳ Predicting...' : '🔍 Predict Face'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="results-section">
          <h3>Prediction Results</h3>
          
          <PredictionResults
            predictionResult={prediction.predictionResult}
            capturedImage={inputMode === 'camera' ? capturedImage : fileUpload.previewImage}
            error={error}
            onReset={handleReset}
            inputMode={inputMode}
          />
        </div>
      </div>
    </div>
  )
}

export default FacePrediction
