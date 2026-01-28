"""Face recognition service - handles face registration and embedding operations"""
import numpy as np
from typing import Tuple, Optional, List, Dict, Any

from utils.logger import logger
from utils.db import get_db_connection, get_db_cursor
from utils.face_model import FaceAnalysisModel
from utils.image_utils import decode_base64_image
from utils.embedding_utils import (
    normalize_embedding,
    average_embeddings,
    embedding_to_db_format,
    filter_high_quality_embeddings
)
from utils.constants import FaceRecognition, FileSystem
from config import FaceRecognitionConfig


def get_face_analyzer():
    """Get face analysis model instance"""
    return FaceAnalysisModel.get_instance()

def validate_single_face(base64_image: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Validate that image contains exactly 1 face with good quality
    
    Args:
        base64_image: Base64 encoded image string
        
    Returns:
        Tuple of (success, message, face_data)
    """
    try:
        img = decode_base64_image(base64_image)
        if img is None:
            return False, "Invalid image data", None
        
        # Get face analyzer and detect faces
        app = get_face_analyzer()
        faces = app.get(img)
        
        # Must have exactly 1 face
        if len(faces) == 0:
            return False, "No face detected", None
        elif len(faces) > 1:
            return False, f"Multiple faces detected ({len(faces)}). Please ensure only one person is visible.", None
        
        face = faces[0]
        
        # Check confidence/quality score
        det_score = float(face.det_score)
        if det_score < FaceRecognition.MIN_DETECTION_CONFIDENCE:
            return False, f"Face quality too low (score: {det_score:.2f}). Please move closer or improve lighting.", None
        
        # Check face size (bounding box)
        bbox = face.bbox.astype(int)
        face_width = bbox[2] - bbox[0]
        face_height = bbox[3] - bbox[1]
        
        if face_width < FaceRecognition.MIN_FACE_SIZE or face_height < FaceRecognition.MIN_FACE_SIZE:
            return False, "Face too small. Please move closer to camera.", None
        
        # All validations passed - extract face data
        face_data = {
            'bbox': bbox.tolist(),
            'confidence': det_score,
            'landmarks': face.kps.tolist() if hasattr(face, 'kps') else None,
            'embedding': face.embedding.tolist() if hasattr(face, 'embedding') else None,
            'age': int(face.age) if hasattr(face, 'age') else None,
            'gender': 'Male' if (hasattr(face, 'gender') and face.gender == 1) else 'Female'
        }
        
        return True, "Face validated successfully", face_data
        
    except Exception as e:
        logger.error(f"Error in validate_single_face: {str(e)}")
        return False, f"Validation error: {str(e)}", None

def extract_face_embedding(base64_image: str) -> Tuple[bool, str, Optional[List[float]]]:
    """
    Extract face embedding from image
    
    Args:
        base64_image: Base64 encoded image string
        
    Returns:
        Tuple of (success, message, embedding_vector)
    """
    try:
        # First validate the face
        success, message, face_data = validate_single_face(base64_image)
        
        if not success:
            return False, message, None
        
        # Extract embedding from face data
        embedding = face_data.get('embedding')
        if embedding is None:
            return False, "Failed to extract face embedding", None
        
        # Convert to numpy array
        embedding = np.array(embedding, dtype=np.float32)
        
        return True, "Embedding extracted successfully", embedding.tolist()
        
    except Exception as e:
        logger.error(f"Error extracting embedding: {str(e)}")
        return False, f"Extraction error: {str(e)}", None

def save_face_embedding(
    user_id: int,
    embedding: List[float],
    quality_score: float,
    image_path: Optional[str] = None
) -> Tuple[bool, str, Optional[int]]:
    """
    Save face embedding to database
    
    Args:
        user_id: User ID
        embedding: Face embedding vector
        quality_score: Quality score of the face
        image_path: Optional path to the image file
        
    Returns:
        Tuple of (success, message, embedding_id)
    """
    try:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            
            # Convert embedding to database format
            embedding_array = np.array(embedding, dtype=np.float32)
            embedding_str = embedding_to_db_format(embedding_array)
            
            cursor.execute(
                """
                INSERT INTO face_embeddings (user_id, embedding, quality_score, image_path)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (user_id, embedding_str, quality_score, image_path)
            )
            
            embedding_id = cursor.fetchone()['id']
            conn.commit()
            
            logger.info(f"Face embedding saved for user {user_id}: embedding_id={embedding_id}")
            return True, "Embedding saved successfully", embedding_id
            
    except Exception as e:
        logger.error(f"Error saving embedding: {str(e)}")
        return False, f"Database error: {str(e)}", None

