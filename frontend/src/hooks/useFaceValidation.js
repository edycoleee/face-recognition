import { useState, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function useFaceValidation() {
  const [faceInPosition, setFaceInPosition] = useState(false)

  const validateFace = useCallback(async (imageData) => {
    const response = await fetch(`${API_BASE_URL}/face/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    })
    
    const data = await response.json()
    return data
  }, [])

  const checkFacePosition = useCallback((faceData, canvasWidth, canvasHeight) => {
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const radiusX = canvasWidth * 0.30
    const radiusY = canvasHeight * 0.40
    
    const [x1, y1, x2, y2] = faceData.bbox
    const faceCenterX = (x1 + x2) / 2
    const faceCenterY = (y1 + y2) / 2
    
    const dx = (faceCenterX - centerX) / radiusX
    const dy = (faceCenterY - centerY) / radiusY
    const isInOval = (dx * dx + dy * dy) <= 1
    
    setFaceInPosition(isInOval)
    return isInOval
  }, [])

  return {
    faceInPosition,
    validateFace,
    checkFacePosition
  }
}
