/**
 * Popup detection utility for continuous face detection
 * Opens new window for continuous detection
 */

export const openFaceDetectionContinuousPopup = (options = {}) => {
  return new Promise((resolve, reject) => {
    const { threshold = 0.5 } = options;

    // Popup window dimensions & position
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
      threshold: threshold.toString()
    });
    
    const popupUrl = `/detection-continuous-popup?${params.toString()}`;

    // Open popup window
    const popup = window.open(popupUrl, 'Face Detection Continuous', features);

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

      // Check if it's our face detection continuous result message
      if (event.data && event.data.type === 'FACE_DETECTION_CONTINUOUS_RESULT') {
        cleanup();
        
        // Always resolve with session summary
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
        reject(new Error('Detection session ended'));
      }
    }, 500);
  });
};
