"""
Authentication API Endpoints
Face Recognition + Password Authentication
"""
from flask import request
from flask_restx import Namespace, Resource, fields
from datetime import datetime, timezone

from services.auth_service import AuthService
from utils.decorators import handle_exceptions, log_request
from utils.validators import validate_base64_image, validate_email
from utils.image_utils import decode_base64_image
from utils.response import success_response, error_response
from utils.logger import logger
from utils.constants import Auth, HTTPStatus


def format_utc_datetime(dt: datetime) -> str:
    """
    Format datetime as UTC ISO string with 'Z' suffix
    
    Args:
        dt: Datetime object (should be timezone-aware UTC)
    
    Returns:
        ISO format string with 'Z' suffix (e.g., '2026-01-31T13:34:08.446Z')
    """
    # If timezone-aware, convert to UTC
    if dt.tzinfo is not None:
        dt_utc = dt.astimezone(timezone.utc)
        # Use isoformat and replace +00:00 with Z
        iso_str = dt_utc.isoformat()
        return iso_str.replace('+00:00', 'Z')
    else:
        # Assume already UTC if naive
        return dt.isoformat() + 'Z'


api = Namespace("auth", description="Face Recognition Authentication API")


# ================================================
# API MODELS (Swagger Documentation)
# ================================================

# Password login model
password_login_model = api.model("PasswordLogin", {
    "email": fields.String(required=True, description='Email user', example='user@example.com'),
    "password": fields.String(required=True, description='Password user', example='password123')
})

# Face login model
face_login_model = api.model("FaceLogin", {
    "email": fields.String(required=True, description='Email user', example='user@example.com'),
    "image": fields.String(required=True, description='Base64 encoded image'),
    "threshold": fields.Float(required=False, description='Confidence threshold (0.0-1.0)', example=0.6)
})

# Token verification model
verify_model = api.model("VerifyToken", {
    "token": fields.String(required=True, description='UUID token', example='550e8400-e29b-41d4-a716-446655440000')
})

# Logout model
logout_model = api.model("Logout", {
    "token": fields.String(required=True, description='UUID token', example='550e8400-e29b-41d4-a716-446655440000')
})


# ================================================
# AUTHENTICATION ENDPOINTS
# ================================================

