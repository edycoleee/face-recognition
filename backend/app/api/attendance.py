"""
Attendance API endpoints
Handles face and password-based attendance check-in/check-out
"""
from flask import request
from flask_restx import Namespace, Resource, fields

from services.attendance_service import AttendanceService
from utils.logger import logger

api = Namespace("attendance", description="Attendance Management API")

# ================================================
# API MODELS FOR SWAGGER DOCUMENTATION
# ================================================

attendance_model = api.model("Attendance", {
    "id": fields.Integer(description="Attendance ID"),
    "user_id": fields.Integer(description="User ID"),
    "user_name": fields.String(description="User name"),
    "user_email": fields.String(description="User email"),
    "method": fields.String(description="Attendance method", enum=['password', 'face-one', 'face-all', 'face-multi']),
    "face_confidence": fields.Float(description="Face match confidence (for face methods)"),
    "presence": fields.String(description="Presence type", enum=['incoming', 'outcoming']),
    "created_at": fields.String(description="Timestamp")
})

password_input = api.model("PasswordAttendance", {
    "email": fields.String(required=True, description="User email"),
    "password": fields.String(required=True, description="User password"),
    "presence": fields.String(required=True, description="Presence type", enum=['incoming', 'outcoming'])
})

face_one_input = api.model("FaceOneAttendance", {
    "user_id": fields.Integer(required=True, description="User ID to verify against"),
    "image": fields.String(required=True, description="Base64 encoded image"),
    "presence": fields.String(required=True, description="Presence type", enum=['incoming', 'outcoming']),
    "threshold": fields.Float(description="Face match threshold (default 0.6)")
})

face_all_input = api.model("FaceAllAttendance", {
    "image": fields.String(required=True, description="Base64 encoded image"),
    "presence": fields.String(required=True, description="Presence type", enum=['incoming', 'outcoming']),
    "threshold": fields.Float(description="Face match threshold (default 0.6)")
})

face_multi_input = api.model("FaceMultiAttendance", {
    "image": fields.String(required=True, description="Base64 encoded image"),
    "presence": fields.String(required=True, description="Presence type", enum=['incoming', 'outcoming']),
    "threshold": fields.Float(description="Face match threshold (default 0.6)")
})


# ================================================
# ENDPOINTS
# ================================================

@api.route("/password")
class AttendancePassword(Resource):
    @api.doc("attendance_with_password")
    @api.expect(password_input)
    @api.response(200, "Success", attendance_model)
    @api.response(400, "Bad Request")
    @api.response(401, "Authentication Failed")
    def post(self):
        """
        Record attendance using email and password
        """
        try:
            data = request.get_json()
            
            # Validate input
            if not data:
                return {'success': False, 'message': 'No data provided'}, 400
            
            email = data.get('email')
            password = data.get('password')
            presence = data.get('presence')
            
            if not email or not password or not presence:
                return {'success': False, 'message': 'Email, password, and presence are required'}, 400
            
            if presence not in ['incoming', 'outcoming']:
                return {'success': False, 'message': 'Presence must be either "incoming" or "outcoming"'}, 400
            
            # Process attendance
            success, message, attendance_data = AttendanceService.attendance_password(
                email=email,
                password=password,
                presence=presence
            )
            
            if not success:
                return {'success': False, 'message': message}, 401
            
            return {
                'success': True,
                'message': message,
                'data': attendance_data
            }, 200
            
        except Exception as e:
            logger.error(f"Error in attendance_password endpoint: {str(e)}")
            return {'success': False, 'message': f'Internal server error: {str(e)}'}, 500


@api.route("/face-one")
class AttendanceFaceOne(Resource):
    @api.doc("attendance_face_one_to_one")
    @api.expect(face_one_input)
    @api.response(200, "Success", attendance_model)
    @api.response(400, "Bad Request")
    @api.response(401, "Face Verification Failed")
    def post(self):
        """
        Record attendance using 1:1 face verification
        Verify the captured face matches the specified user
        """
        try:
            data = request.get_json()
            
            # Validate input
            if not data:
                return {'success': False, 'message': 'No data provided'}, 400
            
            user_id = data.get('user_id')
            image = data.get('image')
            presence = data.get('presence')
            threshold = data.get('threshold', 0.6)
            
            if not user_id or not image or not presence:
                return {'success': False, 'message': 'user_id, image, and presence are required'}, 400
            
            if presence not in ['incoming', 'outcoming']:
                return {'success': False, 'message': 'Presence must be either "incoming" or "outcoming"'}, 400
            
            # Process attendance
            success, message, attendance_data = AttendanceService.attendance_face_one(
                user_id=user_id,
                image_base64=image,
                presence=presence,
                threshold=threshold
            )
            
            if not success:
                return {'success': False, 'message': message}, 401
            
            return {
                'success': True,
                'message': message,
                'data': attendance_data
            }, 200
            
        except Exception as e:
            logger.error(f"Error in attendance_face_one endpoint: {str(e)}")
            return {'success': False, 'message': f'Internal server error: {str(e)}'}, 500


