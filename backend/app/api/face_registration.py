"""Face registration and management API endpoints"""
from flask_restx import Namespace, Resource, fields
from flask import request

from services.recognition_service import (
    validate_single_face,
    register_face_images,
    get_user_embeddings,
    delete_user_embeddings
)
from services.user_service import UserService
from utils.response import success_response, error_response
from utils.logger import logger
from utils.validators import validate_base64_image, validate_image_list
from utils.decorators import handle_exceptions
from utils.constants import FaceRecognition

api = Namespace("face", description="Face Registration & Recognition Operations")

# Models for Swagger documentation
validate_input = api.model("ValidateInput", {
    "image": fields.String(
        required=True,
        description="Base64 encoded image"
    )
})

register_input = api.model("RegisterInput", {
    "images": fields.List(
        fields.String,
        required=True,
        description=f"List of base64 encoded images (max {FaceRecognition.MAX_IMAGES_PER_REGISTRATION})"
    )
})


@api.route("/validate")
class ValidateFace(Resource):
    """Validate face quality and single face detection"""
    
    @api.doc("validate_face")
    @api.expect(validate_input)
    @api.response(200, "Success - Face is valid")
    @api.response(400, "Validation Failed")
    @handle_exceptions
    def post(self):
        """
        Validate face from image (check quality and single face)
        
        Ensures image contains:
        - Exactly one face
        - Face quality above threshold
        - Face size meets minimum requirements
        """
        data = request.json
        
        if not data or 'image' not in data:
            return error_response("No image data provided")
        
        # Validate image data
        is_valid, error = validate_base64_image(data['image'])
        if not is_valid:
            return error_response(error)
        
        # Validate face
        success, message, face_data = validate_single_face(data['image'])
        
        if success:
            return success_response(message, face_data)
        else:
            return error_response(message, face_data)


@api.route("/users/<int:user_id>/register")
class RegisterUserFace(Resource):
    """Register face embeddings for a user"""
    
    @api.doc("register_user_face")
    @api.expect(register_input)
    @api.response(200, "Success - Face registered")
    @api.response(400, "Bad Request")
    @api.response(404, "User Not Found")
    @handle_exceptions
    def post(self, user_id):
        """
        Register face embeddings for a user
        
        Recommended: 5-10 high-quality images from different angles.
        System will validate and average embeddings for optimal accuracy.
        """
        # Check if user exists
        user = UserService.get_user(user_id)
        if not user:
            return error_response("User not found", status_code=404)
        
        data = request.json
        if not data or 'images' not in data:
            return error_response("No images provided")
        
        images = data['images']
        
        # Validate images list
        is_valid, error = validate_image_list(
            images,
            max_images=FaceRecognition.MAX_IMAGES_PER_REGISTRATION
        )
        if not is_valid:
            return error_response(error)
        
        # Register faces
        success, message, results = register_face_images(user_id, images)
        
        if success:
            return success_response(message, results)
        else:
            return error_response(message, results)


@api.route("/users/<int:user_id>/embeddings")
class UserEmbeddings(Resource):
    """Manage user face embeddings"""
    
    @api.doc("get_user_embeddings")
    @api.response(200, "Success")
    @api.response(404, "User Not Found")
    @handle_exceptions
    def get(self, user_id):
        """
        Get all face embeddings for a user
        
        Returns list of embeddings with quality scores and creation dates.
        """
        user = UserService.get_user(user_id)
        if not user:
            return error_response("User not found", status_code=404)
        
        embeddings = get_user_embeddings(user_id)
        
        return success_response(
            f"Found {len(embeddings)} face embedding(s)",
            {
                'user_id': user_id,
                'user_name': user['name'],
                'embeddings_count': len(embeddings),
                'embeddings': embeddings
            }
        )
    
    @api.doc("delete_user_embeddings")
    @api.response(200, "Success")
    @api.response(404, "User Not Found")
    @handle_exceptions
    def delete(self, user_id):
        """
        Delete all face embeddings for a user
        
        This will remove all registered face data.
        User will need to register again for face recognition.
        """
        user = UserService.get_user(user_id)
        if not user:
            return error_response("User not found", status_code=404)
        
        deleted_count = delete_user_embeddings(user_id)
        
        return success_response(
            f"Deleted {deleted_count} face embedding(s)",
            {'deleted_count': deleted_count}
        )
