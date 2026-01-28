import { useState, useRef, useEffect } from 'react';
import { loginWithFace } from '../services/authApi';
import './FaceLoginPopup.css';

function FaceLoginPopup() {
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, capturing, verifying, success, failed
  const [message, setMessage] = useState('');
  const [confidence, setConfidence] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Get params from URL (passed by parent window)
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  const threshold = parseFloat(params.get('threshold') || '0.6');

  useEffect(() => {
    // Auto-start camera when popup opens
    if (email) {
      startCamera();
    } else {
      setMessage('Email not provided');
      setStatus('failed');
    }
    
    return () => {
      stopCamera();
    };
  }, [email]);

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
            setMessage('Failed to start video');
            setStatus('failed');
          });
        };
        
        setCameraActive(true);
        setMessage('Position your face in the oval');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setMessage('Camera access denied. Please allow camera access.');
      setStatus('failed');
      
      // Notify parent about camera error
      sendMessageToParent({
        success: false,
        message: 'Camera access denied: ' + err.message
      });
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

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setStatus('capturing');
    setMessage('Capturing image...');
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.95);

    setStatus('verifying');
    setMessage('Verifying your face...');

    try {
      const response = await loginWithFace(email, base64Image, threshold);
      
      if (response.success) {
        setStatus('success');
        setConfidence(response.data.confidence || 0);
        setMessage(`✅ Verification successful! Confidence: ${(response.data.confidence * 100).toFixed(1)}%`);
        
        // Stop camera
        stopCamera();
        
        // Send success to parent window
        sendMessageToParent({
          success: true,
          data: response.data,
          message: 'Face login successful'
        });
        
        // Close popup after 1.5 seconds
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        throw new Error(response.message || 'Verification failed');
      }
      
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('failed');
      setMessage(`❌ ${err.message || 'Verification failed. Please try again.'}`);
      
      // Don't close popup, allow retry
      // Optionally send error to parent
      // sendMessageToParent({
      //   success: false,
      //   message: err.message
      // });
    }
  };

  const sendMessageToParent = (data) => {
    // Send message to parent window using postMessage (OAuth2 pattern)
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'FACE_LOGIN_RESULT',
        ...data
      }, window.location.origin);
    }
  };

  const handleCancel = () => {
    sendMessageToParent({
      success: false,
      message: 'User cancelled'
    });
    window.close();
  };

  const handleRetry = () => {
    setStatus('idle');
    setMessage('Position your face in the oval');
    setConfidence(0);
    if (!cameraActive) {
      startCamera();
    }
  };

  return (
    <div className="face-login-popup">
      <div className="popup-header">
        <h2>🔐 Face Login</h2>
        <p className="email-display">{email}</p>
        <button onClick={handleCancel} className="btn-close" title="Close">✕</button>
      </div>

      <div className="popup-content">
        {/* Camera View */}
        <div className="camera-section">
          <div className="camera-container">
            {!cameraActive && status !== 'success' && (
              <div className="camera-placeholder">
                <p>📷</p>
                <p>Starting camera...</p>
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
            
            {/* Oval guide overlay */}
            {cameraActive && status === 'idle' && (
              <div className="oval-guide"></div>
            )}
          </div>
        </div>

        {/* Status & Message */}
        <div className="status-section">
          {status === 'idle' && (
            <div className="status-message">
              <p>{message}</p>
            </div>
          )}
          
          {status === 'capturing' && (
            <div className="status-message">
              <p>📸 {message}</p>
            </div>
          )}
          
          {status === 'verifying' && (
            <div className="status-verifying">
              <div className="spinner"></div>
              <p>⏳ {message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="status-success">
              <div className="success-icon">✓</div>
              <p>{message}</p>
              <p className="redirect-msg">Redirecting to dashboard...</p>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="status-failed">
              <p>{message}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="popup-actions">
          {(status === 'idle' || status === 'capturing') && (
            <>
              <button 
                onClick={captureAndVerify}
                disabled={!cameraActive || status === 'capturing'}
                className="btn-capture"
              >
                📸 Capture & Verify
              </button>
              <button onClick={handleCancel} className="btn-cancel">
                Cancel
              </button>
            </>
          )}
          
          {status === 'verifying' && (
            <button disabled className="btn-capture">
              ⏳ Verifying...
            </button>
          )}
          
          {status === 'failed' && (
            <>
              <button onClick={handleRetry} className="btn-retry">
                🔄 Try Again
              </button>
              <button onClick={handleCancel} className="btn-cancel">
                Cancel
              </button>
            </>
          )}
          
          {status === 'success' && (
            <div className="success-actions">
              <p>Window will close automatically...</p>
            </div>
          )}
        </div>

        {/* Threshold Info */}
        <div className="threshold-info">
          <small>Threshold: {(threshold * 100).toFixed(0)}%</small>
        </div>
      </div>
    </div>
  );
}

export default FaceLoginPopup;
