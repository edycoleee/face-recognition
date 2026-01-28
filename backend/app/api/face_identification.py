"""Face identification and verification API endpoints"""
from flask_restx import Namespace, Resource, fields
from flask import request

from services.identification_service import identify_face, verify_face
from utils.response import success_response, error_response
from utils.logger import logger
from utils.validators import validate_threshold, validate_base64_image, validate_user_id
from utils.decorators import handle_exceptions
from utils.constants import FaceRecognition

api = Namespace("identify", description="Face Identification & Verification Operations")

# Models for Swagger documentation
identify_input = api.model("IdentifyInput", {
    "image": fields.String(
        required=True,
        description="Base64 encoded image"
    ),
    "threshold": fields.Float(
        required=False,
        description=f"Similarity threshold (0.0-1.0), default {FaceRecognition.DEFAULT_SIMILARITY_THRESHOLD}"
    )
})

verify_input = api.model("VerifyInput", {
    "image": fields.String(
        required=True,
        description="Base64 encoded image"
    ),
    "user_id": fields.Integer(
        required=True,
        description="User ID to verify against"
    ),
    "threshold": fields.Float(
        required=False,
        description=f"Similarity threshold (0.0-1.0), default {FaceRecognition.DEFAULT_SIMILARITY_THRESHOLD}"
    )
})


@api.route("/")
class IdentifyFace(Resource):
    """Face identification endpoint - find matching user"""
    
    @api.doc("identify_face")
    @api.expect(identify_input)
    @api.response(200, "Success - Face Identified or No Match Found")
    @api.response(400, "Bad Request")
    @handle_exceptions
    def post(self):
        """
        Identify face from image by searching in all registered faces
        
        Returns match with highest similarity if above threshold.
        Always returns 200 status with identified=true/false in response.
        """
        data = request.json
        
        # Validate request
        if not data or 'image' not in data:
            return error_response("No image data provided")
        
        # Validate image data
        is_valid, error = validate_base64_image(data['image'])
        if not is_valid:
            return error_response(error)
        
        # Get and validate threshold
        threshold = data.get('threshold', FaceRecognition.DEFAULT_SIMILARITY_THRESHOLD)
        is_valid, error = validate_threshold(threshold)
        if not is_valid:
            return error_response(error)
        
        # Perform identification
        success, message, result = identify_face(data['image'], threshold)
        
        # Always return 200 with result
        return success_response(message, result)


@api.route("/verify")
class VerifyFace(Resource):
    """Face verification endpoint - verify against specific user"""
    
    @api.doc("verify_face")
    @api.expect(verify_input)
    @api.response(200, "Success")
    @api.response(400, "Bad Request")
    @handle_exceptions
    def post(self):
        """
        Verify if face matches specific user (1:1 verification)
        
        Compares input face against all embeddings for specified user.
        Returns verified=true if best match exceeds threshold.
        """
        data = request.json
        
        # Validate required fields
        if not data or 'image' not in data or 'user_id' not in data:
            return error_response("Image and user_id required")
        
        # Validate image
        is_valid, error = validate_base64_image(data['image'])
        if not is_valid:
            return error_response(error)
        
        # Validate user_id
        is_valid, error = validate_user_id(data['user_id'])
        if not is_valid:
            return error_response(error)
        
        # Get and validate threshold
        threshold = data.get('threshold', FaceRecognition.DEFAULT_SIMILARITY_THRESHOLD)
        is_valid, error = validate_threshold(threshold)
        if not is_valid:
            return error_response(error)
        
        # Perform verification
        success, message, result = verify_face(
            data['image'],
            data['user_id'],
            threshold
        )
        
        return success_response(message, result)
