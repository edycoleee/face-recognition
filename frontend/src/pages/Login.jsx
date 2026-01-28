import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithFace, loginWithPassword, saveAuthData } from '../services/authApi';
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
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      setCapturedImage(blob);
      setError('');
    }, 'image/jpeg', 0.95);
  };

  const handleFaceLogin = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (!capturedImage) {
      setError('Please capture your face image');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create file from blob
      const file = new File([capturedImage], 'face.jpg', { type: 'image/jpeg' });
      
      // Call API
      const response = await loginWithFace(email, file, threshold);
      
      // Save auth data
      saveAuthData(response);
      
      setSuccess(`Login successful! Confidence: ${response.data.confidence.toFixed(2)}`);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Face login failed');
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
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <h1 className="login-main-title">🔐 Face Recognition Login</h1>
        
        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${loginMode === 'face' ? 'active' : ''}`}
            onClick={() => switchMode('face')}
          >
            📷 Face Login
          </button>
          <button
            className={`mode-btn ${loginMode === 'password' ? 'active' : ''}`}
            onClick={() => switchMode('password')}
          >
            🔑 Password Login
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
                    <li>Click "Start Camera" on the right</li>
                    <li>Position your face in the frame</li>
                    <li>Click "Capture Face"</li>
                    <li>Click "Login with Face" below</li>
                  </ol>
                </div>

                <button
                  onClick={handleFaceLogin}
                  className="btn btn-login"
                  disabled={loading || !email || !capturedImage}
                >
                  {loading ? '⏳ Verifying...' : '🚀 Login with Face'}
                </button>
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
                        <button onClick={captureImage} className="btn-predict" disabled={loading}>
                          📸 Capture Face
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
                  <p className="captured-label">✅ Face Captured - Ready to login</p>
                  <button onClick={resetCapture} className="btn-reset" disabled={loading}>
                    🔄 Recapture
                  </button>
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
