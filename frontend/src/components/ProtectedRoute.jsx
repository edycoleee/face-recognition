import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/authApi';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Authenticated, render children
  return children;
}

export default ProtectedRoute;
