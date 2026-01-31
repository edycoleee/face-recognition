"""
Application constants and configuration values
"""
import os

# Face Recognition Constants
class FaceRecognition:
    """Face recognition related constants"""
    MIN_DETECTION_CONFIDENCE = 0.8
    MIN_QUALITY_THRESHOLD = 0.9
    MIN_EMBEDDINGS_REQUIRED = 3
    MIN_FACE_SIZE = 80
    EMBEDDING_DIMENSION = 512
    MAX_IMAGES_PER_REGISTRATION = 20
    
    # Similarity thresholds
    DEFAULT_SIMILARITY_THRESHOLD = 0.6
    MIN_SIMILARITY_THRESHOLD = 0.0
    MAX_SIMILARITY_THRESHOLD = 1.0


# API Constants
class API:
    """API related constants"""
    DEFAULT_VERSION = "1.0"
    DEFAULT_TITLE = "Flask Face Detection API"
    DEFAULT_PREFIX = "/api"
    DEFAULT_DOC_PATH = "/api/docs"

# Database Constants
class Database:
    """Database related constants"""
    DEFAULT_HOST = "192.10.10.154"
    DEFAULT_PORT = 5432
    DEFAULT_DB_NAME = "face_db"
    DEFAULT_USER = "sultan"
    DEFAULT_PASSWORD = "Sulfat123#!"
    POOL_MIN_CONN = 1
    POOL_MAX_CONN = 10


# File System Constants
class FileSystem:
    """File system related constants"""
    DATASET_DIR = "dataset"
    LOG_DIR = "instance"
    LOG_FILE = "app.log"
    
    @staticmethod
    def get_log_path():
        """Get full path to log file"""
        return os.path.join(FileSystem.LOG_DIR, FileSystem.LOG_FILE)
    
    @staticmethod
    def get_user_dataset_path(user_id):
        """Get dataset path for specific user"""
        return os.path.join(FileSystem.DATASET_DIR, str(user_id))


# HTTP Status Codes
class HTTPStatus:
    """HTTP status codes"""
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    NOT_FOUND = 404
    INTERNAL_SERVER_ERROR = 500


# InsightFace Model Constants
class InsightFace:
    """InsightFace model configuration"""
    MODEL_NAME = "buffalo_l"
    CPU_PROVIDER = "CPUExecutionProvider"
    CUDA_PROVIDER = "CUDAExecutionProvider"
    DEFAULT_CTX_ID = 0
    DEFAULT_DET_SIZE = (640, 640)


# Embedding Strategies
class EmbeddingStrategy:
    """Embedding storage strategies"""
    AVERAGING = "averaging"
    SAVE_ALL = "save_all"
    TOP_K = "topk"
    CLUSTERING = "clustering"


# Authentication Constants
class Auth:
    """Authentication related constants"""
    TOKEN_EXPIRY_HOURS = 2
    MIN_CONFIDENCE = 0.6
    DEFAULT_CONFIDENCE = 0.0  # For password login
    MIN_PASSWORD_LENGTH = 6
    TOKEN_LENGTH = 36  # UUID length
    
    # Token status
    TOKEN_ACTIVE = True
    TOKEN_INACTIVE = False

