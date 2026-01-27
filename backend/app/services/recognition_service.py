import numpy as np
import cv2
import base64
from insightface.app import FaceAnalysis
from utils.logger import logger
from utils.db import get_db_connection, get_db_cursor
from datetime import datetime
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

def register_face_images(user_id, images):
    """
    Register multiple face images for a user
    images: list of base64 encoded images
    Returns: (success, message, results)
    """
    try:
        results = {
            'total': len(images),
            'successful': 0,
            'failed': 0,
            'embeddings': [],
            'errors': []
        }
        
        for idx, image in enumerate(images):
            # Extract embedding
            success, message, embedding = extract_face_embedding(image)
            
            if success:
                # Save to database
                save_success, save_message, embedding_id = save_face_embedding(
                    user_id=user_id,
                    embedding=embedding,
                    quality_score=0.95  # You can extract actual score from face_data
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
        logger.error(f"Error in register_face_images: {str(e)}")
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
