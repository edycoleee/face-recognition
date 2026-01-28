# 🔧 Password Hashing Fix

## ✅ Masalah Diperbaiki!

Password login sekarang sudah bekerja dengan benar.

---

## 🐛 Masalah yang Ditemukan

### Error:
```json
{
  "success": false,
  "message": "Invalid email or password",
  "data": 400
}
```

### Root Cause:
1. **Create User**: Password disimpan sebagai **plaintext** di database
2. **Login**: Password di-hash dengan **SHA256** sebelum dibandingkan
3. **Mismatch**: Plaintext ≠ SHA256 hash → Login gagal

---

## 🔧 Solusi yang Diterapkan

### 1. Update UserService ([services/user_service.py](app/services/user_service.py))

#### Added hash_password method:
```python
@staticmethod
def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()
```

#### Updated create_user:
```python
# Hash password before storing
hashed_password = UserService.hash_password(password)

cursor.execute(
    """INSERT INTO users (name, email, password) 
       VALUES (%s, %s, %s) ...""",
    (name, email, hashed_password)  # ← Hashed!
)
```

#### Updated update_user:
```python
# Hash password before updating
hashed_password = UserService.hash_password(password)

cursor.execute(
    """UPDATE users 
       SET name = %s, email = %s, password = %s ...""",
    (name, email, hashed_password, user_id)  # ← Hashed!
)
```

---

### 2. Password Migration Script ([backend/migrate_passwords.py](../migrate_passwords.py))

Script untuk update existing users yang passwordnya masih plaintext.

#### Features:
- ✅ Connect ke database
- ✅ Get all users
- ✅ Check jika password sudah hashed (64 chars)
- ✅ Hash plaintext passwords dengan SHA256
- ✅ Update database
- ✅ Show before/after comparison

#### Hasil Migration:
```
Found 1 users in database
User subject01@gmail.com (ID: 1) - Password updated
  Old (plaintext): 123456
  New (hashed): 8d969eef6ecad3c2...

✅ Successfully updated 1 user password(s)
```

---

## 🔄 Password Flow (Setelah Fix)

### Create User:
```
Frontend → POST /api/users
  {
    "name": "John",
    "email": "john@example.com", 
    "password": "mypass123"
  }
  
Backend → UserService.create_user()
  1. Hash password: SHA256("mypass123")
     → "8d969eef6ecad3c29029c2defffa96193..."
  2. Store hashed password in DB
  
Database:
  users table
  ├─ id: 1
  ├─ email: john@example.com
  └─ password: 8d969eef6ecad3c29029c2defffa96193... (64 chars)
```

### Login:
```
Frontend → POST /api/auth/login-pass
  {
    "email": "john@example.com",
    "password": "mypass123"
  }

Backend → AuthService.password_login()
  1. Get user by email
  2. Hash input password: SHA256("mypass123")
     → "8d969eef6ecad3c29029c2defffa96193..."
  3. Compare hashes:
     DB hash: 8d969eef6ecad3c29029c2defffa96193...
     Input hash: 8d969eef6ecad3c29029c2defffa96193...
     Match: ✅ YES
  4. Generate token
  5. Return success

Response:
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user_id": 1,
      "name": "John",
      "email": "john@example.com",
      "token": "550e8400-e29b-41d4-a716-446655440000",
      "expires_at": "2026-01-28T19:00:00"
    }
  }
```

---

## 🧪 Testing

### 1. Test Create New User
```bash
curl -X POST http://192.168.30.21:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

**Expected:** User created dengan password ter-hash

### 2. Test Password Login
```bash
curl -X POST http://192.168.30.21:5000/api/auth/login-pass \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

**Expected:** Login success dengan token

### 3. Test Wrong Password
```bash
curl -X POST http://192.168.30.21:5000/api/auth/login-pass \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'
```

**Expected:** "Invalid email or password" error

### 4. Verify Database
```sql
-- Check password length (should be 64 chars = SHA256)
SELECT id, email, LENGTH(password) as pass_length 
FROM users;

-- Example result:
-- id | email                  | pass_length
-- ---|------------------------|------------
--  1 | subject01@gmail.com    | 64
--  2 | test@example.com       | 64
```

---

## 📊 Before vs After

### Before Fix:
```
Database: password = "123456" (6 chars, plaintext)
Login Input: password = "123456"
Backend: SHA256("123456") = "8d969eef..."
Compare: "123456" == "8d969eef..." ❌ FAIL
```

### After Fix:
```
Database: password = "8d969eef..." (64 chars, SHA256)
Login Input: password = "123456"
Backend: SHA256("123456") = "8d969eef..."
Compare: "8d969eef..." == "8d969eef..." ✅ SUCCESS
```

---

## 🔐 Security Improvements

1. **Password Hashing**: SHA256 (one-way hash)
2. **No Plaintext Storage**: Passwords never stored in readable form
3. **Consistent Hashing**: Same algorithm for create, update, and verify
4. **Migration Script**: Easy update for existing users
5. **64 Characters**: Easy to identify hashed vs plaintext

---

## 🎯 Frontend Testing

### Using Login Page:

1. **Go to**: http://localhost:5173/login
2. **Select**: "🔑 Password Login"
3. **Enter**:
   - Email: `subject01@gmail.com`
   - Password: `123456`
4. **Click**: "🚀 Login"
5. **Result**: Should redirect to Dashboard ✅

### Expected Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user_id": 1,
    "name": "...",
    "email": "subject01@gmail.com",
    "token": "...",
    "expires_at": "..."
  }
}
```

---

## ✅ Verification Checklist

- [x] Added hash_password() to UserService
- [x] Updated create_user() to hash passwords
- [x] Updated update_user() to hash passwords
- [x] Created migration script
- [x] Migrated existing user passwords
- [x] Tested password login
- [x] All files compile successfully

**Status**: 🎉 Password Login Working!

---

## 💡 Important Notes

1. **Migration Script**: Only run once (checks for 64-char hashes)
2. **New Users**: Automatically hashed on creation
3. **Update Users**: Automatically hashed on update
4. **SHA256**: Industry-standard hashing algorithm
5. **One-Way**: Cannot reverse hash to get original password

Sekarang password login sudah bekerja dengan benar! 🔐✅
