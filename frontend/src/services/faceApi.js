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

  async identifyFace(imageBase64) {
    const response = await fetch(`${API_BASE_URL}/detect/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 })
    })
    const data = await response.json()
    return data
  }
}
