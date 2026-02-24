import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserData, logoutAndClear, verifyToken } from '../services/authApi';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const data = getUserData();
    
    if (!data) {
      navigate('/login');
      return;
    }

    setUserData(data);
    setLoading(false);
  };

  const handleVerifyToken = async () => {
    setVerifying(true);
    try {
      const result = await verifyToken(userData.token);
      alert(`✅ Token is valid!\n\nUser: ${result.data.name}\nEmail: ${result.data.email}\nExpires: ${new Date(result.data.expires_at).toLocaleString()}`);
    } catch (error) {
      alert('❌ Token verification failed: ' + error.message);
      handleLogout();
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return;

    setLoading(true);
    try {
      await logoutAndClear();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if API fails
      navigate('/login');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getTimeRemaining = (expiryString) => {
    if (!expiryString) return 'Unknown';
    
    const expiry = new Date(expiryString);
    const now = new Date();
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">⏳ Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🎉 Welcome to Dashboard</h1>
        <button onClick={handleLogout} className="btn-logout">
          🚪 Logout
        </button>
      </div>

      <div className="dashboard-content">
        {/* User Info Card */}
        <div className="info-card">
          <h2>👤 User Information</h2>
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{userData.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{userData.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">User ID:</span>
            <span className="info-value">{userData.userId}</span>
          </div>
          {userData.confidence && (
            <div className="info-row">
              <span className="info-label">Login Confidence:</span>
              <span className="info-value confidence">
                {(userData.confidence * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Token Info Card */}
        <div className="info-card">
          <h2>🔐 Token Information</h2>
          <div className="info-row">
            <span className="info-label">Token:</span>
            <span className="info-value token-value">
              {userData.token.substring(0, 16)}...
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Expires At:</span>
            <span className="info-value">{formatDate(userData.expiresAt)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Time Remaining:</span>
            <span className="info-value time-remaining">
              {getTimeRemaining(userData.expiresAt)}
            </span>
          </div>
          <button 
            onClick={handleVerifyToken} 
            className="btn-verify"
            disabled={verifying}
          >
            {verifying ? '⏳ Verifying...' : '✓ Verify Token'}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="info-card">
          <h2>⚡ Quick Actions</h2>
          <div className="action-buttons">
            <button 
              onClick={() => navigate('/users')} 
              className="btn-action"
            >
              👥 Manage Users
            </button>
            <button 
              onClick={() => navigate(`/users/${userData.userId}/register-face`)} 
              className="btn-action"
            >
              📷 Register Face
            </button>
            <button 
              onClick={() => navigate(`/users/${userData.userId}/predict`)} 
              className="btn-action"
            >
              🔍 Face Prediction
            </button>
            <button 
              onClick={() => navigate('/face-recognition')} 
              className="btn-action"
            >
              🎯 Face Recognition
            </button>
            <button 
              onClick={() => navigate('/attendance')} 
              className="btn-action"
            >
              ✅ Attendance
            </button>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="welcome-section">
          <h2>🎯 Welcome Back, {userData.name}!</h2>
          <p>
            You are successfully authenticated and have access to all features.
            Your session will expire in <strong>{getTimeRemaining(userData.expiresAt)}</strong>.
          </p>
          <p className="security-note">
            🔒 <strong>Security Note:</strong> This is a protected page. Only authenticated users can access this content.
            Your token is valid for 2 hours from login time.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