def register_face_images(
    user_id: int,
    images: List[str],
    strategy: Optional[str] = None
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Register multiple face images for a user using optimized strategy
    
    Args:
        user_id: User ID
        images: List of base64 encoded images
        strategy: 'averaging' (default), 'save_all', 'topk' - if None, uses config
    
    Returns:
        Tuple of (success, message, results)
    """
    try:
        # Get strategy from config if not specified
        if strategy is None:
            strategy = FaceRecognitionConfig.EMBEDDING_STRATEGY
        
        logger.info(f"Registering faces for user {user_id} using strategy: {strategy}")
        
        if strategy == 'averaging':
            return register_face_images_averaged(user_id, images)
        elif strategy == 'save_all':
            return register_face_images_all(user_id, images)
        else:
            # Default to averaging for unknown strategies
            logger.warning(f"Unknown strategy '{strategy}', defaulting to 'averaging'")
            return register_face_images_averaged(user_id, images)
            
    except Exception as e:
        logger.error(f"Error in register_face_images: {str(e)}")
        return False, f"Registration error: {str(e)}", None

def register_face_images_averaged(
    user_id: int,
    images: List[str]
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Averaging Method - Optimal for efficiency & accuracy
    
    Process:
    1. Extract all embeddings with quality score
    2. Filter high quality embeddings (> threshold)
    3. Average top embeddings
    4. Normalize
    5. Save 1 embedding
    
    Args:
        user_id: User ID
        images: List of base64 encoded images
        
    Returns:
        Tuple of (success, message, results)
    """
    try:
        embeddings_data = []
        results = {
            'total': len(images),
            'processed': 0,
            'failed': 0,
            'strategy': 'averaging',
            'embeddings': [],
            'errors': []
        }
        
        # Step 1: Extract all embeddings with quality scores
        for idx, image in enumerate(images):
            # Validate and extract
            success_val, msg_val, face_data = validate_single_face(image)
            
            if success_val:
                # Extract embedding
                success_emb, msg_emb, embedding = extract_face_embedding(image)
                
                if success_emb:
                    quality = face_data.get('confidence', 0.8)
                    embeddings_data.append({
                        'embedding': np.array(embedding, dtype=np.float32),
                        'quality': float(quality),
                        'index': idx + 1
                    })
                    results['processed'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'index': idx + 1,
                        'error': msg_emb
                    })
            else:
                results['failed'] += 1
                results['errors'].append({
                    'index': idx + 1,
                    'error': msg_val
                })
        
        # Check minimum requirements
        min_required = FaceRecognitionConfig.AVERAGING_MIN_EMBEDDINGS
        if len(embeddings_data) < min_required:
            return False, f"Need at least {min_required} valid images, got {len(embeddings_data)}", results
        
        # Step 2: Filter high quality embeddings or fallback to top K
        selected = filter_high_quality_embeddings(
            embeddings_data,
            quality_threshold=FaceRecognitionConfig.AVERAGING_MIN_QUALITY,
            min_required=FaceRecognitionConfig.AVERAGING_MIN_EMBEDDINGS
        )
        
        # Step 3 & 4: Calculate average and normalize
        avg_embedding = average_embeddings(
            [e['embedding'] for e in selected],
            normalize=FaceRecognitionConfig.NORMALIZE_EMBEDDINGS
        )
        
        # Step 5: Calculate average quality
        avg_quality = float(np.mean([e['quality'] for e in selected]))
        
        # Step 6: Save single averaged embedding
        save_success, save_message, embedding_id = save_face_embedding(
            user_id=user_id,
            embedding=avg_embedding.tolist(),
            quality_score=avg_quality
        )
        
        if save_success:
            results['successful'] = 1
            results['embeddings'].append({
                'id': embedding_id,
                'type': 'averaged',
                'source_count': len(selected),
                'avg_quality': avg_quality
            })
            
            logger.info(
                f"Saved averaged embedding for user {user_id}: "
                f"{len(selected)} images averaged, quality={avg_quality:.3f}"
            )
            
            return True, f"Successfully registered face (averaged from {len(selected)} images)", results
        else:
            return False, f"Failed to save embedding: {save_message}", results
            
    except Exception as e:
        logger.error(f"Error in register_face_images_averaged: {str(e)}")
        return False, f"Registration error: {str(e)}", None

