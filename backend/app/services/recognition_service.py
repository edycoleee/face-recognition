import numpy as np
import cv2
import base64
from insightface.app import FaceAnalysis
from utils.logger import logger
from utils.db import get_db_connection, get_db_cursor
from datetime import datetime
from config import FACE_RECOGNITION_CONFIG
import os

# Initialize InsightFace app for face recognition
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

DATASET_DIR = "dataset"

def decode_base64_image(base64_string):
    """Decode base64 image string to numpy array"""
    try:
        # Remove data:image/jpeg;base64, prefix if exists
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}")
        return None

def validate_single_face(base64_image):
    """
    Validate that image contains exactly 1 face with good quality
    Returns: (success, message, face_data)
    """
    try:
        img = decode_base64_image(base64_image)
        if img is None:
            return False, "Invalid image data", None
        
        # Detect faces
        faces = app.get(img)
        
        # Must have exactly 1 face
        if len(faces) == 0:
            return False, "No face detected", None
        elif len(faces) > 1:
            return False, f"Multiple faces detected ({len(faces)}). Please ensure only one person is visible.", None
        
        face = faces[0]
        
        # Check confidence/quality score
        det_score = float(face.det_score)
        if det_score < 0.8:
            return False, f"Face quality too low (score: {det_score:.2f}). Please move closer or improve lighting.", None
        
        # Check face size (bounding box)
        bbox = face.bbox.astype(int)
        face_width = bbox[2] - bbox[0]
        face_height = bbox[3] - bbox[1]
        
        if face_width < 80 or face_height < 80:
            return False, "Face too small. Please move closer to camera.", None
        
        # All validations passed
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

def extract_face_embedding(base64_image):
    """
    Extract face embedding from image
    Returns: (success, message, embedding_vector)
    """
    try:
        # First validate
        success, message, face_data = validate_single_face(base64_image)
        
        if not success:
            return False, message, None
        
        # Extract embedding
        embedding = face_data.get('embedding')
        if embedding is None:
            return False, "Failed to extract face embedding", None
        
        # Convert to numpy array and normalize
        embedding = np.array(embedding, dtype=np.float32)
        
        return True, "Embedding extracted successfully", embedding.tolist()
        
    except Exception as e:
        logger.error(f"Error extracting embedding: {str(e)}")
        return False, f"Extraction error: {str(e)}", None

def save_face_embedding(user_id, embedding, quality_score, image_path=None):
    """
    Save face embedding to database
    Returns: (success, message, embedding_id)
    """
    try:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            
            # Convert embedding list to string format for pgvector
            embedding_str = '[' + ','.join(map(str, embedding)) + ']'
            
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

def register_face_images(user_id, images, strategy=None):
    """
    Register multiple face images for a user using optimized strategy
    
    Args:
        user_id: User ID
        images: list of base64 encoded images
        strategy: 'averaging' (default), 'save_all', 'topk' - if None, uses config
    
    Returns: (success, message, results)
    """
    try:
        # Get strategy from config if not specified
        if strategy is None:
            strategy = FACE_RECOGNITION_CONFIG['embedding_strategy']
        
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

def register_face_images_averaged(user_id, images):
    """
    METODE A: Averaging Method - Optimal untuk efisiensi & akurasi
    
    Process:
    1. Extract semua embeddings dengan quality score
    2. Filter hanya high quality (> 0.9)
    3. Average top embeddings
    4. Normalize
    5. Save 1 embedding
    
    Returns: (success, message, results)
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
        if len(embeddings_data) < 3:
            return False, f"Need at least 3 valid images, got {len(embeddings_data)}", results
        
        # Step 2: Filter high quality or fallback to top K
        config = FACE_RECOGNITION_CONFIG['averaging']
        MIN_QUALITY = config['min_quality_threshold']
        FALLBACK_TOP_K = config['fallback_top_k']
        
        high_quality = [e for e in embeddings_data if e['quality'] >= MIN_QUALITY]
        
        if len(high_quality) >= 3:
            selected = high_quality
            logger.info(f"Using {len(selected)} high-quality embeddings (quality >= {MIN_QUALITY})")
        else:
            # Fallback: sort by quality and take top K
            embeddings_data.sort(key=lambda x: x['quality'], reverse=True)
            selected = embeddings_data[:FALLBACK_TOP_K]
            logger.info(f"Using top {len(selected)} embeddings (fallback mode)")
        
        # Step 3: Calculate average embedding
        embeddings_array = np.array([e['embedding'] for e in selected], dtype=np.float32)
        avg_embedding = np.mean(embeddings_array, axis=0)
        
        # Step 4: Normalize (crucial for cosine similarity)
        norm = np.linalg.norm(avg_embedding)
        if norm > 0:
            avg_embedding = avg_embedding / norm
        
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
            
            logger.info(f"Saved averaged embedding for user {user_id}: "
                       f"{len(selected)} images averaged, quality={avg_quality:.3f}")
            
            return True, f"Successfully registered face (averaged from {len(selected)} images)", results
        else:
            return False, f"Failed to save embedding: {save_message}", results
            
    except Exception as e:
        logger.error(f"Error in register_face_images_averaged: {str(e)}")
        return False, f"Registration error: {str(e)}", None

def register_face_images_all(user_id, images):
    """
    Legacy method: Save all embeddings (backward compatibility)
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

def get_user_embeddings(user_id):
    """Get all face embeddings for a user"""
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

def delete_user_embeddings(user_id):
    """Delete all face embeddings for a user"""
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
