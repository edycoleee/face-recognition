# app/utils/logger.py
import logging
import os

# Create logs directory if not exists
LOG_DIR = "instance"
os.makedirs(LOG_DIR, exist_ok=True)

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, 'app.log')),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
