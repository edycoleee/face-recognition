import { useNavigate } from 'react-router-dom'
import FaceRecognition from '../components/FaceRecognition'
import './FaceRecognitionPage.css'

function FaceRecognitionPage() {
  const navigate = useNavigate()

  return (
    <div className="face-recognition-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Home
      </button>

      <h1>Face Recognition</h1>
      <p className="subtitle">Detect and identify faces from your database</p>

      <div className="recognition-content">
        <FaceRecognition />
      </div>
    </div>
  )
}

export default FaceRecognitionPage