@api.route("/login-face")
class FaceLogin(Resource):
    """Face-based authentication endpoint"""
    
    @api.doc("face_login")
    @api.expect(face_login_model)
    @handle_exceptions
    @log_request
    def post(self):
        """
        Login dengan face verification (1:1 - LEBIH CEPAT & AKURAT)
        
        Face verification (1:1) untuk user specific.
        
        Keuntungan:
        - ⚡ Lebih cepat (tidak perlu prediksi semua classes)
        - 🎯 Lebih akurat (focused comparison)
        - 💡 Real use case (user input email/username dulu)
        - 🔒 More secure (explicit user claim + verification)
        
        Process:
        1. User input email → get user_id (dari email lookup)
        2. Upload foto wajah → camera dari frontend
        3. Verify apakah wajah cocok dengan user_id
        4. Jika match dan confidence > threshold → generate token
        
        Input:
            - email: Email user yang ingin login
            - image: Base64 encoded image
            - threshold (optional): Confidence threshold (default: 0.6)
        
        Returns:
            - match: True/False (apakah wajah cocok)
            - user_id, name, email, token (jika success)
            - confidence: Confidence score
        """
        data = request.json
        
        # Validate request
        if not data:
            return {
                "success": False,
                "message": "No data provided"
            }, HTTPStatus.BAD_REQUEST
        
        # Get email
        email = data.get('email')
        if not email:
            return {
                "success": False,
                "message": "Email is required"
            }, HTTPStatus.BAD_REQUEST
        
        # Validate email format
        if not validate_email(email):
            return {
                "success": False,
                "message": "Invalid email format"
            }, HTTPStatus.BAD_REQUEST
        
        # Get image
        base64_image = data.get('image')
        if not base64_image:
            return {
                "success": False,
                "message": "Image is required"
            }, HTTPStatus.BAD_REQUEST
        
        # Validate base64 image
        is_valid, error_msg = validate_base64_image(base64_image)
        if not is_valid:
            return {
                "success": False,
                "message": error_msg
            }, HTTPStatus.BAD_REQUEST
        
        # Get threshold (optional)
        threshold = data.get('threshold')
        if threshold is not None:
            try:
                threshold = float(threshold)
                if not (0.0 <= threshold <= 1.0):
                    return {
                        "success": False,
                        "message": "Threshold must be between 0.0 and 1.0"
                    }, HTTPStatus.BAD_REQUEST
            except ValueError:
                return {
                    "success": False,
                    "message": "Invalid threshold value"
                }, HTTPStatus.BAD_REQUEST
        
        try:
            # Decode base64 to numpy array
            face_image = decode_base64_image(base64_image)
            if face_image is None:
                return {
                    "success": False,
                    "message": "Failed to decode image"
                }, HTTPStatus.BAD_REQUEST
            
            # Perform face login
            match, auth_result, confidence = AuthService.face_login(email, face_image, threshold)
            
            if not match:
                # Check if we detected wrong person
                if auth_result and isinstance(auth_result, dict) and 'user_id' in auth_result:
                    # This is actual_identity of wrong person
                    logger.warning(
                        f"Face login failed for {email}. "
                        f"Detected as {auth_result['user_name']} (ID: {auth_result['user_id']}) instead. "
                        f"Confidence: {auth_result['confidence']:.2f}"
                    )
                    return {
                        "success": False,
                        "message": f"Face verification failed. This appears to be {auth_result['user_name']} instead of {email}.",
                        "data": {
                            "match": False,
                            "confidence": confidence,
                            "actual_identity": {
                                "user_id": auth_result['user_id'],
                                "user_name": auth_result['user_name'],
                                "detected_confidence": auth_result['confidence']
                            }
                        }
                    }, HTTPStatus.UNAUTHORIZED
                
                # No identity detected
                logger.warning(f"Face login failed for {email}, confidence={confidence:.2f}")
                return {
                    "success": False,
                    "message": f"Face verification failed. Confidence: {confidence:.2f}",
                    "data": {
                        "match": False,
                        "confidence": confidence
                    }
                }, HTTPStatus.UNAUTHORIZED
            
            logger.info(f"Face login successful for {email}, confidence={confidence:.2f}")
            
            return {
                "success": True,
                "message": "Face login successful",
                "data": {
                    "match": True,
                    "user_id": auth_result["user_id"],
                    "name": auth_result["name"],
                    "email": auth_result["email"],
                    "token": auth_result["token"],
                    "expires_at": format_utc_datetime(auth_result["expires_at"]),
                    "confidence": confidence
                }
            }, HTTPStatus.OK
            
        except Exception as e:
            logger.error(f"Face login error: {str(e)}")
            return {
                "success": False,
                "message": f"Face login failed: {str(e)}"
            }, HTTPStatus.INTERNAL_SERVER_ERROR


