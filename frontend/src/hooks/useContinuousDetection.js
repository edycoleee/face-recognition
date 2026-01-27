import { useState, useRef, useCallback, useEffect } from 'react'

export function useContinuousDetection(detectFunction) {
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState('')
  const intervalRef = useRef(null)
  const isDetectingRef = useRef(false)

  const setStatusValue = useCallback((value) => {
    setStatus(value)
  }, [])

  const start = useCallback(() => {
    if (intervalRef.current) return

    setIsActive(true)
    setStatus('▶️ Started')

    // Run immediately
    detectFunction()

    // Then every 350ms
    intervalRef.current = setInterval(() => {
      if (!isDetectingRef.current) {
        isDetectingRef.current = true
        detectFunction().finally(() => {
          isDetectingRef.current = false
        })
      }
    }, 350)
  }, [detectFunction])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsActive(false)
    setStatus('⏸️ Stopped')
  }, [])

  const toggle = useCallback(() => {
    if (isActive) {
      stop()
    } else {
      start()
    }
  }, [isActive, start, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isActive,
    status,
    setStatus: setStatusValue,
    start,
    stop,
    toggle
  }
}
