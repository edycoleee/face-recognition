import os

# Database Configuration
DATABASE_CONFIG = {
    'host': os.getenv('DB_HOST', '192.168.171.184'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'face_recognition_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'root')
}

# Face Recognition Configuration
FACE_RECOGNITION_CONFIG = {
    # Embedding Strategy: 'averaging', 'save_all', 'topk', 'clustering'
    'embedding_strategy': os.getenv('EMBEDDING_STRATEGY', 'averaging'),
    
    # Averaging Method Config
    'averaging': {
        'min_quality_threshold': 0.9,      # Minimum quality untuk high-quality filter
        'min_embeddings_required': 3,     # Minimum valid embeddings required
        'fallback_top_k': 7                # Fallback: ambil top K jika < 3 high quality
    },
    
    # Top-K Method Config (untuk future implementation)
    'topk': {
        'k': 5,                            # Save top 5 embeddings
        'min_quality_threshold': 0.85
    },
    
    # Clustering Method Config (untuk future implementation)
    'clustering': {
        'max_clusters': 3,                 # Maximum clusters to save
        'eps': 0.3,                        # DBSCAN epsilon parameter
        'min_samples': 2                   # DBSCAN min samples
    },
    
    # General Settings
    'normalize_embeddings': True,          # Always normalize embeddings
    'embedding_dimension': 512,            # InsightFace buffalo_l dimension
    'detection_threshold': 0.8,            # Minimum face detection confidence
    'face_size_threshold': 80              # Minimum face width/height in pixels
}

# API Configuration
API_CONFIG = {
    'title': 'Face Recognition API',
    'version': '1.0',
    'description': 'Face Detection and Recognition API using InsightFace'
}

# Logging Configuration
LOG_CONFIG = {
    'level': os.getenv('LOG_LEVEL', 'INFO'),
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
}
