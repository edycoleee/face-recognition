"""Face identification service - handles face identification and verification"""
import numpy as np
from typing import Tuple, Optional, Dict, Any, List

from utils.logger import logger
from utils.db import get_db_connection, get_db_cursor
from utils.face_model import FaceAnalysisModel
from utils.image_utils import decode_base64_image
from utils.embedding_utils import (
    calculate_cosine_similarity,
    db_format_to_embedding
)
from utils.constants import FaceRecognition


def get_face_analyzer():
    """Get face analysis model instance"""
    return FaceAnalysisModel.get_instance()


def extract_face_embedding(base64_image: str) -> Tuple[Optional[np.ndarray], Optional[str]]:
    """
    Extract face embedding from image
    
    Args:
        base64_image: Base64 encoded image string
        
    Returns:
        Tuple of (embedding, error_message)
    """
    try:
        img = decode_base64_image(base64_image)
        if img is None:
            return None, "Invalid image data"
        
        app = get_face_analyzer()
        faces = app.get(img)
        
        if len(faces) == 0:
            return None, "No face detected"
        elif len(faces) > 1:
            return None, f"Multiple faces detected ({len(faces)}). Please ensure only one person is visible."
        
        face = faces[0]
        det_score = float(face.det_score)
        
        if det_score < FaceRecognition.MIN_DETECTION_CONFIDENCE:
            return None, f"Face quality too low (score: {det_score:.2f})"
        
        embedding = face.embedding
        return embedding, None
        
    except Exception as e:
        logger.error(f"Error extracting embedding: {str(e)}")
        return None, f"Error: {str(e)}"


def _parse_db_embedding(db_embedding: Any) -> np.ndarray:
    """
    Parse embedding from database format to numpy array
    
    Args:
        db_embedding: Embedding from database (string or already parsed)
        
    Returns:
        Embedding as numpy array
    """
    if isinstance(db_embedding, str):
        return db_format_to_embedding(db_embedding)
    return np.array(db_embedding, dtype=np.float32)

