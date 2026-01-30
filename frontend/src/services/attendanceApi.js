const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const attendanceApi = {
  /**
   * Record attendance using password
   */
  async attendancePassword(email, password, presence) {
    const response = await fetch(`${API_BASE_URL}/attendance/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, presence })
    })
    const data = await response.json()
    return data
  },

  /**
   * Record attendance using face verification (1:1)
   */
  async attendanceFaceOne(userId, imageBase64, presence, threshold = 0.6) {
    const response = await fetch(`${API_BASE_URL}/attendance/face-one`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        image: imageBase64, 
        presence,
        threshold 
      })
    })
    const data = await response.json()
    return data
  },

  /**
   * Record attendance using face identification (1:N single face)
   */
  async attendanceFaceAll(imageBase64, presence, threshold = 0.6) {
    const response = await fetch(`${API_BASE_URL}/attendance/face-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        image: imageBase64, 
        presence,
        threshold 
      })
    })
    const data = await response.json()
    return data
  },

  /**
   * Record attendance using face identification (1:N multiple faces)
   */
  async attendanceFaceMulti(imageBase64, presence, threshold = 0.6) {
    const response = await fetch(`${API_BASE_URL}/attendance/face-multi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        image: imageBase64, 
        presence,
        threshold 
      })
    })
    const data = await response.json()
    return data
  },

  /**
   * Get all attendance records
   */
  async getAllAttendance(limit = 100, offset = 0) {
    const response = await fetch(`${API_BASE_URL}/attendance/all?limit=${limit}&offset=${offset}`)
    const data = await response.json()
    return data
  },

  /**
   * Get attendance by ID
   */
  async getAttendanceById(attendanceId) {
    const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}`)
    const data = await response.json()
    return data
  },

  /**
   * Get user's attendance records
   */
  async getUserAttendance(userId, limit = 50) {
    const response = await fetch(`${API_BASE_URL}/attendance/user/${userId}?limit=${limit}`)
    const data = await response.json()
    return data
  }
}
