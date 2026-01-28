"""User service - handles user CRUD operations"""
import os
import shutil
import hashlib
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

from utils.db import get_db_connection, get_db_cursor
from utils.logger import logger
from utils.constants import FileSystem


def serialize_datetime(obj: Any) -> Any:
    """Convert datetime objects to ISO format string"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def serialize_user(user_dict: Optional[Dict]) -> Optional[Dict]:
    """Serialize user dict with datetime conversion"""
    if user_dict is None:
        return None
    return {
        **user_dict,
        'created_at': serialize_datetime(user_dict.get('created_at'))
    }

class UserService:
    """Service class for user operations"""

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash password using SHA256
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password
        """
        return hashlib.sha256(password.encode()).hexdigest()

    @staticmethod
    def get_all_users() -> List[Dict[str, Any]]:
        """
        Get all users with face registration count
        
        Returns:
            List of user dictionaries
        """
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
            
            # Convert and serialize results
            users = []
            for row in rows:
                user_dict = dict(row)
                user_dict['face_registered'] = user_dict['face_count'] > 0
                user_dict['created_at'] = serialize_datetime(user_dict.get('created_at'))
                users.append(user_dict)
            
            return users

    @staticmethod
    def get_user(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a single user by ID with face registration count
        
        Args:
            user_id: User ID
            
        Returns:
            User dictionary or None if not found
        """
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
    def create_user(name: str, email: str, password: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Create a new user
        
        Args:
            name: User name
            email: User email
            password: User password (will be hashed)
            
        Returns:
            Tuple of (user_dict, error_message)
        """
        with get_db_connection() as conn:
            try:
                cursor = get_db_cursor(conn)
                
                # Hash password before storing
                hashed_password = UserService.hash_password(password)
                
                cursor.execute(
                    """INSERT INTO users (name, email, password) 
                       VALUES (%s, %s, %s) 
                       RETURNING id, name, email, created_at""",
                    (name, email, hashed_password)
                )
                user = cursor.fetchone()
                conn.commit()

                # Create user dataset folder automatically
                folder_path = FileSystem.get_user_dataset_path(user['id'])
                os.makedirs(folder_path, exist_ok=True)
                
                logger.info(f"User created: {user['id']} - folder created at {folder_path}")
                return serialize_user(dict(user)), None
                
            except Exception as e:
                conn.rollback()
                # Check for unique constraint violation
                if 'unique constraint' in str(e).lower() or '23505' in str(e):
                    logger.error(f"Integrity Error: {str(e)}")
                    return None, "Email sudah terdaftar!"
                logger.error(f"Database Error: {str(e)}")
                return None, f"Error: {str(e)}"
                return None, f"Error: {str(e)}"

    @staticmethod
    def update_user(user_id: int, name: str, email: str, password: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Update an existing user
        
        Args:
            user_id: User ID
            name: New name
            email: New email
            password: New password (will be hashed)
            
        Returns:
            Tuple of (user_dict, error_message)
        """
        with get_db_connection() as conn:
            try:
                cursor = get_db_cursor(conn)
                
                # Hash password before updating
                hashed_password = UserService.hash_password(password)
                
                cursor.execute(
                    """UPDATE users 
                       SET name = %s, email = %s, password = %s 
                       WHERE id = %s 
                       RETURNING id, name, email, created_at""",
                    (name, email, hashed_password, user_id)
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
    def delete_user(user_id: int) -> bool:
        """
        Delete a user and their dataset folder
        
        Args:
            user_id: User ID
            
        Returns:
            True if deleted, False if user not found
        """
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            
            # Check if user exists
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return False

            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()

        # Delete user dataset folder
        folder_path = FileSystem.get_user_dataset_path(user_id)
        if os.path.exists(folder_path):
            shutil.rmtree(folder_path)

        logger.info(f"User deleted: {user_id} - folder removed {folder_path}")
        return True