import { useEffect } from 'react'

export function useOvalGuide(overlayCanvasRef, videoRef, cameraActive, faceInPosition) {
  useEffect(() => {
    if (!cameraActive || !overlayCanvasRef.current || !videoRef.current) {
      return
    }

    let animationId

    const drawOvalGuide = () => {
      const video = videoRef.current
      const canvas = overlayCanvasRef.current
      
      if (!video?.videoWidth || !video?.videoHeight) {
        animationId = requestAnimationFrame(drawOvalGuide)
        return
      }
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radiusX = canvas.width * 0.30
      const radiusY = canvas.height * 0.40
      
      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Cut out oval
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw oval border
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      ctx.strokeStyle = faceInPosition ? '#00ff00' : '#00ffff'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      ctx.stroke()
      
      // Instructions
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Position your face inside the oval', centerX, 40)
      ctx.font = '14px Arial'
      ctx.fillText('Look straight at the camera', centerX, canvas.height - 30)
      
      animationId = requestAnimationFrame(drawOvalGuide)
    }
    
    drawOvalGuide()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [cameraActive, faceInPosition, overlayCanvasRef, videoRef])
}
