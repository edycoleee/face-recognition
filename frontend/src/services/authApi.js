/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

const API_BASE_URL = 'http://192.168.30.21:5000/api';

/**
 * Login with face verification (1:1)
 * 
 * @param {string} email - User email
 * @param {string} base64Image - Base64 encoded image string
 * @param {number} threshold - Confidence threshold (optional)
 * @returns {Promise} Response with token and user info
 */
export const loginWithFace = async (email, base64Image, threshold = 0.6) => {
  const response = await fetch(`${API_BASE_URL}/auth/login-face`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      image: base64Image,
      threshold
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Face login failed');
  }

  return data;
};

/**
 * Login with email and password
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} Response with token and user info
 */
export const loginWithPassword = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login-pass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Password login failed');
  }

  return data;
};

/**
 * Verify token validity
 * 
 * @param {string} token - UUID token
 * @returns {Promise} Response with user info if valid
 */
export const verifyToken = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Token verification failed');
  }

  return data;
};

/**
 * Logout (deactivate token)
 * 
 * @param {string} token - UUID token
 * @returns {Promise} Response with success status
 */
export const logout = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Logout failed');
  }

  return data;
};

/**
 * Get all active tokens for a user
 * 
 * @param {number} userId - User ID
 * @returns {Promise} Response with list of tokens
 */
export const getUserTokens = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/auth/tokens/${userId}`, {
    method: 'GET',
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to get user tokens');
  }

  return data;
};

/**
 * Save authentication data to localStorage
 * 
 * @param {Object} authData - Authentication data from login response
 */
export const saveAuthData = (authData) => {
  localStorage.setItem('authToken', authData.data.token);
  localStorage.setItem('userEmail', authData.data.email);
  localStorage.setItem('userName', authData.data.name);
  localStorage.setItem('userId', authData.data.user_id.toString());
  localStorage.setItem('tokenExpiry', authData.data.expires_at);
  
  if (authData.data.confidence !== undefined) {
    localStorage.setItem('loginConfidence', authData.data.confidence.toString());
  }
};

/**
 * Get authentication token from localStorage
 * 
 * @returns {string|null} Token or null if not found
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Get user data from localStorage
 * 
 * @returns {Object|null} User data or null if not found
 */
export const getUserData = () => {
  const token = getAuthToken();
  
  if (!token) return null;

  return {
    token,
    email: localStorage.getItem('userEmail'),
    name: localStorage.getItem('userName'),
    userId: parseInt(localStorage.getItem('userId')),
    expiresAt: localStorage.getItem('tokenExpiry'),
    confidence: parseFloat(localStorage.getItem('loginConfidence')) || null,
  };
};

/**
 * Check if token is expired
 * 
 * @returns {boolean} True if expired
 */
export const isTokenExpired = () => {
  const expiryStr = localStorage.getItem('tokenExpiry');
  
  if (!expiryStr) return true;

  const expiry = new Date(expiryStr);
  return new Date() > expiry;
};

/**
 * Check if user is authenticated
 * 
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  return token !== null && !isTokenExpired();
};

/**
 * Clear all authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('loginConfidence');
};

/**
 * Logout and clear auth data
 * 
 * @returns {Promise} Logout result
 */
export const logoutAndClear = async () => {
  const token = getAuthToken();
  
  if (token) {
    try {
      await logout(token);
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with clearing even if API fails
    }
  }
  
  clearAuthData();
};
