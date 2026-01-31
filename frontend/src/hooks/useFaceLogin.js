/**
 * Custom hook for face login functionality
 * Handles face verification and login flow
 */
import { useState, useCallback } from 'react';
import { loginWithFace } from '../services/authApi';

/**
 * @typedef {Object} UseFaceLoginReturn
 * @property {boolean} loading - Loading state
 * @property {string} error - Error message
 * @property {string} success - Success message
 * @property {Function} performFaceLogin - Perform face login
 * @property {Function} resetMessages - Reset messages
 * @property {Function} setError - Set error message
 * @property {Function} setSuccess - Set success message
 */

/**
 * @returns {UseFaceLoginReturn}
 */
export const useFaceLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Perform face login with verification
   * @param {string} email - User email
   * @param {string} base64Image - Base64 encoded image
   * @param {number} threshold - Confidence threshold
   * @returns {Promise<Object>} Login response data
   */
  const performFaceLogin = useCallback(async (email, base64Image, threshold = 0.6) => {
    if (!email) {
      const error = 'Please enter your email first';
      setError(error);
      throw new Error(error);
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Starting face verification for email:', email);
      console.log('Threshold:', threshold);
      console.log('Base64 image length:', base64Image.length);

      const response = await loginWithFace(email, base64Image, threshold);

      console.log('Login response:', response);

      // Validate response
      if (!response) {
        throw new Error('No response from server');
      }

      if (!response.success) {
        // Wrong person detected
        if (response.data && response.data.actual_identity) {
          const actual = response.data.actual_identity;
          throw new Error(
            `❌ Wrong person detected!\n` +
            `Expected: ${email}\n` +
            `Detected: ${actual.user_name} (Confidence: ${actual.detected_confidence.toFixed(2)})`
          );
        }
        
        // Verification failed with confidence
        if (response.data && typeof response.data.confidence !== 'undefined') {
          throw new Error(`${response.message || 'Verification failed'} (Confidence: ${response.data.confidence.toFixed(2)})`);
        }
        
        throw new Error(response.message || 'Verification failed');
      }

      // Validate data
      if (!response.data) {
        throw new Error('Invalid response data from server');
      }

      // Success message with confidence
      const confidenceText = response.data.confidence
        ? ` Confidence: ${response.data.confidence.toFixed(2)}`
        : '';

      const successMessage = `✅ Login successful!${confidenceText}`;
      setSuccess(successMessage);

      return response;

    } catch (err) {
      console.error('Face verification error:', err);

      // Extract error message
      let errorMessage = 'Face verification failed. Please try again.';

      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

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
    performFaceLogin,
    resetMessages,
    setError,
    setSuccess,
  };
};
