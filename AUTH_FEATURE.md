# 🔐 Authentication Feature - Face Recognition API

## ✅ Fitur Authentication Selesai!

Sistem authentication lengkap dengan **Face Login** dan **Password Login** sudah berhasil ditambahkan.

---

## 🎯 Fitur yang Ditambahkan

### 1. **Database Schema** 
Tabel `auth_tokens` untuk menyimpan token authentication:

```sql
CREATE TABLE auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    confidence REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes:**
- `idx_auth_tokens_token` - Fast token lookup
- `idx_auth_tokens_user_id` - User tokens lookup
- `idx_auth_tokens_active` - Active tokens only (partial index)

### 2. **Constants** (`utils/constants.py`)
```python
class Auth:
    TOKEN_EXPIRY_HOURS = 2
    MIN_CONFIDENCE = 0.6
    DEFAULT_CONFIDENCE = 0.0  # For password login
    MIN_PASSWORD_LENGTH = 6
    TOKEN_LENGTH = 36  # UUID length
```

### 3. **Authentication Service** (`services/auth_service.py`)

#### Fungsi Utama:
- ✅ `hash_password()` - SHA256 password hashing
- ✅ `verify_password()` - Password verification
- ✅ `generate_token()` - UUID token generation
- ✅ `get_token_expiry()` - Calculate 2-hour expiry
- ✅ `create_auth_token()` - Create new token in DB
- ✅ `verify_token()` - Verify token validity
- ✅ `deactivate_token()` - Logout (deactivate token)
- ✅ `get_user_tokens()` - Get all active tokens for user
- ✅ `password_login()` - Email + password authentication
- ✅ `face_login()` - Face verification (1:1) authentication

### 4. **API Endpoints** (`api/auth.py`)

#### 📍 POST `/api/auth/login-face`
**Face Login dengan Verification (1:1)**

**Input:**
- `email` (form) - Email user
- `file` (file) - Face image
- `threshold` (form, optional) - Confidence threshold (default: 0.6)

**Response Success:**
```json
{
  "message": "Face login successful",
  "data": {
    "match": true,
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "expires_at": "2026-01-28T12:00:00",
    "confidence": 0.85
  }
}
```

**Keuntungan:**
- ⚡ Lebih cepat (1:1 verification vs 1:N identification)
- 🎯 Lebih akurat (focused comparison)
- 🔒 More secure (explicit user claim)

---

#### 📍 POST `/api/auth/login-pass`
**Password Login (Traditional)**

**Input:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response Success:**
```json
{
  "message": "Login successful",
  "data": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "expires_at": "2026-01-28T12:00:00"
  }
}
```

**Keuntungan:**
- 🔐 Standard & reliable
- 💻 Tidak perlu kamera
- ⚡ Instant verification
- 🔄 Good fallback method

---

#### 📍 POST `/api/auth/verify`
**Verify Token Validity**

**Input:**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Success:**
```json
{
  "message": "Token is valid",
  "data": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "confidence": 0.85,
    "expires_at": "2026-01-28T12:00:00"
  }
}
```

---

#### 📍 POST `/api/auth/logout`
**Logout (Deactivate Token)**

**Input:**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Success:**
```json
{
  "message": "Logout successful",
  "data": {
    "success": true
  }
}
```

---

#### 📍 GET `/api/auth/tokens/<user_id>`
**Get All Active Tokens for User**

**Response Success:**
```json
{
  "message": "Found 2 active token(s)",
  "data": {
    "user_id": 1,
    "count": 2,
    "tokens": [
      {
        "id": 1,
        "token": "550e8400-e29b-41d4-a716-446655440000",
        "confidence": 0.85,
        "created_at": "2026-01-28T10:00:00",
        "expires_at": "2026-01-28T12:00:00",
        "is_active": true
      }
    ]
  }
}
```

---

## 🔄 Authentication Flow

### Face Login Flow:
```
1. User input email → Frontend
2. User capture face → Camera
3. POST /api/auth/login-face (email + image)
4. Backend: Get user_id from email
5. Backend: Face verification (1:1)
6. Backend: Generate UUID token (2 jam expiry)
7. Return: token + user info + confidence
8. Frontend: Save token (localStorage/cookie)
9. Frontend: Use token for authenticated requests
```

### Password Login Flow:
```
1. User input email + password → Frontend
2. POST /api/auth/login-pass
3. Backend: Verify credentials
4. Backend: Generate UUID token (2 jam expiry)
5. Return: token + user info
6. Frontend: Save token
7. Frontend: Use token for authenticated requests
```

### Token Verification Flow:
```
1. Frontend: Send token in request
2. POST /api/auth/verify
3. Backend: Check token validity & expiry
4. Return: User info if valid
5. Frontend: Allow/deny access
```

---

## 📁 File Structure

```
backend/app/
├── services/
│   └── auth_service.py          (NEW) - Authentication logic
├── api/
│   └── auth.py                  (NEW) - Auth endpoints
├── utils/
│   └── constants.py             (UPDATED) - Auth constants
└── main.py                      (UPDATED) - Register auth namespace

