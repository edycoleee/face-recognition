# app/api/detect.py
from flask import request, send_file
from flask_restx import Namespace, Resource, fields
from services.detection_service import (
    detect_faces_from_image,
    detect_faces_from_base64,
    draw_faces_on_image,
    process_video_frame
)
import io

api = Namespace("detect", description="Face Detection API")

# Models for Swagger documentation
detect_response = api.model("DetectResponse", {
    "faces": fields.List(fields.Raw, description="List of detected faces with bounding boxes"),
    "count": fields.Integer(description="Number of faces detected"),
    "image_shape": fields.Raw(description="Image dimensions")
})

base64_input = api.model("Base64Input", {
    "image": fields.String(required=True, description="Base64 encoded image string")
})

video_frame_input = api.model("VideoFrameInput", {
    "frame": fields.String(required=True, description="Base64 encoded video frame")
})

@api.route("/image")
class DetectFromImage(Resource):
    @api.doc("detect_faces_from_uploaded_image")
    @api.response(200, "Success", detect_response)
    def post(self):
        """Detect faces from uploaded image file"""
        if 'file' not in request.files:
            return {'error': 'No file provided'}, 400
        
        file = request.files['file']
        if file.filename == '':
            return {'error': 'No file selected'}, 400
        
        # Read file bytes
        image_bytes = file.read()
        
        # Detect faces
        result = detect_faces_from_image(image_bytes)
        
        if 'error' in result:
            return result, 400
        
        return result, 200

@api.route("/image/base64")
class DetectFromBase64(Resource):
    @api.doc("detect_faces_from_base64")
    @api.expect(base64_input)
    @api.response(200, "Success", detect_response)
    def post(self):
        """Detect faces from base64 encoded image"""
        data = request.get_json()
        
        if not data or 'image' not in data:
            return {'error': 'No image data provided'}, 400
        
        base64_string = data['image']
        
        # Detect faces
        result = detect_faces_from_base64(base64_string)
        
        if 'error' in result:
            return result, 400
        
        return result, 200

@api.route("/image/annotated")
class DetectAndDrawImage(Resource):
    @api.doc("detect_and_draw_faces")
    def post(self):
        """Detect faces and return annotated image"""
        if 'file' not in request.files:
            return {'error': 'No file provided'}, 400
        
        file = request.files['file']
        if file.filename == '':
            return {'error': 'No file selected'}, 400
        
        # Read file bytes
        image_bytes = file.read()
        
        # Detect faces
        result = detect_faces_from_image(image_bytes)
        
        if 'error' in result:
            return result, 400
        
        # Draw faces on image
        annotated_image = draw_faces_on_image(image_bytes, result['faces'])
        
        # Return annotated image
        return send_file(
            io.BytesIO(annotated_image),
            mimetype='image/jpeg',
            as_attachment=False,
            download_name='annotated.jpg'
        )

@api.route("/video/frame")
class DetectFromVideoFrame(Resource):
    @api.doc("detect_faces_from_video_frame")
    @api.expect(video_frame_input)
    @api.response(200, "Success", detect_response)
    def post(self):
        """Detect faces from a single video frame (base64 encoded)"""
        data = request.get_json()
        
        if not data or 'frame' not in data:
            return {'error': 'No frame data provided'}, 400
        
        frame_base64 = data['frame']
        
        # Process video frame
        result = process_video_frame(frame_base64)
        
        if 'error' in result:
            return result, 400
        
        return result, 200

@api.route("/webcam")
class DetectFromWebcam(Resource):
    @api.doc("detect_faces_from_webcam")
    @api.expect(base64_input)
    @api.response(200, "Success", detect_response)
    def post(self):
        """Detect faces from webcam capture (base64 encoded)"""
        data = request.get_json()
        
        if not data or 'image' not in data:
            return {'error': 'No webcam image data provided'}, 400
        
        base64_string = data['image']
        
        # Detect faces
        result = detect_faces_from_base64(base64_string)
        
        if 'error' in result:
            return result, 400
        
        return result, 200