@api.route("/login-pass")
class PasswordLogin(Resource):
    """Password-based authentication endpoint"""
    
    @api.doc("password_login")
    @api.expect(password_login_model)
    @handle_exceptions
    @log_request
    def post(self):
        """
        Login dengan email dan password (Traditional Authentication)
        
        Metode login tradisional menggunakan kredensial email & password.
        Cocok sebagai fallback method jika face authentication gagal.
        
        Process:
        1. User input email dan password
        2. Verify credentials dengan database
        3. Jika valid → generate UUID token
        4. Return token untuk authentication
        
        Input:
            - email: Email user (string)
            - password: Password user (string)
        
        Returns:
            - user_id, name, email
            - token: UUID token untuk authentication
            - expires_at: Token expiry time
        
        Keuntungan:
        - 🔐 Standard & reliable
        - 💻 Tidak perlu kamera
        - ⚡ Instant verification
        - 🔄 Good fallback method
        """
        data = request.get_json()
        
        # Validate required fields
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return error_response("Email and password are required", HTTPStatus.BAD_REQUEST)
        
        # Validate email format
        if not validate_email(email):
            return error_response("Invalid email format", HTTPStatus.BAD_REQUEST)
        
        # Validate password length
        if len(password) < Auth.MIN_PASSWORD_LENGTH:
            return error_response(
                f"Password must be at least {Auth.MIN_PASSWORD_LENGTH} characters",
                HTTPStatus.BAD_REQUEST
            )
        
        # Perform password login
        auth_result = AuthService.password_login(email, password)
        
        if not auth_result:
            return error_response("Invalid email or password", HTTPStatus.BAD_REQUEST)
        
        logger.info(f"Password login successful for {email}")
        
        return success_response(
            "Login successful",
            {
                "user_id": auth_result["user_id"],
                "name": auth_result["name"],
                "email": auth_result["email"],
                "token": auth_result["token"],
                "expires_at": format_utc_datetime(auth_result["expires_at"])
            }
        )


@api.route("/verify")
class VerifyToken(Resource):
    """Token verification endpoint"""
    
    @api.doc("verify_token")
    @api.expect(verify_model)
    @handle_exceptions
    @log_request
    def post(self):
        """
        Verify token validity dan return user info
        
        Returns user information jika token valid dan belum expired.
        
        Input:
            - token: UUID token string
        
        Returns:
            - user_id, name, email
            - confidence: Authentication confidence
            - expires_at: Token expiry time
        """
        data = request.get_json()
        
        token = data.get('token')
        if not token:
            return error_response("Token is required", HTTPStatus.BAD_REQUEST)
        
        # Verify token
        user_info = AuthService.verify_token(token)
        
        if not user_info:
            return error_response("Invalid or expired token", HTTPStatus.BAD_REQUEST)
        
        return success_response(
            "Token is valid",
            {
                "user_id": user_info["user_id"],
                "name": user_info["name"],
                "email": user_info["email"],
                "confidence": user_info["confidence"],
                "expires_at": format_utc_datetime(user_info["expires_at"])
            }
        )


@api.route("/logout")
class Logout(Resource):
    """Logout endpoint"""
    
    @api.doc("logout")
    @api.expect(logout_model)
    @handle_exceptions
    @log_request
    def post(self):
        """
        Logout (deactivate token)
        
        Deactivate token so it can't be used anymore.
        
        Input:
            - token: UUID token string
        
        Returns:
            - success: True/False
        """
        data = request.get_json()
        
        token = data.get('token')
        if not token:
            return error_response("Token is required", HTTPStatus.BAD_REQUEST)
        
        # Deactivate token
        success = AuthService.deactivate_token(token)
        
        if not success:
            return error_response("Token not found", HTTPStatus.NOT_FOUND)
        
        logger.info(f"Logout successful for token: {token[:8]}...")
        
        return success_response("Logout successful", {"success": True})


@api.route("/tokens/<int:user_id>")
class UserTokens(Resource):
    """Get user tokens endpoint"""
    
    @api.doc("get_user_tokens")
    @handle_exceptions
    @log_request
    def get(self, user_id):
        """
        Get all active tokens untuk user
        
        Returns all active tokens for a specific user.
        Useful for managing user sessions.
        
        Input:
            - user_id: User ID (path parameter)
        
        Returns:
            - tokens: List of active tokens with details
        """
        # Get user tokens
        tokens = AuthService.get_user_tokens(user_id)
        
        # Convert datetime to ISO format
        tokens_data = []
        for token in tokens:
            tokens_data.append({
                "id": token["id"],
                "token": token["token"],
                "confidence": token["confidence"],
                "created_at": format_utc_datetime(token["created_at"]),
                "expires_at": format_utc_datetime(token["expires_at"]),
                "is_active": token["is_active"]
            })
        
        return success_response(
            f"Found {len(tokens_data)} active token(s)",
            {
                "user_id": user_id,
                "count": len(tokens_data),
                "tokens": tokens_data
            }
        )
