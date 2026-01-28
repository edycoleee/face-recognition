"""
Base64 image encoding/decoding utilities
"""
import base64
import cv2
import numpy as np
from typing import Optional, Tuple
from utils.logger import logger


def decode_base64_image(base64_string: str) -> Optional[np.ndarray]:
    """
    Decode base64 image string to numpy array
    
    Args:
        base64_string: Base64 encoded image string
        
    Returns:
        Decoded image as numpy array or None if decoding fails
    """
    try:
        # Remove data URL prefix if exists (e.g., "data:image/jpeg;base64,")
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64 to bytes
        img_data = base64.b64decode(base64_string)
        
        # Convert bytes to numpy array
        nparr = np.frombuffer(img_data, np.uint8)
        
        # Decode to image
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        return img
        
    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}")
        return None


def encode_image_to_base64(image: np.ndarray, format: str = '.jpg') -> Optional[str]:
    """
    Encode numpy array image to base64 string
    
    Args:
        image: Image as numpy array
        format: Image format (e.g., '.jpg', '.png')
        
    Returns:
        Base64 encoded string or None if encoding fails
    """
    try:
        # Encode image to bytes
        success, buffer = cv2.imencode(format, image)
        
        if not success:
            return None
        
        # Convert to base64
        base64_string = base64.b64encode(buffer).decode('utf-8')
        
        return base64_string
        
    except Exception as e:
        logger.error(f"Error encoding image to base64: {str(e)}")
        return None


def decode_bytes_to_image(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Convert image bytes to numpy array
    
    Args:
        image_bytes: Image data in bytes
        
    Returns:
        Decoded image as numpy array or None if decoding fails
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Error decoding bytes to image: {str(e)}")
        return None


def encode_image_to_bytes(image: np.ndarray, format: str = '.jpg') -> Optional[bytes]:
    """
    Encode numpy array image to bytes
    
    Args:
        image: Image as numpy array
        format: Image format (e.g., '.jpg', '.png')
        
    Returns:
        Image bytes or None if encoding fails
    """
    try:
        success, buffer = cv2.imencode(format, image)
        if not success:
            return None
        return buffer.tobytes()
    except Exception as e:
        logger.error(f"Error encoding image to bytes: {str(e)}")
        return None
