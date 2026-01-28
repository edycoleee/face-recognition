"""
Script untuk update password existing users ke hashed version
Jalankan script ini sekali untuk migrate existing users
"""
import psycopg2
import hashlib
import sys

# Database configuration
DB_CONFIG = {
    'dbname': 'face_db',
    'user': 'sultan',
    'password': 'Sulfat123#!',
    'host': '192.168.30.21',
    'port': 5432
}

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def update_existing_passwords():
    """
    Update all existing users to have hashed passwords
    
    CATATAN: Script ini hanya perlu dijalankan SEKALI
    Hanya untuk migrate existing users yang passwordnya masih plaintext
    """
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Get all users
        cursor.execute("SELECT id, email, password FROM users")
        users = cursor.fetchall()
        
        print(f"Found {len(users)} users in database")
        
        updated_count = 0
        for user_id, email, current_password in users:
            # Check if password is already hashed (64 chars = SHA256)
            if len(current_password) == 64:
                print(f"User {email} (ID: {user_id}) - Password already hashed, skipping")
                continue
            
            # Hash the plaintext password
            hashed = hash_password(current_password)
            
            # Update in database
            cursor.execute(
                "UPDATE users SET password = %s WHERE id = %s",
                (hashed, user_id)
            )
            
            print(f"User {email} (ID: {user_id}) - Password updated")
            print(f"  Old (plaintext): {current_password}")
            print(f"  New (hashed): {hashed[:16]}...")
            updated_count += 1
        
        # Commit changes
        conn.commit()
        
        print(f"\n✅ Successfully updated {updated_count} user password(s)")
        print(f"⏭️  Skipped {len(users) - updated_count} user(s) (already hashed)")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    print("🔐 Password Migration Script")
    print("=" * 50)
    
    response = input("Update existing user passwords to hashed version? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        update_existing_passwords()
    else:
        print("Migration cancelled")
