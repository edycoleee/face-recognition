function CaptureGrid({ 
  captures, 
  targetCaptures, 
  loading,
  onDeleteCapture, 
  onResetCaptures 
}) {
  return (
    <div className="captures-section">
      <div className="captures-header">
        <h3>Captured Images ({captures.length}/{targetCaptures})</h3>
        {captures.length > 0 && (
          <button onClick={onResetCaptures} className="btn-reset">
            Clear All
          </button>
        )}
      </div>

      <div className="captures-grid">
        {captures.map((capture) => (
          <div key={capture.id} className="capture-item">
            <img src={capture.image} alt="Captured face" />
            <div className="capture-info">
              <span className="capture-time">{capture.timestamp}</span>
              <span className="capture-score">
                {(capture.faceData.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <button
              onClick={() => onDeleteCapture(capture.id)}
              className="btn-delete-capture"
              disabled={loading}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CaptureGrid
