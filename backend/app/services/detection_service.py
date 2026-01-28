"""
Face detection service - handles face detection operations
"""
from typing import Dict, List, Any, Optional
import cv2
import numpy as np

from utils.face_model import FaceAnalysisModel
from utils.image_utils import (
    decode_base64_image,
    decode_bytes_to_image,
    encode_image_to_bytes
)
from utils.constants import FaceRecognition
from utils.logger import logger


def get_face_detector():
    """
    Get face detector instance (singleton pattern)
    
    Returns:
        FaceAnalysis instance
    """
    return FaceAnalysisModel.get_instance()


def extract_face_info(face) -> Dict[str, Any]:
    """
    Extract face information from InsightFace detection result
    
    Args:
        face: Face object from InsightFace
        
    Returns:
        Dictionary containing face information
    """
    bbox = face.bbox.astype(int).tolist()  # [x1, y1, x2, y2]
    
    face_info = {
        'bbox': bbox,
        'confidence': float(face.det_score),
        'landmarks': face.kps.astype(int).tolist() if hasattr(face, 'kps') else None,
        'age': int(face.age) if hasattr(face, 'age') else None,
        'gender': 'Male' if (hasattr(face, 'gender') and face.gender == 1) else 'Female' if hasattr(face, 'gender') else None
    }
    
    return face_info


def detect_faces_from_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Detect faces from image bytes
    
    Args:
        image_bytes: Image data in bytes
        
    Returns:
        Dictionary containing detection results:
        {
            'faces': list of detected faces with bounding boxes,
            'count': number of faces detected,
            'image_shape': (height, width, channels)
        }
    """
    try:
        # Convert bytes to image
        img = decode_bytes_to_image(image_bytes)
        
        if img is None:
            return {
                'error': 'Failed to decode image',
                'faces': [],
                'count': 0
            }
        
        # Get face detector
        app = get_face_detector()
        
        # Detect faces
        faces = app.get(img)
        
        # Extract face information
        face_data = [extract_face_info(face) for face in faces]
        
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
        logger.error(f"Error in detect_faces_from_image: {str(e)}")
        return {
            'error': str(e),
            'faces': [],
            'count': 0
        }


def detect_faces_from_base64(base64_string: str) -> Dict[str, Any]:
    """
    Detect faces from base64 encoded image
    
    Args:
        base64_string: Base64 encoded image string
        
    Returns:
        Dictionary containing detection results
    """
    try:
        # Decode base64 to image
        img = decode_base64_image(base64_string)
        
        if img is None:
            return {
                'error': 'Failed to decode base64 image',
                'faces': [],
                'count': 0
            }
        
        # Encode to bytes and use existing function
        image_bytes = encode_image_to_bytes(img)
        
        if image_bytes is None:
            return {
                'error': 'Failed to encode image',
                'faces': [],
                'count': 0
            }
        
        return detect_faces_from_image(image_bytes)
        
    except Exception as e:
        logger.error(f"Error in detect_faces_from_base64: {str(e)}")
        return {
            'error': str(e),
            'faces': [],
            'count': 0
        }


def draw_faces_on_image(image_bytes: bytes, faces_data: List[Dict[str, Any]]) -> bytes:
    """
    Draw bounding boxes and landmarks on image
    
    Args:
        image_bytes: Original image bytes
        faces_data: List of face detection results
        
    Returns:
        Image bytes with drawn annotations
    """
    try:
        # Convert bytes to image
        img = decode_bytes_to_image(image_bytes)
        
        if img is None:
            logger.error("Failed to decode image for drawing")
            return image_bytes
        
        # Draw annotations for each face
        for face in faces_data:
            bbox = face['bbox']
            x1, y1, x2, y2 = bbox
            
            # Draw rectangle
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw confidence score
            confidence = face.get('confidence', 0)
            label = f"{confidence:.2f}"
            cv2.putText(
                img, label, (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2
            )
            
            # Draw landmarks if available
            landmarks = face.get('landmarks')
            if landmarks:
                for lm in landmarks:
                    cv2.circle(img, tuple(lm), 2, (0, 0, 255), -1)
        
        # Encode back to bytes
        annotated_bytes = encode_image_to_bytes(img)
        
        return annotated_bytes if annotated_bytes else image_bytes
        
    except Exception as e:
        logger.error(f"Error drawing faces: {str(e)}")
        return image_bytes


def process_video_frame(frame_base64: str) -> Dict[str, Any]:
    """
    Process a single video frame for face detection
    Optimized for real-time video processing
    
    Args:
        frame_base64: Base64 encoded video frame
        
    Returns:
        Dictionary containing detection results
    """
    # For video frames, use the same detection logic
    # Could be optimized with frame skipping or lower resolution
    return detect_faces_from_base64(frame_base64)
