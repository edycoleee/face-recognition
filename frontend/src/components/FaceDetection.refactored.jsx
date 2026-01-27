import { useState, useCallback, useEffect, useRef } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { useContinuousDetection } from '../hooks/useContinuousDetection'
import { drawBoundingBoxes, scaleDetections } from '../utils/canvasHelpers'
import ImageDetection from './FaceDetection/ImageDetection'
import WebcamDetection from './FaceDetection/WebcamDetection'
import DetectionResults from './FaceDetection/DetectionResults'
import './FaceDetection.css'

const FaceDetection = () => {
  // Mode state
  const [detectionMode, setDetectionMode] = useState('image') // 'image' or 'webcam'
  
  // Image mode state
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  
  // Error state
  const [error, setError] = useState(null)
  
  // Custom hooks
  const camera = useCamera()
  const detection = useFaceDetection()
  
  // Temp canvas for downscaling
  const tempCanvasRef = useRef(null)

  // Continuous detection function
  const performContinuousDetection = useCallback(async () => {
    if (!camera.videoRef.current || !detection.canvasRef.current) {
      return
    }

    const video = camera.videoRef.current
    const canvas = detection.canvasRef.current

    if (!video.videoWidth || !video.videoHeight) {
      return
    }

    // Set canvas size
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Downscale for faster detection
    const targetWidth = 320
    const scale = targetWidth / canvas.width
    const targetHeight = Math.round(canvas.height * scale)
    
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas')
    }
    
    const tempCanvas = tempCanvasRef.current
    tempCanvas.width = targetWidth
    tempCanvas.height = targetHeight
    
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight)

    const base64Image = tempCanvas.toDataURL('image/jpeg', 0.6).split(',')[1]

    const result = await detection.detectFromWebcam(base64Image)

    if (result.success) {
      // Redraw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Scale boxes back
      const scaleX = canvas.width / targetWidth
      const scaleY = canvas.height / targetHeight
      const scaledFaces = scaleDetections(result.data.faces, scaleX, scaleY)
      
      drawBoundingBoxes(canvas, scaledFaces)
      continuous.setStatus(`✅ ${result.data.count} face(s)`)
    }
  }, [camera.videoRef, detection])

  const continuous = useContinuousDetection(performContinuousDetection)

  // Handle file selection
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      detection.resetDetection()
      setError(null)
    }
  }, [detection])

  // Handle image detection
  const handleImageDetection = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select an image first')
      return
    }

    setError(null)
    const result = await detection.detectFromImage(selectedFile)

    if (result.success) {
      // Draw on canvas
      if (detection.canvasRef.current && previewUrl) {
        const canvas = detection.canvasRef.current
        const ctx = canvas.getContext('2d')
        const img = new Image()

        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          drawBoundingBoxes(canvas, result.data.faces)
        }

        img.src = previewUrl
      }
    } else {
      setError(result.error)
    }
  }, [selectedFile, previewUrl, detection])

  // Handle webcam capture
  const handleWebcamCapture = useCallback(async () => {
    if (!camera.videoRef.current || !detection.canvasRef.current) return

    const video = camera.videoRef.current
    const canvas = detection.canvasRef.current

    if (!video.videoWidth || !video.videoHeight) {
      setError('Webcam not ready yet')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    setError(null)
    const result = await detection.detectFromWebcam(base64Image)

    if (result.success) {
      drawBoundingBoxes(canvas, result.data.faces)
    } else {
      setError(result.error)
    }
  }, [camera, detection])

  // Handle mode change
  const handleModeChange = useCallback((mode) => {
    setDetectionMode(mode)
    camera.stopCamera()
    continuous.stop()
    detection.resetDetection()
    setError(null)
    setSelectedFile(null)
    setPreviewUrl(null)
  }, [camera, continuous, detection])

  // Handle start webcam with continuous detection check
  const handleStartWebcam = useCallback(async () => {
    setError(null)
    await camera.startCamera()
  }, [camera])

  // Handle stop webcam
  const handleStopWebcam = useCallback(() => {
    continuous.stop()
    camera.stopCamera()
    detection.resetDetection()
  }, [camera, continuous, detection])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      camera.stopCamera()
      continuous.stop()
    }
  }, [])

  return (
    <div className="face-detection">
      <h1>Face Detection</h1>

      {/* Mode Selection */}
      <div className="mode-selection">
        <button
          className={detectionMode === 'image' ? 'active' : ''}
          onClick={() => handleModeChange('image')}
        >
          Upload Image
        </button>
        <button
          className={detectionMode === 'webcam' ? 'active' : ''}
          onClick={() => handleModeChange('webcam')}
        >
          Webcam
        </button>
      </div>

      {/* Image Upload Mode */}
      {detectionMode === 'image' && (
        <ImageDetection
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          canvasRef={detection.canvasRef}
          loading={detection.loading}
          onFileSelect={handleFileSelect}
          onDetect={handleImageDetection}
        />
      )}

      {/* Webcam Mode */}
      {detectionMode === 'webcam' && (
        <WebcamDetection
          isWebcamActive={camera.cameraActive}
          videoRef={camera.videoRef}
          canvasRef={detection.canvasRef}
          loading={detection.loading}
          isContinuousDetection={continuous.isActive}
          detectionStatus={continuous.status}
          onStartWebcam={handleStartWebcam}
          onStopWebcam={handleStopWebcam}
          onCapture={handleWebcamCapture}
          onToggleContinuous={continuous.toggle}
        />
      )}

      {/* Detection Results */}
      <DetectionResults
        detectionResult={detection.detectionResult}
        error={error}
      />
    </div>
  )
}

export default FaceDetection
