# Face Prediction - File Upload Feature

## Overview
Face Prediction page now supports **two input modes**:
1. **📷 Camera Mode** - Capture face from webcam (existing feature)
2. **📁 Upload Mode** - Upload image file (new feature)

## New Files Created

### 1. Components
- `frontend/src/components/FacePrediction/FileUploadSection.jsx`
  - File upload component with drag & drop support
  - Image preview
  - File validation (type and size)

- `frontend/src/components/FacePrediction/FileUploadSection.css`
  - Styling for upload area
  - Drag & drop hover effects
  - Preview image display

### 2. Hooks
- `frontend/src/hooks/useFileUpload.js`
  - Manages file selection state
  - Converts file to base64
  - Creates image preview
  - Handles file cleanup

## Modified Files

### 1. `frontend/src/pages/FacePrediction.jsx`
**Added:**
- Mode selector UI (Camera / Upload)
- File upload handler
- Mode switching logic
- Integration with useFileUpload hook

**Key Functions:**
- `handleFileUploadAndPredict()` - Processes uploaded file and predicts
- `handlePredictFromFile()` - Predicts from already uploaded file
- `handleModeChange()` - Switches between camera and upload modes

### 2. `frontend/src/components/FacePrediction/PredictionResults.jsx`
**Added:**
- `inputMode` prop to customize empty state message
- Conditional text based on camera/upload mode

### 3. `frontend/src/pages/FacePrediction.css`
**Added:**
- `.mode-selector` - Mode toggle buttons styling
- `.mode-btn` - Individual mode button styles
- `.upload-section` - Upload area container
- `.upload-controls` - Predict button for uploaded files

## Features

### File Upload Component
✅ **Drag & Drop Support** - Drop image files directly
✅ **Click to Select** - Traditional file picker
✅ **Image Preview** - See selected image before prediction
✅ **File Validation:**
  - Only image files accepted (JPG, PNG, JPEG)
  - Maximum file size: 10MB
✅ **File Info Display** - Shows filename and size
✅ **Remove File** - Clear selection and start over

### User Flow

#### Camera Mode (Existing)
1. Click "📷 Camera" mode button
2. Click "Start Camera"
3. Click "🔍 Capture & Predict"
4. View results

#### Upload Mode (New)
1. Click "📁 Upload File" mode button
2. Drag & drop image OR click to select
3. Preview image appears
4. Click "🔍 Predict Face"
5. View results

## API Integration

Uses existing backend API:
- **Endpoint**: `POST /api/identify/`
- **Payload**: 
  ```json
  {
    "image": "data:image/jpeg;base64,...",
    "threshold": 0.6
  }
  ```
- **Works with both camera capture and file upload** (both convert to base64)

## Technical Details

### Base64 Conversion
```javascript
// File to base64
const reader = new FileReader()
reader.readAsDataURL(file)
// Returns: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
```

### File Validation
- **Type check**: `file.type.startsWith('image/')`
- **Size check**: `file.size > 10 * 1024 * 1024` (10MB limit)

### State Management
```javascript
const fileUpload = useFileUpload()
// Returns: {
//   selectedFile,      // File object
//   previewImage,      // Object URL for preview
//   base64Image,       // Base64 string for API
//   handleFileSelect,  // Select file handler
//   clearFile          // Reset handler
// }
```

## User Interface

### Mode Selector
- Two toggle buttons at top
- Active mode highlighted in green
- Switches input section dynamically

### Upload Area (Inactive)
- Dashed green border
- Upload icon 📁
- Instructions text
- Hover effect

### Upload Area (Active)
- Shows preview image
- File information
- Remove button

## Browser Compatibility
✅ Modern browsers (Chrome, Firefox, Safari, Edge)
✅ File API support required
✅ FileReader API support required
✅ Drag & Drop API support

## Error Handling
- Invalid file type alert
- File size too large alert
- File processing errors caught and displayed
- Prediction errors shown in results section

## Responsive Design
- Works on desktop and tablet
- Mobile responsive (may need touch optimization for drag & drop)
- Grid layout adjusts to screen size

## Next Steps (Optional Enhancements)

1. **Image cropping** - Allow user to crop face area
2. **Image rotation** - Fix orientation before prediction
3. **Multiple file upload** - Batch prediction
4. **Webcam snapshot enhancement** - Better quality controls
5. **Image compression** - Reduce file size before upload
6. **Progress indicator** - Show upload/processing progress
7. **Recent uploads** - Keep history of uploaded images

## Testing Checklist

✅ Upload JPG file
✅ Upload PNG file
✅ Drag & drop file
✅ File too large (>10MB)
✅ Non-image file
✅ Switch between camera and upload modes
✅ Prediction with uploaded image
✅ Reset and upload new file
✅ API response handling
✅ Error message display

---

**Status**: ✅ Complete and Ready to Use
**Backward Compatible**: Yes
**Breaking Changes**: None
