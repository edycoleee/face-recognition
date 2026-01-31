/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Base API fetch function with consistent error handling
 * @param {string} endpoint - API endpoint (e.g., '/auth/login-face')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} Response data
 * @throws {Error} If request fails or response is not ok
 */
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const fetchOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    // Network error or JSON parse error
    if (error instanceof TypeError) {
      throw new Error('Network error: Unable to reach server');
    }
    throw error;
  }
};

/**
 * Login with face verification (1:1)
 * 
 * @param {string} email - User email
 * @param {string} base64Image - Base64 encoded image string
 * @param {number} threshold - Confidence threshold (optional)
 * @returns {Promise<Object>} Response with token and user info
 * @throws {Error} If login fails
 */
export const loginWithFace = async (email, base64Image, threshold = 0.6) => {
  if (!email || !base64Image) {
    throw new Error('Email and image are required');
  }

  return apiFetch('/auth/login-face', {
    method: 'POST',
    body: JSON.stringify({
      email,
      image: base64Image,
      threshold
    }),
  });
};

/**
 * Login with email and password
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Response with token and user info
 * @throws {Error} If login fails
 */
export const loginWithPassword = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  return apiFetch('/auth/login-pass', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

/**
 * Verify token validity
 * 
 * @param {string} token - UUID token
 * @returns {Promise<Object>} Response with user info if valid
 * @throws {Error} If token is invalid
 */
export const verifyToken = async (token) => {
  if (!token) {
    throw new Error('Token is required');
  }

  return apiFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
};

/**
 * Logout (deactivate token)
 * 
 * @param {string} token - UUID token
 * @returns {Promise<Object>} Response with success status
 * @throws {Error} If logout fails
 */
export const logout = async (token) => {
  if (!token) {
    throw new Error('Token is required');
  }

  return apiFetch('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
};

/**
 * Get all active tokens for a user
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Response with list of tokens
 * @throws {Error} If request fails
 */
export const getUserTokens = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  return apiFetch(`/auth/tokens/${userId}`, {
    method: 'GET',
  });
};

/**
 * Get user by email (for attendance purposes)
 * 
 * @param {string} email - User email
 * @returns {Promise<Object>} Response with user info
 * @throws {Error} If user not found
 */
export const getUserByEmail = async (email) => {
  if (!email) {
    throw new Error('Email is required');
  }

  return apiFetch(`/users?email=${encodeURIComponent(email)}`, {
    method: 'GET',
  });
};

/**
 * Save authentication data to localStorage
 * 
 * @param {Object} authData - Authentication data from login response
 */
export const saveAuthData = (authData) => {
  console.log('Saving auth data:', authData.data);
  console.log('Expires at from backend (UTC):', authData.data.expires_at);
  console.log('Current time (UTC):', new Date().toISOString());
  
  localStorage.setItem('authToken', authData.data.token);
  localStorage.setItem('userEmail', authData.data.email);
  localStorage.setItem('userName', authData.data.name);
  localStorage.setItem('userId', authData.data.user_id.toString());
  // Store the UTC timestamp directly from backend
  localStorage.setItem('tokenExpiry', authData.data.expires_at);
  
  if (authData.data.confidence !== undefined) {
    localStorage.setItem('loginConfidence', authData.data.confidence.toString());
  }
  
  console.log('Token expiry saved (UTC):', localStorage.getItem('tokenExpiry'));
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
  
  if (!expiryStr) {
    console.log('No token expiry found in localStorage');
    return true;
  }

  try {
    // Parse as UTC - backend sends ISO format with 'Z' suffix
    // JavaScript Date constructor correctly handles ISO strings with 'Z' as UTC
    const expiry = new Date(expiryStr);
    const now = new Date();
    
    // Validate parsed date
    if (isNaN(expiry.getTime())) {
      console.error('Invalid date format:', expiryStr);
      return true;
    }
    
    const isExpired = now > expiry;
    const diffMinutes = (expiry.getTime() - now.getTime()) / 1000 / 60;
    
    // Debug log
    console.log('Token expiry check:', {
      expiryStr,
      expiryUTC: expiry.toISOString(),
      nowUTC: now.toISOString(),
      differenceMinutes: diffMinutes.toFixed(2),
      remainingMinutes: Math.max(0, diffMinutes).toFixed(2),
      isExpired
    });
    
    return isExpired;
  } catch (error) {
    console.error('Error parsing token expiry:', error);
    return true;
  }
};

/**
 * Check if user is authenticated
 * 
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  const hasToken = token !== null;
  const expired = isTokenExpired();
  
  // Debug log
  console.log('Authentication check:', {
    hasToken,
    token: token ? token.substring(0, 20) + '...' : null,
    expired,
    isAuthenticated: hasToken && !expired
  });
  
  return hasToken && !expired;
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

// Export all functions as authApi object
export const authApi = {
  loginWithFace,
  loginWithPassword,
  verifyToken,
  logout,
  getUserTokens,
  getUserByEmail,
  saveAuthData,
  getAuthToken,
  getUserData,
  isTokenExpired,
  isAuthenticated,
  clearAuthData,
  logoutAndClear
};