database/
└── init.sql                     (UPDATED) - auth_tokens table
```

---

## 🔐 Security Features

1. **Password Hashing**: SHA256
2. **Token Expiry**: 2 hours
3. **UUID Tokens**: Secure random tokens
4. **Token Deactivation**: Logout functionality
5. **Email Validation**: Email format check
6. **Face Verification**: 1:1 matching dengan threshold
7. **Confidence Score**: Track authentication quality
8. **Cascade Delete**: Tokens dihapus saat user dihapus

---

## 🧪 Testing Commands

### 1. Apply Database Schema
```bash
cd /home/sultan/face-recognition/database
psql -h 192.168.30.21 -U sultan -d face_db -f init.sql
```

### 2. Test Password Login (curl)
```bash
curl -X POST http://localhost:5000/api/auth/login-pass \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 3. Test Face Login (curl)
```bash
curl -X POST http://localhost:5000/api/auth/login-face \
  -F "email=user@example.com" \
  -F "file=@/path/to/face.jpg" \
  -F "threshold=0.6"
```

### 4. Test Verify Token
```bash
curl -X POST http://localhost:5000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE"
  }'
```

### 5. Test Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE"
  }'
```

### 6. Get User Tokens
```bash
curl http://localhost:5000/api/auth/tokens/1
```

---

## 📊 Database Queries

### Check Active Tokens
```sql
SELECT * FROM auth_tokens WHERE is_active = TRUE;
```

### Check Expired Tokens
```sql
SELECT * FROM auth_tokens WHERE expires_at < NOW();
```

### Count Tokens per User
```sql
SELECT user_id, COUNT(*) 
FROM auth_tokens 
WHERE is_active = TRUE 
GROUP BY user_id;
```

### Manually Deactivate Token
```sql
UPDATE auth_tokens 
SET is_active = FALSE 
WHERE token = 'YOUR_TOKEN';
```

---

## 🎨 Frontend Integration

### Save Token (localStorage)
```javascript
// After login success
const { token, expires_at } = response.data;
localStorage.setItem('authToken', token);
localStorage.setItem('tokenExpiry', expires_at);
```

### Use Token in Requests
```javascript
// Add to headers
const token = localStorage.getItem('authToken');
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Check Token Expiry
```javascript
const expiry = new Date(localStorage.getItem('tokenExpiry'));
if (new Date() > expiry) {
  // Token expired, redirect to login
  logout();
}
```

---

## 🚀 Next Steps

### Frontend Implementation:
1. **Login Page**:
   - Face login dengan camera
   - Password login form
   - Mode toggle (Face/Password)

2. **Token Management**:
   - Save token di localStorage
   - Auto-logout saat expired
   - Refresh token mechanism (optional)

3. **Protected Routes**:
   - Check token before accessing pages
   - Redirect to login if invalid

4. **Logout Button**:
   - Call `/api/auth/logout`
   - Clear localStorage
   - Redirect to login

---

## ✅ Verification Checklist

- [x] Database schema created
- [x] Auth constants added
- [x] AuthService implemented
- [x] API endpoints created
- [x] Namespace registered
- [x] All files compile successfully
- [x] No errors found

**Status**: 🎉 Ready to Use!

---

**Token Expiry**: 2 jam  
**Authentication Methods**: Face (1:1) + Password  
**Token Type**: UUID  
**Security**: SHA256 + Expiry + Active status

Selamat mencoba! 🔐🚀
