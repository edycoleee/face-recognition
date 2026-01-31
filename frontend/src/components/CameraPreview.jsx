/**
 * Shared Camera Preview Component
 * Displays camera feed with controls
 */
import PropTypes from 'prop-types';
import './CameraPreview.css';

const CameraPreview = ({
  videoRef,
  canvasRef,
  cameraActive,
  cameraError,
  onStartCamera,
  onStopCamera,
  onCapture,
  loading = false,
  showOvalGuide = false,
  captureButtonText = '📸 Capture',
  children
}) => {
  return (
    <div className="camera-preview-container">
      {/* Camera Display */}
      <div className="camera-display">
        {!cameraActive && !loading && (
          <div className="camera-placeholder">
            <p className="camera-icon">📷</p>
            <button 
              onClick={onStartCamera} 
              className="btn-start-camera" 
              disabled={loading}
            >
              Start Camera
            </button>
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

        {/* Oval Guide Overlay */}
        {showOvalGuide && cameraActive && (
          <div className="face-oval-overlay">
            <svg viewBox="0 0 100 100" className="oval-guide">
              <ellipse 
                cx="50" 
                cy="50" 
                rx="30" 
                ry="40" 
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

      {/* Error Display */}
      {cameraError && (
        <div className="camera-error">
          <p>❌ {cameraError}</p>
        </div>
      )}

      {/* Camera Instructions */}
      {cameraActive && (
        <p className="camera-hint">
          📸 Position your face {showOvalGuide ? 'within the oval guide' : 'in the frame'}
        </p>
      )}

      {/* Camera Controls */}
      {cameraActive && (
        <div className="camera-controls">
          {onCapture && (
            <button 
              onClick={onCapture} 
              className="btn-capture" 
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : captureButtonText}
            </button>
          )}
          
          {onStopCamera && (
            <button 
              onClick={onStopCamera} 
              className="btn-stop-camera" 
              disabled={loading}
            >
              Stop Camera
            </button>
          )}
        </div>
      )}

      {/* Additional Content */}
      {children}
    </div>
  );
};

CameraPreview.propTypes = {
  videoRef: PropTypes.object.isRequired,
  canvasRef: PropTypes.object.isRequired,
  cameraActive: PropTypes.bool.isRequired,
  cameraError: PropTypes.string,
  onStartCamera: PropTypes.func.isRequired,
  onStopCamera: PropTypes.func,
  onCapture: PropTypes.func,
  loading: PropTypes.bool,
  showOvalGuide: PropTypes.bool,
  captureButtonText: PropTypes.string,
  children: PropTypes.node,
};

export default CameraPreview;
