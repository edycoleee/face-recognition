"""
Flask application factory and configuration
"""
import os
from datetime import datetime
from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_restx import Api
from flask_cors import CORS

from api.halo import api as halo_ns
from api.users import api as users_ns
from api.face_registration import api as face_ns
from api.face_identification import api as identify_ns
from api.auth import api as auth_ns
from api.attendance import api as attendance_ns
from utils.constants import API, FileSystem
from utils.logger import logger


class CustomJSONProvider(DefaultJSONProvider):
    """Custom JSON provider to handle datetime serialization"""
    
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def register_namespaces(api: Api) -> None:
    """
    Register all API namespaces
    
    Args:
        api: Flask-RESTX Api instance
    """
    api.add_namespace(halo_ns, path="/halo")
    api.add_namespace(users_ns, path="/users")
    api.add_namespace(face_ns, path="/face")
    api.add_namespace(identify_ns, path="/identify")
    api.add_namespace(auth_ns, path="/auth")
    api.add_namespace(attendance_ns, path="/attendance")


def register_routes(app: Flask) -> None:
    """
    Register additional routes (non-namespace routes)
    
    Args:
        app: Flask application instance
    """
    @app.route("/api/logs")
    def get_logs():
        """Get last 30 lines of application logs"""
        log_path = FileSystem.get_log_path()
        
        if os.path.exists(log_path):
            try:
                with open(log_path, "r") as f:
                    lines = f.readlines()
                    return "".join(lines[-30:])
            except Exception as e:
                logger.error(f"Error reading log file: {str(e)}")
                return f"Error reading logs: {str(e)}"
        
        return "No logs available."
    
    @app.route("/api/health")
    def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "version": API.DEFAULT_VERSION
        }


def create_app(config: dict = None) -> Flask:
    """
    Application factory pattern
    
    Args:
        config: Optional configuration dictionary
        
    Returns:
        Configured Flask application instance
    """
    # Create Flask app
    app = Flask(__name__)
    
    # Apply custom JSON provider
    app.json = CustomJSONProvider(app)
    
    # Apply configuration if provided
    if config:
        app.config.update(config)
    
    # Initialize Flask-RESTX API
    api = Api(
        app,
        version=API.DEFAULT_VERSION,
        title=API.DEFAULT_TITLE,
        doc=API.DEFAULT_DOC_PATH,
        prefix=API.DEFAULT_PREFIX
    )
    
    # Register all namespaces
    register_namespaces(api)
    
    # Register additional routes
    register_routes(app)
    
    # Enable CORS
    CORS(app)
    
    logger.info("Flask application created successfully")
    
    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    # Get environment variables
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    
    logger.info(f"Starting Flask application on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)