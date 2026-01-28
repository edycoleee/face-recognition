import { useNavigate } from 'react-router-dom'
import './Landing.css'

function Landing() {
  const navigate = useNavigate()

  const cards = [
    {
      title: '🔐 Login',
      description: 'Face Recognition or Password Authentication',
      icon: '🚀',
      path: '/login',
      color: '#9C27B0'
    },
    {
      title: 'API Halo',
      description: 'Test GET and POST endpoints for Halo API',
      icon: '👋',
      path: '/halo',
      color: '#4CAF50'
    },
    {
      title: 'Face Detection',
      description: 'Upload images and detect faces using AI',
      icon: '🎭',
      path: '/face-detection',
      color: '#2196F3'
    },
    {
      title: 'User Management',
      description: 'Manage users with CRUD operations',
      icon: '👥',
      path: '/users',
      color: '#FF9800'
    }
  ]

  return (
    <div className="landing-container">
      <div className="landing-header">
        <h1>Face Recognition System</h1>
        <p>Sistem deteksi wajah dengan manajemen user terintegrasi</p>
      </div>

      <div className="cards-grid">
        {cards.map((card, index) => (
          <div
            key={index}
            className="landing-card"
            onClick={() => navigate(card.path)}
            style={{ borderColor: card.color }}
          >
            <div className="card-icon" style={{ color: card.color }}>
              {card.icon}
            </div>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <button
              className="card-button"
              style={{ backgroundColor: card.color }}
            >
              Open →
            </button>
          </div>
        ))}
      </div>

      <div className="landing-footer">
        <p>Built with Flask + React + PostgreSQL + pgvector</p>
      </div>
    </div>
  )
}

export default Landing
