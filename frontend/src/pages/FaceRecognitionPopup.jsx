import { useState, useRef, useEffect, useCallback } from 'react';
import { faceApi } from '../services/faceApi';
import './FaceRecognitionPopup.css';

function FaceRecognitionPopup() {
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('Ready to start');
  const [capturing, setCapturing] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const isRecognizingRef = useRef(false);

  useEffect(() => {
    // Auto-start camera when popup opens
    startCamera();
    
    return () => {
      stopCamera();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
            setStatus('Failed to start video');
          });
        };
        
        setCameraActive(true);
        setStatus('Camera ready - Click Start to begin recognition');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('Camera access denied. Please allow camera access.');
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

  const recognizeFrame = useCallback(async () => {
    if (isRecognizingRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      return;
    }

    // Prevent concurrent calls
    isRecognizingRef.current = true;

    try {
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get base64 image
      const base64Image = canvas.toDataURL('image/jpeg', 0.7);

      // Call recognition API
      const response = await faceApi.identifyFace(base64Image);

      if (response.success && response.faces && response.faces.length > 0) {
        setResults(response);
        
        // Redraw video frame (fresh)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw bounding boxes ON TOP
        response.faces.forEach((face) => {
          const [x1, y1, x2, y2] = face.bbox;
          
          // Determine color
          const color = face.identified ? '#4CAF50' : '#FF9800';
          
          // Draw rectangle with thicker line
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          
          // Draw label
          let label;
          if (face.identified) {
            label = `${face.name} (${(face.confidence * 100).toFixed(1)}%)`;
          } else {
            if (face.confidence > 0) {
              label = `Unknown (${(face.confidence * 100).toFixed(1)}%)`;
            } else {
              label = 'Unknown';
            }
          }
          
          ctx.font = 'bold 20px Arial';
          const textWidth = ctx.measureText(label).width;
          
          // Background rectangle
          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 35, textWidth + 20, 35);
          
          // Text
          ctx.fillStyle = 'white';
          ctx.fillText(label, x1 + 10, y1 - 10);
        });
        
        setStatus(`✅ ${response.count} face(s) detected`);
      } else {
        // Redraw clean frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setStatus('No faces detected');
        setResults(null);
      }
    } catch (err) {
      console.error('Recognition error:', err);
      setStatus('Recognition error');
    } finally {
      isRecognizingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (recognizing) {
      console.log('Starting continuous recognition with setInterval...');
      // Run immediately
      recognizeFrame();
      
      // Then run every 350ms
      intervalRef.current = setInterval(() => {
        recognizeFrame();
      }, 350);
    } else {
      console.log('Stopping continuous recognition...');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [recognizing, recognizeFrame]);

  const handleStartRecognition = () => {
    console.log('Start recognition button clicked');
    setRecognizing(true);
    setStatus('Recognizing...');
  };

  const handleStopRecognition = () => {
    console.log('Stop recognition button clicked');
    setRecognizing(false);
    setStatus('Recognition stopped');
    setResults(null);
    
    // Clear interval (will be handled by useEffect, but ensure cleanup)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Clear canvas - just show video
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      // Draw one final frame without boxes
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
  };

  const handleCaptureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      setStatus('Camera not ready');
      return;
    }

    setCapturing(true);
    setStatus('Capturing frame...');
    setDebugInfo(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      
      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get base64 image
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      
      setDebugInfo({
        timestamp: new Date().toISOString(),
        imageSize: base64Image.length,
        canvasSize: `${canvas.width}x${canvas.height}`
      });

      setStatus('Recognizing faces...');

      // Call recognition API
      const response = await faceApi.identifyFace(base64Image);

      console.log('Recognition response:', response);
      setDebugInfo(prev => ({
        ...prev,
        response: response,
        apiSuccess: response.success,
        facesDetected: response.faces ? response.faces.length : 0
      }));

      if (response.success && response.faces) {
        setResults(response);
        
        // Redraw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw bounding boxes
        response.faces.forEach((face, index) => {
          const [x1, y1, x2, y2] = face.bbox;
          
          console.log(`Face ${index + 1}:`, face);
          console.log(`  - Identified: ${face.identified}`);
          console.log(`  - Confidence: ${face.confidence}`);
          console.log(`  - Name: ${face.name}`);
          
          // Determine color
          const color = face.identified ? '#4CAF50' : '#FF9800';
          
          // Draw rectangle
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          
          // Draw label
          let label;
          if (face.identified) {
            label = `${face.name} (${(face.confidence * 100).toFixed(1)}%)`;
          } else {
            // Show confidence even for unknown faces for debugging
            if (face.confidence > 0) {
              label = `Unknown (${(face.confidence * 100).toFixed(1)}% - below threshold)`;
            } else {
              label = 'Unknown';
            }
          }
          
          ctx.font = 'bold 20px Arial';
          const textWidth = ctx.measureText(label).width;
          
          // Background
          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 35, textWidth + 20, 35);
          
          // Text
          ctx.fillStyle = 'white';
          ctx.fillText(label, x1 + 10, y1 - 10);
        });
        
        setStatus(`✅ Captured: ${response.count} face(s) detected`);
      } else {
        setStatus('❌ No faces detected in capture');
        setResults(null);
      }
    } catch (err) {
      console.error('Capture error:', err);
      setStatus(`❌ Error: ${err.message}`);
      setDebugInfo(prev => ({
        ...prev,
        error: err.message,
        errorStack: err.stack
      }));
    } finally {
      setCapturing(false);
    }
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="face-recognition-popup">
      <div className="popup-header">
        <h2>🔍 Face Recognition</h2>
        <button onClick={handleClose} className="close-btn">✕</button>
      </div>

      <div className="popup-content">
        {/* Controls - Moved above video */}
        <div className="popup-controls">
          <button 
            onClick={handleCaptureAndRecognize}
            disabled={!cameraActive || capturing || recognizing}
            className="btn-capture"
          >
            {capturing ? '📸 Capturing...' : '📸 Capture & Recognize'}
          </button>
          
          {!recognizing ? (
            <button 
              onClick={handleStartRecognition}
              disabled={!cameraActive}
              className="btn-primary"
            >
              ▶️ Start Continuous
            </button>
          ) : (
            <button 
              onClick={handleStopRecognition}
              className="btn-warning"
            >
              ⏸️ Stop Continuous
            </button>
          )}
          
          <button onClick={handleClose} className="btn-secondary">
            Close Window
          </button>
        </div>

        {/* Video + Canvas Container */}
        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="popup-video"
          />
          <canvas
            ref={canvasRef}
            className="popup-canvas"
          />
        </div>

        {/* Status */}
        <div className={`status-box ${recognizing ? 'active' : ''}`}>
          {status}
        </div>

        {/* Results Summary */}
        {results && results.faces && results.faces.length > 0 && (
          <div className="results-summary">
            <div className="summary-item">
              <span className="summary-label">Total:</span>
              <span className="summary-value">{results.count}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Identified:</span>
              <span className="summary-value identified">{results.faces.filter(f => f.identified).length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Unknown:</span>
              <span className="summary-value unknown">{results.faces.filter(f => !f.identified).length}</span>
            </div>
          </div>
        )}

        {/* Face Details */}
        {results && results.faces && results.faces.length > 0 && (
          <div className="faces-details">
            {results.faces.map((face, index) => (
              <div 
                key={index} 
                className={`face-card ${face.identified ? 'identified' : 'unknown'}`}
              >
                <div className="face-index">#{index + 1}</div>
                <div className="face-info">
                  {face.identified ? (
                    <>
                      <div className="face-name">{face.name}</div>
                      <div className="face-email">{face.email}</div>
                      <div className="face-confidence">
                        {(face.confidence * 100).toFixed(1)}% match
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="face-name">Unknown Person</div>
                      <div className="face-email">Not in database</div>
                      {face.confidence > 0 && (
                        <div className="face-confidence-low">
                          Best match: {(face.confidence * 100).toFixed(1)}% (below threshold)
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="face-icon">
                  {face.identified ? '✅' : '❓'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div className="debug-info">
            <h4>🐛 Debug Information</h4>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}

        {/* Info */}
        <div className="popup-info">
          <p>💡 Green boxes = Identified | Orange boxes = Unknown</p>
          <p>🎯 Position faces clearly in frame for best results</p>
        </div>
      </div>
    </div>
  );
}

export default FaceRecognitionPopup;
