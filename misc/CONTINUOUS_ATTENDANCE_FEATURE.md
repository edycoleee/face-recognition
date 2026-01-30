# Face Attendance Continuous (N:N) - Feature Documentation

## 📋 Overview
Face Attendance Continuous mode is the 5th attendance method in the system, providing automatic face recognition every 3 seconds for monitoring entry/exit points.

## ✨ Key Features

### 🔄 Automatic Recognition
- **Interval**: Automatically recognizes faces every 3 seconds
- **Continuous Operation**: Runs indefinitely until user stops
- **No Manual Capture**: Fully automated - no need to click capture button

### 👥 Multi-Face Support
- Detects and identifies multiple faces simultaneously
- Same N:N (many-to-many) capabilities as Face Multi mode
- Wider camera view (1600x900) for better coverage

### 📊 Live Results Feed
- Real-time display of recognition results
- Color-coded status indicators:
  - **🟢 Green**: Successfully recorded
  - **🔵 Blue**: Skipped (within 2-hour protection)
  - **🟠 Orange**: Unknown/unidentified face
- Scrollable results list (last 50 entries)

### 📈 Session Statistics
- **Total Faces**: Total faces processed during session
- **Recorded**: Successfully recorded attendance
- **Skipped**: Skipped due to 2-hour protection
- **Unknown**: Unidentified faces

### ⏰ Duplicate Protection
- Same 2-hour minimum interval as Face Multi mode
- Prevents duplicate attendance records
- Users can only record once every 2 hours

## 🎨 User Interface

### Split Layout Design
```
┌─────────────────────────────────────────────────┐
│  Camera Section (60%)  │  Results Section (40%) │
│                        │                         │
│   📷 Live Camera       │   📊 Session Stats      │
│   🎯 Bounding Boxes    │   ┌──────────────────┐ │
│   ▶️/⏹️ Controls       │   │ ✅ User 1        │ │
│                        │   │ 🔵 User 2 (skip) │ │
│                        │   │ 🟠 Unknown       │ │
│                        │   │ ✅ User 3        │ │
│                        │   └──────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Components

#### Camera Section (Left)
- Live video preview with real-time face detection
- Color-coded bounding boxes matching status colors
- Start/Stop recognition buttons
- Status indicator with pulse animation when active

#### Results Section (Right)
- Session statistics bar (total/recorded/skipped/unknown)
- Live scrolling results list
- Each result shows:
  - User name or "Unknown"
  - Confidence percentage
  - Status badge
  - Timestamp

#### Stats Bar
```
┌─────────────────────────────────────────────────┐
│ Total: 15  │ ✅ Recorded: 8  │ ⏭️ Skipped: 5  │ ❓ Unknown: 2 │
└─────────────────────────────────────────────────┘
```

## 🔧 Technical Implementation

### Frontend Files

#### 1. **FaceAttendanceContinuousPopup.jsx** (320+ lines)
Location: `frontend/src/pages/FaceAttendanceContinuousPopup.jsx`

Key Functions:
```javascript
// Auto-recognition every 3 seconds
const startRecognition = () => {
  intervalRef.current = setInterval(recognizeFrame, 3000)
}

