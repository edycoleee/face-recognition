import { useState, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import StatusMessage from '../components/StatusMessage';
import './FaceLoginPopup.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function LoginPopup1N() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [threshold, setThreshold] = useState(0.6);

  // Use camera hook
  const camera = useCamera();

  // Auto-start camera on mount
  useEffect(() => {
    camera.startCamera();
    
    // Cleanup on unmount
    return () => {
      camera.stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  /**
   * Capture and identify face (1:N)
   */
  const captureAndIdentify = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Identifying face with threshold:', threshold);

      // Capture image from camera
      const base64Image = camera.captureFrame();

      if (!base64Image) {
        setError('Failed to capture image');
        setLoading(false);
        return;
      }

      // Call 1:N identification endpoint
      const identifyResponse = await fetch(`${API_BASE_URL}/identify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          threshold: threshold
        }),
      });

      const identifyData = await identifyResponse.json();
      console.log('Identification response:', identifyData);

      if (!identifyResponse.ok || !identifyData.success) {
        throw new Error(identifyData.message || 'Identification failed');
      }

      // Check if face was identified
      if (!identifyData.data.identified) {
        setError('❌ No matching face found in database. Please try again or register first.');
        setLoading(false);
        return;
      }

      // Face identified! Get user info
      const userInfo = {
        user_id: identifyData.data.user_id,
        name: identifyData.data.user_name,
        email: identifyData.data.user_email
      };
      const confidence = identifyData.data.similarity_score;

      console.log('Face identified:', userInfo);

      // Call face login endpoint with the identified email
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userInfo.email,
          image: base64Image,
          threshold: threshold
        }),
      });

      const loginData = await loginResponse.json();
      console.log('Login response:', loginData);

      if (!loginResponse.ok || !loginData.success) {
        throw new Error(loginData.message || 'Login failed');
      }

      setSuccess(`✅ Welcome ${userInfo.name}! (Confidence: ${confidence.toFixed(2)})`);

      // Stop camera
      camera.stopCamera();

      // Send success message to parent window
      setTimeout(() => {
        sendMessageToParent({
          type: 'FACE_LOGIN_1N_RESULT',
          success: true,
          data: loginData.data,
          message: `Face identified: ${userInfo.name}`
        });
        window.close();
      }, 1500);

    } catch (err) {
      console.error('Identification error:', err);
      setError(err.message || 'Face identification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send message to parent window
   */
  const sendMessageToParent = (message) => {
    if (window.opener) {
      window.opener.postMessage(message, window.location.origin);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    camera.stopCamera();
    sendMessageToParent({
      type: 'FACE_LOGIN_1N_RESULT',
      success: false,
      message: 'Login cancelled by user'
    });
    window.close();
  };

  return (
    <div className="face-login-popup">
      <div className="popup-header">
        <h2>🔍 1:N Face Identification</h2>
        <p className="email-display" style={{ position: 'static', transform: 'none' }}>
          No Email Required
        </p>
        <button onClick={handleCancel} className="btn-close" disabled={loading}>
          ✖
        </button>
      </div>

      <div className="popup-body">
        {/* Camera Preview */}
        <div className="camera-section">
          <div className="camera-preview">
            {!camera.cameraActive && !loading && (
              <div className="camera-placeholder">
                <div className="spinner"></div>
                <p>📷 Initializing camera...</p>
              </div>
            )}

            <video
              ref={camera.videoRef}
              autoPlay
              playsInline
              muted
              className="video-stream"
              style={{ display: camera.cameraActive ? 'block' : 'none' }}
            />

            {/* Oval Overlay */}
            {camera.cameraActive && (
              <div className="face-oval-overlay">
                <svg viewBox="0 0 100 100" className="oval-guide">
                  <ellipse cx="50" cy="50" rx="30" ry="40" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="0.5" 
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                </svg>
              </div>
            )}
          </div>

          {camera.cameraActive && (
            <p className="camera-hint">
              📸 Position your face within the oval guide
            </p>
          )}
        </div>

        {/* Status Section */}
        <div className="status-section">
          {/* Threshold Control */}
          <div className="threshold-control">
            <label>
              Confidence Threshold: <strong>{threshold.toFixed(2)}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              disabled={loading}
              className="threshold-slider"
            />
            <small className="threshold-hint">
              Lower = more lenient, Higher = more strict
            </small>
          </div>

          {/* Messages */}
          {error && <StatusMessage type="error" message={error} />}
          {success && <StatusMessage type="success" message={success} />}
          {loading && <StatusMessage type="loading" message="⏳ Searching for your face in database..." />}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={captureAndIdentify}
            className="btn-action btn-capture"
            disabled={loading || !camera.cameraActive}
          >
            {loading ? '⏳ Identifying...' : '🎯 Capture & Identify'}
          </button>
          
          <button
            onClick={handleCancel}
            className="btn-action btn-cancel"
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        {/* Instructions */}
        <div className="instructions-box">
          <h4>📋 How it works:</h4>
          <ol>
            <li>Position your face clearly within the oval guide</li>
            <li>Click "Capture & Identify" button</li>
            <li>We'll search for your face in our entire database (1:N)</li>
            <li>If found, you'll be logged in automatically!</li>
          </ol>
          <p className="note">
            ℹ️ <strong>No email required</strong> - just your beautiful face! 😊
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPopup1N;
