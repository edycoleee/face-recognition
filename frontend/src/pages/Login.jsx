import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithFace, loginWithPassword, saveAuthData } from '../services/authApi';
import { openFaceLoginPopup, openFaceLogin1NPopup } from '../utils/popupAuth';
import './Login.css';

function Login() {
  const navigate = useNavigate();

  // Mode state: 'face' or 'password'
  const [loginMode, setLoginMode] = useState('face');

  // Common
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password mode
  const [password, setPassword] = useState('');

  // Face mode
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [threshold, setThreshold] = useState(0.6);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup camera on unmount or mode change
  useEffect(() => {
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

        // Wait for video to be ready
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

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert canvas to base64 and verify immediately
    const base64Image = canvas.toDataURL('image/jpeg', 0.95);

    // Create blob for preview
    canvas.toBlob(async (blob) => {
      setCapturedImage(blob);
      setError('');

      // Stop camera after capture
      stopCamera();

      // Auto verify with base64 image
      await verifyFaceLogin(base64Image);
    }, 'image/jpeg', 0.95);
  };

  const verifyFaceLogin = async (base64Image) => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Starting face verification for email:', email);
      console.log('Threshold:', threshold);
      console.log('Base64 image length:', base64Image.length);

      // Call API with base64 image
      const response = await loginWithFace(email, base64Image, threshold);

      console.log('Login response:', response);

      // Check if response is valid
      if (!response) {
        throw new Error('No response from server');
      }

      if (!response.success) {
        // If we got data with actual identity info (wrong person detected)
        if (response.data && response.data.actual_identity) {
          const actual = response.data.actual_identity;
          throw new Error(
            `❌ Wrong person detected!\n` +
            `Expected: ${email}\n` +
            `Detected: ${actual.user_name} (Confidence: ${actual.detected_confidence.toFixed(2)})`
          );
        }
        
        // If we got data with confidence info, show it
        if (response.data && typeof response.data.confidence !== 'undefined') {
          throw new Error(`${response.message || 'Verification failed'} (Confidence: ${response.data.confidence.toFixed(2)})`);
        }
        throw new Error(response.message || 'Verification failed');
      }

      // Check if data exists
      if (!response.data) {
        throw new Error('Invalid response data from server');
      }

      // Save auth data
      saveAuthData(response);

      // Show success with confidence if available
      const confidenceText = response.data.confidence
        ? ` Confidence: ${response.data.confidence.toFixed(2)}`
        : '';

      setSuccess(`✅ Login successful!${confidenceText}`);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      console.error('Face verification error:', err);

      // Extract error message properly
      let errorMessage = 'Face verification failed. Please try again.';

      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await loginWithPassword(email, password);

      // Save auth data
      saveAuthData(response);

      setSuccess('Login successful!');

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      setError(err.message || 'Password login failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setLoginMode(mode);
    setError('');
    setSuccess('');
    setPassword('');
    setCapturedImage(null);

    if (mode === 'password') {
      stopCamera();
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setError('');
    setSuccess('');
    // Restart camera for recapture
    startCamera();
  };

  const handlePopupLogin = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Open popup window (OAuth2-style)
      const result = await openFaceLoginPopup({
        email,
        threshold
      });

      if (result.success) {
        // Save auth data
        saveAuthData(result);

        setSuccess('✅ Login successful via popup!');

        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err) {
      console.error('Popup login error:', err);
      setError(err.message || 'Popup login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePopupLogin1N = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Open 1:N identification popup (no email required)
      const result = await openFaceLogin1NPopup({
        threshold
      });

      if (result.success) {
        // Save auth data
        saveAuthData(result);

        setSuccess(`✅ Face identified! Welcome ${result.data.name}!`);

        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err) {
      console.error('1:N Popup login error:', err);
      setError(err.message || '1:N identification failed');
    } finally {
      setLoading(false);
    }
  };

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
            disabled={loading || !email}
            title="Open popup window for face login (OAuth2-style)"
          >
            🪟 Popup Face Login (1:1)
          </button>
          <button
            className="mode-btn mode-btn-popup mode-btn-1n"
            onClick={handlePopupLogin1N}
            disabled={loading}
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
                disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-login"
                    disabled={loading || !email || !password}
                  >
                    {loading ? '⏳ Logging in...' : '🚀 Login'}
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
              disabled={loading}
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
                    {!cameraActive && (
                      <div className="camera-placeholder">
                        <p>📷</p>
                        <button onClick={startCamera} className="btn-start-camera" disabled={loading}>
                          Start Camera
                        </button>
                      </div>
                    )}

                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="video-preview"
                      style={{ display: cameraActive ? 'block' : 'none' }}
                    />

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>

                  {cameraActive && (
                    <>
                      <p className="video-instruction">Position your face in the frame</p>
                      <div className="camera-controls">
                        <button onClick={captureImage} className="btn-predict" disabled={loading || !email}>
                          📸 Capture & Verify Face
                        </button>
                        <button onClick={stopCamera} className="btn-stop-camera" disabled={loading}>
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

                  {loading && (
                    <div className="verification-status verifying">
                      <div className="spinner"></div>
                      <p>⏳ Verifying your face...</p>
                    </div>
                  )}

                  {!loading && error && (
                    <div className="verification-status failed">
                      <p>❌ Verification Failed</p>
                      <button onClick={resetCapture} className="btn-reset">
                        🔄 Try Again
                      </button>
                    </div>
                  )}

                  {!loading && success && (
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
