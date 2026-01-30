import { useState, useRef, useCallback } from 'react';
import { openFaceRecognitionPopup } from '../utils/popupAuth';
import { faceApi } from '../services/faceApi';
import './FaceRecognition.css';

function FaceRecognition() {
  // Image mode state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Shared state
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // Refs
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Handle popup webcam recognition
  const handlePopupRecognition = async () => {
    try {
      await openFaceRecognitionPopup();
    } catch (err) {
      console.error('Popup error:', err);
      setError(err.message);
    }
  };

  const handleImageSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedImage(file);
    setError(null);
    setResults(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const recognizeFaces = useCallback(async () => {
    if (!selectedImage || !imagePreview) return;

    setProcessing(true);
    setError(null);
    setResults(null);

    try {
      // Call face recognition API (identify face)
      const response = await faceApi.identifyFace(imagePreview);

      if (response.success) {
        setResults(response);
        
        // Draw bounding boxes after image loads
        if (imageRef.current && imageRef.current.complete) {
          drawBoundingBoxes(response);
        } else if (imageRef.current) {
          imageRef.current.onload = () => drawBoundingBoxes(response);
        }
      } else {
        setError(response.message || 'Recognition failed');
      }
    } catch (err) {
      console.error('Recognition error:', err);
      setError(err.message || 'Failed to recognize faces');
    } finally {
      setProcessing(false);
    }
  }, [selectedImage, imagePreview]);

  const drawBoundingBoxes = useCallback((data) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match image
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes for each face
    if (data.faces && data.faces.length > 0) {
      data.faces.forEach((face, index) => {
        const bbox = face.bbox;
        const name = face.identified ? face.name : 'Unknown';
        const confidence = face.confidence || 0;
        
        // Determine box color based on identification
        const boxColor = face.identified ? '#4CAF50' : '#FF9800';
        const textColor = face.identified ? '#4CAF50' : '#FF9800';
        
        // Draw rectangle
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
        
        // Draw background for text
        const label = face.identified 
          ? `${name} (${(confidence * 100).toFixed(1)}%)`
          : 'Unknown';
        
        ctx.font = 'bold 16px Arial';
        const textWidth = ctx.measureText(label).width;
        const textHeight = 20;
        
        // Background rectangle
        ctx.fillStyle = boxColor;
        ctx.fillRect(bbox[0], bbox[1] - textHeight - 5, textWidth + 10, textHeight + 5);
        
        // Text
        ctx.fillStyle = 'white';
        ctx.fillText(label, bbox[0] + 5, bbox[1] - 8);
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setResults(null);
    setError(null);
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  return (
    <div className="face-recognition-container">
      {/* Webcam Popup Button */}
      <div className="webcam-popup-section">
        <button onClick={handlePopupRecognition} className="btn-popup-webcam">
          📷 Open Webcam Recognition (Popup)
        </button>
        <p className="popup-info-text">Opens in new window for real-time face recognition</p>
      </div>

      {/* Upload Section */}
      {!imagePreview && (
            <div className="upload-section">
              <div className="upload-box">
                <div className="upload-icon">🎭</div>
                <h3>Upload Image for Face Recognition</h3>
                <p>Select an image to detect and identify faces</p>
                <label className="upload-button">
                  📁 Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Recognition Section */}
          {imagePreview && (
            <div className="recognition-section">
          {/* Image Display with Canvas Overlay */}
          <div className="image-container">
            <img
              ref={imageRef}
              src={imagePreview}
              alt="Selected"
              className="recognition-image"
            />
            <canvas
              ref={canvasRef}
              className="bounding-box-canvas"
            />
          </div>

          {/* Controls */}
          <div className="controls-section">
            <button
              onClick={recognizeFaces}
              disabled={processing}
              className="btn-recognize"
            >
              {processing ? '⏳ Recognizing...' : '🔍 Recognize Faces'}
            </button>
            <button onClick={handleReset} className="btn-reset">
              🔄 Upload New Image
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {/* Results Summary */}
          {results && (
            <div className="results-section">
              <h3>Recognition Results</h3>
              
              {results.faces && results.faces.length > 0 ? (
                <div className="results-grid">
                  <div className="result-card summary-card">
                    <div className="result-icon">👥</div>
                    <div className="result-info">
                      <span className="result-label">Total Faces</span>
                      <span className="result-value">{results.faces.length}</span>
                    </div>
                  </div>

                  <div className="result-card identified-card">
                    <div className="result-icon">✅</div>
                    <div className="result-info">
                      <span className="result-label">Identified</span>
                      <span className="result-value">
                        {results.faces.filter(f => f.identified).length}
                      </span>
                    </div>
                  </div>

                  <div className="result-card unknown-card">
                    <div className="result-icon">❓</div>
                    <div className="result-info">
                      <span className="result-label">Unknown</span>
                      <span className="result-value">
                        {results.faces.filter(f => !f.identified).length}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-faces">
                  <p>😕 No faces detected in the image</p>
                </div>
              )}

              {/* Face Details List */}
              {results.faces && results.faces.length > 0 && (
                <div className="faces-list">
                  <h4>Detected Faces:</h4>
                  {results.faces.map((face, index) => (
                    <div 
                      key={index} 
                      className={`face-item ${face.identified ? 'identified' : 'unknown'}`}
                    >
                      <div className="face-number">#{index + 1}</div>
                      <div className="face-details">
                        <div className="face-name">
                          {face.identified ? (
                            <>
                              <strong>{face.name}</strong>
                              <span className="confidence">
                                {(face.confidence * 100).toFixed(1)}% match
                              </span>
                            </>
                          ) : (
                            <>
                              <strong>Unknown Person</strong>
                              <span className="confidence">Not in database</span>
                            </>
                          )}
                        </div>
                        {face.email && (
                          <div className="face-email">{face.email}</div>
                        )}
                      </div>
                      <div className="face-status">
                        {face.identified ? '✅' : '❓'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
            </div>
          )}
    </div>
  );
}

export default FaceRecognition;
