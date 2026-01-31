"""
Authentication Service
Handles user authentication (face & password), token management, and verification
"""
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List, Tuple

from utils.db import get_db_connection, get_db_cursor
from utils.logger import logger
from utils.constants import Auth, FaceRecognition
from services.recognition_service import verify_face


class AuthService:
    """Service for authentication operations"""
    
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
    def verify_password(password: str, hashed: str) -> bool:
        """
        Verify password against hash
        
        Args:
            password: Plain text password
            hashed: Hashed password from database
            
        Returns:
            True if password matches
        """
        return AuthService.hash_password(password) == hashed
    
    @staticmethod
    def generate_token() -> str:
        """
        Generate UUID token
        
        Returns:
            UUID string
        """
        return str(uuid.uuid4())
    
    @staticmethod
    def get_token_expiry() -> datetime:
        """
        Calculate token expiry time
        
        Returns:
            Datetime object for token expiration (UTC timezone-aware)
        """
        return datetime.now(timezone.utc) + timedelta(hours=Auth.TOKEN_EXPIRY_HOURS)
    
    @staticmethod
    def create_auth_token(user_id: int, confidence: float) -> Dict:
        """
        Create new authentication token
        
        Args:
            user_id: User ID
            confidence: Authentication confidence score
            
        Returns:
            Dict with token information
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                
                token = AuthService.generate_token()
                expires_at = AuthService.get_token_expiry()
                
                query = """
                    INSERT INTO auth_tokens (user_id, token, confidence, expires_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, token, created_at, expires_at
                """
                
                cursor.execute(query, (user_id, token, confidence, expires_at))
                result = cursor.fetchone()
                conn.commit()
                
                logger.info(f"Token created for user_id={user_id}, confidence={confidence:.2f}")
                
                return {
                    "id": result["id"],
                    "token": result["token"],
                    "created_at": result["created_at"],
                    "expires_at": result["expires_at"]
                }
                
        except Exception as e:
            logger.error(f"Error creating token: {str(e)}")
            raise
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """
        Verify token validity
        
        Args:
            token: UUID token string
            
        Returns:
            User info if token valid, None otherwise
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                
                query = """
                    SELECT 
                        at.user_id,
                        at.confidence,
                        at.expires_at,
                        at.is_active,
                        u.name,
                        u.email
                    FROM auth_tokens at
                    JOIN users u ON at.user_id = u.id
                    WHERE at.token = %s
                """
                
                cursor.execute(query, (token,))
                result = cursor.fetchone()
                
                if not result:
                    logger.warning(f"Token not found: {token[:8]}...")
                    return None
                
                # Check if token is active
                if not result["is_active"]:
                    logger.warning(f"Token inactive: {token[:8]}...")
                    return None
                
                # Check if token expired
                if datetime.now() > result["expires_at"]:
                    logger.warning(f"Token expired: {token[:8]}...")
                    return None
                
                logger.info(f"Token verified for user_id={result['user_id']}")
                
                return {
                    "user_id": result["user_id"],
                    "name": result["name"],
                    "email": result["email"],
                    "confidence": result["confidence"],
                    "expires_at": result["expires_at"]
                }
                
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            raise
    
    @staticmethod
    def deactivate_token(token: str) -> bool:
        """
        Deactivate (logout) a token
        
        Args:
            token: UUID token string
            
        Returns:
            True if successful
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                
                query = """
                    UPDATE auth_tokens
                    SET is_active = FALSE
                    WHERE token = %s
                    RETURNING id
                """
                
                cursor.execute(query, (token,))
                result = cursor.fetchone()
                conn.commit()
                
                if result:
                    logger.info(f"Token deactivated: {token[:8]}...")
                    return True
                
                logger.warning(f"Token not found for deactivation: {token[:8]}...")
                return False
                
        except Exception as e:
            logger.error(f"Error deactivating token: {str(e)}")
            raise
    
    @staticmethod
    def get_user_tokens(user_id: int) -> List[Dict]:
        """
        Get all active tokens for a user
        
        Args:
            user_id: User ID
            
        Returns:
            List of active tokens
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                
                query = """
                    SELECT 
                        id,
                        token,
                        confidence,
                        created_at,
                        expires_at,
                        is_active
                    FROM auth_tokens
                    WHERE user_id = %s AND is_active = TRUE
                    ORDER BY created_at DESC
                """
                
                cursor.execute(query, (user_id,))
                results = cursor.fetchall()
                
                tokens = []
                for row in results:
                    tokens.append({
                        "id": row["id"],
                        "token": row["token"],
                        "confidence": row["confidence"],
                        "created_at": row["created_at"],
                        "expires_at": row["expires_at"],
                        "is_active": row["is_active"]
                    })
                
                logger.info(f"Retrieved {len(tokens)} active tokens for user_id={user_id}")
                return tokens
                
        except Exception as e:
            logger.error(f"Error getting user tokens: {str(e)}")
            raise
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict]:
        """
        Get user by email
        
        Args:
            email: User email
            
        Returns:
            User info if found
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                
                query = """
                    SELECT id, name, email, password
                    FROM users
                    WHERE email = %s
                """
                
                cursor.execute(query, (email,))
                result = cursor.fetchone()
                
                if not result:
                    return None
                
                return {
                    "id": result["id"],
                    "name": result["name"],
                    "email": result["email"],
                    "password": result["password"]
                }
                
        except Exception as e:
            logger.error(f"Error getting user by email: {str(e)}")
            raise
    
    @staticmethod
    def password_login(email: str, password: str) -> Optional[Dict]:
        """
        Authenticate user with email and password
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            Authentication result with token
        """
        # Get user by email
        user = AuthService.get_user_by_email(email)
        
        if not user:
            logger.warning(f"Login failed: User not found for email={email}")
            return None
        
        # Verify password
        if not AuthService.verify_password(password, user["password"]):
            logger.warning(f"Login failed: Invalid password for email={email}")
            return None
        
        # Generate token
        token_info = AuthService.create_auth_token(
            user["id"],
            Auth.DEFAULT_CONFIDENCE
        )
        
        logger.info(f"Password login successful for user_id={user['id']}")
        
        return {
            "user_id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "token": token_info["token"],
            "expires_at": token_info["expires_at"]
        }
    
    @staticmethod
    def face_login(email: str, face_image, threshold: float = None) -> Tuple[bool, Optional[Dict], float]:
        """
        Authenticate user with face verification (1:1)
        
        Args:
            email: User email (to get user_id)
            face_image: Face image (numpy array)
            threshold: Confidence threshold (default from FaceRecognition)
            
        Returns:
            Tuple of (match, auth_result, confidence)
        """
        if threshold is None:
            threshold = FaceRecognition.DEFAULT_SIMILARITY_THRESHOLD
        
        # Get user by email
        user = AuthService.get_user_by_email(email)
        
        if not user:
            logger.warning(f"Face login failed: User not found for email={email}")
            return False, None, 0.0
        
        user_id = user["id"]
        
        # Use verify_face function for face verification
        match, confidence = verify_face(user_id, face_image, threshold)
        
        if not match:
            logger.warning(f"Face login failed: No match for user_id={user_id}, confidence={confidence:.2f}")
            
            # Try to identify who this actually is (security feature)
            try:
                from services.identification_service import identify_face, extract_face_embedding
                
                # Extract embedding first to reuse
                query_embedding, error = extract_face_embedding(
                    # Convert numpy array to base64 for identify_face
                    "data:image/jpeg;base64," + ""  # We'll use direct face_image instead
                )
                
                # Actually, let's use find_best_match which accepts numpy array directly
                from services.recognition_service import find_best_match, get_face_analyzer
                
                app = get_face_analyzer()
                faces = app.get(face_image)
                
                if len(faces) == 1:
                    from utils.embedding_utils import normalize_embedding
                    query_embedding = normalize_embedding(faces[0].embedding)
                    
                    success, message, result = find_best_match(query_embedding, threshold)
                    
                    if success and result.get('identified'):
                        # Found who this actually is
                        actual_identity = {
                            'user_id': result['user_id'],
                            'user_name': result['user_name'],
                            'confidence': result['confidence']
                        }
                        
                        logger.warning(
                            f"Wrong person detected! Expected user_id={user_id}, "
                            f"but detected user_id={result['user_id']} ({result['user_name']}) "
                            f"with confidence={result['confidence']:.2f}"
                        )
                        
                        return False, actual_identity, confidence
            except Exception as e:
                logger.warning(f"Failed to identify actual person: {str(e)}")
            
            return False, None, confidence
        
        # Generate token
        token_info = AuthService.create_auth_token(user_id, confidence)
        
        logger.info(f"Face login successful for user_id={user_id}, confidence={confidence:.2f}")
        
        return True, {
            "user_id": user_id,
            "name": user["name"],
            "email": user["email"],
            "token": token_info["token"],
            "expires_at": token_info["expires_at"],
            "confidence": confidence
        }, confidence
