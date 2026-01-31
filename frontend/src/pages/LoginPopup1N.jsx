import { useState, useRef, useEffect } from 'react';
import './FaceLoginPopup.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function LoginPopup1N() {
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [threshold, setThreshold] = useState(0.6);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
            setError('Failed to play video stream');
          });
        };

        setCameraActive(true);
        setError('');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const base64Image = canvas.toDataURL('image/jpeg', 0.95);

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Identifying face with threshold:', threshold);

      // Call 1:N identification endpoint
      const response = await fetch(`${API_BASE_URL}/identify/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          threshold: threshold
        }),
      });

      const data = await response.json();
      console.log('Identification response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Identification failed');
      }

      // Check if face was identified
      if (!data.data.identified) {
        setError('❌ No matching face found in database. Please try again or register first.');
        setLoading(false);
        return;
      }

      // Face identified! Get user info
      const userInfo = {
        user_id: data.data.user_id,
        name: data.data.user_name,
        email: data.data.user_email
      };
      const confidence = data.data.similarity_score;

      console.log('Face identified:', userInfo);

      // Call face login endpoint with the identified email
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      stopCamera();

      // Send success message to parent window
      setTimeout(() => {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'FACE_LOGIN_1N_RESULT',
              success: true,
              data: loginData.data,
              message: `Face identified: ${userInfo.name}`
            },
            window.location.origin
          );
        }
        window.close();
      }, 1500);

    } catch (err) {
      console.error('Identification error:', err);
      setError(err.message || 'Face identification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    stopCamera();
    
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'FACE_LOGIN_1N_RESULT',
          success: false,
          message: 'Login cancelled by user'
        },
        window.location.origin
      );
    }
    
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
            {!cameraActive && !loading && (
              <div className="camera-placeholder">
                <div className="spinner"></div>
                <p>📷 Initializing camera...</p>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-stream"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />

            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {/* Oval Overlay */}
            {cameraActive && (
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

          {cameraActive && (
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
          {error && (
            <div className="status-message error">
              <div className="status-icon">❌</div>
              <div className="status-text">{error}</div>
            </div>
          )}

          {success && (
            <div className="status-message success">
              <div className="status-icon">✅</div>
              <div className="status-text">{success}</div>
            </div>
          )}

          {loading && (
            <div className="status-message verifying">
              <div className="spinner"></div>
              <div className="status-text">⏳ Searching for your face in database...</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={captureAndIdentify}
            className="btn-action btn-capture"
            disabled={loading || !cameraActive}
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
