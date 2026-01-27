from flask_restx import Namespace, Resource, fields
from flask import request
from services.identification_service import identify_face, verify_face
from utils.response import success_response, error_response
from utils.logger import logger

api = Namespace("identify", description="Face Identification & Verification Operations")

# Models for Swagger
identify_input = api.model("IdentifyInput", {
    "image": fields.String(required=True, description="Base64 encoded image"),
    "threshold": fields.Float(required=False, description="Similarity threshold (0.0-1.0), default 0.6")
})

verify_input = api.model("VerifyInput", {
    "image": fields.String(required=True, description="Base64 encoded image"),
    "user_id": fields.Integer(required=True, description="User ID to verify against"),
    "threshold": fields.Float(required=False, description="Similarity threshold (0.0-1.0), default 0.6")
})

@api.route("/")
class IdentifyFace(Resource):
    @api.doc("identify_face")
    @api.expect(identify_input)
    @api.response(200, "Success - Face Identified")
    @api.response(404, "Not Found - No Match")
    @api.response(400, "Bad Request")
    def post(self):
        """Identify face from image by searching in all registered faces"""
        try:
            data = request.json
            if not data or 'image' not in data:
                return error_response("No image data provided")
            
            threshold = data.get('threshold', 0.6)
            
            # Validate threshold
            if not 0.0 <= threshold <= 1.0:
                return error_response("Threshold must be between 0.0 and 1.0")
            
            success, message, result = identify_face(data['image'], threshold)
            
            if success:
                return success_response(message, result)
            else:
                # Return 200 but with identified=False for "no match" case
                return success_response(message, result)
                
        except Exception as e:
            logger.error(f"Identification error: {str(e)}")
            return error_response(f"Server error: {str(e)}")

@api.route("/verify")
class VerifyFace(Resource):
    @api.doc("verify_face")
    @api.expect(verify_input)
    @api.response(200, "Success")
    @api.response(400, "Bad Request")
    def post(self):
        """Verify if face matches specific user (1:1 verification)"""
        try:
            data = request.json
            if not data or 'image' not in data or 'user_id' not in data:
                return error_response("Image and user_id required")
            
            threshold = data.get('threshold', 0.6)
            
            if not 0.0 <= threshold <= 1.0:
                return error_response("Threshold must be between 0.0 and 1.0")
            
            success, message, result = verify_face(
                data['image'], 
                data['user_id'],
                threshold
            )
            
            return success_response(message, result)
                
        except Exception as e:
            logger.error(f"Verification error: {str(e)}")
            return error_response(f"Server error: {str(e)}")
