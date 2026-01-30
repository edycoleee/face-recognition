/**
 * Popup recognition utility for optimized face recognition
 * Opens new window for face recognition with dual canvas
 */

export const openFaceRecognitionOptimizedPopup = (options = {}) => {
  return new Promise((resolve, reject) => {
    const { threshold = 0.6 } = options;

    // Popup window dimensions & position
    const width = 1000;
    const height = 800;
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
    
    const popupUrl = `/recognition-optimized-popup?${params.toString()}`;

    // Open popup window
    const popup = window.open(popupUrl, 'Face Recognition Optimized', features);

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Focus popup window
    popup.focus();

    // No timeout - let user control when to close
    // (since continuous mode can run indefinitely)

    // Listen for messages from popup window
    const handleMessage = (event) => {
      // Security: Verify origin matches current site
      if (event.origin !== window.location.origin) {
        console.warn('Rejected message from unknown origin:', event.origin);
        return;
      }

      // Check if it's our face recognition result message
      if (event.data && event.data.type === 'FACE_RECOGNITION_OPTIMIZED_RESULT') {
        cleanup();
        
        if (event.data.success) {
          resolve({
            success: true,
            data: event.data.data,
            message: event.data.message
          });
        } else {
          reject(new Error(event.data.message || 'Recognition failed'));
        }
      }
    };

    // Cleanup function
    const cleanup = () => {
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
        reject(new Error('Recognition cancelled by user'));
      }
    }, 500);
  });
};
