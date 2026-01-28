import { useState, useRef, useCallback, useEffect } from 'react'

const AUTO_INTERVAL_MS = 2000

export function useCapture(initialTargetCaptures = 10) {
  const [captures, setCaptures] = useState([])
  const [captureMode, setCaptureMode] = useState('manual')
  const [isCapturing, setIsCapturing] = useState(false)
  const [autoInterval, setAutoInterval] = useState(null)
  const [targetCaptures, setTargetCaptures] = useState(initialTargetCaptures)
  const capturesRef = useRef([])

  // Sync captures to ref
  useEffect(() => {
    capturesRef.current = captures
  }, [captures])

  // Auto-stop when target reached
  useEffect(() => {
    if (captures.length >= targetCaptures && autoInterval) {
      stopAutoCapture()
    }
  }, [captures.length, targetCaptures, autoInterval])

  const addCapture = useCallback((imageData, faceData) => {
    const newCapture = {
      id: Date.now(),
      image: imageData,
      faceData: faceData,
      timestamp: new Date().toLocaleTimeString()
    }
    
    setCaptures(prev => [...prev, newCapture])
    return newCapture
  }, [])

  const deleteCapture = useCallback((id) => {
    setCaptures(prev => prev.filter(c => c.id !== id))
  }, [])

  const resetCaptures = useCallback(() => {
    setCaptures([])
  }, [])

  const startAutoCapture = useCallback((captureFunction) => {
    if (autoInterval) return
    
    setCaptureMode('auto')
    captureFunction() // Immediate first capture
    
    const interval = setInterval(captureFunction, AUTO_INTERVAL_MS)
    setAutoInterval(interval)
  }, [autoInterval])

  const stopAutoCapture = useCallback(() => {
    if (autoInterval) {
      clearInterval(autoInterval)
      setAutoInterval(null)
    }
  }, [autoInterval])

  return {
    captures,
    capturesRef,
    captureMode,
    setCaptureMode,
    isCapturing,
    setIsCapturing,
    autoInterval,
    targetCaptures,
    setTargetCaptures,
    addCapture,
    deleteCapture,
    resetCaptures,
    startAutoCapture,
    stopAutoCapture
  }
}
