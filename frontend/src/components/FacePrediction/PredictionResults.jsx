function PredictionResults({ 
  predictionResult, 
  capturedImage, 
  error,
  onReset,
  inputMode = 'camera'
}) {
  if (!predictionResult && !error && !capturedImage) {
    return (
      <div className="empty-state">
        <p>
          {inputMode === 'camera' 
            ? '📷 Start camera and capture to see prediction results'
            : '📁 Upload an image file to see prediction results'
          }
        </p>
      </div>
    )
  }

  return (
    <>
      {capturedImage && (
        <div className="captured-preview">
          <img src={capturedImage} alt="Captured" />
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {predictionResult && (
        <div className="result-card">
          {predictionResult.identified ? (
            <MatchFound result={predictionResult} />
          ) : (
            <NoMatch result={predictionResult} />
          )}

          {predictionResult.top_matches && predictionResult.top_matches.length > 0 && (
            <TopMatches matches={predictionResult.top_matches} identified={predictionResult.identified} />
          )}

          <button onClick={onReset} className="btn-reset">
            Try Again
          </button>
        </div>
      )}
    </>
  )
}

function MatchFound({ result }) {
  return (
    <>
      <div className="result-header success">
        <h2>✅ Match Found!</h2>
      </div>
      <div className="result-body">
        <div className="result-item">
          <span className="label">Identified As:</span>
          <span className="value">{result.user_name}</span>
        </div>
        <div className="result-item">
          <span className="label">Email:</span>
          <span className="value">{result.user_email}</span>
        </div>
        <div className="result-item">
          <span className="label">Confidence:</span>
          <span className="value confidence">{result.confidence}%</span>
        </div>
        <div className="result-item">
          <span className="label">Similarity Score:</span>
          <span className="value">{result.similarity_score}</span>
        </div>
      </div>
    </>
  )
}

function NoMatch({ result }) {
  return (
    <>
      <div className="result-header failure">
        <h2>❌ No Match Found</h2>
      </div>
      <div className="result-body">
        <p>{result.message}</p>
        <div className="result-item">
          <span className="label">Best Confidence:</span>
          <span className="value">{result.confidence}%</span>
        </div>
        <div className="result-item">
          <span className="label">Threshold:</span>
          <span className="value">{result.threshold}%</span>
        </div>
      </div>
    </>
  )
}

function TopMatches({ matches, identified }) {
  return (
    <div className="top-matches">
      <h4>Top Matches:</h4>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Confidence</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, idx) => (
            <tr key={idx} className={idx === 0 && identified ? 'highlight' : ''}>
              <td>{idx + 1}</td>
              <td>{match.user_name}</td>
              <td>{match.confidence}%</td>
              <td>{match.similarity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PredictionResults
