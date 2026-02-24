import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Landing from './pages/Landing'
import Login from './pages/Login'
import FaceLoginPopup from './pages/FaceLoginPopup'
import LoginPopup1N from './pages/LoginPopup1N'
import FaceAttendancePopup from './pages/FaceAttendancePopup'
import FaceAttendanceMultiPopup from './pages/FaceAttendanceMultiPopup'
import FaceAttendanceContinuousPopup from './pages/FaceAttendanceContinuousPopup'
import Dashboard from './pages/Dashboard'
import HaloPage from './pages/HaloPage'
import AttendancePage from './pages/AttendancePage'
import UsersPage from './pages/UsersPage'
import FaceRegistration from './pages/FaceRegistration'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-popup" element={<FaceLoginPopup />} />
        <Route path="/login-popup-1n" element={<LoginPopup1N />} />
        <Route path="/attendance-popup" element={<FaceAttendancePopup />} />
        <Route path="/attendance-multi-popup" element={<FaceAttendanceMultiPopup />} />
        <Route path="/attendance-continuous-popup" element={<FaceAttendanceContinuousPopup />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/halo" element={<HaloPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:userId/register-face" element={<FaceRegistration />} />
      </Routes>
    </Router>
  )
}

export default App
