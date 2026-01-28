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


def recognize_faces_from_base64(image_base64: str, threshold: float = 0.6) -> Dict[str, Any]:
    """
    Detect all faces in image and identify each one against database (1:N matching)
    
    Args:
        image_base64: Base64 encoded image
        threshold: Similarity threshold for face matching (default 0.6)
        
    Returns:
        Dictionary containing:
        - success: bool
        - faces: List of detected faces with identification info
        - count: Total number of faces detected
    """
    try:
        from services.recognition_service import find_best_match
        
        # First, detect all faces
        detection_result = detect_faces_from_base64(image_base64)
        
        if 'error' in detection_result:
            return detection_result
        
        detected_faces = detection_result.get('faces', [])
        
        if not detected_faces:
            return {
                'success': True,
                'message': 'No faces detected',
                'faces': [],
                'count': 0
            }
        
        # Get face detector for embedding extraction
        detector = get_face_detector()
        img = decode_base64_image(image_base64)
        
        if img is None:
            return {'error': 'Failed to decode image'}
        
        # Get all faces with embeddings
        faces = detector.get(img)
        
        # Process each detected face
        recognized_faces = []
        
        for i, (face, face_info) in enumerate(zip(faces, detected_faces)):
            # Get embedding for this face
            embedding = face.normed_embedding
            
            logger.info(f"Processing face {i+1}: embedding shape = {embedding.shape if embedding is not None else 'None'}")
            
            if embedding is None:
                # No embedding, mark as unknown
                logger.warning(f"Face {i+1}: No embedding extracted")
                recognized_faces.append({
                    **face_info,
                    'identified': False,
                    'name': None,
                    'email': None,
                    'user_id': None,
                    'confidence': 0.0
                })
                continue
            
            # Try to identify this face (1:N search)
            logger.info(f"Face {i+1}: Calling find_best_match with threshold={threshold}")
            success, message, match_result = find_best_match(embedding, threshold)
            
            logger.info(f"Face {i+1}: find_best_match result - success={success}, message={message}, identified={match_result.get('identified')}, confidence={match_result.get('confidence')}")
            
            if success and match_result.get('identified'):
                # Face identified
                logger.info(f"Face {i+1}: IDENTIFIED as {match_result.get('name')} with confidence {match_result.get('confidence')}")
                recognized_faces.append({
                    **face_info,
                    'identified': True,
                    'name': match_result.get('name'),
                    'email': match_result.get('email'),
                    'user_id': match_result.get('user_id'),
                    'confidence': match_result.get('confidence', 0.0)
                })
            else:
                # Face not identified (below threshold or not in database)
                logger.warning(f"Face {i+1}: NOT IDENTIFIED - {message}")
                recognized_faces.append({
                    **face_info,
                    'identified': False,
                    'name': None,
                    'email': None,
                    'user_id': None,
                    'confidence': match_result.get('confidence', 0.0)
                })
        
        return {
            'success': True,
            'message': f'Detected {len(recognized_faces)} face(s)',
            'faces': recognized_faces,
            'count': len(recognized_faces)
        }
        
    except Exception as e:
        logger.error(f"Error in recognize_faces_from_base64: {str(e)}")
        return {'error': f'Face recognition failed: {str(e)}'}
