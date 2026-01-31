/**
 * Custom hook for password login functionality
 * Handles password authentication flow
 */
import { useState, useCallback } from 'react';
import { loginWithPassword } from '../services/authApi';

/**
 * @typedef {Object} UsePasswordLoginReturn
 * @property {boolean} loading - Loading state
 * @property {string} error - Error message
 * @property {string} success - Success message
 * @property {Function} performPasswordLogin - Perform password login
 * @property {Function} resetMessages - Reset messages
 * @property {Function} setError - Set error message
 * @property {Function} setSuccess - Set success message
 */

/**
 * @returns {UsePasswordLoginReturn}
 */
export const usePasswordLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Perform password login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response data
   */
  const performPasswordLogin = useCallback(async (email, password) => {
    if (!email || !password) {
      const error = 'Please enter email and password';
      setError(error);
      throw new Error(error);
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await loginWithPassword(email, password);

      setSuccess('✅ Login successful!');

      return response;

    } catch (err) {
      const errorMessage = err.message || 'Password login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reset error and success messages
   */
  const resetMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  return {
    loading,
    error,
    success,
    performPasswordLogin,
    resetMessages,
    setError,
    setSuccess,
  };
};
