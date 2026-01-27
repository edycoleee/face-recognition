import os
import shutil
from datetime import datetime
from utils.db import get_db_connection, get_db_cursor
from utils.logger import logger

DATASET_DIR = "dataset"

def serialize_datetime(obj):
    """Convert datetime objects to ISO format string"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_user(user_dict):
    """Serialize user dict with datetime conversion"""
    if user_dict is None:
        return None
    return {
        **user_dict,
        'created_at': serialize_datetime(user_dict.get('created_at'))
    }

class UserService:

    @staticmethod
    def get_all_users():
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute("""
                SELECT 
                    u.id, 
                    u.name, 
                    u.email, 
                    u.created_at,
                    COUNT(fe.id) as face_count
                FROM users u
                LEFT JOIN face_embeddings fe ON u.id = fe.user_id
                GROUP BY u.id, u.name, u.email, u.created_at
                ORDER BY u.id DESC
            """)
            rows = cursor.fetchall()
            # Convert RealDictRow to regular dict and serialize datetime
            users = []
            for row in rows:
                user_dict = dict(row)
                user_dict['face_registered'] = user_dict['face_count'] > 0
                user_dict['created_at'] = serialize_datetime(user_dict.get('created_at'))
                users.append(user_dict)
            return users

    @staticmethod
    def get_user(user_id):
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute("""
                SELECT 
                    u.id, 
                    u.name, 
                    u.email, 
                    u.created_at,
                    COUNT(fe.id) as face_count
                FROM users u
                LEFT JOIN face_embeddings fe ON u.id = fe.user_id
                WHERE u.id = %s
                GROUP BY u.id, u.name, u.email, u.created_at
            """, (user_id,))
            row = cursor.fetchone()
            if row:
                user_dict = dict(row)
                user_dict['face_registered'] = user_dict['face_count'] > 0
                user_dict['created_at'] = serialize_datetime(user_dict.get('created_at'))
                return user_dict
            return None

    @staticmethod
    def create_user(name, email, password):
        with get_db_connection() as conn:
            try:
                cursor = get_db_cursor(conn)
                cursor.execute(
                    "INSERT INTO users (name, email, password) VALUES (%s, %s, %s) RETURNING id, name, email, created_at",
                    (name, email, password)
                )
                user = cursor.fetchone()
                conn.commit()

                # Buat folder otomatis berdasarkan ID baru
                folder_path = os.path.join(DATASET_DIR, str(user['id']))
                os.makedirs(folder_path, exist_ok=True)
                
                logger.info(f"User created: {user['id']} - folder created at {folder_path}")
                return serialize_user(dict(user)), None
            except Exception as e:
                conn.rollback()
                # Check for unique constraint violation (PostgreSQL error code 23505)
                if 'unique constraint' in str(e).lower() or '23505' in str(e):
                    logger.error(f"Integrity Error: {str(e)}")
                    return None, "Email sudah terdaftar!"
                logger.error(f"Database Error: {str(e)}")
                return None, f"Error: {str(e)}"

    @staticmethod
    def update_user(user_id, name, email, password):
        with get_db_connection() as conn:
            try:
                cursor = get_db_cursor(conn)
                cursor.execute(
                    "UPDATE users SET name = %s, email = %s, password = %s WHERE id = %s RETURNING id, name, email, created_at",
                    (name, email, password, user_id)
                )
                user = cursor.fetchone()
                if not user:
                    return None, "User tidak ditemukan"
                
                conn.commit()
                logger.info(f"User updated: {user_id}")
                return serialize_user(dict(user)), None
            except Exception as e:
                conn.rollback()
                if 'unique constraint' in str(e).lower() or '23505' in str(e):
                    return None, "Email baru sudah digunakan oleh user lain!"
                return None, f"Error: {str(e)}"

    @staticmethod
    def delete_user(user_id):
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            
            # Cek apakah user ada sebelum dihapus
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return False

            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()

        # Hapus folder secara rekursif
        folder_path = os.path.join(DATASET_DIR, str(user_id))
        if os.path.exists(folder_path):
            shutil.rmtree(folder_path)

        logger.info(f"User deleted: {user_id} - folder removed {folder_path}")
        return True