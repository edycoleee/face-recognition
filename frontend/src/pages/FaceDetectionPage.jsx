import { useNavigate } from 'react-router-dom'
import FaceDetection from '../components/FaceDetection'
import './FaceDetectionPage.css'

function FaceDetectionPage() {
  const navigate = useNavigate()

  return (
    <div className="face-detection-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Home
      </button>

      <h1>Face Detection</h1>
      <p className="subtitle">Upload an image to detect faces using AI</p>

      <div className="detection-content">
        <FaceDetection />
      </div>
    </div>
  )
}

export default FaceDetectionPage
