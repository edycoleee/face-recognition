export function drawBoundingBoxes(canvas, faces) {
  if (!canvas || !faces || faces.length === 0) return

  const ctx = canvas.getContext('2d')

  faces.forEach(face => {
    const [x1, y1, x2, y2] = face.bbox

    // Draw rectangle
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 3
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

    // Draw confidence
    ctx.fillStyle = '#00FF00'
    ctx.font = '16px Arial'
    ctx.fillText(`${(face.confidence * 100).toFixed(1)}%`, x1, y1 - 5)

    // Draw landmarks
    if (face.landmarks) {
      ctx.fillStyle = '#FF0000'
      face.landmarks.forEach(([lx, ly]) => {
        ctx.beginPath()
        ctx.arc(lx, ly, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
    }

    // Draw age and gender
    if (face.age || face.gender) {
      let label = []
      if (face.gender) label.push(face.gender)
      if (face.age) label.push(`${face.age}y`)
      
      if (label.length > 0) {
        ctx.fillStyle = '#00FF00'
        ctx.fillText(label.join(', '), x1, y2 + 20)
      }
    }
  })
}

export function scaleDetections(faces, scaleX, scaleY) {
  return faces.map(face => ({
    ...face,
    bbox: [
      face.bbox[0] * scaleX,
      face.bbox[1] * scaleY,
      face.bbox[2] * scaleX,
      face.bbox[3] * scaleY
    ],
    landmarks: face.landmarks
      ? face.landmarks.map(([lx, ly]) => [lx * scaleX, ly * scaleY])
      : null
  }))
}
