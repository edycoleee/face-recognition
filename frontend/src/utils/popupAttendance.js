/**
 * Popup attendance utility for face recognition (1:N Single)
 * Opens new window for face attendance (similar to OAuth)
 */

export const openFaceAttendanceSinglePopup = (options = {}) => {
  return new Promise((resolve, reject) => {
    const { presence = 'incoming', threshold = 0.6 } = options;

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
      presence,
      threshold: threshold.toString()
    });
    
    const popupUrl = `/attendance-popup?${params.toString()}`;

    // Open popup window
    const popup = window.open(popupUrl, 'Face Attendance', features);

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Focus popup window
    popup.focus();

    // Timeout handling (30 seconds)
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Attendance timeout (30s)'));
    }, 30000);

    // Listen for messages from popup window
    const handleMessage = (event) => {
      // Security: Verify origin matches current site
      if (event.origin !== window.location.origin) {
        console.warn('Rejected message from unknown origin:', event.origin);
        return;
      }

      // Check if it's our face attendance result message
      if (event.data && event.data.type === 'FACE_ATTENDANCE_RESULT') {
        cleanup();
        
        if (event.data.success) {
          resolve({
            success: true,
            data: event.data.data,
            message: event.data.message
          });
        } else {
          reject(new Error(event.data.message || 'Attendance failed'));
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
        reject(new Error('Attendance cancelled by user'));
      }
    }, 500);
  });
};

/**
 * Open popup window for face attendance (N:N Multiple faces)
 */
export const openFaceAttendanceMultiPopup = (options = {}) => {
  return new Promise((resolve, reject) => {
    const { presence = 'incoming', threshold = 0.6 } = options;

    // Popup window dimensions & position (wider for multiple faces)
    const width = 1400;
    const height = 900;
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

    // Build popup URL with params
    const params = new URLSearchParams({
      presence,
      threshold: threshold.toString()
    });
    
    const popupUrl = `/attendance-multi-popup?${params.toString()}`;

    // Open popup window
    const popup = window.open(popupUrl, 'Face Attendance Multi', features);

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Focus popup window
    popup.focus();

    // Timeout handling (60 seconds for multiple faces)
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Attendance timeout (60s)'));
    }, 60000);

    // Listen for messages from popup window
    const handleMessage = (event) => {
      // Security: Verify origin matches current site
      if (event.origin !== window.location.origin) {
        console.warn('Rejected message from unknown origin:', event.origin);
        return;
      }

      // Check if it's our face attendance result message
      if (event.data && event.data.type === 'FACE_ATTENDANCE_MULTI_RESULT') {
        cleanup();
        
        if (event.data.success) {
          resolve({
            success: true,
            data: event.data.data,
            message: event.data.message
          });
        } else {
          reject(new Error(event.data.message || 'Attendance failed'));
        }
      }
    };

    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      
      // Don't auto-close popup for multi-face (let user see results)
      // User can close manually
    };

    // Add message listener
    window.addEventListener('message', handleMessage);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        cleanup();
        reject(new Error('Attendance cancelled by user'));
      }
    }, 500);
  });
};

/**
 * Open popup window for face attendance (N:N Continuous Recognition)
 * Continuous recognition every 3 seconds
 */
export const openFaceAttendanceContinuousPopup = (options = {}) => {
  return new Promise((resolve, reject) => {
    const { presence = 'incoming', threshold = 0.6 } = options;

    // Popup window dimensions & position (wider for continuous + results)
    const width = 1600;
    const height = 900;
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

    // Build popup URL with params
    const params = new URLSearchParams({
      presence,
      threshold: threshold.toString()
    });
    
    const popupUrl = `/attendance-continuous-popup?${params.toString()}`;

    // Open popup window
    const popup = window.open(popupUrl, 'Face Attendance Continuous', features);

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Focus popup window
    popup.focus();

    // No timeout for continuous mode (let it run indefinitely)

    // Listen for messages from popup window
    const handleMessage = (event) => {
      // Security: Verify origin matches current site
      if (event.origin !== window.location.origin) {
        console.warn('Rejected message from unknown origin:', event.origin);
        return;
      }

      // Check if it's our face attendance continuous result message
      if (event.data && event.data.type === 'FACE_ATTENDANCE_CONTINUOUS_RESULT') {
        cleanup();
        
        // Always resolve with session summary (even if no faces recorded)
        resolve({
          success: true,
          data: event.data.data,
          message: event.data.message
        });
      }
    };

    // Cleanup function
    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      
      // Don't auto-close popup for continuous mode
      // User controls when to close
    };

    // Add message listener
    window.addEventListener('message', handleMessage);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        cleanup();
        reject(new Error('Continuous attendance session ended'));
      }
    }, 500);
  });
};
