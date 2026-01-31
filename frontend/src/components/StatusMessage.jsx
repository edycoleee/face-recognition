/**
 * Shared Status Message Component
 * Displays loading, error, and success messages
 */
import PropTypes from 'prop-types';
import './StatusMessage.css';

const StatusMessage = ({ type, message, children }) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'loading':
        return null; // Spinner handled separately
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '';
    }
  };

  const getClassName = () => {
    return `status-message status-message-${type}`;
  };

  return (
    <div className={getClassName()}>
      {type === 'loading' && (
        <div className="status-spinner"></div>
      )}
      
      {type !== 'loading' && (
        <div className="status-icon">{getIcon()}</div>
      )}
      
      <div className="status-content">
        {message && <div className="status-text">{message}</div>}
        {children}
      </div>
    </div>
  );
};

StatusMessage.propTypes = {
  type: PropTypes.oneOf(['error', 'success', 'loading', 'warning', 'info']).isRequired,
  message: PropTypes.string,
  children: PropTypes.node,
};

export default StatusMessage;
