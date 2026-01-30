import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FaceRecognition from '../components/FaceRecognition'
import { openFaceRecognitionOptimizedPopup } from '../utils/popupRecognition'
import './FaceRecognitionPage.css'

function FaceRecognitionPage() {
  const navigate = useNavigate()
  const [recognitionMode, setRecognitionMode] = useState('standard') // 'standard' or 'optimized'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const handleOptimizedRecognition = async () => {
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const result = await openFaceRecognitionOptimizedPopup()

      if (result.success && result.data) {
        setSuccess({
          user: result.data,
          message: result.message
        })
      }
    } catch (err) {
      setError(err.message || 'Recognition session ended')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="face-recognition-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Home
      </button>

      <h1>Face Recognition</h1>
      <p className="subtitle">Detect and identify faces from your database</p>

      {/* Mode Selector */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${recognitionMode === 'standard' ? 'active' : ''}`}
          onClick={() => {
            setRecognitionMode('standard')
            setError('')
            setSuccess(null)
          }}
        >
          📷 Standard Mode
        </button>
        <button
          className={`mode-btn ${recognitionMode === 'optimized' ? 'active' : ''}`}
          onClick={() => {
            setRecognitionMode('optimized')
            setError('')
            setSuccess(null)
          }}
        >
          ⚡ Webcam Popup Optimized
        </button>
      </div>

      <div className="recognition-content">
        {recognitionMode === 'standard' ? (
          <FaceRecognition />
        ) : (
          <div className="optimized-mode-card">
            <h2>⚡ Webcam Popup Optimized</h2>
            <p className="mode-description">
              Optimized face recognition using separate input and output canvases for better performance.
              Camera input and bounding box rendering are separated to prevent lag.
            </p>

            <div className="settings-section">
              <div className="instructions">
                <h3>📋 How it works:</h3>
                <ol>
                  <li>Click "Open Optimized Recognition" to open popup window</li>
                  <li>Camera starts with 2 separate canvases</li>
                  <li><strong>Input Canvas</strong>: Captures frames from camera</li>
                  <li><strong>Output Canvas</strong>: Shows face with bounding box & identity</li>
                  <li>Click "Capture & Recognize" to identify the person</li>
                  <li>System matches face against database</li>
                  <li>View identity result instantly</li>
                </ol>
                <p className="note">
                  💡 <strong>Why optimized?</strong> Separate canvases prevent render blocking,
                  making the camera feed smoother and more responsive.
                </p>
              </div>

              <button
                onClick={handleOptimizedRecognition}
                className="btn-open-popup"
                disabled={loading}
              >
                {loading ? '⏳ Opening...' : '⚡ Open Optimized Recognition'}
              </button>
            </div>

            {error && (
              <div className="message error-message">
                ❌ {error}
              </div>
            )}

            {success && (
              <div className="message success-message">
                <div className="success-header">✅ Face Recognized!</div>
                <div className="success-details">
                  <p><strong>Name:</strong> {success.user.name}</p>
                  <p><strong>Email:</strong> {success.user.email}</p>
                  <p><strong>Confidence:</strong> {(success.user.confidence * 100).toFixed(1)}%</p>
                  <p style={{ marginTop: '0.75rem', fontSize: '14px', color: '#059669' }}>
                    {success.message}
                  </p>
                </div>
              </div>
            )}

            <div className="info-card">
              <h3>🎯 Benefits:</h3>
              <ul>
                <li>⚡ Faster camera rendering - no lag</li>
                <li>📥 Separate input canvas for capture</li>
                <li>📤 Separate output canvas for results</li>
                <li>🎯 Accurate face detection & recognition</li>
                <li>🚀 Optimized performance</li>
                <li>🪟 Clean popup interface</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FaceRecognitionPage