def register_face_images_all(
    user_id: int,
    images: List[str]
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Legacy method: Save all embeddings (backward compatibility)
    
    Args:
        user_id: User ID
        images: List of base64 encoded images
        
    Returns:
        Tuple of (success, message, results)
    """
    try:
        results = {
            'total': len(images),
            'successful': 0,
            'failed': 0,
            'strategy': 'save_all',
            'embeddings': [],
            'errors': []
        }
        
        for idx, image in enumerate(images):
            # Extract embedding
            success, message, embedding = extract_face_embedding(image)
            
            if success:
                # Get quality score
                _, _, face_data = validate_single_face(image)
                quality = face_data.get('confidence', 0.95)
                
                # Save to database
                save_success, save_message, embedding_id = save_face_embedding(
                    user_id=user_id,
                    embedding=embedding,
                    quality_score=quality
                )
                
                if save_success:
                    results['successful'] += 1
                    results['embeddings'].append({
                        'id': embedding_id,
                        'index': idx + 1
                    })
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'index': idx + 1,
                        'error': save_message
                    })
            else:
                results['failed'] += 1
                results['errors'].append({
                    'index': idx + 1,
                    'error': message
                })
        
        if results['successful'] > 0:
            return True, f"Successfully registered {results['successful']}/{results['total']} faces", results
        else:
            return False, "Failed to register any faces", results
            
    except Exception as e:
        logger.error(f"Error in register_face_images_all: {str(e)}")
        return False, f"Registration error: {str(e)}", None

def get_user_embeddings(user_id: int) -> List[Dict[str, Any]]:
    """
    Get all face embeddings for a user
    
    Args:
        user_id: User ID
        
    Returns:
        List of embedding records
    """
    try:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute(
                """
                SELECT id, quality_score, created_at
                FROM face_embeddings
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,)
            )
            embeddings = cursor.fetchall()
            return [dict(emb) for emb in embeddings]
    except Exception as e:
        logger.error(f"Error getting embeddings: {str(e)}")
        return []

def delete_user_embeddings(user_id: int) -> int:
    """
    Delete all face embeddings for a user
    
    Args:
        user_id: User ID
        
    Returns:
        Number of deleted embeddings
    """
    try:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute("DELETE FROM face_embeddings WHERE user_id = %s", (user_id,))
            deleted_count = cursor.rowcount
            conn.commit()
            logger.info(f"Deleted {deleted_count} embeddings for user {user_id}")
            return deleted_count
    except Exception as e:
        logger.error(f"Error deleting embeddings: {str(e)}")
        return 0


def verify_face(user_id: int, face_image, threshold: float = None) -> Tuple[bool, float]:
    """
    Verify if a face matches a specific user's stored embeddings (1:1 verification)
    
    This is more efficient than identification because it only compares against
    one user's embeddings instead of all users.
    
    Args:
        user_id: User ID to verify against
        face_image: Numpy array of face image
        threshold: Similarity threshold (default from FaceRecognition config)
        
    Returns:
        Tuple of (match, confidence)
            match: True if face matches user
            confidence: Similarity score (0.0 - 1.0)
    """
    from utils.embedding_utils import calculate_cosine_similarity
    
    if threshold is None:
        threshold = FaceRecognition.DEFAULT_SIMILARITY_THRESHOLD
    
    try:
        # Get face analyzer and detect face in image
        app = get_face_analyzer()
        faces = app.get(face_image)
        
        if len(faces) == 0:
            logger.warning("No face detected in verification image")
            return False, 0.0
        
        if len(faces) > 1:
            logger.warning(f"Multiple faces detected ({len(faces)}) in verification")
            return False, 0.0
        
        # Extract embedding from detected face
        face = faces[0]
        query_embedding = normalize_embedding(face.embedding)
        
        # Get user's stored embeddings from database
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute(
                """
                SELECT embedding 
                FROM face_embeddings 
                WHERE user_id = %s
                """,
                (user_id,)
            )
            results = cursor.fetchall()
        
        if not results:
            logger.warning(f"No embeddings found for user_id={user_id}")
            return False, 0.0
        
        # Compare against all stored embeddings and get best match
        max_similarity = 0.0
        for row in results:
            stored_embedding = np.array(row['embedding'], dtype=np.float32)
            stored_embedding = normalize_embedding(stored_embedding)
            
            similarity = calculate_cosine_similarity(query_embedding, stored_embedding)
            max_similarity = max(max_similarity, similarity)
        
        # Check if similarity exceeds threshold
        match = max_similarity >= threshold
        
        logger.info(
            f"Face verification for user_id={user_id}: "
            f"match={match}, confidence={max_similarity:.3f}, threshold={threshold:.3f}"
        )
        
        return match, float(max_similarity)
        
    except Exception as e:
        logger.error(f"Error in verify_face: {str(e)}")
        return False, 0.0