@api.route("/face-all")
class AttendanceFaceAll(Resource):
    @api.doc("attendance_face_one_to_many")
    @api.expect(face_all_input)
    @api.response(200, "Success", attendance_model)
    @api.response(400, "Bad Request")
    @api.response(404, "Face Not Identified")
    def post(self):
        """
        Record attendance using 1:N face identification
        Detect one face and identify against all users in database
        """
        try:
            data = request.get_json()
            
            # Validate input
            if not data:
                return {'success': False, 'message': 'No data provided'}, 400
            
            image = data.get('image')
            presence = data.get('presence')
            threshold = data.get('threshold', 0.6)
            
            if not image or not presence:
                return {'success': False, 'message': 'image and presence are required'}, 400
            
            if presence not in ['incoming', 'outcoming']:
                return {'success': False, 'message': 'Presence must be either "incoming" or "outcoming"'}, 400
            
            # Process attendance
            success, message, attendance_data = AttendanceService.attendance_face_all(
                image_base64=image,
                presence=presence,
                threshold=threshold
            )
            
            if not success:
                return {'success': False, 'message': message}, 404
            
            return {
                'success': True,
                'message': message,
                'data': attendance_data
            }, 200
            
        except Exception as e:
            logger.error(f"Error in attendance_face_all endpoint: {str(e)}")
            return {'success': False, 'message': f'Internal server error: {str(e)}'}, 500


@api.route("/face-multi")
class AttendanceFaceMulti(Resource):
    @api.doc("attendance_face_multi_person")
    @api.expect(face_multi_input)
    @api.response(200, "Success")
    @api.response(400, "Bad Request")
    def post(self):
        """
        Record attendance using 1:N face identification for multiple faces
        Detect multiple faces and identify each against all users in database
        """
        try:
            data = request.get_json()
            
            # Validate input
            if not data:
                return {'success': False, 'message': 'No data provided'}, 400
            
            image = data.get('image')
            presence = data.get('presence')
            threshold = data.get('threshold', 0.6)
            
            if not image or not presence:
                return {'success': False, 'message': 'image and presence are required'}, 400
            
            if presence not in ['incoming', 'outcoming']:
                return {'success': False, 'message': 'Presence must be either "incoming" or "outcoming"'}, 400
            
            # Process attendance
            success, message, attendance_list = AttendanceService.attendance_face_multi(
                image_base64=image,
                presence=presence,
                threshold=threshold
            )
            
            return {
                'success': success,
                'message': message,
                'data': attendance_list
            }, 200
            
        except Exception as e:
            logger.error(f"Error in attendance_face_multi endpoint: {str(e)}")
            return {'success': False, 'message': f'Internal server error: {str(e)}'}, 500


@api.route("/all")
class AttendanceAll(Resource):
    @api.doc("get_all_attendance")
    @api.param('limit', 'Maximum number of records (default 100)', type=int)
    @api.param('offset', 'Offset for pagination (default 0)', type=int)
    @api.response(200, "Success")
    def get(self):
        """
        Get all attendance records with pagination
        """
        try:
            limit = request.args.get('limit', 100, type=int)
            offset = request.args.get('offset', 0, type=int)
            
            # Validate limits
            if limit > 500:
                limit = 500
            
            success, message, attendance_list = AttendanceService.get_all_attendance(
                limit=limit,
                offset=offset
            )
            
            if not success:
                return {'success': False, 'message': message}, 400
            
            return {
                'success': True,
                'message': message,
                'data': attendance_list,
                'count': len(attendance_list)
            }, 200
            
        except Exception as e:
            logger.error(f"Error in get_all_attendance endpoint: {str(e)}")
            return {'success': False, 'message': f'Internal server error: {str(e)}'}, 500


@api.route("/<int:attendance_id>")
class AttendanceById(Resource):
    @api.doc("get_attendance_by_id")
    @api.response(200, "Success", attendance_model)
    @api.response(404, "Not Found")
    def get(self, attendance_id):
        """
        Get attendance record by ID
        """
        try:
            success, message, attendance_data = AttendanceService.get_attendance_by_id(attendance_id)
            
            if not success:
                return {'success': False, 'message': message}, 404
            
            return {
                'success': True,
                'message': message,
                'data': attendance_data
            }, 200
            
        except Exception as e:
            logger.error(f"Error in get_attendance_by_id endpoint: {str(e)}")
            return {'success': False, 'message': f'Internal server error: {str(e)}'}, 500


@api.route("/user/<int:user_id>")
class AttendanceByUser(Resource):
    @api.doc("get_user_attendance")
    @api.param('limit', 'Maximum number of records (default 50)', type=int)
    @api.response(200, "Success")
    @api.response(404, "Not Found")
    def get(self, user_id):
        """
        Get attendance records for specific user
        """
        try:
            limit = request.args.get('limit', 50, type=int)
            
            # Validate limit
            if limit > 200:
                limit = 200
            
            success, message, attendance_list = AttendanceService.get_user_attendance(
                user_id=user_id,
                limit=limit
            )
            
            if not success:
                return {'success': False, 'message': message}, 404
            
            return {
                'success': True,
                'message': message,
                'data': attendance_list,
                'count': len(attendance_list)
            }, 200
            
        except Exception as e:
            logger.error(f"Error in get_user_attendance endpoint: {str(e)}")
            return {'success': False, 'message': f'Internal server error: {str(e)}'}, 500
