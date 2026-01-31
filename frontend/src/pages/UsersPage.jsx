import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './UsersPage.css'

function UsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showFaceMenu, setShowFaceMenu] = useState(null) // Track which user's menu is open
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const USERS_PER_PAGE = 15

  useEffect(() => {
    fetchUsers()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFaceMenu && !event.target.closest('.dropdown')) {
        setShowFaceMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFaceMenu])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/users`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.data)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Error fetching users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = editingUser
        ? `${API_BASE_URL}/users/${editingUser.id}`
        : `${API_BASE_URL}/users`
      
      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (data.success) {
        fetchUsers()
        closeModal()
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Error saving user: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        fetchUsers()
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Error deleting user: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: ''
      })
    } else {
      setEditingUser(null)
      setFormData({ name: '', email: '', password: '' })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '' })
    setError(null)
  }

  const handleDeleteFaceData = async (userId) => {
    if (!confirm('Delete all face data for this user? This cannot be undone.')) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/face/users/${userId}/embeddings`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        alert('Face data deleted successfully')
        fetchUsers()
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Error deleting face data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterFace = (userId) => {
    setShowFaceMenu(null)
    navigate(`/users/${userId}/register-face`)
  }

  const handleUpdateFace = (userId) => {
    setShowFaceMenu(null)
    navigate(`/users/${userId}/register-face?mode=update`)
  }

  const handleReRegisterFace = async (userId) => {
    setShowFaceMenu(null)
    if (!confirm('This will delete all existing face data and start fresh. Continue?')) return
    
    // Delete existing face data first
    await handleDeleteFaceData(userId)
    // Then navigate to registration
    navigate(`/users/${userId}/register-face`)
  }

  // Pagination
  const indexOfLastUser = currentPage * USERS_PER_PAGE
  const indexOfFirstUser = indexOfLastUser - USERS_PER_PAGE
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser)
  const totalPages = Math.ceil(users.length / USERS_PER_PAGE)

  return (
    <div className="users-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Home
      </button>

      <div className="users-header">
        <h1>User Management</h1>
        <button className="btn-add" onClick={() => openModal()}>
          + Add New User
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Face Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  No users found
                </td>
              </tr>
            ) : (
              currentUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.face_registered ? (
                      <span className="status-badge status-registered">
                        ✓ Registered ({user.face_count})
                      </span>
                    ) : (
                      <span className="status-badge status-not-registered">
                        ✗ Not Registered
                      </span>
                    )}
                  </td>
                  <td>{new Date(user.created_at).toLocaleString()}</td>
                  <td>
                    <div className="actions-cell">
                      {/* Face Registration Actions */}
                      <div className="face-actions">
                        {!user.face_registered ? (
                          <button
                            className="btn-register"
                            onClick={() => handleRegisterFace(user.id)}
                          >
                            📷 Register Face
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn-update"
                              onClick={() => handleUpdateFace(user.id)}
                            >
                              ➕ Update Face
                            </button>
                            <button
                              className="btn-reregister"
                              onClick={() => handleReRegisterFace(user.id)}
                            >
                              🔄 Re-register
                            </button>
                          </>
                        )}
                      </div>

                      {user.face_registered && (
                        <>
                          <button
                            className="btn-predict"
                            onClick={() => navigate(`/users/${user.id}/predict?mode=1-n`)}
                          >
                            🔍 Predict 1:N
                          </button>
                          <button
                            className="btn-verify"
                            onClick={() => navigate(`/users/${user.id}/predict?mode=1-1`)}
                          >
                            ✓ Predict 1:1
                          </button>
                        </>
                      )}
                      <button
                        className="btn-edit"
                        onClick={() => openModal(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password {editingUser && '(leave blank to keep current)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
