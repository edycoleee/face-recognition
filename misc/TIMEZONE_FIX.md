# Timezone Token Expiry Fix

## Problem

The authentication system had a timezone mismatch issue causing tokens to appear expired immediately after login:

1. **Backend**: Generated UTC datetime and sent as `2026-01-31T13:34:08.446291` (without timezone indicator)
2. **Frontend**: JavaScript `Date()` constructor interpreted this as LOCAL time
3. **Result**: Token appeared expired because browser converted local time to UTC, causing ~7 hour difference

### Example of the Issue:
```
Backend sends: 2026-01-31T13:34:08.446291
Frontend parses as local: 2026-01-31T13:34:08.446 (local timezone)
Frontend converts to UTC: 2026-01-31T06:34:08.446Z (7 hours behind!)
Current time: 2026-01-31T11:34:10.432Z
Result: Token appears expired (6:34 < 11:34) ❌
```

## Solution

### Backend Changes (`backend/app/api/auth.py`)

1. **Added helper function** to format datetime with proper UTC indicator:

```python
def format_utc_datetime(dt: datetime) -> str:
    """
    Format datetime as UTC ISO string with 'Z' suffix
    
    Returns:
        ISO format string with 'Z' suffix (e.g., '2026-01-31T13:34:08.446Z')
    """
    if dt.tzinfo is not None:
        dt_utc = dt.astimezone(timezone.utc)
        iso_str = dt_utc.isoformat()
        return iso_str.replace('+00:00', 'Z')
    else:
        return dt.isoformat() + 'Z'
```

2. **Updated all endpoints** to use `format_utc_datetime()` instead of `.isoformat()`:
   - `/auth/login-face` - Face login
   - `/auth/login-pass` - Password login
   - `/auth/verify` - Token verification
   - `/auth/tokens/<user_id>` - Get user tokens

### Frontend Changes (`frontend/src/services/authApi.js`)

1. **Updated `isTokenExpired()`** with better UTC parsing and validation:

```javascript
export const isTokenExpired = () => {
  const expiryStr = localStorage.getItem('tokenExpiry');
  
  if (!expiryStr) {
    return true;
  }

  try {
    // Parse as UTC - backend sends ISO format with 'Z' suffix
    const expiry = new Date(expiryStr);
    const now = new Date();
    
    // Validate parsed date
    if (isNaN(expiry.getTime())) {
      console.error('Invalid date format:', expiryStr);
      return true;
    }
    
    const isExpired = now > expiry;
    const diffMinutes = (expiry.getTime() - now.getTime()) / 1000 / 60;
    
    console.log('Token expiry check:', {
      expiryStr,
      expiryUTC: expiry.toISOString(),
      nowUTC: now.toISOString(),
      differenceMinutes: diffMinutes.toFixed(2),
      remainingMinutes: Math.max(0, diffMinutes).toFixed(2),
      isExpired
    });
    
    return isExpired;
  } catch (error) {
    console.error('Error parsing token expiry:', error);
    return true;
  }
};
```

2. **Updated logging** in `saveAuthData()` to show UTC explicitly

## How It Works Now

### Correct Flow:
```
1. Backend generates: datetime.now(timezone.utc) + timedelta(hours=2)
   → 2026-01-31 13:34:08.446291+00:00 (UTC aware)

2. Backend formats with helper: format_utc_datetime()
   → "2026-01-31T13:34:08.446Z" (with Z suffix)

3. Frontend receives: "2026-01-31T13:34:08.446Z"

4. Frontend parses: new Date("2026-01-31T13:34:08.446Z")
   → Correctly interprets as UTC ✅

5. Frontend compares with: new Date()
   → Both in UTC, comparison works! ✅
```

## Testing

### Test File Created
`test_timezone_fix.html` - Browser test showing:
- ✅ Correct UTC parsing with 'Z' suffix
- ⚠️ Problematic parsing without timezone
- ✅ Complete auth flow simulation
- ℹ️ Browser timezone information

### How to Test

1. **Start Backend**:
   ```bash
   cd backend
   source venv/bin/activate
   python app/main.py
   ```

2. **Open Frontend** and login with face or password

3. **Check Console Logs**:
   ```
   Saving auth data: {...}
   Expires at from backend (UTC): 2026-01-31T13:34:08.446Z
   Current time (UTC): 2026-01-31T11:34:08.927Z
   Token expiry saved (UTC): 2026-01-31T13:34:08.446Z
   
   Token expiry check: {
     expiryStr: "2026-01-31T13:34:08.446Z",
     expiryUTC: "2026-01-31T13:34:08.446Z",
     nowUTC: "2026-01-31T11:34:10.432Z",
     differenceMinutes: "119.97",
     remainingMinutes: "119.97",
     isExpired: false ✅
   }
   ```

4. **Verify Token Works**:
   - Should NOT be immediately expired
   - Should remain valid for 2 hours
   - Should successfully authenticate

## Key Points

- ✅ Always use **UTC** for server timestamps
- ✅ Always append **'Z'** suffix for UTC ISO strings
- ✅ JavaScript `Date()` correctly parses ISO strings with 'Z'
- ✅ Token expiry now works correctly across all timezones
- ✅ Improved logging for debugging

## Files Modified

1. `backend/app/api/auth.py` - Added helper function, updated all datetime responses
2. `frontend/src/services/authApi.js` - Improved token expiry checking and logging

## Related

- Token Expiry: 2 hours (configured in `utils/constants.py: Auth.TOKEN_EXPIRY_HOURS`)
- Timezone: UTC (Universal Coordinated Time)
- Format: ISO 8601 with 'Z' suffix (e.g., `2026-01-31T13:34:08.446Z`)