// Process frame and update results
const recognizeFrame = async () => {
  // Capture frame from video
  // Call attendanceFaceMulti() API
  // Draw bounding boxes
  // Update results and stats
}
```

State Management:
- `recognizing`: Boolean flag for active recognition
- `results[]`: Array of recognition results (max 50)
- `sessionStats`: Object with total/recorded/skipped/unknown counts
- `recordedUsersRef`: Set to track unique users in session

#### 2. **FaceAttendanceContinuousPopup.css**
Location: `frontend/src/pages/FaceAttendanceContinuousPopup.css`

Key Styles:
- `.popup-content`: Flexbox row layout (camera + results)
- `.camera-section`: flex: 2 (60% width)
- `.results-section`: flex: 1 (40% width)
- `.status-indicator.active`: Pulse animation
- `.result-item`: Color-coded borders

#### 3. **popupAttendance.js** (Updated)
Location: `frontend/src/utils/popupAttendance.js`

New Function:
```javascript
export const openFaceAttendanceContinuousPopup = (options = {})
```

Features:
- 1600x900 popup window (wider than multi mode)
- No timeout (runs indefinitely)
- Listens for `FACE_ATTENDANCE_CONTINUOUS_RESULT` message
- Returns session summary on close

#### 4. **AttendancePage.jsx** (Updated)
Location: `frontend/src/pages/AttendancePage.jsx`

Changes:
- Added 5th mode: `'face-continuous'`
- New handler: `handleFaceContinuousAttendance()`
- 5th mode selector button: 🔄 N:N Continuous
- Continuous mode instructions
- Info card explaining continuous recognition

#### 5. **App.jsx** (Updated)
Location: `frontend/src/App.jsx`

Changes:
- Import: `FaceAttendanceContinuousPopup`
- Route: `/attendance-continuous-popup`

### Backend API
Uses existing endpoint: `POST /api/attendance/face-multi`

No backend changes required - reuses multi-face endpoint.

## 🚀 Usage Flow

### From AttendancePage

1. **Select Mode**
   - Click "🔄 N:N Continuous" button in mode selector

2. **Configure Settings**
   - Select Presence Type (Incoming/Outcoming)
   - Adjust Confidence Threshold (0.00 - 1.00)

3. **Start Session**
   - Click "🔄 Start Continuous Recognition"
   - Popup window opens (1600x900)

### In Popup Window

4. **Camera Initialization**
   - Camera starts automatically
   - System begins recognition every 3 seconds

5. **Live Recognition**
   - Faces detected and identified automatically
   - Bounding boxes drawn in real-time
   - Results appear in right panel instantly

6. **Monitor Session**
   - Watch stats update: total/recorded/skipped/unknown
   - Scroll through results list
   - Green = success, Blue = skipped, Orange = unknown

7. **End Session**
   - Click "⏹️ Stop & Close" button
   - Session summary sent to parent page
   - Popup closes automatically

### Back on AttendancePage

8. **View Summary**
   - Success message displays session stats
   - Shows total faces processed
   - Breakdown of recorded/skipped/unknown

## 📊 Data Flow

```
AttendancePage (Main)
    ↓ (User clicks "Start Continuous Recognition")
    ↓ (Opens popup with openFaceAttendanceContinuousPopup())
    ↓
FaceAttendanceContinuousPopup (Popup Window)
    ↓ (setInterval every 3 seconds)
    ↓ (Captures frame → base64)
    ↓
Backend API: POST /api/attendance/face-multi
    ↓ (Returns recognition results)
    ↓
DetectionService: detect_faces()
    ↓ (Find all faces in frame)
    ↓
RecognitionService: find_best_match() for each face
    ↓ (Match against database)
    ↓
AttendanceService: can_record_attendance() check
    ↓ (2-hour protection)
    ↓
AttendanceService: create_attendance() if allowed
    ↓ (Insert to database)
    ↓
    ↓ (Results back to popup)
    ↓
FaceAttendanceContinuousPopup
    ↓ (Update canvas with bounding boxes)
    ↓ (Add to results list)
    ↓ (Update session stats)
    ↓ (User clicks "Stop & Close")
    ↓ (Send FACE_ATTENDANCE_CONTINUOUS_RESULT message)
    ↓
AttendancePage (Receives summary via postMessage)
    ↓ (Display success message with stats)
