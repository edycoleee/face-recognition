import { useRef } from 'react'
import { useOvalGuide } from '../../hooks/useOvalGuide'

function CameraSection({ 
  cameraActive, 
  faceInPosition, 
  videoRef, 
  onStartCamera 
}) {
  const overlayCanvasRef = useRef(null)

  useOvalGuide(overlayCanvasRef, videoRef, cameraActive, faceInPosition)

  return (
    <div className="camera-container" style={{ position: 'relative' }}>
      {!cameraActive && (
        <div className="camera-placeholder">
          <p>📷</p>
          <button onClick={onStartCamera} className="btn-start-camera">
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
      
      <canvas 
        ref={overlayCanvasRef}
        className="overlay-canvas"
        style={{ 
          display: cameraActive ? 'block' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}

export default CameraSection
