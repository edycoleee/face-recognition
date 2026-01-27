from flask_restx import Namespace, Resource, fields
from flask import request
from services.recognition_service import (
    validate_single_face,
    extract_face_embedding,
    register_face_images,
    get_user_embeddings,
    delete_user_embeddings
)
from services.user_service import UserService
from utils.response import success_response, error_response
from utils.logger import logger

api = Namespace("face", description="Face Registration & Recognition Operations")

# Models for Swagger
validate_input = api.model("ValidateInput", {
    "image": fields.String(required=True, description="Base64 encoded image")
})

register_input = api.model("RegisterInput", {
    "images": fields.List(fields.String, required=True, description="List of base64 encoded images")
})

validate_response = api.model("ValidateResponse", {
    "success": fields.Boolean(description="Validation success"),
    "message": fields.String(description="Validation message"),
    "data": fields.Raw(description="Face data if valid")
})

@api.route("/validate")
class ValidateFace(Resource):
    @api.doc("validate_face")
    @api.expect(validate_input)
    @api.response(200, "Success", validate_response)
    @api.response(400, "Validation Failed")
    def post(self):
        """Validate face from image (check quality and single face)"""
        try:
            data = request.json
            if not data or 'image' not in data:
                return error_response("No image data provided")
            
            success, message, face_data = validate_single_face(data['image'])
            
            if success:
                return success_response(message, face_data)
            else:
                return error_response(message, face_data)
                
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return error_response(f"Server error: {str(e)}")

@api.route("/users/<int:user_id>/register")
class RegisterUserFace(Resource):
    @api.doc("register_user_face")
    @api.expect(register_input)
    @api.response(200, "Success")
    @api.response(400, "Bad Request")
    @api.response(404, "User Not Found")
    def post(self, user_id):
        """Register face embeddings for a user (5-10 images recommended)"""
        try:
            # Check if user exists
            user = UserService.get_user(user_id)
            if not user:
                return error_response("User not found", status_code=404)
            
            data = request.json
            if not data or 'images' not in data:
                return error_response("No images provided")
            
            images = data['images']
            if not isinstance(images, list) or len(images) == 0:
                return error_response("Images must be a non-empty array")
            
            if len(images) > 20:
                return error_response("Maximum 20 images allowed per registration")
            
            # Register faces
            success, message, results = register_face_images(user_id, images)
            
            if success:
                return success_response(message, results)
            else:
                return error_response(message, results)
                
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return error_response(f"Server error: {str(e)}")

@api.route("/users/<int:user_id>/embeddings")
class UserEmbeddings(Resource):
    @api.doc("get_user_embeddings")
    @api.response(200, "Success")
    @api.response(404, "User Not Found")
    def get(self, user_id):
        """Get all face embeddings for a user"""
        try:
            user = UserService.get_user(user_id)
            if not user:
                return error_response("User not found", status_code=404)
            
            embeddings = get_user_embeddings(user_id)
            
            return success_response(
                f"Found {len(embeddings)} face embeddings",
                {
                    'user_id': user_id,
                    'user_name': user['name'],
                    'embeddings_count': len(embeddings),
                    'embeddings': embeddings
                }
            )
            
        except Exception as e:
            logger.error(f"Error getting embeddings: {str(e)}")
            return error_response(f"Server error: {str(e)}")
    
    @api.doc("delete_user_embeddings")
    @api.response(200, "Success")
    @api.response(404, "User Not Found")
    def delete(self, user_id):
        """Delete all face embeddings for a user"""
        try:
            user = UserService.get_user(user_id)
            if not user:
                return error_response("User not found", status_code=404)
            
            deleted_count = delete_user_embeddings(user_id)
            
            return success_response(
                f"Deleted {deleted_count} face embeddings",
                {'deleted_count': deleted_count}
            )
            
        except Exception as e:
            logger.error(f"Error deleting embeddings: {str(e)}")
            return error_response(f"Server error: {str(e)}")
