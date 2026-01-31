import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveAuthData } from '../services/authApi';
import { openFaceLoginPopup, openFaceLogin1NPopup } from '../utils/popupAuth';
import { useCamera } from '../hooks/useCamera';
import { useFaceLogin } from '../hooks/useFaceLogin';
import { usePasswordLogin } from '../hooks/usePasswordLogin';
import './Login.css';

function Login() {
  const navigate = useNavigate();

  // Mode state: 'face' or 'password'
  const [loginMode, setLoginMode] = useState('face');

  // Common
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [threshold, setThreshold] = useState(0.6);

  // Custom hooks
  const camera = useCamera();
  const faceLogin = useFaceLogin();
  const passwordLogin = usePasswordLogin();
  
  // Add canvasRef for blob creation
  const canvasRef = useRef(null);

  /**
   * Capture image and verify face login
   */
  const handleCaptureAndVerify = async () => {
    try {
      // Capture image from camera
      const base64Image = camera.captureFrame();
      
      if (!base64Image) {
        faceLogin.setError('Failed to capture image');
        return;
      }
      
      // Convert base64 to blob for preview
      const blobResponse = await fetch(base64Image);
      const blob = await blobResponse.blob();
      setCapturedImage(blob);

      // Stop camera after capture
      camera.stopCamera();

      // Verify face login
      const response = await faceLogin.performFaceLogin(email, base64Image, threshold);
      
      // Save auth data
      saveAuthData(response);

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      // Error already set by hook
      console.error('Capture and verify error:', err);
    }
  };

  /**
   * Handle password login
   */
  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await passwordLogin.performPasswordLogin(email, password);
      
      // Save auth data
      saveAuthData(response);

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      // Error already set by hook
      console.error('Password login error:', err);
    }
  };

  /**
   * Switch login mode
   */
  const switchMode = (mode) => {
    setLoginMode(mode);
    setPassword('');
    setCapturedImage(null);
    
    // Reset all messages
    faceLogin.resetMessages();
    passwordLogin.resetMessages();

    // Stop camera if switching to password mode
    if (mode === 'password') {
      camera.stopCamera();
    }
  };

  /**
   * Reset capture and restart camera
   */
  const resetCapture = () => {
    setCapturedImage(null);
    faceLogin.resetMessages();
    camera.startCamera();
  };

  /**
   * Handle popup face login (1:1)
   */
  const handlePopupLogin = async () => {
    if (!email) {
      faceLogin.setError('Please enter your email first');
      return;
    }

    faceLogin.resetMessages();

    try {
      const result = await openFaceLoginPopup({ email, threshold });

      if (result.success) {
        saveAuthData(result);
        faceLogin.setSuccess('✅ Login successful via popup!');

        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (err) {
      console.error('Popup login error:', err);
      faceLogin.setError(err.message || 'Popup login failed');
    }
  };

  /**
   * Handle 1:N face identification popup
   */
  const handlePopupLogin1N = async () => {
    faceLogin.resetMessages();

    try {
      const result = await openFaceLogin1NPopup({ threshold });

      if (result.success) {
        saveAuthData(result);
        faceLogin.setSuccess(`✅ Face identified! Welcome ${result.data.name}!`);

        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (err) {
      console.error('1:N Popup login error:', err);
      faceLogin.setError(err.message || '1:N identification failed');
    }
  };

  // Determine combined loading and error states
  const isLoading = faceLogin.loading || passwordLogin.loading;
  const error = faceLogin.error || passwordLogin.error;
  const success = faceLogin.success || passwordLogin.success;

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <h1 className="login-main-title">🔐 Face Recognition Login</h1>

        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${loginMode === 'password' ? 'active' : ''}`}
            onClick={() => switchMode('password')}
          >
            🔑 Password Login
          </button>
          <button
            className={`mode-btn ${loginMode === 'face' ? 'active' : ''}`}
            onClick={() => switchMode('face')}
          >
            📷 Face Login
          </button>
          <button
            className="mode-btn mode-btn-popup"
            onClick={handlePopupLogin}
            disabled={isLoading || !email}
            title="Open popup window for face login (OAuth2-style)"
          >
            🪟 Popup Face Login (1:1)
          </button>
          <button
            className="mode-btn mode-btn-popup mode-btn-1n"
            onClick={handlePopupLogin1N}
            disabled={isLoading}
            title="1:N Face Identification - No email required!"
          >
            🔍 Popup Face Login (1:N)
          </button>
        </div>

        <div className="login-content">
          {/* Left Side - Login Form */}
          <div className="login-form-card">
            <h2 className="form-title">
              {loginMode === 'face' ? '📷 Face Authentication' : '🔑 Password Authentication'}
            </h2>

            {/* Email Input (Common) */}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>

            {/* Face Login Mode - Controls Only */}
            {loginMode === 'face' && (
              <div className="face-login-section">
                <div className="form-group">
                  <label>Confidence Threshold</label>
                  <div className="threshold-control">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      disabled={isLoading}
                    />
                    <span className="threshold-value">{threshold.toFixed(2)}</span>
                  </div>
                </div>

                <div className="login-instructions">
                  <p>📋 Instructions:</p>
                  <ol>
                    <li>Enter your email address</li>
                    <li>Click "Start Camera" on the right</li>
                    <li>Position your face in the frame</li>
                    <li>Click "Capture Face" to verify</li>
                  </ol>
                  <p style={{ marginTop: '0.75rem', fontSize: '13px', color: '#666' }}>
                    ℹ️ Verification happens automatically after capture
                  </p>
                </div>
              </div>
            )}

            {/* Password Login Mode */}
            {loginMode === 'password' && (
              <div className="password-login-section">
                <form onSubmit={handlePasswordLogin}>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-login"
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? '⏳ Logging in...' : '🚀 Login'}
                  </button>
                </form>
              </div>
            )}

            {/* Messages */}
            {error && <div className="message error-message">❌ {error}</div>}
            {success && <div className="message success-message">✅ {success}</div>}

            {/* Back to Home */}
            <button
              onClick={() => navigate('/')}
              className="btn btn-text"
              disabled={isLoading}
            >
              ← Back to Home
            </button>
          </div>

          {/* Right Side - Camera/Preview for Face Login */}
          {loginMode === 'face' && (
            <div className="camera-preview-card">
              <h3 className="preview-title">Camera Preview</h3>

              {!capturedImage ? (
                <div className="camera-section">
                  <div className="camera-container">
                    {!camera.cameraActive && (
                      <div className="camera-placeholder">
                        <p>📷</p>
                        <button 
                          onClick={camera.startCamera} 
                          className="btn-start-camera" 
                          disabled={isLoading}
                        >
                          Start Camera
                        </button>
                      </div>
                    )}

                    <video
                      ref={camera.videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="video-preview"
                      style={{ display: camera.cameraActive ? 'block' : 'none' }}
                    />

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>

                  {camera.cameraActive && (
                    <>
                      <p className="video-instruction">Position your face in the frame</p>
                      <div className="camera-controls">
                        <button 
                          onClick={handleCaptureAndVerify} 
                          className="btn-predict" 
                          disabled={isLoading || !email}
                        >
                          📸 Capture & Verify Face
                        </button>
                        <button 
                          onClick={camera.stopCamera} 
                          className="btn-stop-camera" 
                          disabled={isLoading}
                        >
                          Stop Camera
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="captured-section">
                  <div className="captured-preview">
                    <img
                      src={URL.createObjectURL(capturedImage)}
                      alt="Captured face"
                    />
                  </div>

                  {isLoading && (
                    <div className="verification-status verifying">
                      <div className="spinner"></div>
                      <p>⏳ Verifying your face...</p>
                    </div>
                  )}

                  {!isLoading && error && (
                    <div className="verification-status failed">
                      <p>❌ Verification Failed</p>
                      <button onClick={resetCapture} className="btn-reset">
                        🔄 Try Again
                      </button>
                    </div>
                  )}

                  {!isLoading && success && (
                    <div className="verification-status success">
                      <p>✅ Verification Successful!</p>
                      <p className="redirect-msg">Redirecting to dashboard...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right Side - Info for Password Login */}
          {loginMode === 'password' && (
            <div className="info-card">
              <h3>🔐 Password Login</h3>
              <div className="info-content">
                <p>✅ Traditional authentication method</p>
                <p>💻 No camera required</p>
                <p>⚡ Instant verification</p>
                <p>🔄 Fallback method</p>
              </div>
              <div className="security-note">
                <strong>Security Note:</strong>
                <p>Your password is encrypted and securely stored using SHA256 hashing.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
