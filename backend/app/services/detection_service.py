# app/services/detection_service.py
import cv2
import numpy as np
from insightface.app import FaceAnalysis
from PIL import Image
import io
import base64

# Initialize InsightFace model
face_app = None

def get_face_detector():
    """Initialize and return face detector (singleton pattern)"""
    global face_app
    if face_app is None:
        face_app = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']  # Use CPU, change to CUDAExecutionProvider for GPU
        )
        face_app.prepare(ctx_id=0, det_size=(640, 640))
    return face_app

def detect_faces_from_image(image_bytes):
    """
    Detect faces from image bytes
    
    Args:
        image_bytes: Image data in bytes
        
    Returns:
        dict: {
            'faces': list of detected faces with bounding boxes,
            'count': number of faces detected,
            'image_shape': (height, width, channels)
        }
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {'error': 'Failed to decode image', 'faces': [], 'count': 0}
        
        # Get face detector
        app = get_face_detector()
        
        # Detect faces
        faces = app.get(img)
        
        # Extract bounding boxes and additional info
        face_data = []
        for face in faces:
            bbox = face.bbox.astype(int).tolist()  # [x1, y1, x2, y2]
            face_info = {
                'bbox': bbox,  # [x1, y1, x2, y2]
                'confidence': float(face.det_score),
                'landmarks': face.kps.astype(int).tolist() if hasattr(face, 'kps') else None,
                'age': int(face.age) if hasattr(face, 'age') else None,
                'gender': 'Male' if hasattr(face, 'gender') and face.gender == 1 else 'Female' if hasattr(face, 'gender') else None
            }
            face_data.append(face_info)
        
        return {
            'faces': face_data,
            'count': len(faces),
            'image_shape': {
                'height': img.shape[0],
                'width': img.shape[1],
                'channels': img.shape[2]
            }
        }
        
    except Exception as e:
        return {'error': str(e), 'faces': [], 'count': 0}

def detect_faces_from_base64(base64_string):
    """
    Detect faces from base64 encoded image
    
    Args:
        base64_string: Base64 encoded image string
        
    Returns:
        dict: Detection results
    """
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_string)
        
        return detect_faces_from_image(image_bytes)
        
    except Exception as e:
        return {'error': str(e), 'faces': [], 'count': 0}

def draw_faces_on_image(image_bytes, faces_data):
    """
    Draw bounding boxes on image
    
    Args:
        image_bytes: Original image bytes
        faces_data: List of face detection results
        
    Returns:
        bytes: Image with drawn bounding boxes
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Draw rectangles for each face
        for face in faces_data:
            bbox = face['bbox']
            x1, y1, x2, y2 = bbox
            
            # Draw rectangle
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw confidence
            confidence = face.get('confidence', 0)
            label = f"{confidence:.2f}"
            cv2.putText(img, label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Draw landmarks if available
            if face.get('landmarks'):
                landmarks = face['landmarks']
                for lm in landmarks:
                    cv2.circle(img, tuple(lm), 2, (0, 0, 255), -1)
        
        # Encode back to bytes
        _, buffer = cv2.imencode('.jpg', img)
        return buffer.tobytes()
        
    except Exception as e:
        print(f"Error drawing faces: {e}")
        return image_bytes

def process_video_frame(frame_base64):
    """
    Process a single video frame for face detection
    
    Args:
        frame_base64: Base64 encoded video frame
        
    Returns:
        dict: Detection results for the frame
    """
    return detect_faces_from_base64(frame_base64)
