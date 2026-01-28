import { useRef } from 'react'
import './FileUploadSection.css'

function FileUploadSection({ 
  onFileSelect, 
  selectedFile, 
  previewImage,
  onClearFile 
}) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }

      onFileSelect(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    } else {
      alert('Please drop an image file')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className="file-upload-section">
      {!selectedFile ? (
        <div
          className="upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">📁</div>
          <p className="upload-text">Click to select or drag & drop an image</p>
          <p className="upload-hint">Supports: JPG, PNG, JPEG (Max 10MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="file-preview">
          {previewImage && (
            <img src={previewImage} alt="Selected" className="preview-image" />
          )}
          <div className="file-info">
            <p className="file-name">📄 {selectedFile.name}</p>
            <p className="file-size">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <button onClick={onClearFile} className="btn-clear-file">
            ✕ Remove
          </button>
        </div>
      )}
    </div>
  )
}

export default FileUploadSection
