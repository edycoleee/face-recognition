"""
Face embedding utilities - common operations for face embeddings
"""
import numpy as np
from typing import List, Tuple, Optional
from utils.logger import logger


def normalize_embedding(embedding: np.ndarray) -> np.ndarray:
    """
    Normalize embedding vector to unit length
    
    Args:
        embedding: Embedding vector as numpy array
        
    Returns:
        Normalized embedding
    """
    norm = np.linalg.norm(embedding)
    if norm > 0:
        return embedding / norm
    return embedding


def calculate_cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Calculate cosine similarity between two embeddings
    
    Args:
        embedding1: First embedding vector
        embedding2: Second embedding vector
        
    Returns:
        Cosine similarity score (0.0 to 1.0)
    """
    # Convert to numpy arrays if needed
    embedding1 = np.array(embedding1, dtype=np.float32)
    embedding2 = np.array(embedding2, dtype=np.float32)
    
    # Calculate dot product
    dot_product = np.dot(embedding1, embedding2)
    
    # Calculate norms
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    
    # Avoid division by zero
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    # Calculate cosine similarity
    similarity = dot_product / (norm1 * norm2)
    
    return float(similarity)


def average_embeddings(embeddings: List[np.ndarray], normalize: bool = True) -> np.ndarray:
    """
    Calculate average of multiple embeddings
    
    Args:
        embeddings: List of embedding vectors
        normalize: Whether to normalize the result
        
    Returns:
        Averaged embedding vector
    """
    if not embeddings:
        raise ValueError("Cannot average empty list of embeddings")
    
    # Convert to numpy array and calculate mean
    embeddings_array = np.array(embeddings, dtype=np.float32)
    avg_embedding = np.mean(embeddings_array, axis=0)
    
    # Normalize if requested
    if normalize:
        avg_embedding = normalize_embedding(avg_embedding)
    
    return avg_embedding


def embedding_to_db_format(embedding: np.ndarray) -> str:
    """
    Convert numpy embedding to PostgreSQL vector format
    
    Args:
        embedding: Embedding as numpy array
        
    Returns:
        String format for pgvector: '[x,y,z,...]'
    """
    return '[' + ','.join(map(str, embedding.tolist())) + ']'


def db_format_to_embedding(db_string: str) -> np.ndarray:
    """
    Convert PostgreSQL vector format to numpy array
    
    Args:
        db_string: String in format '[x,y,z,...]'
        
    Returns:
        Embedding as numpy array
    """
    try:
        # Remove brackets and split
        values = db_string.strip('[]').split(',')
        # Convert to float array
        return np.array([float(x) for x in values], dtype=np.float32)
    except Exception as e:
        logger.error(f"Error parsing embedding from database: {str(e)}")
        raise


def filter_high_quality_embeddings(
    embeddings_data: List[dict],
    quality_threshold: float,
    min_required: int = 3
) -> List[dict]:
    """
    Filter embeddings by quality threshold with fallback
    
    Args:
        embeddings_data: List of dicts with 'embedding' and 'quality' keys
        quality_threshold: Minimum quality score
        min_required: Minimum number of embeddings required
        
    Returns:
        Filtered list of high quality embeddings
    """
    # Filter high quality
    high_quality = [e for e in embeddings_data if e['quality'] >= quality_threshold]
    
    # If we have enough high quality, use them
    if len(high_quality) >= min_required:
        logger.info(f"Using {len(high_quality)} high-quality embeddings (quality >= {quality_threshold})")
        return high_quality
    
    # Fallback: sort by quality and take top ones
    sorted_embeddings = sorted(embeddings_data, key=lambda x: x['quality'], reverse=True)
    fallback_count = max(min_required, len(high_quality))
    selected = sorted_embeddings[:fallback_count]
    
    logger.info(f"Using top {len(selected)} embeddings (fallback mode)")
    return selected


def calculate_embedding_statistics(embeddings: List[np.ndarray]) -> dict:
    """
    Calculate statistics for a list of embeddings
    
    Args:
        embeddings: List of embedding vectors
        
    Returns:
        Dictionary with statistics
    """
    if not embeddings:
        return {}
    
    embeddings_array = np.array(embeddings, dtype=np.float32)
    
    return {
        'count': len(embeddings),
        'mean_norm': float(np.mean([np.linalg.norm(e) for e in embeddings])),
        'std_norm': float(np.std([np.linalg.norm(e) for e in embeddings])),
        'dimension': embeddings_array.shape[1] if len(embeddings_array.shape) > 1 else len(embeddings[0])
    }
