## Debugging Camera Issue

### Symptoms
- "📷 Starting camera..." appears
- No video image shown
- Camera permission might be granted

### Common Causes & Fixes

#### 1. **Autoplay Policy** ✅ FIXED
```jsx
// Added muted attribute - required by modern browsers
<video autoPlay playsInline muted />
```

#### 2. **Video Play Promise** ✅ FIXED
```jsx
// Better error handling with play() promise
videoRef.current.play()
  .then(() => console.log('Video playing'))
  .catch(err => console.error('Play error:', err))
```

#### 3. **CSS Display** ✅ FIXED
```css
.video-preview {
  display: block; /* Ensure visible */
  background: #000; /* Show black while loading */
}
```

### How to Debug

**1. Open Browser Console (F12)**
Check for logs:
- "Video playing" - Video started successfully
- "Play error:" - Autoplay blocked
- "Camera error:" - Permission denied

**2. Check Browser Permissions**
- Click lock icon in address bar
- Ensure Camera permission = "Allow"

**3. Test in Different Browsers**
- Chrome/Edge: Strict autoplay policy
- Firefox: More permissive
- Safari: Requires user gesture for some cases

### Manual Test

```javascript
// In browser console while on page:
const video = document.querySelector('.video-preview')
console.log('Video element:', video)
console.log('Video stream:', video?.srcObject)
console.log('Video dimensions:', video?.videoWidth, 'x', video?.videoHeight)
console.log('Video paused?', video?.paused)
console.log('Video muted?', video?.muted)
```

### Expected Flow
```
1. Click "Start Camera"
   → "📷 Starting camera..."
2. Browser asks permission (first time)
   → User clicks "Allow"
3. getUserMedia success
   → Stream assigned to video.srcObject
4. onloadedmetadata fires
   → video.play() called
5. play() promise resolves
   → "✅ Camera ready"
   → Video appears!
```

### Still Not Working?

Try this alternative startCamera:
```jsx
const startCamera = async () => {
  try {
    console.log('Requesting camera...')
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' }
    })
    console.log('Got stream:', stream)
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      streamRef.current = stream
      
      // Force play
      try {
        await videoRef.current.play()
        console.log('Video playing!')
        setCameraActive(true)
      } catch (playErr) {
        console.error('Play failed:', playErr)
      }
    }
  } catch (err) {
    console.error('Camera error:', err)
    setError(err.message)
  }
}
```
