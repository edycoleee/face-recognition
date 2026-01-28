import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import HaloPage from './pages/HaloPage'
import FaceDetectionPage from './pages/FaceDetectionPage'
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
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/halo" element={<HaloPage />} />
        <Route path="/face-detection" element={<FaceDetectionPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:userId/register-face" element={<FaceRegistration />} />
        <Route path="/users/:userId/predict" element={<FacePrediction />} />
      </Routes>
    </Router>
  )
}

export default App
