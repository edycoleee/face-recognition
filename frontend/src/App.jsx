import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Landing from './pages/Landing'
import Login from './pages/Login'
import FaceLoginPopup from './pages/FaceLoginPopup'
import FaceRecognitionPopup from './pages/FaceRecognitionPopup'
import FaceAttendancePopup from './pages/FaceAttendancePopup'
import FaceAttendanceMultiPopup from './pages/FaceAttendanceMultiPopup'
import FaceAttendanceContinuousPopup from './pages/FaceAttendanceContinuousPopup'
import FaceDetectionContinuousPopup from './pages/FaceDetectionContinuousPopup'
import FaceRecognitionOptimizedPopup from './pages/FaceRecognitionOptimizedPopup'
import Dashboard from './pages/Dashboard'
import HaloPage from './pages/HaloPage'
import FaceDetectionPage from './pages/FaceDetectionPage'
import FaceRecognitionPage from './pages/FaceRecognitionPage'
import AttendancePage from './pages/AttendancePage'
import UsersPage from './pages/UsersPage'
import FaceRegistration from './pages/FaceRegistration'
import FacePrediction from './pages/FacePrediction'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-popup" element={<FaceLoginPopup />} />
        <Route path="/recognition-popup" element={<FaceRecognitionPopup />} />
        <Route path="/attendance-popup" element={<FaceAttendancePopup />} />
        <Route path="/attendance-multi-popup" element={<FaceAttendanceMultiPopup />} />
        <Route path="/attendance-continuous-popup" element={<FaceAttendanceContinuousPopup />} />
        <Route path="/detection-continuous-popup" element={<FaceDetectionContinuousPopup />} />
        <Route path="/recognition-optimized-popup" element={<FaceRecognitionOptimizedPopup />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/halo" element={<HaloPage />} />
        <Route path="/face-detection" element={<FaceDetectionPage />} />
        <Route path="/face-recognition" element={<FaceRecognitionPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:userId/register-face" element={<FaceRegistration />} />
        <Route path="/users/:userId/predict" element={<FacePrediction />} />
      </Routes>
    </Router>
  )
}

export default App
