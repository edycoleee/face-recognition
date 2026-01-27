function WebcamDetection({
  isWebcamActive,
  videoRef,
  canvasRef,
  loading,
  isContinuousDetection,
  detectionStatus,
  onStartWebcam,
  onStopWebcam,
  onCapture,
  onToggleContinuous
}) {
  return (
    <div className="webcam-mode">
      <div className="webcam-controls">
        {!isWebcamActive ? (
          <button onClick={onStartWebcam}>Start Webcam</button>
        ) : (
          <>
            <button onClick={onStopWebcam}>Stop Webcam</button>
            <button 
              onClick={onCapture} 
              disabled={loading || isContinuousDetection}
            >
              Capture & Detect
            </button>
            <button
              onClick={onToggleContinuous}
              className={isContinuousDetection ? 'active' : ''}
            >
              {isContinuousDetection ? 'Stop Continuous' : 'Start Continuous'}
            </button>
          </>
        )}
      </div>

      {isWebcamActive && detectionStatus && (
        <div className="detection-status">
          <p>{detectionStatus}</p>
        </div>
      )}

      <div className="webcam-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            display: isWebcamActive ? 'block' : 'none',
            maxWidth: '100%',
            border: '1px solid #ccc'
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            display: isWebcamActive ? 'block' : 'none',
            maxWidth: '100%',
            border: '1px solid #ccc',
            marginTop: '10px'
          }}
        />
      </div>
    </div>
  )
}

export default WebcamDetection
