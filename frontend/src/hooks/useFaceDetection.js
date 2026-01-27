import { useState, useRef, useCallback } from 'react'

export function useFaceDetection() {
  const [detectionResult, setDetectionResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  const detectFromImage = useCallback(async (file) => {
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/detect/image`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setDetectionResult(data)
        return { success: true, data }
      } else {
        return { success: false, error: data.error || 'Detection failed' }
      }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const detectFromWebcam = useCallback(async (imageData) => {
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/detect/webcam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      })

      const data = await response.json()

      if (response.ok) {
        setDetectionResult(data)
        return { success: true, data }
      } else {
        return { success: false, error: data.error || 'Detection failed' }
      }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const resetDetection = useCallback(() => {
    setDetectionResult(null)
  }, [])

  return {
    detectionResult,
    loading,
    canvasRef,
    detectFromImage,
    detectFromWebcam,
    resetDetection
  }
}
