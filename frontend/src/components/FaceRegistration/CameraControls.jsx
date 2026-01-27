function CameraControls({
  captureMode,
  isCapturing,
  capturesCount,
  targetCaptures,
  autoInterval,
  onManualMode,
  onAutoCapture,
  onStopAuto,
  onCapture,
  onStopCamera
}) {
  return (
    <div className="camera-controls">
      <div className="mode-buttons">
        <button
          onClick={onManualMode}
          className={captureMode === 'manual' ? 'active' : ''}
          disabled={isCapturing || capturesCount >= targetCaptures}
        >
          Manual Capture
        </button>
        <button
          onClick={onAutoCapture}
          className={captureMode === 'auto' && autoInterval ? 'active' : ''}
          disabled={isCapturing || capturesCount >= targetCaptures || autoInterval}
        >
          Auto Capture ({targetCaptures} pics)
        </button>
        {autoInterval && (
          <button onClick={onStopAuto} className="btn-stop">
            ⏸️ Stop Auto
          </button>
        )}
      </div>

      {captureMode === 'manual' && capturesCount < targetCaptures && !autoInterval && (
        <button
          onClick={onCapture}
          disabled={isCapturing}
          className="btn-capture"
        >
          📸 Capture ({capturesCount}/{targetCaptures})
        </button>
      )}

      {capturesCount < targetCaptures && (
        <button onClick={onStopCamera} className="btn-stop-camera">
          Stop Camera
        </button>
      )}
    </div>
  )
}

export default CameraControls
