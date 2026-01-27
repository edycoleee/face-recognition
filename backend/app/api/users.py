from flask_restx import Namespace, Resource, fields
from flask import request
from services.user_service import UserService
from utils.response import success_response, error_response

api = Namespace("users", description="User CRUD Operations")

# Definisi Model untuk Swagger UI
user_model = api.model("User", {
    "name": fields.String(required=True, description="User name"),
    "email": fields.String(required=True, description="User email"),
    "password": fields.String(required=True, description="User password")
})

user_response_model = api.model("UserResponse", {
    "id": fields.Integer(readonly=True, description="User ID"),
    "name": fields.String(description="User name"),
    "email": fields.String(description="User email"),
    "created_at": fields.DateTime(description="Created timestamp")
})

standard_response = api.model("StandardResponse", {
    "success": fields.Boolean(description="Request success status"),
    "message": fields.String(description="Response message"),
    "data": fields.Raw(description="Response data")
})

@api.route("")
class UserList(Resource):
    @api.doc("get_all_users")
    @api.response(200, "Success", standard_response)
    def get(self):
        """Get all users"""
        users = UserService.get_all_users()
        return success_response("Users retrieved successfully", users)

    @api.doc("create_user")
    @api.expect(user_model, validate=True)
    @api.response(201, "Created", standard_response)
    @api.response(400, "Validation Error", standard_response)
    def post(self):
        """Create a new user"""
        data = request.json
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
    @api.doc("get_user")
    @api.response(200, "Success", standard_response)
    @api.response(404, "Not Found", standard_response)
    def get(self, id):
        """Get a user by ID"""
        user = UserService.get_user(id)
        if not user:
            return error_response("User tidak ditemukan", status_code=404)
        return success_response("User retrieved successfully", user)

    @api.doc("update_user")
    @api.expect(user_model, validate=True)
    @api.response(200, "Success", standard_response)
    @api.response(400, "Validation Error", standard_response)
    @api.response(404, "Not Found", standard_response)
    def put(self, id):
        """Update a user"""
        data = request.json
        user, error = UserService.update_user(
            id,
            data["name"],
            data["email"],
            data["password"]
        )
        if error:
            return error_response(error, status_code=404 if "tidak ditemukan" in error else 400)
        return success_response("User updated successfully", user)

    @api.doc("delete_user")
    @api.response(200, "Success", standard_response)
    @api.response(404, "Not Found", standard_response)
    def delete(self, id):
        """Delete a user"""
        if UserService.delete_user(id):
            return success_response(f"User {id} berhasil dihapus")
        return error_response("User tidak ditemukan", status_code=404)