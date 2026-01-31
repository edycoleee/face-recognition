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
          {/* Handle both identification (1:N) and verification (1:1) results */}
          {(predictionResult.identified || predictionResult.verified) ? (
            <MatchFound result={predictionResult} />
          ) : (
            <NoMatch result={predictionResult} />
          )}

          {predictionResult.top_matches && predictionResult.top_matches.length > 0 && (
            <TopMatches matches={predictionResult.top_matches} identified={predictionResult.identified || predictionResult.verified} />
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
  const isVerification = result.verified !== undefined
  
  return (
    <>
      <div className="result-header success">
        <h2>✅ {isVerification ? 'Verification Success!' : 'Match Found!'}</h2>
      </div>
      <div className="result-body">
        <div className="result-item">
          <span className="label">{isVerification ? 'Verified As:' : 'Identified As:'}</span>
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
        {result.similarity_score && (
          <div className="result-item">
            <span className="label">Similarity Score:</span>
            <span className="value">{result.similarity_score}</span>
          </div>
        )}
        {result.best_similarity && (
          <div className="result-item">
            <span className="label">Best Similarity:</span>
            <span className="value">{result.best_similarity}</span>
          </div>
        )}
        {result.avg_similarity && (
          <div className="result-item">
            <span className="label">Average Similarity:</span>
            <span className="value">{result.avg_similarity}</span>
          </div>
        )}
        {result.embeddings_checked && (
          <div className="result-item">
            <span className="label">Embeddings Checked:</span>
            <span className="value">{result.embeddings_checked}</span>
          </div>
        )}
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
