"""
InsightFace model wrapper - singleton pattern for model management
"""
from insightface.app import FaceAnalysis
from typing import Optional
from utils.constants import InsightFace
from utils.logger import logger


class FaceAnalysisModel:
    """
    Singleton class for managing InsightFace model
    Ensures only one model instance is loaded in memory
    """
    _instance: Optional[FaceAnalysis] = None
    _initialized: bool = False
    
    @classmethod
    def get_instance(cls, use_gpu: bool = False) -> FaceAnalysis:
        """
        Get or create FaceAnalysis instance
        
        Args:
            use_gpu: Whether to use GPU acceleration
            
        Returns:
            FaceAnalysis instance
        """
        if cls._instance is None:
            logger.info("Initializing InsightFace model...")
            
            provider = InsightFace.CUDA_PROVIDER if use_gpu else InsightFace.CPU_PROVIDER
            
            cls._instance = FaceAnalysis(
                name=InsightFace.MODEL_NAME,
                providers=[provider]
            )
            
            cls._instance.prepare(
                ctx_id=InsightFace.DEFAULT_CTX_ID,
                det_size=InsightFace.DEFAULT_DET_SIZE
            )
            
            cls._initialized = True
            logger.info(f"InsightFace model initialized (provider: {provider})")
        
        return cls._instance
    
    @classmethod
    def is_initialized(cls) -> bool:
        """Check if model is initialized"""
        return cls._initialized
    
    @classmethod
    def reset(cls):
        """Reset the model instance (for testing purposes)"""
        cls._instance = None
        cls._initialized = False
        logger.info("InsightFace model reset")
