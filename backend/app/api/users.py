"""User CRUD API endpoints"""
from flask_restx import Namespace, Resource, fields
from flask import request

from services.user_service import UserService
from utils.response import success_response, error_response
from utils.decorators import handle_exceptions
from utils.validators import validate_email

api = Namespace("users", description="User CRUD Operations")

# Swagger Models
user_model = api.model("User", {
    "name": fields.String(
        required=True,
        description="User name",
        example="John Doe"
    ),
    "email": fields.String(
        required=True,
        description="User email",
        example="john.doe@example.com"
    ),
    "password": fields.String(
        required=True,
        description="User password",
        example="secure_password123"
    )
})

user_response_model = api.model("UserResponse", {
    "id": fields.Integer(
        readonly=True,
        description="User ID"
    ),
    "name": fields.String(description="User name"),
    "email": fields.String(description="User email"),
    "created_at": fields.DateTime(description="Created timestamp"),
    "face_registered": fields.Boolean(description="Whether user has registered face"),
    "face_count": fields.Integer(description="Number of face embeddings")
})


@api.route("")
class UserList(Resource):
    """User list operations"""
    
    @api.doc("get_all_users")
    @api.param('email', 'Filter by email address', type=str, required=False)
    @api.response(200, "Success")
    @handle_exceptions
    def get(self):
        """
        Get all users or filter by email
        
        Returns list of all users with face registration status.
        Use ?email=user@example.com to filter by specific email.
        """
        email = request.args.get('email')
        
        if email:
            # Get user by email
            user = UserService.get_user_by_email(email)
            if user:
                return success_response("User found", user)
            else:
                return error_response("User not found", 404)
        
        # Get all users
        users = UserService.get_all_users()
        return success_response("Users retrieved successfully", users)

    @api.doc("create_user")
    @api.expect(user_model, validate=True)
    @api.response(201, "Created")
    @api.response(400, "Validation Error")
    @handle_exceptions
    def post(self):
        """
        Create a new user
        
        Creates user record and initializes dataset folder.
        Email must be unique.
        """
        data = request.json
        
        # Validate email format
        is_valid, error = validate_email(data.get("email", ""))
        if not is_valid:
            return error_response(error)
        
        user, error = UserService.create_user(
            data["name"],
            data["email"],
            data["password"]
        )
        
        if error:
            return error_response(error)
        
        return success_response("User created successfully", user, 201)


@api.route("/<int:id>")
class UserItem(Resource):
    """Single user operations"""
    
    @api.doc("get_user")
    @api.response(200, "Success")
    @api.response(404, "Not Found")
    @handle_exceptions
    def get(self, id):
        """
        Get a user by ID
        
        Returns user details including face registration status.
        """
        user = UserService.get_user(id)
        if not user:
            return error_response("User tidak ditemukan", status_code=404)
        return success_response("User retrieved successfully", user)

    @api.doc("update_user")
    @api.expect(user_model, validate=True)
    @api.response(200, "Success")
    @api.response(400, "Validation Error")
    @api.response(404, "Not Found")
    @handle_exceptions
    def put(self, id):
        """
        Update a user
        
        Updates user information. Email must be unique.
        """
        data = request.json
        
        # Validate email format
        is_valid, error = validate_email(data.get("email", ""))
        if not is_valid:
            return error_response(error)
        
        user, error = UserService.update_user(
            id,
            data["name"],
            data["email"],
            data["password"]
        )
        
        if error:
            status_code = 404 if "tidak ditemukan" in error else 400
            return error_response(error, status_code=status_code)
        
        return success_response("User updated successfully", user)

    @api.doc("delete_user")
    @api.response(200, "Success")
    @api.response(404, "Not Found")
    @handle_exceptions
    def delete(self, id):
        """
        Delete a user
        
        Removes user record, face embeddings, and dataset folder.
        This action cannot be undone.
        """
        if UserService.delete_user(id):
            return success_response(f"User {id} berhasil dihapus")
        return error_response("User tidak ditemukan", status_code=404)