```

## 🎯 Use Cases

### 1. **Entrance Monitoring**
- Monitor building entrance/exit
- Automatic attendance for all entering employees
- Real-time tracking of who's in/out

### 2. **Event Registration**
- Conference or event check-in
- Continuous flow of attendees
- No need to stop for individual captures

### 3. **Classroom Attendance**
- Students enter classroom
- Automatic attendance taking
- No disruption to class flow

### 4. **Security Checkpoints**
- Access control points
- Continuous monitoring
- Immediate identification alerts

## ⚙️ Configuration

### Camera Settings
```javascript
const constraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  }
}
```

### Recognition Interval
```javascript
const RECOGNITION_INTERVAL = 3000 // 3 seconds
```

### Results Limit
```javascript
const MAX_RESULTS = 50 // Keep last 50 entries
```

### Popup Dimensions
```javascript
const width = 1600
const height = 900
```

## 🔒 Security Features

### 1. **Origin Validation**
- postMessage origin verification
- Only accepts messages from same origin

### 2. **2-Hour Protection**
- Prevents attendance spam
- User-level duplicate prevention
- Shared with Face Multi mode

### 3. **Session Isolation**
- Each session tracks its own users
- `recordedUsersRef` prevents duplicate displays
- Fresh start for each session

## 🐛 Error Handling

### Camera Errors
```javascript
try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
} catch (err) {
  setError('Failed to access camera: ' + err.message)
}
```

### Recognition Errors
```javascript
try {
  const response = await attendanceApi.attendanceFaceMulti(...)
} catch (err) {
  console.error('Recognition error:', err)
  // Continue with next interval
}
```

### Popup Blocked
```javascript
if (!popup) {
  reject(new Error('Popup blocked. Please allow popups for this site.'))
}
```

## 📈 Performance

### Optimization Strategies
1. **Interval-based**: 3-second delay prevents overwhelming backend
2. **Canvas Reuse**: Single canvas for all frames
3. **Results Pruning**: Limit to last 50 entries
4. **Ref for Tracking**: `recordedUsersRef` uses Set for O(1) lookup

### Resource Usage
- **Camera**: 1280x720 resolution
- **Network**: API call every 3 seconds
- **Memory**: Results array capped at 50 items
- **CPU**: Canvas drawing on each interval

## 🔄 Comparison with Other Modes

| Feature | Face 1:1 | Face 1:N Single | Face N:N Multi | **Face N:N Continuous** |
|---------|----------|-----------------|----------------|-------------------------|
| Email Required | ✅ | ❌ | ❌ | ❌ |
| Multiple Faces | ❌ | ❌ | ✅ | ✅ |
| Manual Capture | ✅ | ✅ | ✅ | ❌ (Auto) |
| Popup Window | ❌ | ✅ | ✅ | ✅ |
| Oval Guide | ✅ | ✅ | ❌ | ❌ |
| 2-Hour Protection | ❌ | ❌ | ✅ | ✅ |
| Auto Recognition | ❌ | ❌ | ❌ | ✅ (3s) |
| Live Results | ❌ | ❌ | ❌ | ✅ |
| Session Stats | ❌ | ❌ | ❌ | ✅ |
| Popup Size | - | 600x700 | 1400x900 | **1600x900** |

## 🎨 Color Coding System

### Bounding Boxes (Canvas)
```javascript
if (r.identified && !r.skipped) {
  ctx.strokeStyle = '#10B981' // Green - recorded
} else if (r.skipped) {
  ctx.strokeStyle = '#3B82F6' // Blue - skipped
} else {
  ctx.strokeStyle = '#F59E0B' // Orange - unknown
}
```

### Results List (CSS)
```css
.result-item.recorded {
  border-left: 4px solid #10B981;
  background: linear-gradient(to right, #10B98110, transparent);
}

.result-item.skipped {
  border-left: 4px solid #3B82F6;
  background: linear-gradient(to right, #3B82F610, transparent);
}

.result-item.unknown {
  border-left: 4px solid #F59E0B;
  background: linear-gradient(to right, #F59E0B10, transparent);
}
```

## 🚦 Status Indicators

### Recognition Status
```jsx
<div className={`status-indicator ${recognizing ? 'active' : ''}`}>
  <div className="status-dot"></div>
  <span>{recognizing ? 'Recognizing...' : 'Stopped'}</span>
</div>
```

### Pulse Animation
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}
```

## 📝 Message Protocol

### Message Type
```javascript
type: 'FACE_ATTENDANCE_CONTINUOUS_RESULT'
```

### Message Data
```javascript
{
  type: 'FACE_ATTENDANCE_CONTINUOUS_RESULT',
  success: true,
  data: {
    sessionStats: {
      total: 15,
      recorded: 8,
      skipped: 5,
      unknown: 2
    },
    results: [...] // Array of results
  },
  message: 'Continuous attendance session ended successfully'
}
```

## 🔍 Testing Checklist

- [ ] Popup opens with correct dimensions (1600x900)
- [ ] Camera starts automatically
- [ ] Recognition starts every 3 seconds
- [ ] Bounding boxes drawn with correct colors
- [ ] Results appear in right panel
- [ ] Stats update correctly (total/recorded/skipped/unknown)
- [ ] 2-hour protection works (users skipped if within 2h)
- [ ] Unknown faces handled correctly
- [ ] Multiple faces detected simultaneously
- [ ] Results list scrollable
- [ ] Last 50 entries kept
- [ ] Stop button ends recognition
- [ ] Close button sends message to parent
- [ ] Parent page displays session summary
- [ ] No console errors
- [ ] Camera releases on close

## 🎯 Future Enhancements

1. **Configurable Interval**: Allow users to set recognition interval (1-10s)
2. **Export Session Data**: Download session results as CSV/JSON
3. **Face Tracking**: Track same person across frames
4. **Alert System**: Notifications for specific users
5. **Attendance Log**: Show detailed log in popup
6. **Statistics Dashboard**: Visual charts for session data
7. **Video Recording**: Option to record session for review
8. **Custom Alerts**: Sound/visual alerts for VIPs
9. **Multi-Camera**: Support multiple camera feeds
10. **Cloud Sync**: Real-time sync to cloud dashboard

## 🏁 Conclusion

Face Attendance Continuous mode provides a powerful, fully automated attendance system suitable for high-traffic scenarios. With its split layout, live results feed, and color-coded status indicators, it offers the best user experience for monitoring entry/exit points.

Key Benefits:
- ✅ Zero user interaction required (fully automatic)
- ✅ Handles multiple people efficiently
- ✅ Real-time feedback with color coding
- ✅ Session statistics for reporting
- ✅ 2-hour duplicate protection
- ✅ Scalable for high-traffic scenarios
