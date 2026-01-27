import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './HaloPage.css'

function HaloPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [nama, setNama] = useState('')
  const [handphone, setHandphone] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  const handleGetHalo = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/halo/`)
      const data = await res.json()
      setMessage(data.message)
      setResponse(data)
    } catch (err) {
      setError('Error fetching data: ' + err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePostHalo = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE_URL}/halo/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama: nama,
          handphone: handphone
        })
      })
      
      const data = await res.json()
      setResponse(data)
      setMessage(data.message)
    } catch (err) {
      setError('Error posting data: ' + err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="halo-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Home
      </button>

      <h1>Halo API Testing</h1>

      <div className="halo-content">
        {/* GET Request Section */}
        <div className="card">
          <h2>GET /api/halo/</h2>
          <p>Test simple GET request to API</p>
          <button onClick={handleGetHalo} disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : 'Get Halo Message'}
          </button>
        </div>

        {/* POST Request Section */}
        <div className="card">
          <h2>POST /api/halo/</h2>
          <p>Send data to API endpoint</p>
          <form onSubmit={handlePostHalo}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Handphone"
                value={handphone}
                onChange={(e) => setHandphone(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Sending...' : 'Send Halo'}
            </button>
          </form>
        </div>

        {/* Response Display */}
        {error && (
          <div className="card error-card">
            <h3>Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {message && !error && (
          <div className="card success-card">
            <h3>Message:</h3>
            <p>{message}</p>
          </div>
        )}

        {response && !error && (
          <div className="card">
            <h3>Response Data:</h3>
            <pre className="response-data">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default HaloPage