def identify_face(
    base64_image: str,
    threshold: float = FaceRecognition.DEFAULT_SIMILARITY_THRESHOLD
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Identify face from image by comparing with all registered faces in database
    
    Args:
        base64_image: Base64 encoded image string
        threshold: Similarity threshold for matching (0.0 to 1.0)
        
    Returns:
        Tuple of (success, message, result_data)
    """
    try:
        # Extract embedding from input image
        query_embedding, error = extract_face_embedding(base64_image)
        if error:
            return False, error, None
        
        # Get all face embeddings from database
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute("""
                SELECT 
                    fe.id,
                    fe.user_id,
                    fe.embedding,
                    fe.quality_score,
                    u.name,
                    u.email
                FROM face_embeddings fe
                JOIN users u ON fe.user_id = u.id
                ORDER BY fe.user_id
            """)
            
            db_faces = cursor.fetchall()
        
        if not db_faces:
            return False, "No registered faces found in database", None
        
        # Calculate similarities
        user_scores = {}  # Track best score per user
        
        for face in db_faces:
            # Parse embedding from database
            db_embedding = _parse_db_embedding(face['embedding'])
            
            # Calculate similarity
            similarity = calculate_cosine_similarity(query_embedding, db_embedding)
            
            user_id = face['user_id']
            
            # Track best score for each user
            if user_id not in user_scores or similarity > user_scores[user_id]['similarity']:
                user_scores[user_id] = {
                    'user_id': user_id,
                    'name': face['name'],
                    'email': face['email'],
                    'similarity': similarity,
                    'embedding_id': face['id']
                }
        
        # Get best match per user (sorted)
        best_per_user = sorted(user_scores.values(), key=lambda x: x['similarity'], reverse=True)
        
        # Determine if we have a match
        best_match = best_per_user[0] if best_per_user else None
        
        if best_match and best_match['similarity'] >= threshold:
            result = {
                'identified': True,
                'user_id': best_match['user_id'],
                'user_name': best_match['name'],
                'user_email': best_match['email'],
                'confidence': round(best_match['similarity'] * 100, 2),
                'similarity_score': round(best_match['similarity'], 4),
                'threshold': threshold,
                'top_matches': [
                    {
                        'user_id': m['user_id'],
                        'user_name': m['name'],
                        'confidence': round(m['similarity'] * 100, 2),
                        'similarity': round(m['similarity'], 4)
                    }
                    for m in best_per_user[:5]  # Top 5 users
                ]
            }
            return True, f"Face identified as {best_match['name']}", result
        else:
            result = {
                'identified': False,
                'message': 'No matching face found in database',
                'confidence': round(best_match['similarity'] * 100, 2) if best_match else 0,
                'threshold': threshold * 100,
                'top_matches': [
                    {
                        'user_id': m['user_id'],
                        'user_name': m['name'],
                        'confidence': round(m['similarity'] * 100, 2),
                        'similarity': round(m['similarity'], 4)
                    }
                    for m in best_per_user[:5]
                ]
            }
            return False, "No match found (confidence too low)", result
            
    except Exception as e:
        logger.error(f"Error in identify_face: {str(e)}")
        return False, f"Identification error: {str(e)}", None


def verify_face(
    base64_image: str,
    user_id: int,
    threshold: float = FaceRecognition.DEFAULT_SIMILARITY_THRESHOLD
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Verify if face in image matches specific user (1:1 verification)
    
    Args:
        base64_image: Base64 encoded image string
        user_id: User ID to verify against
        threshold: Similarity threshold for verification
        
    Returns:
        Tuple of (success, message, result_data)
    """
    try:
        # Extract embedding from input image
        query_embedding, error = extract_face_embedding(base64_image)
        if error:
            return False, error, None
        
        # Get user's face embeddings from database
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute("""
                SELECT 
                    fe.id,
                    fe.embedding,
                    fe.quality_score,
                    u.name,
                    u.email
                FROM face_embeddings fe
                JOIN users u ON fe.user_id = u.id
                WHERE fe.user_id = %s
            """, (user_id,))
            
            db_faces = cursor.fetchall()
        
        if not db_faces:
            return False, f"No face embeddings found for user {user_id}", None
        
        # Calculate similarities with all user's embeddings
        similarities = []
        for face in db_faces:
            db_embedding = _parse_db_embedding(face['embedding'])
            similarity = calculate_cosine_similarity(query_embedding, db_embedding)
            similarities.append(similarity)
        
        # Use best match (highest similarity)
        best_similarity = max(similarities)
        avg_similarity = np.mean(similarities)
        
        user_info = db_faces[0]
        verified = best_similarity >= threshold
        
        result = {
            'verified': verified,
            'user_id': user_id,
            'user_name': user_info['name'],
            'user_email': user_info['email'],
            'best_similarity': round(best_similarity, 4),
            'avg_similarity': round(avg_similarity, 4),
            'confidence': round(best_similarity * 100, 2),
            'threshold': threshold,
            'embeddings_checked': len(similarities)
        }
        
        if verified:
            return True, f"Face verified as {user_info['name']}", result
        else:
            # If verification failed, try to identify who this actually is
            # This helps detect if wrong person is trying to verify
            try:
                _, _, identify_result = identify_face(base64_image, threshold)
                if identify_result and identify_result.get('identified'):
                    # Add actual identity to result
                    result['actual_identity'] = {
                        'user_id': identify_result['user_id'],
                        'user_name': identify_result['user_name'],
                        'confidence': identify_result['confidence']
                    }
                    return False, f"Face does not match {user_info['name']}. Detected as {identify_result['user_name']} instead.", result
            except Exception as e:
                logger.warning(f"Failed to identify actual person: {str(e)}")
            
            return False, f"Face does not match {user_info['name']}", result
            
    except Exception as e:
        logger.error(f"Error in verify_face: {str(e)}")
        return False, f"Verification error: {str(e)}", None
