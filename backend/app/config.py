"""
Application configuration management
"""
import os
from typing import Dict, Any
from utils.constants import (
    Database, FaceRecognition, EmbeddingStrategy, API
)


class Config:
    """Base configuration class"""
    
    # Flask Configuration
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    TESTING = False
    
    # API Configuration
    API_TITLE = os.getenv('API_TITLE', API.DEFAULT_TITLE)
    API_VERSION = os.getenv('API_VERSION', API.DEFAULT_VERSION)
    
    # Database Configuration
    DB_HOST = os.getenv('DB_HOST', Database.DEFAULT_HOST)
    DB_PORT = int(os.getenv('DB_PORT', Database.DEFAULT_PORT))
    DB_NAME = os.getenv('DB_NAME', Database.DEFAULT_DB_NAME)
    DB_USER = os.getenv('DB_USER', Database.DEFAULT_USER)
    DB_PASSWORD = os.getenv('DB_PASSWORD', Database.DEFAULT_PASSWORD)
    
    @classmethod
    def get_database_config(cls) -> Dict[str, Any]:
        """Get database configuration as dictionary"""
        return {
            'host': cls.DB_HOST,
            'port': cls.DB_PORT,
            'database': cls.DB_NAME,
            'user': cls.DB_USER,
            'password': cls.DB_PASSWORD
        }


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing environment configuration"""
    DEBUG = True
    TESTING = True


class FaceRecognitionConfig:
    """Face recognition specific configuration"""
    
    # Strategy selection
    EMBEDDING_STRATEGY = os.getenv(
        'EMBEDDING_STRATEGY',
        EmbeddingStrategy.AVERAGING
    )
    
    # Averaging method configuration
    AVERAGING_MIN_QUALITY = float(os.getenv(
        'AVERAGING_MIN_QUALITY',
        FaceRecognition.MIN_QUALITY_THRESHOLD
    ))
    AVERAGING_MIN_EMBEDDINGS = int(os.getenv(
        'AVERAGING_MIN_EMBEDDINGS',
        FaceRecognition.MIN_EMBEDDINGS_REQUIRED
    ))
    AVERAGING_FALLBACK_TOP_K = int(os.getenv('AVERAGING_FALLBACK_TOP_K', 7))
    
    # Top-K method configuration
    TOPK_K = int(os.getenv('TOPK_K', 5))
    TOPK_MIN_QUALITY = float(os.getenv('TOPK_MIN_QUALITY', 0.85))
    
    # Clustering method configuration
    CLUSTERING_MAX_CLUSTERS = int(os.getenv('CLUSTERING_MAX_CLUSTERS', 3))
    CLUSTERING_EPS = float(os.getenv('CLUSTERING_EPS', 0.3))
    CLUSTERING_MIN_SAMPLES = int(os.getenv('CLUSTERING_MIN_SAMPLES', 2))
    
    # General settings
    NORMALIZE_EMBEDDINGS = os.getenv('NORMALIZE_EMBEDDINGS', 'True').lower() == 'true'
    EMBEDDING_DIMENSION = int(os.getenv(
        'EMBEDDING_DIMENSION',
        FaceRecognition.EMBEDDING_DIMENSION
    ))
    DETECTION_THRESHOLD = float(os.getenv(
        'DETECTION_THRESHOLD',
        FaceRecognition.MIN_DETECTION_CONFIDENCE
    ))
    FACE_SIZE_THRESHOLD = int(os.getenv(
        'FACE_SIZE_THRESHOLD',
        FaceRecognition.MIN_FACE_SIZE
    ))
    
    @classmethod
    def get_config_dict(cls) -> Dict[str, Any]:
        """
        Get face recognition configuration as dictionary
        (For backward compatibility with existing code)
        """
        return {
            'embedding_strategy': cls.EMBEDDING_STRATEGY,
            'averaging': {
                'min_quality_threshold': cls.AVERAGING_MIN_QUALITY,
                'min_embeddings_required': cls.AVERAGING_MIN_EMBEDDINGS,
                'fallback_top_k': cls.AVERAGING_FALLBACK_TOP_K
            },
            'topk': {
                'k': cls.TOPK_K,
                'min_quality_threshold': cls.TOPK_MIN_QUALITY
            },
            'clustering': {
                'max_clusters': cls.CLUSTERING_MAX_CLUSTERS,
                'eps': cls.CLUSTERING_EPS,
                'min_samples': cls.CLUSTERING_MIN_SAMPLES
            },
            'normalize_embeddings': cls.NORMALIZE_EMBEDDINGS,
            'embedding_dimension': cls.EMBEDDING_DIMENSION,
            'detection_threshold': cls.DETECTION_THRESHOLD,
            'face_size_threshold': cls.FACE_SIZE_THRESHOLD
        }
    
    @classmethod
    def validate(cls) -> bool:
        """Validate configuration values"""
        errors = []
        
        # Validate strategy
        valid_strategies = [
            EmbeddingStrategy.AVERAGING,
            EmbeddingStrategy.SAVE_ALL,
            EmbeddingStrategy.TOP_K,
            EmbeddingStrategy.CLUSTERING
        ]
        if cls.EMBEDDING_STRATEGY not in valid_strategies:
            errors.append(f"Invalid embedding strategy: {cls.EMBEDDING_STRATEGY}")
        
        # Validate thresholds
        if not 0.0 <= cls.AVERAGING_MIN_QUALITY <= 1.0:
            errors.append("AVERAGING_MIN_QUALITY must be between 0.0 and 1.0")
        
        if not 0.0 <= cls.DETECTION_THRESHOLD <= 1.0:
            errors.append("DETECTION_THRESHOLD must be between 0.0 and 1.0")
        
        # Validate counts
        if cls.AVERAGING_MIN_EMBEDDINGS < 1:
            errors.append("AVERAGING_MIN_EMBEDDINGS must be at least 1")
        
        if cls.FACE_SIZE_THRESHOLD < 1:
            errors.append("FACE_SIZE_THRESHOLD must be positive")
        
        if errors:
            raise ValueError("Configuration validation failed:\n" + "\n".join(errors))
        
        return True


# Export for backward compatibility
DATABASE_CONFIG = Config.get_database_config()
FACE_RECOGNITION_CONFIG = FaceRecognitionConfig.get_config_dict()
API_CONFIG = {
    'title': Config.API_TITLE,
    'version': Config.API_VERSION,
    'description': 'Face Detection and Recognition API using InsightFace'
}


# Get configuration based on environment
def get_config() -> Config:
    """
    Get configuration class based on environment
    
    Returns:
        Configuration class instance
    """
    env = os.getenv('FLASK_ENV', 'development').lower()
    
    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig
    }
    
    return config_map.get(env, DevelopmentConfig)

# Logging Configuration
LOG_CONFIG = {
    'level': os.getenv('LOG_LEVEL', 'INFO'),
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
}
