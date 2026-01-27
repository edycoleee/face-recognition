function ImageDetection({ 
  selectedFile, 
  previewUrl, 
  canvasRef,
  loading,
  onFileSelect, 
  onDetect 
}) {
  return (
    <div className="image-mode">
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={onFileSelect}
          style={{ marginBottom: '10px' }}
        />
        <button
          onClick={onDetect}
          disabled={!selectedFile || loading}
        >
          {loading ? 'Detecting...' : 'Detect Faces'}
        </button>
      </div>

      {previewUrl && (
        <div className="preview-section">
          <h3>Detection Result:</h3>
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', border: '1px solid #ccc' }}
          />
        </div>
      )}
    </div>
  )
}

export default ImageDetection
