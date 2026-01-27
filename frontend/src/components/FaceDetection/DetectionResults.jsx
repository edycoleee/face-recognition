function DetectionResults({ detectionResult, error }) {
  if (error) {
    return (
      <div className="error-message">
        <h3>Error:</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (!detectionResult) {
    return null
  }

  return (
    <div className="result-info">
      <h3>Detection Info:</h3>
      <p><strong>Faces Detected:</strong> {detectionResult.count}</p>
      {detectionResult.faces.map((face, idx) => (
        <div key={idx} className="face-info">
          <h4>Face {idx + 1}:</h4>
          <p>Confidence: {(face.confidence * 100).toFixed(2)}%</p>
          {face.gender && <p>Gender: {face.gender}</p>}
          {face.age && <p>Age: ~{face.age} years</p>}
          <p>BBox: [{face.bbox.join(', ')}]</p>
        </div>
      ))}
    </div>
  )
}

export default DetectionResults
