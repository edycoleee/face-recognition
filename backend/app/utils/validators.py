"""
Reusable validation functions
"""
from typing import Tuple, Any, Optional
from utils.constants import FaceRecognition


def validate_threshold(threshold: float) -> Tuple[bool, Optional[str]]:
    """
    Validate similarity threshold value
    
    Args:
        threshold: Threshold value to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(threshold, (int, float)):
        return False, "Threshold must be a number"
    
    if not (FaceRecognition.MIN_SIMILARITY_THRESHOLD <= threshold <= FaceRecognition.MAX_SIMILARITY_THRESHOLD):
        return False, f"Threshold must be between {FaceRecognition.MIN_SIMILARITY_THRESHOLD} and {FaceRecognition.MAX_SIMILARITY_THRESHOLD}"
    
    return True, None


def validate_image_list(images: Any, max_images: int = None) -> Tuple[bool, Optional[str]]:
    """
    Validate list of images
    
    Args:
        images: List of images to validate
        max_images: Maximum allowed images
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not images:
        return False, "No images provided"
    
    if not isinstance(images, list):
        return False, "Images must be a list"
    
    if len(images) == 0:
        return False, "Images list cannot be empty"
    
    if max_images and len(images) > max_images:
        return False, f"Maximum {max_images} images allowed"
    
    return True, None


def validate_base64_image(image_data: Any) -> Tuple[bool, Optional[str]]:
    """
    Validate base64 image data
    
    Args:
        image_data: Base64 image string to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not image_data:
        return False, "No image data provided"
    
    if not isinstance(image_data, str):
        return False, "Image data must be a string"
    
    return True, None


def validate_user_id(user_id: Any) -> Tuple[bool, Optional[str]]:
    """
    Validate user ID
    
    Args:
        user_id: User ID to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if user_id is None:
        return False, "User ID is required"
    
    if not isinstance(user_id, int) or user_id <= 0:
        return False, "User ID must be a positive integer"
    
    return True, None


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """
    Basic email validation
    
    Args:
        email: Email address to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"
    
    if not isinstance(email, str):
        return False, "Email must be a string"
    
    if "@" not in email or "." not in email:
        return False, "Invalid email format"
    
    return True, None
