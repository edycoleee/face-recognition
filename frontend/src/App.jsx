import { useState } from 'react'
import './App.css'
import FaceDetection from './components/FaceDetection'

function App() {
  const [activeTab, setActiveTab] = useState('detection') // detection, halo
  const [message, setMessage] = useState('')
  const [nama, setNama] = useState('')
  const [handphone, setHandphone] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Base URL untuk API
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  // Handle GET request
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

  // Handle POST request
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
    <div className="App">
      <h1>Flask API + React Frontend</h1>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={activeTab === 'detection' ? 'active' : ''}
          onClick={() => setActiveTab('detection')}
        >
          Face Detection
        </button>
        <button
          className={activeTab === 'halo' ? 'active' : ''}
          onClick={() => setActiveTab('halo')}
        >
          Halo API
        </button>
      </div>

      {/* Face Detection Tab */}
      {activeTab === 'detection' && <FaceDetection />}

      {/* Halo API Tab */}
      {activeTab === 'halo' && (
        <div className="halo-section">
          {/* GET Request Section */}
          <div className="card">
            <h2>GET /api/halo/</h2>
            <button onClick={handleGetHalo} disabled={loading}>
              {loading ? 'Loading...' : 'Get Halo Message'}
            </button>
          </div>

          {/* POST Request Section */}
          <div className="card">
            <h2>POST /api/halo/</h2>
            <form onSubmit={handlePostHalo}>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  style={{ marginRight: '10px', padding: '8px' }}
                />
                <input
                  type="text"
                  placeholder="Handphone"
                  value={handphone}
                  onChange={(e) => setHandphone(e.target.value)}
                  required
                  style={{ padding: '8px' }}
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Halo'}
              </button>
            </form>
          </div>

          {/* Response Display */}
          {error && (
            <div className="card" style={{ backgroundColor: '#ffebee', color: '#c62828' }}>
              <h3>Error:</h3>
              <p>{error}</p>
            </div>
          )}

          {message && !error && (
            <div className="card" style={{ backgroundColor: '#e8f5e9' }}>
              <h3>Message:</h3>
              <p>{message}</p>
            </div>
          )}

          {response && !error && (
            <div className="card">
              <h3>Response Data:</h3>
              <pre style={{ textAlign: 'left', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
