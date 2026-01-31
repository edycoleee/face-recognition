import { useState, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function useFacePrediction() {
  const [predictionResult, setPredictionResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const predictFace = useCallback(async (imageData, threshold = 0.6) => {
    setLoading(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/identify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageData,
          threshold
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPredictionResult(data.data)
        return { success: true, data: data.data }
      } else {
        return { success: false, error: data.message }
      }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyFace = useCallback(async (imageData, userId, threshold = 0.6) => {
    setLoading(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/identify/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageData,
          user_id: parseInt(userId),
          threshold
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPredictionResult(data.data)
        return { success: true, data: data.data }
      } else {
        return { success: false, error: data.message }
      }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const resetPrediction = useCallback(() => {
    setPredictionResult(null)
  }, [])

  return {
    predictionResult,
    loading,
    predictFace,
    verifyFace,
    resetPrediction
  }
}
