import numpy as np
import cv2
import base64
from insightface.app import FaceAnalysis
from utils.logger import logger
from utils.db import get_db_connection, get_db_cursor

# Initialize InsightFace app for face recognition
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

def decode_base64_image(base64_string):
    """Decode base64 image string to numpy array"""
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}")
        return None

def extract_face_embedding(base64_image):
    """Extract face embedding from image"""
    try:
        img = decode_base64_image(base64_image)
        if img is None:
            return None, "Invalid image data"
        
        faces = app.get(img)
        
        if len(faces) == 0:
            return None, "No face detected"
        elif len(faces) > 1:
            return None, f"Multiple faces detected ({len(faces)}). Please ensure only one person is visible."
        
        face = faces[0]
        det_score = float(face.det_score)
        
        if det_score < 0.8:
            return None, f"Face quality too low (score: {det_score:.2f})"
        
        embedding = face.embedding
        return embedding, None
        
    except Exception as e:
        logger.error(f"Error extracting embedding: {str(e)}")
        return None, f"Error: {str(e)}"

def cosine_similarity(embedding1, embedding2):
    """Calculate cosine similarity between two embeddings"""
    embedding1 = np.array(embedding1)
    embedding2 = np.array(embedding2)
    
    dot_product = np.dot(embedding1, embedding2)
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return float(dot_product / (norm1 * norm2))

def identify_face(base64_image, threshold=0.6):
    """
    Identify face from image by comparing with all registered faces in database
    Returns: (success, message, result_data)
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
        matches = []
        user_scores = {}  # Track best score per user
        
        for face in db_faces:
            # Parse embedding from database (it's stored as string '[x,y,z,...]')
            db_embedding_str = face['embedding']
            if isinstance(db_embedding_str, str):
                # Remove brackets and parse
                db_embedding = np.array([float(x) for x in db_embedding_str.strip('[]').split(',')])
            else:
                db_embedding = np.array(db_embedding_str)
            
            # Calculate similarity
            similarity = cosine_similarity(query_embedding, db_embedding)
            
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
            
            matches.append({
                'embedding_id': face['id'],
                'user_id': user_id,
                'user_name': face['name'],
                'similarity': similarity
            })
        
        # Sort by similarity (highest first)
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        
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

def verify_face(base64_image, user_id, threshold=0.6):
    """
    Verify if face in image matches specific user
    Returns: (success, message, result_data)
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
            db_embedding_str = face['embedding']
            if isinstance(db_embedding_str, str):
                db_embedding = np.array([float(x) for x in db_embedding_str.strip('[]').split(',')])
            else:
                db_embedding = np.array(db_embedding_str)
            
            similarity = cosine_similarity(query_embedding, db_embedding)
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
            return False, f"Face does not match {user_info['name']}", result
            
    except Exception as e:
        logger.error(f"Error in verify_face: {str(e)}")
        return False, f"Verification error: {str(e)}", None
