import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FaceDetection from '../components/FaceDetection'
import { openFaceDetectionContinuousPopup } from '../utils/popupDetection'
import './FaceDetectionPage.css'

function FaceDetectionPage() {
  const navigate = useNavigate()
  const [detectionMode, setDetectionMode] = useState('upload') // 'upload', 'webcam', or 'continuous'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [threshold, setThreshold] = useState(0.5)

  const handleContinuousDetection = async () => {
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const result = await openFaceDetectionContinuousPopup({
        threshold
      })

      if (result.success && result.data) {
        // Show session summary
        setSuccess({
          sessionStats: result.data.sessionStats,
          message: result.message
        })
      }
    } catch (err) {
      setError(err.message || 'Detection session ended')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="face-detection-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Home
      </button>

      <h1>Face Detection</h1>
      <p className="subtitle">Detect faces using AI - Upload images or use webcam</p>

      {/* Mode Selector */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${detectionMode === 'upload' ? 'active' : ''}`}
          onClick={() => {
            setDetectionMode('upload')
            setError('')
            setSuccess(null)
          }}
        >
          📤 Upload Image
        </button>
        <button
          className={`mode-btn ${detectionMode === 'webcam' ? 'active' : ''}`}
          onClick={() => {
            setDetectionMode('webcam')
            setError('')
            setSuccess(null)
          }}
        >
          📷 Webcam
        </button>
        <button
          className={`mode-btn ${detectionMode === 'continuous' ? 'active' : ''}`}
          onClick={() => {
            setDetectionMode('continuous')
            setError('')
            setSuccess(null)
          }}
        >
          🔄 Webcam Continuous
        </button>
      </div>

      <div className="detection-content">
        {detectionMode === 'upload' ? (
          <FaceDetection initialMode="image" />
        ) : detectionMode === 'webcam' ? (
          <FaceDetection initialMode="webcam" />
        ) : (
          <div className="continuous-mode-card">
            <h2>🔄 Continuous Face Detection</h2>
            <p className="mode-description">
              Start continuous face detection using your webcam. The system will automatically
              detect faces every 3 seconds with separate input and output canvases for optimal performance.
            </p>

            <div className="settings-section">
              <div className="form-group">
                <label>Detection Confidence Threshold</label>
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

              <div className="instructions">
                <h3>📋 How it works:</h3>
                <ol>
                  <li>Click "Start Continuous Detection" to open popup window</li>
                  <li>Camera starts automatically with 2 separate canvases</li>
                  <li><strong>Input Canvas</strong>: Captures frames from camera (no lag)</li>
                  <li><strong>Output Canvas</strong>: Shows detections with bounding boxes</li>
                  <li>Automatic detection runs every 3 seconds</li>
                  <li>View live results on the right panel</li>
                  <li>Click "Stop & Close" when finished</li>
                </ol>
                <p className="note">
                  💡 <strong>Why 2 canvases?</strong> Separate canvases prevent lag by isolating
                  the capture process from the rendering of bounding boxes.
                </p>
              </div>

              <button
                onClick={handleContinuousDetection}
                className="btn-start-continuous"
                disabled={loading}
              >
                {loading ? '⏳ Opening...' : '🔄 Start Continuous Detection'}
              </button>
            </div>

            {error && (
              <div className="message error-message">
                ❌ {error}
              </div>
            )}

            {success && (
              <div className="message success-message">
                <div className="success-header">✅ Detection Session Complete!</div>
                <div className="success-details">
                  <p><strong>Total Frames Processed:</strong> {success.sessionStats.total}</p>
                  <p><strong>✅ With Faces:</strong> {success.sessionStats.withFaces}</p>
                  <p><strong>❌ No Faces:</strong> {success.sessionStats.noFaces}</p>
                  <p style={{ marginTop: '0.75rem', fontSize: '14px', color: '#059669' }}>
                    {success.message}
                  </p>
                </div>
              </div>
            )}

            <div className="info-card">
              <h3>🎯 Features:</h3>
              <ul>
                <li>🎬 Automatic detection every 3 seconds</li>
                <li>📊 Live results feed with timestamps</li>
                <li>📥 Input canvas for frame capture</li>
                <li>📤 Output canvas for bounding boxes</li>
                <li>⚡ No lag - separate processing</li>
                <li>📈 Session statistics tracking</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FaceDetectionPage
