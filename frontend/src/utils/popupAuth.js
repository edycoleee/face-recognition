/**
 * OAuth2-style popup authentication utility
 * Opens new Chrome window for face login (like Google OAuth)
 */

export const openFaceLoginPopup = (options = {}) => {
  return new Promise((resolve, reject) => {
    const { email, threshold = 0.6 } = options;

    if (!email) {
      reject(new Error('Email is required'));
      return;
    }

    // Popup window dimensions & position (centered on screen)
    const width = 600;
    const height = 700;
    const left = Math.floor((window.screen.width - width) / 2);
    const top = Math.floor((window.screen.height - height) / 2);

    // Window features (OAuth2-style popup)
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'location=no',
      'directories=no',
      'status=no',
      'menubar=no',
      'scrollbars=no',
      'resizable=yes',
      'copyhistory=no'
    ].join(',');

    // Build popup URL with params
    const params = new URLSearchParams({
      email,
      threshold: threshold.toString()
    });
    
    const popupUrl = `/login-popup?${params.toString()}`;

    // Open popup window
    const popup = window.open(popupUrl, 'Face Login', features);

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Focus popup window
    popup.focus();

    // Timeout handling (30 seconds)
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Authentication timeout (30s)'));
    }, 30000);

    // Listen for messages from popup window
    const handleMessage = (event) => {
      // Security: Verify origin matches current site
      if (event.origin !== window.location.origin) {
        console.warn('Rejected message from unknown origin:', event.origin);
        return;
      }

      // Check if it's our face login result message
      if (event.data && event.data.type === 'FACE_LOGIN_RESULT') {
        cleanup();
        
        if (event.data.success) {
          resolve({
            success: true,
            data: event.data.data,
            message: event.data.message
          });
        } else {
          reject(new Error(event.data.message || 'Authentication failed'));
        }
      }
    };

    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      
      // Close popup if still open
      if (popup && !popup.closed) {
        popup.close();
      }
    };

    // Add message listener
    window.addEventListener('message', handleMessage);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        cleanup();
        reject(new Error('Login cancelled by user'));
      }
    }, 500);
  });
};

/**
 * Open popup window for 1:N face identification login (no email required)
 */
export const openFaceLogin1NPopup = (options = {}) => {
  return new Promise((resolve, reject) => {
    const { threshold = 0.6 } = options;

    // Popup window dimensions & position (centered on screen)
    const width = 600;
    const height = 700;
    const left = Math.floor((window.screen.width - width) / 2);
    const top = Math.floor((window.screen.height - height) / 2);

    // Window features (OAuth2-style popup)
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'location=no',
      'directories=no',
      'status=no',
      'menubar=no',
      'scrollbars=yes',
      'resizable=yes',
      'copyhistory=no'
    ].join(',');

    // Build popup URL with params
    const params = new URLSearchParams({
      threshold: threshold.toString()
    });
    
    const popupUrl = `/login-popup-1n?${params.toString()}`;

    // Open popup window
    const popup = window.open(popupUrl, '1:N Face Login', features);

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Focus popup window
    popup.focus();

    // Timeout handling (60 seconds for 1:N search)
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Authentication timeout (60s)'));
    }, 60000);

    // Listen for messages from popup window
    const handleMessage = (event) => {
      // Security: Verify origin matches current site
      if (event.origin !== window.location.origin) {
        console.warn('Rejected message from unknown origin:', event.origin);
        return;
      }

      // Check if it's our 1:N face login result message
      if (event.data && event.data.type === 'FACE_LOGIN_1N_RESULT') {
        cleanup();
        
        if (event.data.success) {
          resolve({
            success: true,
            data: event.data.data,
            message: event.data.message
          });
        } else {
          reject(new Error(event.data.message || 'Authentication failed'));
        }
      }
    };

    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      
      // Close popup if still open
      if (popup && !popup.closed) {
        popup.close();
      }
    };

    // Add message listener
    window.addEventListener('message', handleMessage);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        cleanup();
        reject(new Error('Login cancelled by user'));
      }
    }, 500);
  });
};

/**
 * Open popup window for face recognition (detect + identify multiple faces)
 */
export const openFaceRecognitionPopup = () => {
  return new Promise((resolve, reject) => {
    // Popup window dimensions & position (wider for recognition)
    const width = 800;
    const height = 700;
    const left = Math.floor((window.screen.width - width) / 2);
    const top = Math.floor((window.screen.height - height) / 2);

    // Window features
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'location=no',
      'directories=no',
      'status=no',
      'menubar=no',
      'scrollbars=yes',
      'resizable=yes',
      'copyhistory=no'
    ].join(',');

    const popupUrl = '/recognition-popup';

    // Open popup window
    const popup = window.open(popupUrl, 'Face Recognition', features);

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Focus popup window
    popup.focus();

    // Note: This popup stays open for continuous recognition
    // User can close it manually when done
    
    resolve({
      success: true,
      popup: popup,
      message: 'Recognition window opened'
    });
  });
};
