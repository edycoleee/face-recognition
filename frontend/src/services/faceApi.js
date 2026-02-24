const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const faceApi = {
  async getUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`)
    const data = await response.json()
    return data
  },

  async getExistingFaceCount(userId) {
    const response = await fetch(`${API_BASE_URL}/face/users/${userId}/embeddings`)
    const data = await response.json()
    return data
  },

  async registerFaces(userId, images) {
    const response = await fetch(`${API_BASE_URL}/face/users/${userId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images })
    })
    const data = await response.json()
    return data
  },

  async identifyFace(imageBase64, threshold = 0.6) {
    const response = await fetch(`${API_BASE_URL}/identify/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, threshold })
    })
    const result = await response.json()
    // Return data directly for backward compatibility
    return result.data || result
  },

  async verifyFace(imageBase64, userId, threshold = 0.6) {
    const response = await fetch(`${API_BASE_URL}/identify/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        image: imageBase64,
        user_id: parseInt(userId),
        threshold
      })
    })
    const data = await response.json()
    return data
  }
}
